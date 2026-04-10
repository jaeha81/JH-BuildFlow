from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class BidRequestCreate(BaseModel):
    process_package_id: str
    vendor_ids: list[str]  # 다수 업체 일괄 발주
    deadline: datetime | None = None
    instructions: str | None = None
    document_urls: list[str] = []


class RespondBody(BaseModel):
    status: str  # accepted | rejected | on_hold
    reason: str | None = None


class BidRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    company_id: str
    project_id: str
    process_package_id: str
    vendor_id: str
    sent_at: datetime | None = None
    deadline: datetime | None = None
    response_status: str
    response_reason: str | None = None
    read_at: datetime | None = None
