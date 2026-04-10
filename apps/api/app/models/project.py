from datetime import date

from sqlalchemy import JSON, DATE, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, SoftDeleteMixin, TimestampMixin, new_uuid

IndustryTemplate = str  # "카페" | "오피스" | "병원" | "상가"
ProjectStatus = str     # "draft" | "active" | "bid_collecting" | "contracted" | ...


class Project(Base, TimestampMixin, SoftDeleteMixin):
    """공사 현장 프로젝트."""

    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    company_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("companies.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(300), nullable=False)
    site_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    client_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    industry_template: Mapped[str | None] = mapped_column(String(20), nullable=True)
    contract_amount: Mapped[float | None] = mapped_column(Numeric(15, 2), nullable=True)
    estimated_budget: Mapped[float | None] = mapped_column(Numeric(15, 2), nullable=True)
    start_date: Mapped[date | None] = mapped_column(DATE, nullable=True)
    end_date: Mapped[date | None] = mapped_column(DATE, nullable=True)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="draft")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    # 업종별 기본 공정 세트
    site_info: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)

    company: Mapped["Company"] = relationship(back_populates="projects")  # noqa: F821
    process_packages: Mapped[list["ProcessPackage"]] = relationship(  # noqa: F821
        back_populates="project"
    )
    documents: Mapped[list["ProjectDocument"]] = relationship(back_populates="project")  # noqa: F821


class ProcessPackage(Base, TimestampMixin, SoftDeleteMixin):
    """공종별 패키지. 예산 배분 및 발주 단위."""

    __tablename__ = "process_packages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    company_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("companies.id"), nullable=False, index=True
    )
    project_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("projects.id"), nullable=False, index=True
    )
    trade_type: Mapped[str] = mapped_column(String(20), nullable=False)
    budget_allocated: Mapped[float | None] = mapped_column(Numeric(15, 2), nullable=True)
    schedule: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="draft")

    project: Mapped["Project"] = relationship(back_populates="process_packages")
    bid_requests: Mapped[list["BidRequest"]] = relationship(  # noqa: F821
        back_populates="process_package"
    )


class ProjectDocument(Base, TimestampMixin, SoftDeleteMixin):
    """프로젝트 첨부 문서."""

    __tablename__ = "project_documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    company_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("companies.id"), nullable=False, index=True
    )
    project_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("projects.id"), nullable=False, index=True
    )
    doc_type: Mapped[str] = mapped_column(String(50), nullable=False)
    file_url: Mapped[str] = mapped_column(String(500), nullable=False)
    file_name: Mapped[str] = mapped_column(String(300), nullable=False)
    file_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    version: Mapped[int] = mapped_column(default=1, nullable=False)
    is_internal: Mapped[bool] = mapped_column(default=True, nullable=False)
    is_external: Mapped[bool] = mapped_column(default=False, nullable=False)
    folder_key: Mapped[str | None] = mapped_column(String(50), nullable=True)

    project: Mapped["Project"] = relationship(back_populates="documents")
