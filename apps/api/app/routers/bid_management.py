"""발주 상태 머신 전용 추가 API (PROMPT-07)."""
from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import require_roles
from app.models.bid import BidRequest
from app.models.user import User
from app.models.vendor import Vendor
from app.schemas.bids import BidRequestResponse
from app.services.bid_state import (
    confirm_rebid,
    enqueue_unresponded_notifications,
    get_rebid_candidates,
    mark_expired_lazy,
    send_rebid,
)

router = APIRouter(prefix="/bid-management", tags=["bid-management"])

ADMIN_ROLES = ("super_admin", "sub_admin", "site_manager")


@router.get("/response-status/{project_id}")
async def project_response_status(
    project_id: str,
    current_user: User = Depends(require_roles(*ADMIN_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """프로젝트 공종별 응답 현황 테이블 데이터.
    컬럼: 업체명 | 발송 시각 | 열람 여부 | 응답 상태 | 경과 시간(h)
    """
    from datetime import timezone
    now = datetime.now(timezone.utc)

    bid_result = await db.execute(
        select(BidRequest).where(
            BidRequest.project_id == project_id,
            BidRequest.company_id == current_user.company_id,
            BidRequest.deleted_at.is_(None),
        )
    )
    bids = list(bid_result.scalars())
    await mark_expired_lazy(db, bids)

    rows = []
    for bid in bids:
        vendor_result = await db.execute(select(Vendor).where(Vendor.id == bid.vendor_id))
        vendor = vendor_result.scalar_one_or_none()

        elapsed_h = None
        if bid.sent_at:
            sent_aware = bid.sent_at if bid.sent_at.tzinfo else bid.sent_at.replace(tzinfo=__import__("datetime").timezone.utc)
            elapsed_h = round((now - sent_aware).total_seconds() / 3600, 1)

        warning = elapsed_h is not None and elapsed_h >= 24 and bid.response_status in ("sent", "read", "pending")
        rows.append({
            "bid_id": bid.id,
            "vendor_id": bid.vendor_id,
            "company_name": vendor.company_name if vendor else "—",
            "sent_at": bid.sent_at.isoformat() if bid.sent_at else None,
            "read": bid.read_at is not None,
            "response_status": bid.response_status,
            "elapsed_hours": elapsed_h,
            "unresponded_warning": warning,
        })
    return rows


@router.get("/rebid-candidates/{process_package_id}")
async def rebid_candidates(
    process_package_id: str,
    top_n: int = 5,
    current_user: User = Depends(require_roles(*ADMIN_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    return await get_rebid_candidates(db, process_package_id, current_user.company_id, top_n)


@router.put("/bids/{bid_id}/confirm-rebid", response_model=BidRequestResponse)
async def confirm_rebid_endpoint(
    bid_id: str,
    request: Request,
    current_user: User = Depends(require_roles(*ADMIN_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> BidRequestResponse:
    result = await db.execute(select(BidRequest).where(BidRequest.id == bid_id))
    bid = result.scalar_one_or_none()
    bid = await confirm_rebid(db, bid, current_user, request)
    return BidRequestResponse.model_validate(bid)


@router.post("/bids/{bid_id}/send-rebid", response_model=BidRequestResponse)
async def send_rebid_endpoint(
    bid_id: str,
    new_vendor_id: str,
    request: Request,
    deadline: datetime | None = None,
    current_user: User = Depends(require_roles(*ADMIN_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> BidRequestResponse:
    result = await db.execute(select(BidRequest).where(BidRequest.id == bid_id))
    original = result.scalar_one_or_none()
    new_bid = await send_rebid(db, original, new_vendor_id, current_user, deadline, request)
    return BidRequestResponse.model_validate(new_bid)


@router.post("/notify-unresponded")
async def notify_unresponded(
    current_user: User = Depends(require_roles(*ADMIN_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> dict:
    await enqueue_unresponded_notifications(db, current_user.company_id)
    return {"status": "queued"}
