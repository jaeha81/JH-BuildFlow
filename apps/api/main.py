from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.limiter import limiter
from app.routers import auth, health
from app.routers.projects import router as projects_router
from app.routers.vendors import router as vendors_router
from app.routers.bids import router as bids_router
from app.routers.quotes import router as quotes_router
from app.routers.messages import router as threads_router
from app.routers.messages import messages_router
from app.routers.settlements import router as settlements_router
from app.routers.analytics import router as analytics_router
from app.routers.agent_sync import router as agent_router
from app.routers.bid_management import router as bid_management_router

scheduler = AsyncIOScheduler()


async def _monthly_snapshot_job() -> None:
    """매월 1일 02:00 전체 협력사 스냅샷 생성."""
    try:
        from app.core.database import AsyncSessionLocal
        from app.services.vendor_score import snapshot_all_vendors
        from sqlalchemy import select
        from app.models.company import Company

        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Company.id))
            company_ids = list(result.scalars())
            for company_id in company_ids:
                count = await snapshot_all_vendors(company_id, db)
                print(f"[Scheduler] company={company_id} snapshots={count}")
    except Exception as exc:
        print(f"[Scheduler] 스냅샷 오류: {exc}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler.add_job(
        _monthly_snapshot_job,
        CronTrigger(day=1, hour=2, minute=0),
        id="monthly_vendor_snapshot",
        replace_existing=True,
    )
    scheduler.start()
    yield
    scheduler.shutdown(wait=False)


app = FastAPI(
    title="Interior Contractor Platform API",
    version="0.2.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Rate limiter 상태 주입 + 초과 핸들러
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS — settings.ALLOWED_ORIGINS 파싱 (운영 시 실제 도메인만 허용)
_origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(projects_router)
app.include_router(vendors_router)
app.include_router(bids_router)
app.include_router(quotes_router)
app.include_router(threads_router)
app.include_router(messages_router)
app.include_router(settlements_router)
app.include_router(analytics_router)
app.include_router(agent_router)
app.include_router(bid_management_router)


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "Interior Contractor Platform API", "docs": "/docs", "version": "0.2.0"}
