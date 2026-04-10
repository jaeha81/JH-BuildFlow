from sqlalchemy import JSON, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, SoftDeleteMixin, TimestampMixin, new_uuid


class Vendor(Base, TimestampMixin, SoftDeleteMixin):
    """협력사."""

    __tablename__ = "vendors"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    company_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("companies.id"), nullable=False, index=True
    )
    company_name: Mapped[str] = mapped_column(String(200), nullable=False)
    representative_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    email: Mapped[str] = mapped_column(String(254), unique=True, nullable=False, index=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    business_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    business_cert_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    # 공종 목록 (JSON array)
    trade_types: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    # 서비스 지역 (JSON array)
    regions: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    tax_info: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    rating: Mapped[float | None] = mapped_column(Numeric(3, 2), nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    is_verified: Mapped[bool] = mapped_column(default=False, nullable=False)

    bid_requests: Mapped[list["BidRequest"]] = relationship(  # noqa: F821
        back_populates="vendor"
    )
    score_snapshots: Mapped[list["VendorScoreSnapshot"]] = relationship(  # noqa: F821
        back_populates="vendor"
    )
