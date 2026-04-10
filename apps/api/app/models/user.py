from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, SoftDeleteMixin, TimestampMixin, new_uuid

if TYPE_CHECKING:
    from app.models.company import Company

UserRole = str  # "super_admin" | "sub_admin" | "site_manager" | "vendor_user" | "accounting"
VALID_ROLES = ("super_admin", "sub_admin", "site_manager", "vendor_user", "accounting")


class User(Base, TimestampMixin, SoftDeleteMixin):
    """플랫폼 사용자. RBAC role 기반 권한 분리."""

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    company_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("companies.id"), nullable=False, index=True
    )
    email: Mapped[str] = mapped_column(String(254), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    role: Mapped[str] = mapped_column(String(30), nullable=False)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)

    company: Mapped["Company"] = relationship(back_populates="users")
