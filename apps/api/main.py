from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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

app = FastAPI(
    title="Interior Contractor Platform API",
    version="0.2.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:5173"],
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
