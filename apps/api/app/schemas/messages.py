from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ThreadCreate(BaseModel):
    project_id: str
    vendor_id: str
    thread_type: str = "project"  # project | bid | support
    bid_request_id: str | None = None


class ThreadResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    company_id: str
    project_id: str
    vendor_id: str
    thread_type: str
    is_closed: bool


class MessageCreate(BaseModel):
    content: str


class MessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    thread_id: str
    sender_id: str
    sender_role: str
    content: str
    file_url: str | None = None
    ai_handled: bool
    escalated_at: datetime | None = None
    read_at: datetime | None = None
    created_at: datetime
