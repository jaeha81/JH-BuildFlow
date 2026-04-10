from __future__ import annotations

from datetime import date
from typing import Any

from pydantic import BaseModel, ConfigDict


class ProjectCreate(BaseModel):
    name: str
    site_address: str | None = None
    client_name: str | None = None
    industry_template: str | None = None
    contract_amount: float | None = None
    estimated_budget: float | None = None
    start_date: date | None = None
    end_date: date | None = None
    notes: str | None = None
    site_info: dict[str, Any] = {}


class ProjectUpdate(BaseModel):
    name: str | None = None
    site_address: str | None = None
    client_name: str | None = None
    status: str | None = None
    contract_amount: float | None = None
    estimated_budget: float | None = None
    start_date: date | None = None
    end_date: date | None = None
    notes: str | None = None


class ProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    company_id: str
    name: str
    site_address: str | None = None
    client_name: str | None = None
    industry_template: str | None = None
    contract_amount: float | None = None
    estimated_budget: float | None = None
    start_date: date | None = None
    end_date: date | None = None
    status: str
    notes: str | None = None


class PackageCreate(BaseModel):
    trade_type: str
    budget_allocated: float | None = None
    schedule: dict[str, Any] = {}


class PackageUpdate(BaseModel):
    budget_allocated: float | None = None
    status: str | None = None
    schedule: dict[str, Any] | None = None


class PackageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    project_id: str
    trade_type: str
    budget_allocated: float | None = None
    status: str


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    project_id: str
    doc_type: str
    file_url: str
    file_name: str
    version: int
    is_internal: bool
    folder_key: str | None = None
