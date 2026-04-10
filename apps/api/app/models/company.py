from sqlalchemy import JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, SoftDeleteMixin, TimestampMixin, new_uuid


class Company(Base, TimestampMixin, SoftDeleteMixin):
    """Tenant 단위 회사. 멀티테넌트 분리 기준."""

    __tablename__ = "companies"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    business_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    representative_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    # 화이트라벨 설정 레이어 (로고, 색상, 알림 설정 등)
    company_settings: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)

    users: Mapped[list["User"]] = relationship(back_populates="company")  # noqa: F821
    projects: Mapped[list["Project"]] = relationship(back_populates="company")  # noqa: F821
