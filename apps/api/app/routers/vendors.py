"""협력사 관리 API."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import write_audit
from app.core.database import get_db
from app.dependencies.auth import get_current_user, require_roles
from app.models.audit import VendorScoreSnapshot
from app.models.base import new_uuid
from app.models.vendor import Vendor
from app.models.user import User
from app.schemas.vendors import VendorCreate, VendorResponse, VendorScoreResponse, VendorUpdate

router = APIRouter(prefix="/vendors", tags=["vendors"])


@router.get("", response_model=list[VendorResponse])
async def list_vendors(
    trade_type: str | None = None,
    region: str | None = None,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[VendorResponse]:
    q = select(Vendor).where(
        Vendor.company_id == current_user.company_id,
        Vendor.deleted_at.is_(None),
    )
    result = await db.execute(q.offset(skip).limit(limit))
    vendors = list(result.scalars())
    if trade_type:
        vendors = [v for v in vendors if trade_type in (v.trade_types or [])]
    if region:
        vendors = [v for v in vendors if region in (v.regions or [])]
    return [VendorResponse.model_validate(v) for v in vendors]


@router.post("", response_model=VendorResponse, status_code=status.HTTP_201_CREATED)
async def create_vendor(
    body: VendorCreate,
    request: Request,
    current_user: User = Depends(require_roles("super_admin", "sub_admin")),
    db: AsyncSession = Depends(get_db),
) -> VendorResponse:
    vendor = Vendor(
        id=new_uuid(),
        company_id=current_user.company_id,
        **body.model_dump(),
    )
    db.add(vendor)
    await write_audit(
        db,
        company_id=current_user.company_id,
        actor_id=current_user.id,
        actor_role=current_user.role,
        action="vendor.create",
        target_type="Vendor",
        target_id=vendor.id,
        after=body.model_dump(),
        request=request,
    )
    await db.commit()
    await db.refresh(vendor)
    return VendorResponse.model_validate(vendor)


@router.get("/me", response_model=VendorResponse)
async def my_vendor(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> VendorResponse:
    """협력사 사용자가 자신의 업체 정보 조회."""
    result = await db.execute(
        select(Vendor).where(Vendor.email == current_user.email, Vendor.deleted_at.is_(None))
    )
    vendor = result.scalar_one_or_none()
    if not vendor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="협력사 정보를 찾을 수 없습니다.")
    return VendorResponse.model_validate(vendor)


@router.get("/{vendor_id}", response_model=VendorResponse)
async def get_vendor(
    vendor_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> VendorResponse:
    vendor = await _get_vendor_or_404(db, vendor_id, current_user.company_id)
    return VendorResponse.model_validate(vendor)


@router.put("/{vendor_id}", response_model=VendorResponse)
async def update_vendor(
    vendor_id: str,
    body: VendorUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> VendorResponse:
    vendor = await _get_vendor_or_404(db, vendor_id, current_user.company_id)
    before = VendorResponse.model_validate(vendor).model_dump()
    for field, val in body.model_dump(exclude_none=True).items():
        setattr(vendor, field, val)
    await write_audit(
        db,
        company_id=current_user.company_id,
        actor_id=current_user.id,
        actor_role=current_user.role,
        action="vendor.update",
        target_type="Vendor",
        target_id=vendor_id,
        before=before,
        after=body.model_dump(exclude_none=True),
        request=request,
    )
    await db.commit()
    await db.refresh(vendor)
    return VendorResponse.model_validate(vendor)


@router.post("/register", response_model=VendorResponse, status_code=status.HTTP_201_CREATED)
async def register_vendor(
    body: VendorCreate,
    db: AsyncSession = Depends(get_db),
) -> VendorResponse:
    """협력사 자체 등록 (인증 불필요, company_id는 기본값)."""
    result = await db.execute(select(Vendor).where(Vendor.email == body.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="이미 등록된 이메일입니다.")
    # 기본 회사 사용 (vendor_web 전용)
    from app.models.company import Company
    company_result = await db.execute(select(Company).limit(1))
    company = company_result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="등록된 회사가 없습니다.")
    vendor = Vendor(id=new_uuid(), company_id=company.id, **body.model_dump())
    db.add(vendor)
    await db.commit()
    await db.refresh(vendor)
    return VendorResponse.model_validate(vendor)


@router.get("/{vendor_id}/score", response_model=list[VendorScoreResponse])
async def get_vendor_score(
    vendor_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[VendorScoreResponse]:
    await _get_vendor_or_404(db, vendor_id, current_user.company_id)
    result = await db.execute(
        select(VendorScoreSnapshot)
        .where(VendorScoreSnapshot.vendor_id == vendor_id)
        .order_by(VendorScoreSnapshot.created_at.desc())
        .limit(12)
    )
    return [VendorScoreResponse.model_validate(s) for s in result.scalars()]


async def _get_vendor_or_404(db: AsyncSession, vendor_id: str, company_id: str) -> Vendor:
    result = await db.execute(
        select(Vendor).where(
            Vendor.id == vendor_id,
            Vendor.company_id == company_id,
            Vendor.deleted_at.is_(None),
        )
    )
    vendor = result.scalar_one_or_none()
    if not vendor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="협력사를 찾을 수 없습니다.")
    return vendor
