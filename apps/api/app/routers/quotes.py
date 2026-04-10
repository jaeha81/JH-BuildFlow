"""견적 API."""
from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import write_audit
from app.core.database import get_db
from app.core.upload import save_upload
from app.dependencies.auth import get_current_user, require_roles
from app.models.base import new_uuid
from app.models.bid import BidRequest
from app.models.quote import Quote, QuoteLineNormalized
from app.models.user import User
from app.schemas.quotes import NormalizeBody, QuoteResponse, QuoteSubmit

router = APIRouter(prefix="/quotes", tags=["quotes"])

ADMIN_ROLES = ("super_admin", "sub_admin", "site_manager")


@router.post("", response_model=QuoteResponse, status_code=status.HTTP_201_CREATED)
async def submit_quote(
    body: QuoteSubmit,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> QuoteResponse:
    """견적 제출 (직접 입력 또는 파일 업로드 후 별도 file-upload 엔드포인트 사용)."""
    bid_result = await db.execute(
        select(BidRequest).where(
            BidRequest.id == body.bid_request_id,
            BidRequest.deleted_at.is_(None),
        )
    )
    bid = bid_result.scalar_one_or_none()
    if not bid:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="발주를 찾을 수 없습니다.")

    line_items_data = [item.model_dump() for item in body.line_items]
    total = sum(item.amount for item in body.line_items) if body.line_items else None

    # HWP는 항상 manual_review
    is_hwp = body.submission_type == "hwp"
    parse_status = "manual_review" if is_hwp else ("success" if body.line_items else "pending")

    quote = Quote(
        id=new_uuid(),
        company_id=bid.company_id,
        vendor_id=bid.vendor_id,
        project_id=bid.project_id,
        bid_request_id=bid.id,
        parsed_total=total,
        line_items_json=line_items_data,
        parse_status=parse_status,
        manual_review_required=is_hwp,
        submission_type=body.submission_type,
    )
    db.add(quote)

    # 직접 입력이면 normalized lines 생성
    if body.submission_type == "template" and body.line_items:
        for idx, item in enumerate(body.line_items):
            db.add(QuoteLineNormalized(
                id=new_uuid(),
                quote_id=quote.id,
                item_name=item.item_name,
                unit=item.unit,
                quantity=item.quantity,
                unit_price=item.unit_price,
                amount=item.amount,
                sort_order=idx,
            ))

    await write_audit(
        db,
        company_id=bid.company_id,
        actor_id=current_user.id,
        actor_role=current_user.role,
        action="quote.submit",
        target_type="Quote",
        target_id=quote.id,
        after={"submission_type": body.submission_type, "total": total},
        request=request,
    )
    await db.commit()
    await db.refresh(quote)
    return QuoteResponse.model_validate(quote)


@router.post("/upload-file", response_model=QuoteResponse, status_code=status.HTTP_201_CREATED)
async def upload_quote_file(
    bid_request_id: str,
    submission_type: str,
    file: UploadFile = File(...),
    request: Request = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> QuoteResponse:
    """견적 파일 업로드."""
    bid_result = await db.execute(
        select(BidRequest).where(
            BidRequest.id == bid_request_id,
            BidRequest.deleted_at.is_(None),
        )
    )
    bid = bid_result.scalar_one_or_none()
    if not bid:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="발주를 찾을 수 없습니다.")

    file_url, file_name = await save_upload(file, base_dir="uploads/quotes")
    is_hwp = submission_type == "hwp"

    quote = Quote(
        id=new_uuid(),
        company_id=bid.company_id,
        vendor_id=bid.vendor_id,
        project_id=bid.project_id,
        bid_request_id=bid.id,
        file_url=file_url,
        file_name=file_name,
        parse_status="manual_review" if is_hwp else "pending",
        manual_review_required=is_hwp,
        submission_type=submission_type,
    )
    db.add(quote)
    await write_audit(
        db,
        company_id=bid.company_id,
        actor_id=current_user.id,
        actor_role=current_user.role,
        action="quote.upload",
        target_type="Quote",
        target_id=quote.id,
        after={"file_name": file_name, "submission_type": submission_type},
        request=request,
    )
    await db.commit()
    await db.refresh(quote)
    return QuoteResponse.model_validate(quote)


