from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, SoftDeleteMixin, TimestampMixin, new_uuid


class BidRequest(Base, TimestampMixin, SoftDeleteMixin):
    """협력사에게 발송된 발주 요청."""

    __tablename__ = "bid_requests"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    company_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("companies.id"), nullable=False, index=True
    )
    project_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("projects.id"), nullable=False, index=True
    )
    process_package_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("process_packages.id"), nullable=False, index=True
    )
    vendor_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("vendors.id"), nullable=False, index=True
    )
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    deadline: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    response_status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="pending"
    )  # pending | accepted | rejected | on_hold | expired
    response_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    vendor: Mapped["Vendor"] = relationship(back_populates="bid_requests")  # noqa: F821
    process_package: Mapped["ProcessPackage"] = relationship(  # noqa: F821
        back_populates="bid_requests"
    )
    bid_package: Mapped["BidPackage | None"] = relationship(back_populates="bid_request")
    quotes: Mapped[list["Quote"]] = relationship(back_populates="bid_request")  # noqa: F821


class BidPackage(Base, TimestampMixin, SoftDeleteMixin):
    """발주 패키지 (발주 요청에 첨부되는 자료 세트)."""

    __tablename__ = "bid_packages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    company_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("companies.id"), nullable=False, index=True
    )
    bid_request_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("bid_requests.id"), nullable=False, unique=True
    )
    documents: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    instructions: Mapped[str | None] = mapped_column(Text, nullable=True)

    bid_request: Mapped["BidRequest"] = relationship(back_populates="bid_package")
