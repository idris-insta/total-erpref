"""
SQLAlchemy Entity Models — AI Action queue + Bank reconciliation.

Kept in a standalone module (not ai_agents.py) so importing these does not pull
in other agent tables that carry unresolved foreign keys.
"""
from sqlalchemy import String, DateTime, Boolean, Text, Float, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime

from core.database import Base
from models.entities.base import UUIDMixin, TimestampMixin


class AIAction(Base, UUIDMixin, TimestampMixin):
    """Agent-proposed action awaiting human approval (surfaced in AI Inbox)."""
    __tablename__ = "ai_actions"

    agent: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    action_type: Mapped[str] = mapped_column(String(60), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending", index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=True)
    draft: Mapped[dict] = mapped_column(JSONB, nullable=True)
    reference_type: Mapped[str] = mapped_column(String(60), nullable=True)
    reference_id: Mapped[str] = mapped_column(String(60), nullable=True)
    ai_generated: Mapped[bool] = mapped_column(Boolean, default=False)
    decided_by: Mapped[str] = mapped_column(String(36), nullable=True)
    decided_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("ix_aiaction_agent_ref", "agent", "reference_id"),
    )


class BankTransaction(Base, UUIDMixin, TimestampMixin):
    """Imported bank-statement line; matched to a Payment during reconciliation."""
    __tablename__ = "bank_transactions"

    txn_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    ref_no: Mapped[str] = mapped_column(String(120), nullable=True)
    deposit: Mapped[float] = mapped_column(Float, default=0)
    withdrawal: Mapped[float] = mapped_column(Float, default=0)
    bank_account: Mapped[str] = mapped_column(String(120), nullable=True)
    reconciled: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    matched_payment_id: Mapped[str] = mapped_column(String(36), nullable=True)
