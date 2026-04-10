"""인증 API 테스트."""
from __future__ import annotations

import pytest
from httpx import AsyncClient

from tests.conftest import get_token


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, admin_user):
    resp = await client.post(
        "/auth/login", json={"email": "admin@test.com", "password": "Admin1234!"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient, admin_user):
    resp = await client.post(
        "/auth/login", json={"email": "admin@test.com", "password": "wrong"}
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_login_unknown_email(client: AsyncClient):
    resp = await client.post(
        "/auth/login", json={"email": "nobody@test.com", "password": "pass"}
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_me_requires_token(client: AsyncClient):
    resp = await client.get("/auth/me")
    assert resp.status_code == 403  # HTTPBearer 미제공 시 403


@pytest.mark.asyncio
async def test_me_returns_user(client: AsyncClient, admin_user):
    token = await get_token(client, "admin@test.com", "Admin1234!")
    resp = await client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "admin@test.com"
    assert data["role"] == "super_admin"


@pytest.mark.asyncio
async def test_invalid_token_rejected(client: AsyncClient):
    resp = await client.get("/auth/me", headers={"Authorization": "Bearer invalid.token.here"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_refresh_token(client: AsyncClient, admin_user):
    login = await client.post(
        "/auth/login", json={"email": "admin@test.com", "password": "Admin1234!"}
    )
    refresh_token = login.json()["refresh_token"]
    resp = await client.post("/auth/refresh", json={"refresh_token": refresh_token})
    assert resp.status_code == 200
    assert "access_token" in resp.json()
