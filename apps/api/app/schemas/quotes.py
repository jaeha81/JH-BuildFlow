from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class LineItemIn(BaseModel):
    item_name: str
    unit: str
    quantity: float
    unit_price: float
    amount: float
    note: str | None = None


class QuoteSubmit(BaseModel):
    bid_request_id: str
    submission_type: str  # template | pdf | excel | hwp
    line_items: list[LineItemIn] = []


class NormalizeBody(BaseModel):
    line_items: list[LineItemIn]
    parsed_total: float


class QuoteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    vendor_id: str
    project_id: str
    bid_request_id: str
    file_url: str | None = None
    file_name: str | None = None
    parsed_total: float | None = None
    parse_status: str
    manual_review_required: bool
    submission_type: str
