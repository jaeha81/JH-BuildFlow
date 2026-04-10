"""발주 요청 API (상태 머신은 PROMPT-07에서 확장)."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import write_audit
from app.core.database import get_db
from app.dependencies.auth import get_current_user, require_roles
from app.models.base import new_uuid
from app.models.bid import BidPackage, BidRequest
from app.models.project import ProcessPackage
from app.models.user import User
from app.schemas.bids import BidRequestCreate, BidRequestResponse, RespondBody

router = APIRouter(prefix="/bid-requests", tags=["bids"])

ADMIN_ROLES = ("super_admin", "sub_admin", "site_manager")


@router.post("", response_model=list[BidRequestResponse], status_code=status.HTTP_201_CREATED)
async def create_bid_requests(
    body: BidRequestCreate,
    request: Request,
    current_user: User = Depends(require_roles(*ADMIN_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> list[BidRequestResponse]:
    """공종별 다수 업체에 일괄 발주."""
    pkg_result = await db.execute(
        select(ProcessPackage).where(
            ProcessPackage.id == body.process_package_id,
            ProcessPackage.company_id == current_user.company_id,
            ProcessPackage.deleted_at.is_(None),
        )
    )
    pkg = pkg_result.scalar_one_or_none()
    if not pkg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="공종 패키지를 찾을 수 없습니다.")

    now = datetime.now(timezone.utc)
    created: list[BidRequest] = []

    for vendor_id in body.vendor_ids:
        bid = BidRequest(
            id=new_uuid(),
            company_id=current_user.company_id,
            project_id=pkg.project_id,
            process_package_id=pkg.id,
            vendor_id=vendor_id,
            sent_at=now,
            deadline=body.deadline,
            response_status="pending",
        )
        db.add(bid)
        created.append(bid)

        if body.instructions or body.document_urls:
            bid_pkg = BidPackage(
                id=new_uuid(),
                company_id=current_user.company_id,
                bid_request_id=bid.id,
                documents=body.document_urls,
                instructions=body.instructions,
            )
            db.add(bid_pkg)

        await write_audit(
            db,
            company_id=current_user.company_id,
            actor_id=current_user.id,
            actor_role=current_user.role,
            action="bid.create",
            target_type="BidRequest",
            target_id=bid.id,
            after={"vendor_id": vendor_id, "process_package_id": pkg.id},
            request=request,
        )

    await db.commit()
    for bid in created:
        await db.refresh(bid)
    return [BidRequestResponse.model_validate(b) for b in created]


@router.get("", response_model=list[BidRequestResponse])
async def list_bid_requests(
    project_id: str | None = None,
    vendor_id: str | None = None,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[BidRequestResponse]:
    q = select(BidRequest).where(
        BidRequest.company_id == current_user.company_id,
        BidRequest.deleted_at.is_(None),
    )
    if project_id:
        q = q.where(BidRequest.project_id == project_id)
    if vendor_id:
        q = q.where(BidRequest.vendor_id == vendor_id)
    result = await db.execute(q.offset(skip).limit(limit))
    bids = list(result.scalars())
    # Lazy expiry evaluation
    now = datetime.now(timezone.utc)
    changed = False
    for bid in bids:
        if bid.deadline and bid.deadline < now and bid.response_status == "pending":
            bid.response_status = "expired"
            changed = True
    if changed:
        await db.commit()
    return [BidRequestResponse.model_validate(b) for b in bids]


@router.get("/mine", response_model=list[BidRequestResponse])
async def my_bid_requests(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[BidRequestResponse]:
    """협력사 사용자의 발주 수신함."""
    from app.models.vendor import Vendor
    vendor_result = await db.execute(
        select(Vendor).where(Vendor.email == current_user.email, Vendor.deleted_at.is_(None))
    )
    vendor = vendor_result.scalar_one_or_none()
    if not vendor:
        return []

    q = select(BidRequest).where(
        BidRequest.vendor_id == vendor.id,
        BidRequest.deleted_at.is_(None),
    )
    result = await db.execute(q)
    bids = list(result.scalars())
    # Lazy expiry
    now = datetime.now(timezone.utc)
    for bid in bids:
        if bid.deadline and bid.deadline < now and bid.response_status == "pending":
            bid.response_status = "expired"
    await db.commit()
    return [BidRequestResponse.model_validate(b) for b in bids]


@router.get("/{bid_id}", response_model=BidRequestResponse)
async def get_bid_request(
    bid_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> BidRequestResponse:
    bid = await _get_bid_or_404(db, bid_id)
    return BidRequestResponse.model_validate(bid)


@router.put("/{bid_id}/respond", response_model=BidRequestResponse)
async def respond_to_bid(
    bid_id: str,
    body: RespondBody,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> BidRequestResponse:
    bid = await _get_bid_or_404(db, bid_id)
    valid_statuses = {"accepted", "rejected", "on_hold"}
    if body.status not in valid_statuses:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"유효하지 않은 상태: {body.status}")
    before = {"response_status": bid.response_status}
    bid.response_status = body.status
    bid.response_reason = body.reason
    await write_audit(
        db,
        company_id=bid.company_id,
        actor_id=current_user.id,
        actor_role=current_user.role,
        action="bid.respond",
        target_type="BidRequest",
        target_id=bid_id,
        before=before,
        after={"response_status": body.status, "reason": body.reason},
        request=request,
    )
    await db.commit()
    await db.refresh(bid)
    return BidRequestResponse.model_validate(bid)


@router.put("/{bid_id}/mark-read", response_model=BidRequestResponse)
async def mark_bid_read(
    bid_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> BidRequestResponse:
    bid = await _get_bid_or_404(db, bid_id)
    if not bid.read_at:
        bid.read_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(bid)
    return BidRequestResponse.model_validate(bid)


@router.post("/{bid_id}/rebid", response_model=BidRequestResponse)
async def request_rebid(
    bid_id: str,
    request: Request,
    current_user: User = Depends(require_roles(*ADMIN_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> BidRequestResponse:
    """재발주 요청 (관리자 확인 대기 상태로 전환)."""
    bid = await _get_bid_or_404(db, bid_id)
    before = {"response_status": bid.response_status}
    bid.response_status = "rebid_pending_confirm"
    await write_audit(
        db,
        company_id=bid.company_id,
        actor_id=current_user.id,
        actor_role=current_user.role,
        action="bid.rebid_requested",
        target_type="BidRequest",
        target_id=bid_id,
        before=before,
        after={"response_status": "rebid_pending_confirm"},
        request=request,
    )
    await db.commit()
    await db.refresh(bid)
    return BidRequestResponse.model_validate(bid)


async def _get_bid_or_404(db: AsyncSession, bid_id: str) -> BidRequest:
    result = await db.execute(
        select(BidRequest).where(BidRequest.id == bid_id, BidRequest.deleted_at.is_(None))
    )
    bid = result.scalar_one_or_none()
    if not bid:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="발주를 찾을 수 없습니다.")
    return bid
