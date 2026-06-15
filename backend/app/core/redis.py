"""Redis connection management.

Provides a cached Redis client for rate limiting and token blacklisting.
Falls back to a no-op client in development if Redis is unavailable.
"""

import logging

import redis.asyncio as aioredis

from app.core.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

_redis: aioredis.Redis | None = None


async def get_redis() -> aioredis.Redis:
    """Return the cached async Redis client.

    Creates the client on first call. If Redis is unreachable in
    development mode, returns a NoopRedis that silently does nothing
    so the app can still run for local testing.
    """
    global _redis
    if _redis is not None:
        return _redis

    try:
        _redis = aioredis.from_url(
            settings.redis_url,
            decode_responses=True,
            socket_connect_timeout=3,
        )
        # Verify connection
        await _redis.ping()
        return _redis
    except Exception:
        if settings.app_env == "development":
            logger.warning(
                "Redis unavailable — using NoopRedis fallback. "
                "Rate limiting will NOT work in this session."
            )
            _redis = NoopRedis()
            return _redis
        raise


def reset_redis() -> None:
    """Close and discard the cached Redis client (for testing)."""
    global _redis
    if _redis is not None and not isinstance(_redis, NoopRedis):
        try:
            import asyncio
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.ensure_future(_redis.aclose())
            else:
                loop.run_until_complete(_redis.aclose())
        except Exception:
            pass
    _redis = None


class NoopRedis:
    """Fallback Redis client for development when Redis is not running.

    Rate limiting will NOT work (all calls are no-ops).
    Token blacklisting uses an in-memory set so logout works within
    the current process (tokens are lost on restart — acceptable for dev).
    """

    def __init__(self) -> None:
        self._blacklist: set[str] = set()

    async def ping(self) -> bool:
        return True

    async def get(self, key: str) -> None:
        return None

    async def set(self, key: str, value: str, ex: int | None = None, nx: bool = False) -> None:
        # Track token blocklist entries in-memory (prefix: "blocklist:")
        if key.startswith("blocklist:"):
            self._blacklist.add(key)
        return None

    async def incr(self, key: str) -> int:
        return 1

    async def expire(self, key: str, seconds: int) -> bool:
        return True

    async def delete(self, *keys: str) -> int:
        for k in keys:
            self._blacklist.discard(k)
        return 0

    async def ttl(self, key: str) -> int:
        return -1

    async def setnx(self, key: str, value: str) -> bool:
        return True

    async def exists(self, *keys: str) -> int:
        # Check in-memory blacklist so logout works in dev mode
        count = sum(1 for k in keys if k in self._blacklist)
        return count

    async def close(self) -> None:
        pass
