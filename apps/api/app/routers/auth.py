from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_password,
)
from app.core.limiter import limiter
from app.core.security_log import log_login_failure, log_login_success
from app.dependencies.auth import get_current_user
from app.models.audit import AuditLog
from app.models.base import new_uuid
from app.models.user import User
from app.schemas.auth import LoginRequest, RefreshRequest, TokenResponse, UserMeResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
async def login(
    request: Request,
    body: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    ip = request.client.host if request.client else None
    result = await db.execute(
        select(User).where(User.email == body.email, User.deleted_at.is_(None))
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.hashed_password):
        log_login_failure(body.email, ip)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="이메일 또는 비밀번호가 올바르지 않습니다",
        )

    if not user.is_active:
        log_login_failure(body.email, ip)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="비활성화된 계정입니다",
        )

    access_token = create_access_token(
        subject=user.id,
        company_id=user.company_id,
        role=user.role,
    )
    refresh_token = create_refresh_token(subject=user.id)

    log_login_success(user.id, user.role, ip)

    db.add(
        AuditLog(
            id=new_uuid(),
            company_id=user.company_id,
            actor_id=user.id,
            actor_role=user.role,
            action="auth.login",
            target_type="User",
            target_id=user.id,
            ip_address=ip,
            user_agent=request.headers.get("user-agent"),
        )
    )
    await db.commit()

    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    body: RefreshRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    try:
        payload = decode_token(body.refresh_token)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
        )

    user_id: str = payload["sub"]
    result = await db.execute(
        select(User).where(User.id == user_id, User.deleted_at.is_(None))
    )
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    access_token = create_access_token(
        subject=user.id,
        company_id=user.company_id,
        role=user.role,
    )
    new_refresh = create_refresh_token(subject=user.id)

    return TokenResponse(access_token=access_token, refresh_token=new_refresh)


@router.get("/me", response_model=UserMeResponse)
async def me(current_user: User = Depends(get_current_user)) -> UserMeResponse:
    return UserMeResponse.model_validate(current_user)
