"""정산(Settlement) API 테스트 — 생성/승인 RBAC."""
from __future__ import annotations

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.base import new_uuid
from app.models.project import Project
from app.models.settlement import Settlement
from app.models.user import User
from app.models.vendor import Vendor
from app.core.security import hash_password
from tests.conftest import get_token


# ── 픽스처 ────────────────────────────────────────────────────────────────────


@pytest_asyncio.fixture
async def project(db_session: AsyncSession, company):
    p = Project(id=new_uuid(), company_id=company.id, name="정산 현장", status="active")
    db_session.add(p)
    await db_session.commit()
    await db_session.refresh(p)
    return p


@pytest_asyncio.fixture
async def vendor(db_session: AsyncSession, company):
    v = Vendor(
        id=new_uuid(),
        company_id=company.id,
        company_name="정산 협력사",
        email="settlement_vendor@test.com",
        trade_types=["미장"],
        regions=["경기"],
    )
    db_session.add(v)
    await db_session.commit()
    await db_session.refresh(v)
    return v


@pytest_asyncio.fixture
async def accounting_user(db_session: AsyncSession, company):
    u = User(
        id=new_uuid(),
        company_id=company.id,
        email="accounting@test.com",
        hashed_password=hash_password("Acct1234!"),
        name="회계",
        role="accounting",
    )
    db_session.add(u)
    await db_session.commit()
    await db_session.refresh(u)
    return u


@pytest_asyncio.fixture
async def settlement_requested(db_session: AsyncSession, company, project, vendor):
    """requested 상태 정산."""
    s = Settlement(
        id=new_uuid(),
        company_id=company.id,
        project_id=project.id,
        vendor_id=vendor.id,
        milestone_type="interim",
        requested_amount=1000000,
        status="requested",
        tax_review_status="pending",
    )
    db_session.add(s)
    await db_session.commit()
    await db_session.refresh(s)
    return s


@pytest_asyncio.fixture
async def settlement_pending_approval(db_session: AsyncSession, company, project, vendor):
    """pending_approval 상태 정산 (세무검토 통과 후)."""
    s = Settlement(
        id=new_uuid(),
        company_id=company.id,
        project_id=project.id,
        vendor_id=vendor.id,
        milestone_type="final",
        requested_amount=2000000,
        status="pending_approval",
        tax_review_status="passed",
    )
    db_session.add(s)
    await db_session.commit()
    await db_session.refresh(s)
    return s


# ── 테스트 ────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_create_settlement(client: AsyncClient, admin_user, project, vendor):
    """정산 생성 — 인증된 사용자 가능."""
    token = await get_token(client, "admin@test.com", "Admin1234!")
    resp = await client.post(
        "/settlements",
        json={
            "project_id": project.id,
            "vendor_id": vendor.id,
            "milestone_type": "advance",
            "requested_amount": 500000,
            "invoice_file_url": None,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["status"] == "requested"
    assert data["requested_amount"] == 500000


@pytest.mark.asyncio
async def test_list_settlements_admin_roles(client: AsyncClient, admin_user, accounting_user, settlement_requested):
    """관리자/회계는 목록 조회 가능."""
    admin_token = await get_token(client, "admin@test.com", "Admin1234!")
    resp = await client.get("/settlements", headers={"Authorization": f"Bearer {admin_token}"})
    assert resp.status_code == 200

    acct_token = await get_token(client, "accounting@test.com", "Acct1234!")
    resp = await client.get("/settlements", headers={"Authorization": f"Bearer {acct_token}"})
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_list_settlements_vendor_user_forbidden(client: AsyncClient, vendor_user):
    """vendor_user는 정산 목록 조회 불가."""
    token = await get_token(client, "vendor@test.com", "Vendor1234!")
    resp = await client.get("/settlements", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_approve_settlement_super_admin_ok(client: AsyncClient, admin_user, settlement_pending_approval):
    """super_admin은 pending_approval 정산 승인 가능."""
    token = await get_token(client, "admin@test.com", "Admin1234!")
    resp = await client.put(
        f"/settlements/{settlement_pending_approval.id}/approve",
        json={"approved_amount": 2000000, "payout_scheduled_date": "2027-03-01"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "approved"
    assert data["approved_amount"] == 2000000


@pytest.mark.asyncio
async def test_approve_settlement_accounting_forbidden(
    client: AsyncClient, accounting_user, settlement_pending_approval
):
    """accounting 역할은 최종 승인 불가 — super_admin 전용."""
    token = await get_token(client, "accounting@test.com", "Acct1234!")
    resp = await client.put(
        f"/settlements/{settlement_pending_approval.id}/approve",
        json={"approved_amount": 2000000, "payout_scheduled_date": "2027-03-01"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_approve_settlement_wrong_status(client: AsyncClient, admin_user, settlement_requested):
    """requested 상태에서 승인 시도 — 400."""
    token = await get_token(client, "admin@test.com", "Admin1234!")
    resp = await client.put(
        f"/settlements/{settlement_requested.id}/approve",
        json={"approved_amount": 1000000, "payout_scheduled_date": "2027-03-01"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_tax_review_pass_sets_pending_approval(
    client: AsyncClient, accounting_user, settlement_requested
):
    """세무검토 통과 → status가 pending_approval로 변경."""
    token = await get_token(client, "accounting@test.com", "Acct1234!")
    resp = await client.put(
        f"/settlements/{settlement_requested.id}/tax-review",
        json={"tax_review_status": "passed"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["tax_review_status"] == "passed"
    assert data["status"] == "pending_approval"


@pytest.mark.asyncio
async def test_pending_approval_list(client: AsyncClient, admin_user, settlement_pending_approval):
    """pending-approval 목록 조회."""
    token = await get_token(client, "admin@test.com", "Admin1234!")
    resp = await client.get(
        "/settlements/pending-approval",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    ids = [s["id"] for s in resp.json()]
    assert settlement_pending_approval.id in ids
