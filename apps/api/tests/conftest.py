"""pytest 공통 픽스처 — SQLite in-memory DB."""
from __future__ import annotations

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import get_db
from app.core.security import hash_password
from app.models.base import Base, new_uuid
from app.models.company import Company
from app.models.user import User

# SQLite in-memory (테스트 전용)
TEST_DB_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture(scope="function")
async def db_engine():
    engine = create_async_engine(TEST_DB_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def db_session(db_engine):
    SessionLocal = async_sessionmaker(db_engine, expire_on_commit=False)
    async with SessionLocal() as session:
        yield session


@pytest_asyncio.fixture(scope="function")
async def client(db_session: AsyncSession):
    """FastAPI TestClient — DB 의존성 오버라이드."""
    import sys, os
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
    from main import app

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    # 테스트 환경에서 rate limit 비활성화
    from app.core.limiter import limiter
    limiter.enabled = False

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac

    limiter.enabled = True
    app.dependency_overrides.clear()


# ── 공통 픽스처: 회사 + 유저 ───────────────────────────────────────────────────

@pytest_asyncio.fixture
async def company(db_session: AsyncSession) -> Company:
    c = Company(id=new_uuid(), name="테스트 회사", slug="test-co")
    db_session.add(c)
    await db_session.commit()
    await db_session.refresh(c)
    return c


@pytest_asyncio.fixture
async def admin_user(db_session: AsyncSession, company: Company) -> User:
    u = User(
        id=new_uuid(),
        company_id=company.id,
        email="admin@test.com",
        hashed_password=hash_password("Admin1234!"),
        name="관리자",
        role="super_admin",
    )
    db_session.add(u)
    await db_session.commit()
    await db_session.refresh(u)
    return u


@pytest_asyncio.fixture
async def vendor_user(db_session: AsyncSession, company: Company) -> User:
    u = User(
        id=new_uuid(),
        company_id=company.id,
        email="vendor@test.com",
        hashed_password=hash_password("Vendor1234!"),
        name="협력사",
        role="vendor_user",
    )
    db_session.add(u)
    await db_session.commit()
    await db_session.refresh(u)
    return u


async def get_token(client, email: str, password: str) -> str:
    """로그인 후 access_token 반환."""
    resp = await client.post("/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]
