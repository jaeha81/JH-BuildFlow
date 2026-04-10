"""파일 업로드 유틸리티."""
from __future__ import annotations

import os
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

ALLOWED_EXTENSIONS = {"pdf", "xlsx", "xls", "jpg", "jpeg", "png", "hwp"}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB


def _ext(filename: str) -> str:
    return Path(filename).suffix.lstrip(".").lower()


def validate_upload(file: UploadFile) -> None:
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="파일명이 없습니다.")
    ext = _ext(file.filename)
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"허용되지 않는 파일 형식입니다: .{ext}",
        )


async def save_upload(file: UploadFile, base_dir: str = "uploads") -> tuple[str, str]:
    """파일을 저장하고 (file_url, original_filename) 반환."""
    validate_upload(file)

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="파일 크기가 50MB를 초과합니다.",
        )

    ext = _ext(file.filename or "file")
    safe_name = f"{uuid.uuid4().hex}.{ext}"
    upload_path = Path(base_dir) / safe_name
    upload_path.parent.mkdir(parents=True, exist_ok=True)
    upload_path.write_bytes(content)

    return f"/{base_dir}/{safe_name}", file.filename or safe_name
