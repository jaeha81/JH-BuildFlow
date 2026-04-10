"""분석 API — PROMPT-11."""
from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import require_roles
from app.models.audit import VendorScoreSnapshot
from app.models.bid import BidRequest
from app.models.user import User
from app.models.vendor import Vendor
from app.services.vendor_score import compute_vendor_metrics, snapshot_all_vendors

router = APIRouter(prefix="/analytics", tags=["analytics"])

ADMIN_ROLES = ("super_admin", "sub_admin", "site_manager")


# ── 협력사 점수 목록 ──────────────────────────────────────
@router.get("/vendor-scores")
async def vendor_scores(
    trade_type: str | None = None,
    region: str | None = None,
    current_user: User = Depends(require_roles(*ADMIN_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """협력사 목록 + 최신 스냅샷 점수."""
    # 최신 스냅샷 1개씩 (subquery)
    latest_subq = (
        select(
            VendorScoreSnapshot.vendor_id,
            func.max(VendorScoreSnapshot.snapshot_date).label("latest_date"),
        )
        .group_by(VendorScoreSnapshot.vendor_id)
        .subquery()
    )
    q = (
        select(Vendor, VendorScoreSnapshot)
        .outerjoin(
            latest_subq, latest_subq.c.vendor_id == Vendor.id
        )
        .outerjoin(
            VendorScoreSnapshot,
            (VendorScoreSnapshot.vendor_id == Vendor.id)
            & (VendorScoreSnapshot.snapshot_date == latest_subq.c.latest_date),
        )
        .where(Vendor.company_id == current_user.company_id, Vendor.deleted_at.is_(None))
        .order_by(VendorScoreSnapshot.score.desc().nullslast())
    )
    result = await db.execute(q)
    rows = result.all()
    out = []
    for vendor, snap in rows:
        if trade_type and trade_type not in (vendor.trade_types or []):
            continue
        if region and region not in (vendor.regions or []):
            continue
        out.append({
            "vendor_id": vendor.id,
            "company_name": vendor.company_name,
            "trade_types": vendor.trade_types or [],
            "regions": vendor.regions or [],
            "rating": vendor.rating,
            "score": snap.score if snap else None,
            "participation_rate": snap.participation_rate if snap else None,
            "response_speed_avg": snap.response_speed_avg if snap else None,
            "win_rate": snap.win_rate if snap else None,
            "completion_rate": snap.completion_rate if snap else None,
            "snapshot_date": str(snap.snapshot_date) if snap else None,
        })
    return out


# ── 협력사 점수 이력 ──────────────────────────────────────
@router.get("/vendor/{vendor_id}/history")
async def vendor_score_history(
    vendor_id: str,
    current_user: User = Depends(require_roles(*ADMIN_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    result = await db.execute(
        select(VendorScoreSnapshot)
        .where(VendorScoreSnapshot.vendor_id == vendor_id)
        .order_by(VendorScoreSnapshot.snapshot_date.desc())
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
            "completion_rate": s.completion_rate,
            "snapshot_date": str(s.snapshot_date),
        }
        for s in snapshots
    ]


# ── 미응답 많은 업체 ──────────────────────────────────────
@router.get("/low-response")
async def low_response_vendors(
    current_user: User = Depends(require_roles(*ADMIN_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """최근 30일 내 expired/무응답 발주가 많은 업체 상위 20개."""
    from datetime import datetime, timedelta, timezone

    cutoff = datetime.now(tz=timezone.utc) - timedelta(days=30)
    result = await db.execute(
        select(
            BidRequest.vendor_id,
            func.count(BidRequest.id).label("expired_count"),
        )
        .where(
            BidRequest.company_id == current_user.company_id,
            BidRequest.response_status.in_(["expired", "pending"]),
            BidRequest.sent_at >= cutoff,
            BidRequest.deleted_at.is_(None),
        )
        .group_by(BidRequest.vendor_id)
        .order_by(func.count(BidRequest.id).desc())
        .limit(20)
    )
    rows = result.all()
    # 업체명 보완
    vendor_ids = [r.vendor_id for r in rows]
    vendor_result = await db.execute(
        select(Vendor.id, Vendor.company_name).where(Vendor.id.in_(vendor_ids))
    )
    vendor_map = {v.id: v.company_name for v in vendor_result}
    return [
        {
            "vendor_id": r.vendor_id,
            "company_name": vendor_map.get(r.vendor_id, "—"),
            "unresponded_count": r.expired_count,
        }
        for r in rows
    ]


# ── 공종별 상위 업체 ──────────────────────────────────────
@router.get("/top-by-trade")
async def top_by_trade(
    current_user: User = Depends(require_roles(*ADMIN_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """공종별 상위 5개 업체 (score 우선, 없으면 rating)."""
    latest_subq = (
        select(
            VendorScoreSnapshot.vendor_id,
            func.max(VendorScoreSnapshot.snapshot_date).label("latest_date"),
        )
        .group_by(VendorScoreSnapshot.vendor_id)
        .subquery()
    )
    result = await db.execute(
        select(Vendor, VendorScoreSnapshot)
        .outerjoin(latest_subq, latest_subq.c.vendor_id == Vendor.id)
        .outerjoin(
            VendorScoreSnapshot,
            (VendorScoreSnapshot.vendor_id == Vendor.id)
            & (VendorScoreSnapshot.snapshot_date == latest_subq.c.latest_date),
        )
        .where(Vendor.company_id == current_user.company_id, Vendor.deleted_at.is_(None))
    )
    rows = result.all()
    by_trade: dict[str, list[dict]] = {}
    for vendor, snap in rows:
        entry = {
            "vendor_id": vendor.id,
            "company_name": vendor.company_name,
            "score": snap.score if snap else None,
            "rating": vendor.rating,
        }
        for t in (vendor.trade_types or []):
            by_trade.setdefault(t, []).append(entry)
    # 각 공종 score 내림차순 정렬 후 상위 5개
    return [
        {
            "trade_type": k,
            "vendors": sorted(v, key=lambda x: (x["score"] or 0), reverse=True)[:5],
        }
        for k, v in by_trade.items()
    ]


# ── 발주 현황 통계 ─────────────────────────────────────────
@router.get("/bid-stats")
async def bid_stats(
    current_user: User = Depends(require_roles(*ADMIN_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(
        select(BidRequest.response_status, func.count(BidRequest.id).label("cnt"))
        .where(BidRequest.company_id == current_user.company_id, BidRequest.deleted_at.is_(None))
        .group_by(BidRequest.response_status)
    )
    rows = result.all()
    stats: dict[str, int] = {row.response_status: row.cnt for row in rows}
    total = sum(stats.values())
    responded = stats.get("accepted", 0) + stats.get("rejected", 0) + stats.get("on_hold", 0)
    return {
        "total": total,
        "by_status": stats,
        "response_rate": round(responded / total, 3) if total else 0,
    }


# ── 차트용 시계열 데이터 ──────────────────────────────────
@router.get("/chart-data")
async def chart_data(
    type: str = "participation",  # participation | score
    vendor_id: str | None = None,
    period: str = "3m",  # 3m | 6m | 12m
    current_user: User = Depends(require_roles(*ADMIN_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    from datetime import datetime, timedelta, timezone

    period_days = {"3m": 90, "6m": 180, "12m": 365}.get(period, 90)
    cutoff = datetime.now(tz=timezone.utc) - timedelta(days=period_days)

    if type == "participation":
        result = await db.execute(
            select(BidRequest.response_status, func.count(BidRequest.id).label("cnt"))
            .where(
                BidRequest.company_id == current_user.company_id,
                BidRequest.created_at >= cutoff,
                BidRequest.deleted_at.is_(None),
            )
            .group_by(BidRequest.response_status)
        )
        return [{"label": row.response_status, "value": row.cnt} for row in result]

    elif type == "score":
        q = (
            select(
                VendorScoreSnapshot.vendor_id,
                VendorScoreSnapshot.snapshot_date,
                VendorScoreSnapshot.score,
            )
            .where(VendorScoreSnapshot.snapshot_date >= cutoff)
            .order_by(VendorScoreSnapshot.snapshot_date.asc())
        )
        if vendor_id:
            q = q.where(VendorScoreSnapshot.vendor_id == vendor_id)
        else:
            q = q.limit(200)
        result = await db.execute(q)
        return [
            {
                "vendor_id": row.vendor_id,
                "date": str(row.snapshot_date)[:10],
                "score": row.score,
            }
            for row in result
        ]

    return []


# ── 스냅샷 수동 실행 ──────────────────────────────────────
@router.post("/compute-snapshots")
async def compute_snapshots(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_roles("super_admin", "sub_admin")),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """협력사 전체 점수 스냅샷 즉시 계산 (백그라운드)."""
    count = await snapshot_all_vendors(current_user.company_id, db)
    return {"message": f"{count}개 협력사 스냅샷 생성 완료"}


# ── 차기 발주 추천 ─────────────────────────────────────────
@router.get("/recommend-vendors/{package_id}")
async def recommend_vendors(
    package_id: str,
    current_user: User = Depends(require_roles(*ADMIN_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """추천 점수 = vendor_score × 0.6 + 최근 90일 참여율 × 0.2 + 지역 매칭 × 0.2."""
    from datetime import datetime, timedelta, timezone

    from app.models.project import ProcessPackage

    pkg_result = await db.execute(
        select(ProcessPackage).where(ProcessPackage.id == package_id)
    )
    pkg = pkg_result.scalar_one_or_none()
    if not pkg:
        raise HTTPException(status_code=404, detail="패키지를 찾을 수 없습니다.")

    # 최신 스냅샷
    latest_subq = (
        select(
            VendorScoreSnapshot.vendor_id,
            func.max(VendorScoreSnapshot.snapshot_date).label("latest_date"),
        )
        .group_by(VendorScoreSnapshot.vendor_id)
        .subquery()
    )
    vendor_result = await db.execute(
        select(Vendor, VendorScoreSnapshot)
        .outerjoin(latest_subq, latest_subq.c.vendor_id == Vendor.id)
        .outerjoin(
            VendorScoreSnapshot,
            (VendorScoreSnapshot.vendor_id == Vendor.id)
            & (VendorScoreSnapshot.snapshot_date == latest_subq.c.latest_date),
        )
        .where(
            Vendor.company_id == current_user.company_id,
            Vendor.deleted_at.is_(None),
            Vendor.is_active == True,  # noqa: E712
        )
    )
    vendors = vendor_result.all()

    # 최근 90일 참여율
    cutoff = datetime.now(tz=timezone.utc) - timedelta(days=90)
    recent_result = await db.execute(
        select(
            BidRequest.vendor_id,
            func.count(BidRequest.id).label("total"),
            func.sum(
                func.cast(BidRequest.response_status == "accepted", type_=type(1))
            ).label("accepted"),
        )
        .where(
            BidRequest.company_id == current_user.company_id,
            BidRequest.sent_at >= cutoff,
            BidRequest.deleted_at.is_(None),
        )
        .group_by(BidRequest.vendor_id)
    )
    recent_map: dict[str, float] = {}
    for row in recent_result:
        t = row.total or 1
        recent_map[row.vendor_id] = (row.accepted or 0) / t

    recommendations = []
    for vendor, snap in vendors:
        if pkg.trade_type and pkg.trade_type not in (vendor.trade_types or []):
            continue
        vs = snap.score if snap else 0.5
        recent_part = recent_map.get(vendor.id, 0.0)
        rec_score = vs * 0.6 + recent_part * 0.2 + 0.2  # 지역 매칭 stub → 0.2 고정
        recommendations.append({
            "vendor_id": vendor.id,
            "company_name": vendor.company_name,
            "trade_types": vendor.trade_types,
            "vendor_score": vs,
            "recent_participation_rate": round(recent_part, 3),
            "recommendation_score": round(rec_score, 4),
        })

    return sorted(recommendations, key=lambda x: x["recommendation_score"], reverse=True)[:10]
