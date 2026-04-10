"""AuditLog 공통 헬퍼."""
from __future__ import annotations

from typing import Any

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog
from app.models.base import new_uuid

# 감사 로그에서 마스킹할 민감 필드
_SENSITIVE_FIELDS = {"phone", "business_no", "hashed_password", "password"}


def _mask(data: dict[str, Any] | None) -> dict[str, Any] | None:
    """민감 필드를 '***'으로 마스킹."""
    if not data:
        return data
    return {
        k: ("***" if k in _SENSITIVE_FIELDS else v)
        for k, v in data.items()
    }


async def write_audit(
    db: AsyncSession,
    *,
    company_id: str,
    actor_id: str,
    actor_role: str,
    action: str,
    target_type: str,
    target_id: str,
    before: dict[str, Any] | None = None,
    after: dict[str, Any] | None = None,
    request: Request | None = None,
) -> None:
    db.add(
        AuditLog(
            id=new_uuid(),
            company_id=company_id,
            actor_id=actor_id,
            actor_role=actor_role,
            action=action,
            target_type=target_type,
            target_id=target_id,
            before_json=_mask(before),
            after_json=_mask(after),
            ip_address=request.client.host if request and request.client else None,
            user_agent=request.headers.get("user-agent") if request else None,
        )
    )
