"""협력사 평가 점수 계산 서비스.

score = participation_rate   × 0.25
      + response_speed_score × 0.20
      + win_rate             × 0.20
      + completion_rate      × 0.20
      + quality_score        × 0.15
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import VendorScoreSnapshot
from app.models.base import new_uuid
from app.models.bid import BidRequest
from app.models.settlement import Settlement
from app.models.vendor import Vendor


def _response_speed_score(avg_hours: float | None) -> float:
    """응답 속도 점수 (1h→1.0, 48h→0.0, 선형 역산)."""
    if avg_hours is None:
        return 0.5  # 데이터 없으면 중간값
    clamped = max(1.0, min(avg_hours, 48.0))
    return round(1.0 - (clamped - 1.0) / 47.0, 4)


def compute_score(
    participation_rate: float,
    response_speed_avg: float | None,
    win_rate: float,
    completion_rate: float,
    complaint_count: int,
    total_projects: int,
) -> float:
    """5개 지표 가중 합산 점수 (0.0–1.0)."""
    rss = _response_speed_score(response_speed_avg)
    quality = 1.0 - (complaint_count / max(total_projects, 1))
    quality = max(0.0, min(1.0, quality))

    score = (
        participation_rate * 0.25
        + rss              * 0.20
        + win_rate         * 0.20
        + completion_rate  * 0.20
        + quality          * 0.15
    )
    return round(min(1.0, max(0.0, score)), 4)


async def compute_vendor_metrics(
    vendor_id: str,
    company_id: str,
    db: AsyncSession,
) -> dict[str, Any]:
    """단일 협력사 지표 계산."""
    # 발주 집계
    bid_result = await db.execute(
        select(
            func.count(BidRequest.id).label("total"),
            func.sum(
                func.cast(BidRequest.response_status == "accepted", type_=type(1))
            ).label("accepted"),
        )
        .where(
            BidRequest.vendor_id == vendor_id,
            BidRequest.company_id == company_id,
            BidRequest.deleted_at.is_(None),
        )
    )
    bid_row = bid_result.one()
    total_bids: int = bid_row.total or 0
    accepted_bids: int = int(bid_row.accepted or 0)

    participation_rate = (accepted_bids / total_bids) if total_bids > 0 else 0.0

    # 응답 속도 평균 (sent_at → updated_at 대리 사용)
    speed_result = await db.execute(
        select(
            func.avg(
                func.extract(
                    "epoch",
                    BidRequest.updated_at - BidRequest.sent_at,
                ) / 3600.0
            ).label("avg_hours")
        )
        .where(
            BidRequest.vendor_id == vendor_id,
            BidRequest.response_status.in_(["accepted", "rejected", "on_hold"]),
            BidRequest.sent_at.is_not(None),
            BidRequest.deleted_at.is_(None),
        )
    )
    avg_hours = speed_result.scalar()

    # 정산 집계 (수주율 = 정산된 건 / accepted 건)
    settle_result = await db.execute(
        select(func.count(Settlement.id).label("cnt"))
        .where(
            Settlement.vendor_id == vendor_id,
            Settlement.company_id == company_id,
            Settlement.status == "completed",
            Settlement.deleted_at.is_(None),
        )
    )
    completed_settlements: int = settle_result.scalar() or 0
    win_rate = (completed_settlements / max(accepted_bids, 1)) if accepted_bids > 0 else 0.0
    win_rate = min(1.0, win_rate)

    # completion_rate: 정산 완료 / 전체 정산 요청
    total_settle_result = await db.execute(
        select(func.count(Settlement.id).label("cnt"))
        .where(
            Settlement.vendor_id == vendor_id,
            Settlement.company_id == company_id,
            Settlement.deleted_at.is_(None),
        )
    )
    total_settlements: int = total_settle_result.scalar() or 0
    completion_rate = (completed_settlements / max(total_settlements, 1)) if total_settlements > 0 else 0.0

    score = compute_score(
        participation_rate=participation_rate,
        response_speed_avg=float(avg_hours) if avg_hours is not None else None,
        win_rate=win_rate,
        completion_rate=completion_rate,
        complaint_count=0,  # complaint 모델 미구현 → 0
        total_projects=total_bids,
    )

    return {
        "score": score,
        "participation_rate": round(participation_rate, 4),
        "response_speed_avg": round(float(avg_hours), 2) if avg_hours is not None else None,
        "win_rate": round(win_rate, 4),
        "completion_rate": round(completion_rate, 4),
        "complaint_count": 0,
        "settlement_total": float(completed_settlements),
    }


async def snapshot_all_vendors(company_id: str, db: AsyncSession) -> int:
    """전체 협력사 스냅샷 생성. 생성된 건수 반환."""
    result = await db.execute(
        select(Vendor.id)
        .where(Vendor.company_id == company_id, Vendor.deleted_at.is_(None))
    )
    vendor_ids = list(result.scalars())
    now = datetime.now(tz=timezone.utc)
    count = 0
    for vid in vendor_ids:
        metrics = await compute_vendor_metrics(vid, company_id, db)
        db.add(VendorScoreSnapshot(
            id=new_uuid(),
            vendor_id=vid,
            snapshot_date=now,
            participation_rate=metrics["participation_rate"],
            response_speed_avg=metrics["response_speed_avg"],
            win_rate=metrics["win_rate"],
            completion_rate=metrics["completion_rate"],
            complaint_count=metrics["complaint_count"],
            settlement_total=metrics["settlement_total"],
            score=metrics["score"],
        ))
        count += 1
    await db.commit()
    return count
