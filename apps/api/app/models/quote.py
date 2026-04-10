from sqlalchemy import JSON, Boolean, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, SoftDeleteMixin, TimestampMixin, new_uuid


class Quote(Base, TimestampMixin, SoftDeleteMixin):
    """협력사가 제출한 견적."""

    __tablename__ = "quotes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    company_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("companies.id"), nullable=False, index=True
    )
    vendor_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("vendors.id"), nullable=False, index=True
    )
    project_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("projects.id"), nullable=False, index=True
    )
    bid_request_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("bid_requests.id"), nullable=False, index=True
    )
    file_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    file_name: Mapped[str | None] = mapped_column(String(300), nullable=True)
    parsed_total: Mapped[float | None] = mapped_column(Numeric(15, 2), nullable=True)
    line_items_json: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    parse_status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="pending"
    )  # pending | success | failed | manual_review
    manual_review_required: Mapped[bool] = mapped_column(default=False, nullable=False)
    submission_type: Mapped[str] = mapped_column(
        String(20), nullable=False, default="upload"
    )  # template | pdf | excel | hwp | upload

    bid_request: Mapped["BidRequest"] = relationship(back_populates="quotes")  # noqa: F821
    normalized_lines: Mapped[list["QuoteLineNormalized"]] = relationship(
        back_populates="quote"
    )


class QuoteLineNormalized(Base, TimestampMixin):
    """견적 표준화 라인 아이템."""

    __tablename__ = "quote_lines_normalized"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    quote_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("quotes.id"), nullable=False, index=True
    )
    item_name: Mapped[str] = mapped_column(String(300), nullable=False)
    unit: Mapped[str] = mapped_column(String(20), nullable=False)
    quantity: Mapped[float] = mapped_column(Numeric(12, 3), nullable=False, default=0)
    unit_price: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False, default=0)
    amount: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False, default=0)
    sort_order: Mapped[int] = mapped_column(default=0, nullable=False)

    quote: Mapped["Quote"] = relationship(back_populates="normalized_lines")
