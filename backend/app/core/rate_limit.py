import time

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

from app.services.redis_service import RedisService

# Rate limits: (max_requests, window_seconds)
RATE_LIMITS: dict[str, tuple[int, int]] = {
    "/api/v1/auth/login": (5, 60),           # 5 login attempts per minute
    "/api/v1/documents/upload": (10, 60),    # 10 uploads per minute
    "/api/v1/chat/conversations": (20, 60),  # 20 chat messages per minute
}


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Redis-based rate limiter."""

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        path = request.url.path

        # Find matching rate limit rule
        limit_rule = None
        for pattern, rule in RATE_LIMITS.items():
            if path.startswith(pattern):
                limit_rule = rule
                break

        if limit_rule is None:
            return await call_next(request)

        # Skip rate limiting in test environment
        from app.core.config import settings

        if settings.APP_ENV == "test":
            return await call_next(request)

        max_requests, window = limit_rule

        # Identify client by IP + path
        client_ip = request.client.host if request.client else "unknown"
        key = f"ratelimit:{client_ip}:{path}"

        try:
            client = RedisService.get_client()
            now = time.time()
            window_start = now - window

            # Use a sorted set: score = timestamp
            pipe = client.pipeline()
            pipe.zremrangebyscore(key, 0, window_start)
            pipe.zadd(key, {str(now): now})
            pipe.zcard(key)
            pipe.expire(key, window)
            results = await pipe.execute()

            request_count = results[2]

            if request_count > max_requests:
                return Response(
                    content='{"detail":"Rate limit exceeded. Try again later."}',
                    status_code=429,
                    media_type="application/json",
                    headers={"Retry-After": str(window)},
                )
        except Exception:
            # If Redis is down, allow the request (fail open)
            pass

        return await call_next(request)
