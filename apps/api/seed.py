"""
Seed 데이터 초기화 스크립트.
실행: python seed.py

생성 데이터:
- 회사 1개 (JH인테리어)
- super_admin 1명 (admin@jh.com / Admin1234!)
- 협력사 3개 (공종 각각 다름)
- 프로젝트 1개 (강남 카페 프로젝트)
"""

import asyncio
import sys
from datetime import date

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.core.security import hash_password
from app.models.base import new_uuid
from app.models.company import Company
from app.models.project import ProcessPackage, Project
from app.models.user import User
from app.models.vendor import Vendor


async def seed(session: AsyncSession) -> None:
    # ── 1. 회사 ──────────────────────────────────────────────
    company_id = new_uuid()
    company = Company(
        id=company_id,
        name="JH인테리어",
        slug="jh-interior",
        business_number="123-45-67890",
        representative_name="김재하",
        phone="02-1234-5678",
        address="서울시 강남구 테헤란로 123",
        company_settings={
            "logo_url": None,
            "primary_color": "#2563EB",
            "kakao_notify": False,
            "email_notify": True,
        },
    )
    session.add(company)

    # ── 2. Super Admin ────────────────────────────────────────
    admin = User(
        id=new_uuid(),
        company_id=company_id,
        email="admin@jh.com",
        hashed_password=hash_password("Admin1234!"),
        name="관리자",
        phone="010-1234-5678",
        role="super_admin",
    )
    session.add(admin)

    # ── 3. 협력사 3개 (공종 각각 다름) ───────────────────────
    vendors = [
        Vendor(
            id=new_uuid(),
            company_id=company_id,
            company_name="우진목공",
            representative_name="이우진",
            email="woodwork@ujin.com",
            phone="010-2222-3333",
            trade_types=["목공"],
            regions=["서울", "경기"],
            tax_info={"business_number": "111-22-33333", "bank": "국민은행"},
            is_verified=True,
        ),
        Vendor(
            id=new_uuid(),
            company_id=company_id,
            company_name="하나도장",
            representative_name="박하나",
            email="paint@hana.com",
            phone="010-4444-5555",
            trade_types=["도장"],
            regions=["서울"],
            tax_info={"business_number": "222-33-44444", "bank": "신한은행"},
            is_verified=True,
        ),
        Vendor(
            id=new_uuid(),
            company_id=company_id,
            company_name="대성전기",
            representative_name="최대성",
            email="elec@daesung.com",
            phone="010-6666-7777",
            trade_types=["전기", "조명"],
            regions=["서울", "경기", "인천"],
            tax_info={"business_number": "333-44-55555", "bank": "하나은행"},
            is_verified=False,
        ),
    ]
    for v in vendors:
        session.add(v)

    # ── 4. 프로젝트 1개 ───────────────────────────────────────
    project_id = new_uuid()
    project = Project(
        id=project_id,
        company_id=company_id,
        name="강남 카페 인테리어 공사",
        site_address="서울시 강남구 역삼동 123-45",
        client_name="스타벅스코리아",
        industry_template="카페",
        contract_amount=85_000_000,
        estimated_budget=90_000_000,
        start_date=date(2026, 5, 1),
        end_date=date(2026, 6, 30),
        status="active",
        notes="카페 업종 기본 공정 세트 적용. 목공/도장/전기/조명 포함.",
        site_info={
            "floor_area_sqm": 120,
            "floors": 1,
            "building_type": "상가",
        },
    )
    session.add(project)

    # 공종별 패키지 (목공/도장/전기)
    packages = [
        ProcessPackage(
            id=new_uuid(),
            company_id=company_id,
            project_id=project_id,
            trade_type="목공",
            budget_allocated=25_000_000,
            status="draft",
        ),
        ProcessPackage(
            id=new_uuid(),
            company_id=company_id,
            project_id=project_id,
            trade_type="도장",
            budget_allocated=15_000_000,
            status="draft",
        ),
        ProcessPackage(
            id=new_uuid(),
            company_id=company_id,
            project_id=project_id,
            trade_type="전기",
            budget_allocated=20_000_000,
            status="draft",
        ),
    ]
    for p in packages:
        session.add(p)

    await session.commit()
    print("✅ Seed 완료")
    print(f"   회사   : JH인테리어 (id={company_id})")
    print(f"   관리자 : admin@jh.com / Admin1234!")
    print(f"   협력사 : 우진목공, 하나도장, 대성전기")
    print(f"   프로젝트: 강남 카페 인테리어 공사 (id={project_id})")


async def main() -> None:
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        await seed(session)
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
