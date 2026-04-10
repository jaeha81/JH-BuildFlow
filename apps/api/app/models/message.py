from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, SoftDeleteMixin, TimestampMixin, new_uuid


class MessageThread(Base, TimestampMixin, SoftDeleteMixin):
    """메시지 스레드 (프로젝트/발주/지원 Q&A)."""

    __tablename__ = "message_threads"

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
    thread_type: Mapped[str] = mapped_column(
        String(20), nullable=False, default="project"
    )  # project | bid | support
    is_closed: Mapped[bool] = mapped_column(default=False, nullable=False)

    messages: Mapped[list["Message"]] = relationship(back_populates="thread")


class Message(Base, TimestampMixin, SoftDeleteMixin):
    """메시지 단건."""

    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    thread_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("message_threads.id"), nullable=False, index=True
    )
    sender_id: Mapped[str] = mapped_column(String(36), nullable=False)
    sender_role: Mapped[str] = mapped_column(String(30), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    file_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    ai_handled: Mapped[bool] = mapped_column(default=False, nullable=False)
    escalated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    read_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    thread: Mapped["MessageThread"] = relationship(back_populates="messages")
