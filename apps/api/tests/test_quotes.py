"""견적(Quote) API 테스트 — 제출/조회/수동검토/정규화."""
from __future__ import annotations

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.base import new_uuid
from app.models.bid import BidRequest
from app.models.project import ProcessPackage, Project
from app.models.vendor import Vendor
from tests.conftest import get_token


# ── 픽스처 ────────────────────────────────────────────────────────────────────


@pytest_asyncio.fixture
async def project(db_session: AsyncSession, company):
    p = Project(id=new_uuid(), company_id=company.id, name="견적 현장", status="active")
    db_session.add(p)
    await db_session.commit()
    await db_session.refresh(p)
    return p


@pytest_asyncio.fixture
async def vendor(db_session: AsyncSession, company):
    v = Vendor(
        id=new_uuid(),
        company_id=company.id,
        company_name="견적 협력사",
        email="quote_vendor@test.com",
        trade_types=["도장"],
        regions=["서울"],
    )
    db_session.add(v)
    await db_session.commit()
    await db_session.refresh(v)
    return v


@pytest_asyncio.fixture
async def process_package(db_session: AsyncSession, company, project):
    pkg = ProcessPackage(
        id=new_uuid(), company_id=company.id, project_id=project.id, trade_type="도장", status="draft"
    )
    db_session.add(pkg)
    await db_session.commit()
    await db_session.refresh(pkg)
    return pkg


@pytest_asyncio.fixture
async def bid_request(db_session: AsyncSession, company, project, process_package, vendor):
    from datetime import datetime, timezone
    bid = BidRequest(
        id=new_uuid(),
        company_id=company.id,
        project_id=project.id,
        process_package_id=process_package.id,
        vendor_id=vendor.id,
        sent_at=datetime.now(timezone.utc),
        response_status="pending",
    )
    db_session.add(bid)
    await db_session.commit()
    await db_session.refresh(bid)
    return bid


# ── 테스트 ────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_submit_quote_template(client: AsyncClient, admin_user, bid_request):
    """template 타입 견적 제출 — line_items 포함."""
    token = await get_token(client, "admin@test.com", "Admin1234!")
    resp = await client.post(
        "/quotes",
        json={
            "bid_request_id": bid_request.id,
            "submission_type": "template",
            "line_items": [
                {"item_name": "페인트 도장", "unit": "m²", "quantity": 100, "unit_price": 5000, "amount": 500000}
            ],
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["submission_type"] == "template"
    assert data["parse_status"] == "success"
    assert data["parsed_total"] == 500000


@pytest.mark.asyncio
async def test_submit_quote_hwp_is_manual_review(client: AsyncClient, admin_user, bid_request):
    """HWP 견적은 manual_review_required=True."""
    token = await get_token(client, "admin@test.com", "Admin1234!")
    resp = await client.post(
        "/quotes",
        json={
            "bid_request_id": bid_request.id,
            "submission_type": "hwp",
            "line_items": [],
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["manual_review_required"] is True
    assert data["parse_status"] == "manual_review"


@pytest.mark.asyncio
async def test_list_quotes(client: AsyncClient, admin_user, bid_request):
    """견적 목록 조회."""
    token = await get_token(client, "admin@test.com", "Admin1234!")
    resp = await client.get("/quotes", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_manual_review_queue_admin_only(client: AsyncClient, admin_user, vendor_user):
    """수동검토 큐 — 관리자만 접근."""
    vendor_token = await get_token(client, "vendor@test.com", "Vendor1234!")
    resp = await client.get(
        "/quotes/manual-review-queue",
        headers={"Authorization": f"Bearer {vendor_token}"},
    )
    assert resp.status_code == 403

    admin_token = await get_token(client, "admin@test.com", "Admin1234!")
    resp = await client.get(
        "/quotes/manual-review-queue",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_normalize_quote(client: AsyncClient, admin_user, bid_request):
    """수동 보정 — parse_status가 success로 변경."""
    token = await get_token(client, "admin@test.com", "Admin1234!")
    # HWP 견적 제출
    create_resp = await client.post(
        "/quotes",
        json={"bid_request_id": bid_request.id, "submission_type": "hwp", "line_items": []},
        headers={"Authorization": f"Bearer {token}"},
    )
    quote_id = create_resp.json()["id"]

    # 정규화
    resp = await client.put(
        f"/quotes/{quote_id}/normalize",
        json={
            "parsed_total": 800000,
            "line_items": [
                {"item_name": "도장 작업", "unit": "m²", "quantity": 160, "unit_price": 5000, "amount": 800000}
            ],
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["parse_status"] == "success"
    assert data["manual_review_required"] is False
    assert data["parsed_total"] == 800000


@pytest.mark.asyncio
async def test_quote_bid_not_found(client: AsyncClient, admin_user):
    """존재하지 않는 발주에 견적 제출 — 404."""
    token = await get_token(client, "admin@test.com", "Admin1234!")
    resp = await client.post(
        "/quotes",
        json={"bid_request_id": "nonexistent", "submission_type": "template", "line_items": []},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 404
