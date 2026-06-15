"""Database access layer.

Primary: Supabase REST API via supabase-py (works on free plan).
Optional: SQLAlchemy async engine for PostgreSQL direct connect (paid plan).
"""

from functools import lru_cache

from supabase import create_client, Client

from app.core.config import get_settings

settings = get_settings()


# ---------------------------------------------------------------------------
# Supabase REST client (primary — always available)
# ---------------------------------------------------------------------------

@lru_cache
def get_supabase() -> Client:
    """Return a cached Supabase REST client using the service-role key."""
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


@lru_cache
def get_supabase_anon() -> Client:
    """Return a cached Supabase REST client using the anon (public) key."""
    return create_client(settings.supabase_url, settings.supabase_anon_key)


# ---------------------------------------------------------------------------
# Optional: SQLAlchemy async engine (only when supabase_db_url is set)
# ---------------------------------------------------------------------------

_engine = None
_async_session_factory = None


def _init_sqlalchemy():
    """Lazily init SQLAlchemy engine only when direct DB URL is provided."""
    global _engine, _async_session_factory
    if not settings.supabase_db_url:
        return
    if _engine is not None:
        return

    from sqlalchemy.ext.asyncio import (
        AsyncSession,
        async_sessionmaker,
        create_async_engine,
    )

    _engine = create_async_engine(
        settings.supabase_db_url,
        echo=settings.debug,
        pool_size=5,
        max_overflow=10,
        pool_pre_ping=True,
    )
    _async_session_factory = async_sessionmaker(
        _engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )


async def get_db():
    """FastAPI dependency: yield an async DB session (if direct connect available)."""
    _init_sqlalchemy()
    if _async_session_factory is None:
        raise RuntimeError(
            "Direct DB connection not configured. "
            "Set SUPABASE_DB_URL or use get_supabase() for REST API access."
        )
    async with _async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
