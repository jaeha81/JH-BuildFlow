from datetime import date, datetime

from sqlalchemy import DATE, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, SoftDeleteMixin, TimestampMixin, new_uuid


class Settlement(Base, TimestampMixin, SoftDeleteMixin):
    """정산 건. 자동지급 절대 금지 — 승인형만 허용."""

    __tablename__ = "settlements"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    company_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("companies.id"), nullable=False, index=True
    )
    project_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("projects.id"), nullable=False, index=True
    )
    vendor_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("vendors.id"), nullable=False, index=True
    )
    milestone_type: Mapped[str] = mapped_column(
        String(10), nullable=False
    )  # advance | interim | final
    requested_amount: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False)
    approved_amount: Mapped[float | None] = mapped_column(Numeric(15, 2), nullable=True)
    invoice_file: Mapped[str | None] = mapped_column(String(500), nullable=True)
    tax_review_status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="pending"
    )  # pending | passed | failed
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="requested"
    )  # requested | under_review | approved | paid | rejected
    payout_scheduled_date: Mapped[date | None] = mapped_column(DATE, nullable=True)
    # 승인자 정보 (자동 지급 방지)
    payout_approved_by: Mapped[str | None] = mapped_column(String(36), nullable=True)
    payout_approved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    reject_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
