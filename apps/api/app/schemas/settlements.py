from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class SettlementCreate(BaseModel):
    project_id: str
    vendor_id: str
    milestone_type: str  # advance | interim | final
    requested_amount: float
    invoice_file_url: str | None = None


class TaxReviewBody(BaseModel):
    tax_review_status: str  # pending | passed | failed
    note: str | None = None


class ApproveBody(BaseModel):
    approved_amount: float
    payout_scheduled_date: date | None = None
    payment_note: str | None = None


class SettlementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    company_id: str
    project_id: str
    vendor_id: str
    milestone_type: str
    requested_amount: float
    approved_amount: float | None = None
    invoice_file: str | None = None
    tax_review_status: str
    status: str
    payout_scheduled_date: date | None = None
    payout_approved_by: str | None = None
    payout_approved_at: datetime | None = None
    reject_reason: str | None = None
