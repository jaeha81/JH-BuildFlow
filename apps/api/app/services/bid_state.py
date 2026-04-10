"""
발주 상태 머신 (PROMPT-07)

흐름도:
  draft → sent → read → accepted
                       → rejected
                       → on_hold
                       → expired  (마감 초과 + 미응답, lazy evaluation)

재발주 상태:
  rebid_candidate → rebid_pending_confirm → rebid_confirmed → rebid_sent
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import TYPE_CHECKING

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog, NotificationQueue, VendorScoreSnapshot
from app.models.base import new_uuid
from app.models.bid import BidRequest
from app.models.vendor import Vendor

if TYPE_CHECKING:
    from app.models.user import User

# 유효한 전이 맵
VALID_TRANSITIONS: dict[str, set[str]] = {
    "draft": {"sent"},
    "sent": {"read", "expired"},
    "read": {"accepted", "rejected", "on_hold", "expired"},
    "accepted": set(),
    "rejected": {"rebid_candidate"},
    "on_hold": {"rebid_candidate", "accepted", "rejected"},
    "expired": {"rebid_candidate"},
    "rebid_candidate": {"rebid_pending_confirm"},
    "rebid_pending_confirm": {"rebid_confirmed", "rebid_candidate"},  # 취소 가능
    "rebid_confirmed": {"rebid_sent"},
    "rebid_sent": {"read", "accepted", "rejected", "on_hold", "expired"},
}


def validate_transition(current: str, next_: str) -> None:
    allowed = VALID_TRANSITIONS.get(current, set())
    if next_ not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"상태 전이 불가: {current} → {next_}",
        )


async def mark_expired_lazy(
    db: AsyncSession, bids: list[BidRequest]
) -> list[BidRequest]:
    """조회 시점에 expired 자동 전환 (쿼리 기반 lazy evaluation)."""
    now = datetime.now(timezone.utc)
    changed = []
    for bid in bids:
        if (
            bid.deadline
            and bid.deadline < now
            and bid.response_status in ("pending", "sent", "read")
        ):
            bid.response_status = "expired"
            changed.append(bid)
    if changed:
        await db.commit()
    return bids


async def confirm_rebid(
    db: AsyncSession,
    bid: BidRequest,
    actor: "User",
    request=None,
) -> BidRequest:
    """관리자 확인 완료 → rebid_confirmed."""
    validate_transition(bid.response_status, "rebid_confirmed")
    from app.core.audit import write_audit
    before = {"response_status": bid.response_status}
    bid.response_status = "rebid_confirmed"
    await write_audit(
        db,
        company_id=bid.company_id,
        actor_id=actor.id,
        actor_role=actor.role,
        action="bid.rebid_confirmed",
        target_type="BidRequest",
        target_id=bid.id,
        before=before,
        after={"response_status": "rebid_confirmed"},
        request=request,
    )
    await db.commit()
    await db.refresh(bid)
    return bid


async def send_rebid(
    db: AsyncSession,
    original_bid: BidRequest,
    new_vendor_id: str,
    actor: "User",
    deadline: datetime | None = None,
    request=None,
) -> BidRequest:
    """재발주 발송 (rebid_confirmed 후에만 가능)."""
    if original_bid.response_status != "rebid_confirmed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="rebid_confirmed 상태에서만 재발주 발송이 가능합니다.",
        )
    from app.core.audit import write_audit
    now = datetime.now(timezone.utc)
    new_bid = BidRequest(
        id=new_uuid(),
        company_id=original_bid.company_id,
        project_id=original_bid.project_id,
        process_package_id=original_bid.process_package_id,
        vendor_id=new_vendor_id,
        sent_at=now,
        deadline=deadline or original_bid.deadline,
        response_status="rebid_sent",
    )
    db.add(new_bid)
    original_bid.response_status = "rebid_sent"

    await write_audit(
        db,
        company_id=original_bid.company_id,
        actor_id=actor.id,
        actor_role=actor.role,
        action="bid.rebid_sent",
        target_type="BidRequest",
        target_id=new_bid.id,
        after={
            "original_bid_id": original_bid.id,
            "new_vendor_id": new_vendor_id,
        },
        request=request,
    )
    await db.commit()
    await db.refresh(new_bid)
    return new_bid


async def get_rebid_candidates(
    db: AsyncSession,
    process_package_id: str,
    company_id: str,
    top_n: int = 5,
) -> list[dict]:
    """
    차순위 업체 추천 로직:
    score = VendorScoreSnapshot.score × 0.6
          + 지역_매칭 × 0.2
          + 최근_90일_참여율 × 0.2
    """
    vendor_result = await db.execute(
        select(Vendor).where(
            Vendor.company_id == company_id,
            Vendor.deleted_at.is_(None),
            Vendor.is_active == True,  # noqa: E712
        )
    )
    vendors = list(vendor_result.scalars())

    # 이미 발주된 업체 ID 목록
    existing_result = await db.execute(
        select(BidRequest.vendor_id).where(
            BidRequest.process_package_id == process_package_id,
            BidRequest.deleted_at.is_(None),
        )
    )
    already_sent = {row[0] for row in existing_result}

    candidates = []
    for vendor in vendors:
        if vendor.id in already_sent:
            continue

        # 최신 score snapshot
        snap_result = await db.execute(
            select(VendorScoreSnapshot)
            .where(VendorScoreSnapshot.vendor_id == vendor.id)
            .order_by(VendorScoreSnapshot.created_at.desc())
            .limit(1)
        )
        snap = snap_result.scalar_one_or_none()

        base_score = float(snap.score or 0) if snap else 0.5
        participation_rate = float(snap.participation_rate or 0) if snap else 0.5

        # score 계산
        computed = base_score * 0.6 + participation_rate * 0.2
        # 지역 매칭은 project의 site_address 기반이지만 간략화
        computed += 0.0  # 향후 지역 매칭 로직 추가

        candidates.append({
            "vendor_id": vendor.id,
            "company_name": vendor.company_name,
            "trade_types": vendor.trade_types,
            "score": round(computed, 3),
        })

    candidates.sort(key=lambda x: x["score"], reverse=True)
    return candidates[:top_n]


async def enqueue_unresponded_notifications(
    db: AsyncSession, company_id: str
) -> None:
    """48시간 경과 미응답 → NotificationQueue 적재."""
    now = datetime.now(timezone.utc)
    threshold_48h = now - timedelta(hours=48)
    result = await db.execute(
        select(BidRequest).where(
            BidRequest.company_id == company_id,
            BidRequest.response_status.in_(["sent", "read"]),
            BidRequest.sent_at <= threshold_48h,
            BidRequest.deleted_at.is_(None),
        )
    )
    bids = list(result.scalars())
    for bid in bids:
        db.add(NotificationQueue(
            id=new_uuid(),
            company_id=company_id,
            target_user_id=None,
            channel="push",
            title="발주 미응답 알림",
            body=f"발주 {bid.id}가 48시간 이상 미응답 상태입니다.",
        ))
    if bids:
        await db.commit()
