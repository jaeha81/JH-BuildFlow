"""발주(BidRequest) API 테스트 — CRUD + RBAC."""
from __future__ import annotations

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.base import new_uuid
from app.models.project import ProcessPackage, Project
from app.models.vendor import Vendor
from tests.conftest import get_token


# ── 픽스처 ────────────────────────────────────────────────────────────────────


@pytest_asyncio.fixture
async def project(db_session: AsyncSession, company):
    p = Project(
        id=new_uuid(),
        company_id=company.id,
        name="테스트 현장",
        status="active",
    )
    db_session.add(p)
    await db_session.commit()
    await db_session.refresh(p)
    return p


@pytest_asyncio.fixture
async def process_package(db_session: AsyncSession, company, project):
    pkg = ProcessPackage(
        id=new_uuid(),
        company_id=company.id,
        project_id=project.id,
        trade_type="전기",
        status="draft",
    )
    db_session.add(pkg)
    await db_session.commit()
    await db_session.refresh(pkg)
    return pkg


@pytest_asyncio.fixture
async def vendor(db_session: AsyncSession, company):
    v = Vendor(
        id=new_uuid(),
        company_id=company.id,
        company_name="테스트 협력사",
        email="vendor_co@test.com",
        trade_types=["전기"],
        regions=["서울"],
    )
    db_session.add(v)
    await db_session.commit()
    await db_session.refresh(v)
    return v


# ── 테스트 ────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_create_bid_admin_ok(client: AsyncClient, admin_user, process_package, vendor):
    """관리자는 발주 생성 가능."""
    token = await get_token(client, "admin@test.com", "Admin1234!")
    resp = await client.post(
        "/bid-requests",
        json={
            "process_package_id": process_package.id,
            "vendor_ids": [vendor.id],
            "deadline": "2027-01-01T00:00:00Z",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert len(data) == 1
    assert data[0]["vendor_id"] == vendor.id
    assert data[0]["response_status"] == "pending"


@pytest.mark.asyncio
async def test_create_bid_vendor_user_forbidden(client: AsyncClient, vendor_user, process_package, vendor):
    """vendor_user는 발주 생성 불가."""
    token = await get_token(client, "vendor@test.com", "Vendor1234!")
    resp = await client.post(
        "/bid-requests",
        json={
            "process_package_id": process_package.id,
            "vendor_ids": [vendor.id],
            "deadline": "2027-01-01T00:00:00Z",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_list_bids_admin(client: AsyncClient, admin_user, process_package, vendor):
    """관리자: 빈 목록 조회 성공."""
    token = await get_token(client, "admin@test.com", "Admin1234!")
    resp = await client.get(
        "/bid-requests",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_create_multiple_vendors(client: AsyncClient, admin_user, db_session, company, process_package):
    """다수 업체 일괄 발주 — 각각 BidRequest 생성."""
    v1 = Vendor(id=new_uuid(), company_id=company.id, company_name="업체A", email="a@test.com", trade_types=[], regions=[])
    v2 = Vendor(id=new_uuid(), company_id=company.id, company_name="업체B", email="b@test.com", trade_types=[], regions=[])
    db_session.add_all([v1, v2])
    await db_session.commit()

    token = await get_token(client, "admin@test.com", "Admin1234!")
    resp = await client.post(
        "/bid-requests",
        json={
            "process_package_id": process_package.id,
            "vendor_ids": [v1.id, v2.id],
            "deadline": "2027-06-01T00:00:00Z",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 201
    assert len(resp.json()) == 2


@pytest.mark.asyncio
async def test_respond_to_bid(client: AsyncClient, admin_user, db_session, company, process_package, vendor):
    """발주 응답 상태 변경."""
    token = await get_token(client, "admin@test.com", "Admin1234!")
    # 발주 생성
    create_resp = await client.post(
        "/bid-requests",
        json={
            "process_package_id": process_package.id,
            "vendor_ids": [vendor.id],
            "deadline": "2027-01-01T00:00:00Z",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    bid_id = create_resp.json()[0]["id"]

    # 응답
    resp = await client.put(
        f"/bid-requests/{bid_id}/respond",
        json={"status": "accepted", "reason": "조건 OK"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["response_status"] == "accepted"


@pytest.mark.asyncio
async def test_rebid_admin_only(client: AsyncClient, admin_user, vendor_user, db_session, company, process_package, vendor):
    """재발주는 관리자만 가능."""
    admin_token = await get_token(client, "admin@test.com", "Admin1234!")
    create_resp = await client.post(
        "/bid-requests",
        json={
            "process_package_id": process_package.id,
            "vendor_ids": [vendor.id],
            "deadline": "2027-01-01T00:00:00Z",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    bid_id = create_resp.json()[0]["id"]

    vendor_token = await get_token(client, "vendor@test.com", "Vendor1234!")
    resp = await client.post(
        f"/bid-requests/{bid_id}/rebid",
        headers={"Authorization": f"Bearer {vendor_token}"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_bid_not_found(client: AsyncClient, admin_user):
    """존재하지 않는 발주 조회 — 404."""
    token = await get_token(client, "admin@test.com", "Admin1234!")
    resp = await client.get(
        "/bid-requests/nonexistent-id",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 404
