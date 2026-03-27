"""
Async SQLite database engine and session factory.

Tables are created automatically on first startup via init_db().
"""

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from app.config import settings

DATABASE_URL = f"sqlite+aiosqlite:///{settings.db_path}"

engine = create_async_engine(DATABASE_URL, echo=settings.debug)

async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def init_db():
    """Create all tables that don't exist yet."""
    from app.models.db_models import Base
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_session() -> AsyncSession:
    """Dependency for FastAPI route injection."""
    async with async_session() as session:
        yield session
