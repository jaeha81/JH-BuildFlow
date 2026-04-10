"""메시지/스레드 API 테스트 — 생성/전송/에스컬레이션."""
from __future__ import annotations

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.base import new_uuid
from app.models.message import MessageThread
from app.models.project import Project
from app.models.vendor import Vendor
from tests.conftest import get_token


# ── 픽스처 ────────────────────────────────────────────────────────────────────


@pytest_asyncio.fixture
async def project(db_session: AsyncSession, company):
    p = Project(id=new_uuid(), company_id=company.id, name="메시지 현장", status="active")
    db_session.add(p)
    await db_session.commit()
    await db_session.refresh(p)
    return p


@pytest_asyncio.fixture
async def vendor(db_session: AsyncSession, company):
    v = Vendor(
        id=new_uuid(),
        company_id=company.id,
        company_name="메시지 협력사",
        email="msg_vendor@test.com",
        trade_types=["도배"],
        regions=["서울"],
    )
    db_session.add(v)
    await db_session.commit()
    await db_session.refresh(v)
    return v


@pytest_asyncio.fixture
async def thread(db_session: AsyncSession, company, project, vendor):
    t = MessageThread(
        id=new_uuid(),
        company_id=company.id,
        project_id=project.id,
        vendor_id=vendor.id,
        thread_type="Q&A",
        is_closed=False,
    )
    db_session.add(t)
    await db_session.commit()
    await db_session.refresh(t)
    return t


@pytest_asyncio.fixture
async def closed_thread(db_session: AsyncSession, company, project, vendor):
    t = MessageThread(
        id=new_uuid(),
        company_id=company.id,
        project_id=project.id,
        vendor_id=vendor.id,
        thread_type="공지",
        is_closed=True,
    )
    db_session.add(t)
    await db_session.commit()
    await db_session.refresh(t)
    return t


# ── 테스트 ────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_create_thread(client: AsyncClient, admin_user, project, vendor):
    """스레드 생성."""
    token = await get_token(client, "admin@test.com", "Admin1234!")
    resp = await client.post(
        "/threads",
        json={"thread_type": "Q&A", "project_id": project.id, "vendor_id": vendor.id},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["thread_type"] == "Q&A"
    assert data["is_closed"] is False


@pytest.mark.asyncio
async def test_list_threads(client: AsyncClient, admin_user, thread):
    """스레드 목록 조회."""
    token = await get_token(client, "admin@test.com", "Admin1234!")
    resp = await client.get("/threads", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    ids = [t["id"] for t in resp.json()]
    assert thread.id in ids


@pytest.mark.asyncio
async def test_send_message(client: AsyncClient, admin_user, thread):
    """메시지 전송."""
    token = await get_token(client, "admin@test.com", "Admin1234!")
    resp = await client.post(
        f"/threads/{thread.id}/messages",
        json={"content": "안녕하세요, 공사 일정 문의드립니다."},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["content"] == "안녕하세요, 공사 일정 문의드립니다."
    assert data["sender_role"] == "super_admin"


@pytest.mark.asyncio
async def test_list_messages_in_thread(client: AsyncClient, admin_user, thread):
    """스레드 메시지 목록 조회."""
    token = await get_token(client, "admin@test.com", "Admin1234!")
    # 메시지 2개 전송
    for content in ["첫 번째 메시지", "두 번째 메시지"]:
        await client.post(
            f"/threads/{thread.id}/messages",
            json={"content": content},
            headers={"Authorization": f"Bearer {token}"},
        )

    resp = await client.get(
        f"/threads/{thread.id}/messages",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    contents = [m["content"] for m in resp.json()]
    assert "첫 번째 메시지" in contents
    assert "두 번째 메시지" in contents


@pytest.mark.asyncio
async def test_send_message_to_closed_thread(client: AsyncClient, admin_user, closed_thread):
    """종료된 스레드에 메시지 전송 — 400."""
    token = await get_token(client, "admin@test.com", "Admin1234!")
    resp = await client.post(
        f"/threads/{closed_thread.id}/messages",
        json={"content": "종료된 스레드에 전송 시도"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_thread_not_found(client: AsyncClient, admin_user):
    """존재하지 않는 스레드 메시지 전송 — 404."""
    token = await get_token(client, "admin@test.com", "Admin1234!")
    resp = await client.post(
        "/threads/nonexistent-id/messages",
        json={"content": "없는 스레드"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_escalation_stats(client: AsyncClient, admin_user, thread):
    """에스컬레이션 통계 조회 — 관리자 전용."""
    token = await get_token(client, "admin@test.com", "Admin1234!")
    resp = await client.get(
        "/threads/escalation-stats",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "escalated_count" in data
    assert "urgent" in data


@pytest.mark.asyncio
async def test_vendor_user_can_send_message(client: AsyncClient, vendor_user, thread):
    """vendor_user도 메시지 전송 가능 (인증만 있으면 됨)."""
    token = await get_token(client, "vendor@test.com", "Vendor1234!")
    resp = await client.post(
        f"/threads/{thread.id}/messages",
        json={"content": "협력사 문의사항입니다."},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 201
    assert resp.json()["sender_role"] == "vendor_user"
