"""Database setup. SQLite locally, Postgres in production, both via DATABASE_URL."""

from __future__ import annotations

import os
from collections.abc import Generator

from sqlalchemy import Boolean, create_engine
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
    from sqlalchemy import inspect

    from models import Assessment, User  # noqa: F401  (registers the mappers)

    # One-time correction. `assessments.flagged` was first declared as an Integer
    # column while holding a Python bool. SQLite tolerates that, Postgres does not,
    # so every write failed with a 500 and the table is necessarily empty. Drop it so
    # create_all() rebuilds it with the right Boolean type. The users table, which has
    # real rows, is never touched.
    inspector = inspect(engine)
    if inspector.has_table("assessments"):
        columns = {c["name"]: c["type"] for c in inspector.get_columns("assessments")}
        flagged = columns.get("flagged")
        if flagged is not None and not isinstance(flagged, Boolean):
            import logging

            logging.getLogger("neuroriskx").warning(
                "Rebuilding 'assessments': flagged column has type %s, expected Boolean.", flagged
            )
            Assessment.__table__.drop(bind=engine)

    Base.metadata.create_all(bind=engine)
