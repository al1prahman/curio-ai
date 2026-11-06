"""ARQ connection pool + enqueue helpers.

The pool is a lazily-created module singleton (same pattern as RedisService).
Enqueue failures must never break uploads — callers handle exceptions and
leave documents in PENDING for a later process-all/retry.
"""

import logging
import urllib.parse
import uuid

from arq import create_pool
from arq.connections import ArqRedis, RedisSettings

from app.core.config import settings

logger = logging.getLogger(__name__)

_pool: ArqRedis | None = None


def _redis_settings() -> RedisSettings:
    parsed = urllib.parse.urlparse(settings.REDIS_URL)
    database = 0
    if parsed.path and parsed.path != "/":
        try:
            database = int(parsed.path.lstrip("/"))
        except ValueError:
            database = 0
    return RedisSettings(
        host=parsed.hostname or "localhost",
        port=parsed.port or 6379,
        database=database,
        password=parsed.password,
    )


async def get_arq_pool() -> ArqRedis:
    global _pool  # noqa: PLW0603 - module-level singleton, same pattern as RedisService
    if _pool is None:
        _pool = await create_pool(_redis_settings())
    return _pool


async def close_arq_pool() -> None:
    global _pool  # noqa: PLW0603 - module-level singleton
    if _pool is not None:
        await _pool.close()
        _pool = None


async def enqueue_document_processing(
    document_id: uuid.UUID | str,
    organization_id: uuid.UUID | str,
) -> None:
    """Enqueue a document processing job. Raises on queue failure."""
    pool = await get_arq_pool()
    await pool.enqueue_job(
        "process_document_job",
        str(document_id),
        str(organization_id),
    )
