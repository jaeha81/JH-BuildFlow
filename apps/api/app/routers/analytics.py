"""분석 API."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import require_roles
from app.models.audit import VendorScoreSnapshot
from app.models.bid import BidRequest
from app.models.user import User
from app.models.vendor import Vendor

router = APIRouter(prefix="/analytics", tags=["analytics"])

ADMIN_ROLES = ("super_admin", "sub_admin", "site_manager")


@router.get("/vendor-scores")
async def vendor_scores(
    trade_type: str | None = None,
    region: str | None = None,
    current_user: User = Depends(require_roles(*ADMIN_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    q = (
        select(Vendor, VendorScoreSnapshot)
        .outerjoin(
            VendorScoreSnapshot,
            VendorScoreSnapshot.vendor_id == Vendor.id,
        )
        .where(Vendor.company_id == current_user.company_id, Vendor.deleted_at.is_(None))
    )
    result = await db.execute(q)
    rows = result.all()
    out = []
    for vendor, score in rows:
        if trade_type and trade_type not in (vendor.trade_types or []):
            continue
        if region and region not in (vendor.regions or []):
            continue
        out.append({
            "vendor_id": vendor.id,
            "company_name": vendor.company_name,
            "trade_types": vendor.trade_types,
            "regions": vendor.regions,
            "rating": vendor.rating,
            "score": score.score if score else None,
            "participation_rate": score.participation_rate if score else None,
        })
    return out


@router.get("/vendor/{vendor_id}/history")
async def vendor_score_history(
    vendor_id: str,
    current_user: User = Depends(require_roles(*ADMIN_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    result = await db.execute(
        select(VendorScoreSnapshot)
        .where(VendorScoreSnapshot.vendor_id == vendor_id)
        .order_by(VendorScoreSnapshot.created_at.desc())
        .limit(24)
    )
    snapshots = list(result.scalars())
    return [
        {
            "snapshot_id": s.id,
            "score": s.score,
            "participation_rate": s.participation_rate,
            "response_speed_avg": s.response_speed_avg,
            "win_rate": s.win_rate,
            "created_at": str(s.created_at),
        }
        for s in snapshots
    ]


@router.get("/low-response")
async def low_response_vendors(
    threshold: float = 0.3,
    current_user: User = Depends(require_roles(*ADMIN_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """미응답 비율이 높은 업체 목록."""
    # 업체별 발주 수 / 응답(미pending) 수 집계
    bid_result = await db.execute(
        select(
            BidRequest.vendor_id,
            func.count(BidRequest.id).label("total"),
            func.sum(
                func.cast(BidRequest.response_status != "pending", db.bind.dialect.type_descriptor(type(1)).__class__)
                if False else 1  # placeholder
            ).label("responded"),
        )
        .where(
            BidRequest.company_id == current_user.company_id,
            BidRequest.deleted_at.is_(None),
        )
        .group_by(BidRequest.vendor_id)
    )
    # Simplified: return vendors with recent unresponded bids
    bid_result2 = await db.execute(
        select(BidRequest.vendor_id, func.count(BidRequest.id).label("cnt"))
        .where(
            BidRequest.company_id == current_user.company_id,
            BidRequest.response_status == "expired",
            BidRequest.deleted_at.is_(None),
        )
        .group_by(BidRequest.vendor_id)
        .order_by(func.count(BidRequest.id).desc())
        .limit(20)
    )
    return [{"vendor_id": row.vendor_id, "expired_count": row.cnt} for row in bid_result2]


@router.get("/top-by-trade")
async def top_by_trade(
    current_user: User = Depends(require_roles(*ADMIN_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """공종별 상위 업체."""
    result = await db.execute(
        select(Vendor)
        .where(Vendor.company_id == current_user.company_id, Vendor.deleted_at.is_(None))
        .order_by(Vendor.rating.desc().nullslast())
        .limit(50)
    )
    vendors = list(result.scalars())
    by_trade: dict[str, list[dict]] = {}
    for v in vendors:
        for t in (v.trade_types or []):
            by_trade.setdefault(t, []).append({
                "vendor_id": v.id,
                "company_name": v.company_name,
                "rating": v.rating,
            })
    return [{"trade_type": k, "vendors": v[:5]} for k, v in by_trade.items()]


@router.get("/bid-stats")
async def bid_stats(
    current_user: User = Depends(require_roles(*ADMIN_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """발주 현황 통계."""
    result = await db.execute(
        select(BidRequest.response_status, func.count(BidRequest.id).label("cnt"))
        .where(BidRequest.company_id == current_user.company_id, BidRequest.deleted_at.is_(None))
        .group_by(BidRequest.response_status)
    )
    rows = result.all()
    stats: dict[str, int] = {row.response_status: row.cnt for row in rows}
    total = sum(stats.values())
    return {
        "total": total,
        "by_status": stats,
        "response_rate": round((stats.get("accepted", 0) + stats.get("rejected", 0) + stats.get("on_hold", 0)) / total, 3) if total else 0,
    }


@router.get("/chart-data")
async def chart_data(
    chart_type: str = "participation",
    current_user: User = Depends(require_roles(*ADMIN_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """차트용 데이터."""
    if chart_type == "participation":
        result = await db.execute(
            select(BidRequest.response_status, func.count(BidRequest.id).label("cnt"))
            .where(BidRequest.company_id == current_user.company_id, BidRequest.deleted_at.is_(None))
            .group_by(BidRequest.response_status)
        )
        return [{"label": row.response_status, "value": row.cnt} for row in result]
    elif chart_type == "score":
        result = await db.execute(
            select(VendorScoreSnapshot.vendor_id, func.avg(VendorScoreSnapshot.score).label("avg_score"))
            .group_by(VendorScoreSnapshot.vendor_id)
            .order_by(func.avg(VendorScoreSnapshot.score).desc())
            .limit(10)
        )
        return [{"vendor_id": row.vendor_id, "avg_score": row.avg_score} for row in result]
    else:
        return []
