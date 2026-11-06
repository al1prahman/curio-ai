import json
from typing import Any

import redis.asyncio as aioredis

from app.core.config import settings


class RedisService:
    """Redis client for caching and rate limiting."""

    _pool: aioredis.Redis | None = None

    @classmethod
    def get_client(cls) -> aioredis.Redis:
        if cls._pool is None:
            cls._pool = aioredis.from_url(  # type: ignore[no-untyped-call]  # redis<6 ships from_url untyped
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
            )
        return cls._pool

    @classmethod
    async def close(cls) -> None:
        if cls._pool is not None:
            await cls._pool.aclose()
            cls._pool = None


async def cache_get(key: str) -> Any | None:
    """Get a cached value."""
    client = RedisService.get_client()
    data = await client.get(f"cache:{key}")
    if data is None:
        return None
    return json.loads(data)


async def cache_set(key: str, value: Any, ttl_seconds: int = 60) -> None:
    """Set a cached value with TTL."""
    client = RedisService.get_client()
    await client.set(f"cache:{key}", json.dumps(value, default=str), ex=ttl_seconds)


async def cache_delete(key: str) -> None:
    """Delete a cached value."""
    client = RedisService.get_client()
    await client.delete(f"cache:{key}")


async def cache_delete_pattern(pattern: str) -> None:
    """Delete all keys matching a pattern."""
    client = RedisService.get_client()
    keys = []
    async for key in client.scan_iter(match=f"cache:{pattern}"):
        keys.append(key)
    if keys:
        await client.delete(*keys)
