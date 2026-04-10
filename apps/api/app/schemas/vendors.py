from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class VendorCreate(BaseModel):
    company_name: str
    representative_name: str | None = None
    email: str
    phone: str | None = None
    address: str | None = None
    business_number: str | None = None
    trade_types: list[str] = []
    regions: list[str] = []


class VendorUpdate(BaseModel):
    company_name: str | None = None
    representative_name: str | None = None
    phone: str | None = None
    address: str | None = None
    trade_types: list[str] | None = None
    regions: list[str] | None = None
    is_verified: bool | None = None


class VendorResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    company_id: str
    company_name: str
    representative_name: str | None = None
    email: str
    phone: str | None = None
    address: str | None = None
    business_number: str | None = None
    trade_types: list[str]
    regions: list[str]
    rating: float | None = None
    is_active: bool
    is_verified: bool


class VendorScoreResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    vendor_id: str
    score: float | None = None
    participation_rate: float | None = None
    response_speed_avg: float | None = None
    win_rate: float | None = None
    completion_rate: float | None = None
    complaint_count: int | None = None
