"""ORM models."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True, nullable=False)
    # Never the password itself. bcrypt hash only.
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    assessments: Mapped[list["Assessment"]] = relationship(
        back_populates="user", cascade="all, delete-orphan", order_by="Assessment.created_at"
    )


class Assessment(Base):
    """
    A saved risk assessment. This is what gives signing in a point: a real history
    the user can look back on, which is also what the old fake "timeline" pretended
    to show with hardcoded numbers.
    """

    __tablename__ = "assessments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)

    risk_score: Mapped[float] = mapped_column(Float, nullable=False)
    risk_band: Mapped[str] = mapped_column(String(16), nullable=False)
    flagged: Mapped[bool] = mapped_column(Boolean, nullable=False)

    # The exact inputs and the explanation behind the score, so history is auditable.
    inputs: Mapped[dict] = mapped_column(JSON, nullable=False)
    top_features: Mapped[list] = mapped_column(JSON, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, index=True
    )

    user: Mapped[User] = relationship(back_populates="assessments")
