"""Database setup. SQLite locally, Postgres in production, both via DATABASE_URL."""

from __future__ import annotations

import os
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

# Render/Railway hand out postgres:// URLs, SQLAlchemy 2 wants postgresql://.
_raw_url = os.getenv("DATABASE_URL", "sqlite:///./neuroriskx.db")
DATABASE_URL = _raw_url.replace("postgres://", "postgresql://", 1)

# check_same_thread is a SQLite-only concern (FastAPI serves from a threadpool).
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Create tables on startup. Fine for a demo; a real app would use Alembic."""
    from models import Assessment, User  # noqa: F401  (registers the mappers)

    Base.metadata.create_all(bind=engine)
