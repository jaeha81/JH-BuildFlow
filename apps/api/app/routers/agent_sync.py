"""에이전트 동기화 API (로컬 Electron ↔ 서버)."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, File, UploadFile, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.upload import save_upload
from app.dependencies.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/agent", tags=["agent"])


class FileSyncPayload(BaseModel):
    file_hash: str
    file_name: str
    file_path: str
    folder_key: str | None = None
    metadata: dict[str, Any] = {}


class AgentTask(BaseModel):
    task_id: str
    task_type: str
    payload: dict[str, Any]
    created_at: str


# In-memory task queue (프로토타입 — 실 운영 시 Redis/DB로 교체)
_task_queue: list[AgentTask] = []


@router.post("/sync-file", status_code=status.HTTP_200_OK)
async def sync_file(
    body: FileSyncPayload,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """로컬 에이전트 → 서버 메타데이터 전송."""
    return {
        "status": "synced",
        "file_hash": body.file_hash,
        "file_name": body.file_name,
        "company_id": current_user.company_id,
    }


@router.post("/upload-document", status_code=status.HTTP_201_CREATED)
async def upload_agent_document(
    project_id: str,
    folder_key: str | None = None,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """에이전트가 발견한 파일을 서버에 업로드."""
    file_url, file_name = await save_upload(file, base_dir="uploads/agent")
    return {
        "status": "uploaded",
        "file_url": file_url,
        "file_name": file_name,
        "project_id": project_id,
        "folder_key": folder_key,
    }


@router.get("/tasks", response_model=list[AgentTask])
async def get_agent_tasks(
    current_user: User = Depends(get_current_user),
) -> list[AgentTask]:
    """모바일 지시사항 → 데스크톱 에이전트가 polling해서 실행."""
    tasks = [t for t in _task_queue if True]  # 회사 필터 추가 가능
    return tasks
