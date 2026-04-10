from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, new_uuid


class AuditLog(Base):
    """모든 write 작업 감사 로그. 절대 삭제/수정 불가."""

    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    company_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    actor_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    actor_role: Mapped[str] = mapped_column(String(30), nullable=False)
    action: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    target_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    target_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    before_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    after_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(500), nullable=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )


class NotificationQueue(Base):
    """알림 발송 큐."""

    __tablename__ = "notification_queue"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    recipient_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    channel: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # push | email | kakao
    payload: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="pending"
    )  # pending | sent | failed
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class VendorScoreSnapshot(Base, TimestampMixin):
    """협력사 평가 스냅샷. 참여율/응답속도/수주율/완료율/클레임 누적."""

    __tablename__ = "vendor_score_snapshots"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    vendor_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("vendors.id"), nullable=False, index=True
    )
    snapshot_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    participation_rate: Mapped[float | None] = mapped_column(nullable=True)
    response_speed_avg: Mapped[float | None] = mapped_column(nullable=True)
    win_rate: Mapped[float | None] = mapped_column(nullable=True)
    completion_rate: Mapped[float | None] = mapped_column(nullable=True)
    complaint_count: Mapped[int] = mapped_column(default=0, nullable=False)
    settlement_total: Mapped[float | None] = mapped_column(nullable=True)

    score: Mapped[float | None] = mapped_column(nullable=True)  # 최종 가중합 점수 (0~1)
    quality_score: Mapped[float | None] = mapped_column(nullable=True)

    vendor: Mapped["Vendor"] = relationship(back_populates="score_snapshots")  # noqa: F821