@router.get("", response_model=list[QuoteResponse])
async def list_quotes(
    project_id: str | None = None,
    vendor_id: str | None = None,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[QuoteResponse]:
    q = select(Quote).where(
        Quote.company_id == current_user.company_id,
        Quote.deleted_at.is_(None),
    )
    if project_id:
        q = q.where(Quote.project_id == project_id)
    if vendor_id:
        q = q.where(Quote.vendor_id == vendor_id)
    result = await db.execute(q.offset(skip).limit(limit))
    return [QuoteResponse.model_validate(qt) for qt in result.scalars()]


@router.get("/manual-review-queue", response_model=list[QuoteResponse])
async def manual_review_queue(
    current_user: User = Depends(require_roles(*ADMIN_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> list[QuoteResponse]:
    result = await db.execute(
        select(Quote).where(
            Quote.company_id == current_user.company_id,
            Quote.manual_review_required == True,  # noqa: E712
            Quote.deleted_at.is_(None),
        )
    )
    return [QuoteResponse.model_validate(qt) for qt in result.scalars()]


@router.get("/compare")
async def compare_quotes(
    project_id: str,
    process_package_id: str,
    current_user: User = Depends(require_roles(*ADMIN_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """공종별 업체 견적 비교."""
    from app.models.bid import BidRequest as BR
    bid_result = await db.execute(
        select(BR).where(
            BR.project_id == project_id,
            BR.process_package_id == process_package_id,
            BR.company_id == current_user.company_id,
            BR.deleted_at.is_(None),
        )
    )
    bids = list(bid_result.scalars())
    bid_ids = [b.id for b in bids]

    if not bid_ids:
        return []

    quote_result = await db.execute(
        select(Quote).where(
            Quote.bid_request_id.in_(bid_ids),
            Quote.deleted_at.is_(None),
        )
    )
    quotes = list(quote_result.scalars())
    return [
        {
            "quote_id": q.id,
            "vendor_id": q.vendor_id,
            "parsed_total": q.parsed_total,
            "parse_status": q.parse_status,
            "submission_type": q.submission_type,
        }
        for q in quotes
    ]


@router.get("/{quote_id}", response_model=QuoteResponse)
async def get_quote(
    quote_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> QuoteResponse:
    quote = await _get_quote_or_404(db, quote_id)
    return QuoteResponse.model_validate(quote)


@router.put("/{quote_id}/normalize", response_model=QuoteResponse)
async def normalize_quote(
    quote_id: str,
    body: NormalizeBody,
    request: Request,
    current_user: User = Depends(require_roles(*ADMIN_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> QuoteResponse:
    """수동 보정 + QuoteLineNormalized 저장."""
    quote = await _get_quote_or_404(db, quote_id)

    # 기존 normalized lines 삭제
    existing = await db.execute(
        select(QuoteLineNormalized).where(QuoteLineNormalized.quote_id == quote_id)
    )
    for line in existing.scalars():
        await db.delete(line)

    for idx, item in enumerate(body.line_items):
        db.add(QuoteLineNormalized(
            id=new_uuid(),
            quote_id=quote_id,
            item_name=item.item_name,
            unit=item.unit,
            quantity=item.quantity,
            unit_price=item.unit_price,
            amount=item.amount,
            sort_order=idx,
        ))

    quote.parsed_total = body.parsed_total
    quote.parse_status = "success"
    quote.manual_review_required = False
    quote.line_items_json = [item.model_dump() for item in body.line_items]

    await write_audit(
        db,
        company_id=quote.company_id,
        actor_id=current_user.id,
        actor_role=current_user.role,
        action="quote.normalize",
        target_type="Quote",
        target_id=quote_id,
        after={"parsed_total": body.parsed_total},
        request=request,
    )
    await db.commit()
    await db.refresh(quote)
    return QuoteResponse.model_validate(quote)


async def _get_quote_or_404(db: AsyncSession, quote_id: str) -> Quote:
    result = await db.execute(
        select(Quote).where(Quote.id == quote_id, Quote.deleted_at.is_(None))
    )
    quote = result.scalar_one_or_none()
    if not quote:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="견적을 찾을 수 없습니다.")
    return quote
