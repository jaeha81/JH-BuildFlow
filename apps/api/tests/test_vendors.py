"""협력사 RBAC 테스트."""
from __future__ import annotations

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.base import new_uuid
from app.models.vendor import Vendor
from tests.conftest import get_token


async def _create_vendor(db: AsyncSession, company_id: str, email: str = "v@test.com") -> Vendor:
    v = Vendor(
        id=new_uuid(),
        company_id=company_id,
        company_name="테스트 협력사",
        email=email,
    )
    db.add(v)
    await db.commit()
    await db.refresh(v)
    return v


@pytest.mark.asyncio
async def test_list_vendors_admin_allowed(client: AsyncClient, admin_user, db_session, company):
    await _create_vendor(db_session, company.id)
    token = await get_token(client, "admin@test.com", "Admin1234!")
    resp = await client.get("/vendors", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


@pytest.mark.asyncio
async def test_list_vendors_vendor_user_blocked(client: AsyncClient, vendor_user):
    token = await get_token(client, "vendor@test.com", "Vendor1234!")
    resp = await client.get("/vendors", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_update_vendor_self_allowed(
    client: AsyncClient, vendor_user, db_session, company
):
    """vendor_user는 자신의 이메일과 일치하는 업체만 수정 가능."""
    vendor = await _create_vendor(db_session, company.id, email="vendor@test.com")
    token = await get_token(client, "vendor@test.com", "Vendor1234!")
    resp = await client.put(
        f"/vendors/{vendor.id}",
        json={"company_name": "수정된 이름"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["company_name"] == "수정된 이름"


@pytest.mark.asyncio
async def test_update_vendor_other_blocked(
    client: AsyncClient, vendor_user, db_session, company
):
    """vendor_user는 다른 업체 수정 불가."""
    other_vendor = await _create_vendor(db_session, company.id, email="other@test.com")
    token = await get_token(client, "vendor@test.com", "Vendor1234!")
    resp = await client.put(
        f"/vendors/{other_vendor.id}",
        json={"company_name": "해킹 시도"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_update_vendor_admin_allowed(
    client: AsyncClient, admin_user, db_session, company
):
    """admin은 모든 업체 수정 가능."""
    vendor = await _create_vendor(db_session, company.id, email="any@test.com")
    token = await get_token(client, "admin@test.com", "Admin1234!")
    resp = await client.put(
        f"/vendors/{vendor.id}",
        json={"company_name": "관리자 수정"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
