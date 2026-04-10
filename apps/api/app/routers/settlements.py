"""정산 API — 자동 지급 절대 금지, 모든 지급은 인간 승인 필수."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import extract, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import write_audit
from app.core.database import get_db
from app.dependencies.auth import get_current_user, require_roles
from app.models.base import new_uuid
from app.models.settlement import Settlement
from app.models.user import User
from app.schemas.settlements import (
    ApproveBody,
    SettlementCreate,
    SettlementResponse,
    TaxReviewBody,
)

router = APIRouter(prefix="/settlements", tags=["settlements"])

ADMIN_ROLES = ("super_admin", "sub_admin", "site_manager", "accounting")


@router.get("", response_model=list[SettlementResponse])
async def list_settlements(
    project_id: str | None = None,
    vendor_id: str | None = None,
    current_user: User = Depends(require_roles(*ADMIN_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> list[SettlementResponse]:
    q = select(Settlement).where(
        Settlement.company_id == current_user.company_id,
        Settlement.deleted_at.is_(None),
    )
    if project_id:
        q = q.where(Settlement.project_id == project_id)
    if vendor_id:
        q = q.where(Settlement.vendor_id == vendor_id)
    result = await db.execute(q)
    return [SettlementResponse.model_validate(s) for s in result.scalars()]


@router.post("", response_model=SettlementResponse, status_code=status.HTTP_201_CREATED)
async def create_settlement(
    body: SettlementCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SettlementResponse:
    """협력사: 계산서 업로드 + 청구 금액 입력 → requested 상태."""
    settlement = Settlement(
        id=new_uuid(),
        company_id=current_user.company_id,
        project_id=body.project_id,
        vendor_id=body.vendor_id,
        milestone_type=body.milestone_type,
        requested_amount=body.requested_amount,
        invoice_file=body.invoice_file_url,
        status="requested",
        tax_review_status="pending",
    )
    db.add(settlement)
    await write_audit(
        db,
        company_id=current_user.company_id,
        actor_id=current_user.id,
        actor_role=current_user.role,
        action="settlement.create",
        target_type="Settlement",
        target_id=settlement.id,
        after=body.model_dump(),
        request=request,
    )
    await db.commit()
    await db.refresh(settlement)
    return SettlementResponse.model_validate(settlement)


@router.get("/pending-approval", response_model=list[SettlementResponse])
async def pending_approval(
    current_user: User = Depends(require_roles("super_admin", "sub_admin", "accounting")),
    db: AsyncSession = Depends(get_db),
) -> list[SettlementResponse]:
    result = await db.execute(
        select(Settlement).where(
            Settlement.company_id == current_user.company_id,
            Settlement.status == "pending_approval",
            Settlement.deleted_at.is_(None),
        ).order_by(Settlement.created_at.asc())
    )
    return [SettlementResponse.model_validate(s) for s in result.scalars()]


@router.get("/calendar")
async def calendar_data(
    year: int,
    month: int,
    current_user: User = Depends(require_roles(*ADMIN_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """월별 지급 예정 캘린더 데이터."""
    result = await db.execute(
        select(Settlement).where(
            Settlement.company_id == current_user.company_id,
            Settlement.payout_scheduled_date.is_not(None),
            extract("year", Settlement.payout_scheduled_date) == year,
            extract("month", Settlement.payout_scheduled_date) == month,
            Settlement.deleted_at.is_(None),
        )
    )
    settlements = list(result.scalars())
    return [
        {
            "date": str(s.payout_scheduled_date),
            "settlement_id": s.id,
            "vendor_id": s.vendor_id,
            "approved_amount": s.approved_amount,
            "milestone_type": s.milestone_type,
            "status": s.status,
        }
        for s in settlements
    ]


@router.get("/{settlement_id}", response_model=SettlementResponse)
async def get_settlement(
    settlement_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SettlementResponse:
    s = await _get_settlement_or_404(db, settlement_id, current_user.company_id)
    return SettlementResponse.model_validate(s)


@router.put("/{settlement_id}/tax-review", response_model=SettlementResponse)
async def tax_review(
    settlement_id: str,
    body: TaxReviewBody,
    request: Request,
    current_user: User = Depends(require_roles("accounting", "super_admin", "sub_admin")),
    db: AsyncSession = Depends(get_db),
) -> SettlementResponse:
    """세무/회계 검토."""
    s = await _get_settlement_or_404(db, settlement_id, current_user.company_id)
    before = {"tax_review_status": s.tax_review_status, "status": s.status}
    s.tax_review_status = body.tax_review_status
    if body.tax_review_status == "passed":
        s.status = "pending_approval"
    await write_audit(
        db,
        company_id=current_user.company_id,
        actor_id=current_user.id,
        actor_role=current_user.role,
        action="settlement.tax_review",
        target_type="Settlement",
        target_id=settlement_id,
        before=before,
        after=body.model_dump(),
        request=request,
    )
    await db.commit()
    await db.refresh(s)
    return SettlementResponse.model_validate(s)


@router.put("/{settlement_id}/approve", response_model=SettlementResponse)
async def approve_settlement(
    settlement_id: str,
    body: ApproveBody,
    request: Request,
    # 실제 이체 없음, super_admin만 승인 가능
    current_user: User = Depends(require_roles("super_admin")),
    db: AsyncSession = Depends(get_db),
) -> SettlementResponse:
    """최고관리자 승인 — 자동 이체 없음, 외부 수동 처리."""
    s = await _get_settlement_or_404(db, settlement_id, current_user.company_id)
    if s.status != "pending_approval":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"현재 상태 '{s.status}'에서 승인할 수 없습니다.",
        )
    before = {"status": s.status, "approved_amount": s.approved_amount}
    s.approved_amount = body.approved_amount
    s.payout_scheduled_date = body.payout_scheduled_date
    s.payout_approved_by = current_user.id
    s.payout_approved_at = datetime.now(timezone.utc)
    s.status = "approved"
    await write_audit(
        db,
        company_id=current_user.company_id,
        actor_id=current_user.id,
        actor_role=current_user.role,
        action="settlement.approve",
        target_type="Settlement",
        target_id=settlement_id,
        before=before,
        after={"approved_amount": body.approved_amount, "status": "approved"},
        request=request,
    )
    await db.commit()
    await db.refresh(s)
    return SettlementResponse.model_validate(s)


async def _get_settlement_or_404(
    db: AsyncSession, settlement_id: str, company_id: str
) -> Settlement:
    result = await db.execute(
        select(Settlement).where(
            Settlement.id == settlement_id,
            Settlement.company_id == company_id,
            Settlement.deleted_at.is_(None),
        )
    )
    s = result.scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="정산을 찾을 수 없습니다.")
    return s
