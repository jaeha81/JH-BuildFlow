"""메시지/Q&A/에스컬레이션 API."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import write_audit
from app.core.database import get_db
from app.dependencies.auth import get_current_user, require_roles
from app.models.base import new_uuid
from app.models.message import Message, MessageThread
from app.models.user import User
from app.schemas.messages import MessageCreate, MessageResponse, ThreadCreate, ThreadResponse

router = APIRouter(prefix="/threads", tags=["messages"])


@router.get("", response_model=list[ThreadResponse])
async def list_threads(
    project_id: str | None = None,
    vendor_id: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[ThreadResponse]:
    q = select(MessageThread).where(
        MessageThread.company_id == current_user.company_id,
        MessageThread.deleted_at.is_(None),
    )
    if project_id:
        q = q.where(MessageThread.project_id == project_id)
    if vendor_id:
        q = q.where(MessageThread.vendor_id == vendor_id)
    result = await db.execute(q)
    return [ThreadResponse.model_validate(t) for t in result.scalars()]


@router.post("", response_model=ThreadResponse, status_code=status.HTTP_201_CREATED)
async def create_thread(
    body: ThreadCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ThreadResponse:
    thread = MessageThread(
        id=new_uuid(),
        company_id=current_user.company_id,
        project_id=body.project_id,
        vendor_id=body.vendor_id,
        thread_type=body.thread_type,
    )
    db.add(thread)
    await write_audit(
        db,
        company_id=current_user.company_id,
        actor_id=current_user.id,
        actor_role=current_user.role,
        action="thread.create",
        target_type="MessageThread",
        target_id=thread.id,
        request=request,
    )
    await db.commit()
    await db.refresh(thread)
    return ThreadResponse.model_validate(thread)


@router.get("/{thread_id}/messages", response_model=list[MessageResponse])
async def list_messages(
    thread_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[MessageResponse]:
    await _get_thread_or_404(db, thread_id, current_user.company_id)
    result = await db.execute(
        select(Message)
        .where(Message.thread_id == thread_id, Message.deleted_at.is_(None))
        .order_by(Message.created_at.asc())
    )
    return [MessageResponse.model_validate(m) for m in result.scalars()]


@router.post("/{thread_id}/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def send_message(
    thread_id: str,
    body: MessageCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    thread = await _get_thread_or_404(db, thread_id, current_user.company_id)
    if thread.is_closed:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="종료된 스레드입니다.")
    msg = Message(
        id=new_uuid(),
        thread_id=thread_id,
        sender_id=current_user.id,
        sender_role=current_user.role,
        content=body.content,
    )
    db.add(msg)
    await db.flush()  # ID 확보

    # AI 자동응답 시도
    from app.services.ai_reply import ThreadContext, get_ai_provider
    provider = get_ai_provider()
    ctx = ThreadContext(
        thread_type=thread.thread_type,
        project_id=thread.project_id,
        vendor_id=thread.vendor_id,
        company_id=thread.company_id,
        recent_messages=[body.content],
    )
    can_handle = await provider.can_handle(body.content)
    if can_handle:
        ai_text = await provider.reply(body.content, ctx)
        ai_msg = Message(
            id=new_uuid(),
            thread_id=thread_id,
            sender_id="ai-system",
            sender_role="ai",
            content=ai_text,
            ai_handled=True,
        )
        db.add(ai_msg)
    else:
        # escalate: 관리자 알림 적재
        msg.escalated_at = __import__("datetime").datetime.now(__import__("datetime").timezone.utc)
        from app.models.audit import NotificationQueue
        db.add(NotificationQueue(
            id=new_uuid(),
            company_id=current_user.company_id,
            target_user_id=None,
            channel="push",
            title="Q&A 에스컬레이션",
            body=f"스레드 {thread_id}에 처리 필요 메시지가 있습니다.",
        ))

    await db.commit()
    await db.refresh(msg)
    return MessageResponse.model_validate(msg)


@router.put("/messages/{message_id}/escalate", response_model=MessageResponse)
async def escalate_message(
    message_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    result = await db.execute(
        select(Message).where(Message.id == message_id, Message.deleted_at.is_(None))
    )
    msg = result.scalar_one_or_none()
    if not msg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="메시지를 찾을 수 없습니다.")
    msg.escalated_at = datetime.now(timezone.utc)
    # NotificationQueue에 관리자 알림 적재
    from app.models.audit import NotificationQueue
    db.add(NotificationQueue(
        id=new_uuid(),
        company_id=current_user.company_id,
        target_user_id=None,  # 관리자 전체 대상
        channel="push",
        title="에스컬레이션 알림",
        body=f"메시지 {message_id}가 에스컬레이션되었습니다.",
    ))
    await write_audit(
        db,
        company_id=current_user.company_id,
        actor_id=current_user.id,
        actor_role=current_user.role,
        action="message.escalate",
        target_type="Message",
        target_id=message_id,
        request=request,
    )
    await db.commit()
    await db.refresh(msg)
    return MessageResponse.model_validate(msg)


@router.get("/escalation-stats")
async def escalation_stats(
    current_user: User = Depends(require_roles("super_admin", "sub_admin", "site_manager")),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """관리자 대시보드 위젯: 처리 필요 문의 카운트."""
    from datetime import datetime, timedelta, timezone
    now = datetime.now(timezone.utc)
    threshold_24h = now - timedelta(hours=24)

    # 에스컬레이션된 메시지
    esc_result = await db.execute(
        select(Message).where(
            Message.escalated_at.is_not(None),
            Message.deleted_at.is_(None),
        )
    )
    escalated = list(esc_result.scalars())

    # 24시간 이상 미응답
    unresponded = [m for m in escalated if m.escalated_at and m.escalated_at < threshold_24h]

    return {
        "escalated_count": len(escalated),
        "unresponded_24h": len(unresponded),
        "urgent": len(unresponded) > 0,
    }


# vendor-web 호환 alias
messages_router = APIRouter(prefix="/messages", tags=["messages-compat"])


@messages_router.get("/threads", response_model=list[ThreadResponse])
async def list_threads_alias(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[ThreadResponse]:
    return await list_threads(current_user=current_user, db=db)


@messages_router.get("/threads/{thread_id}", response_model=dict)
async def get_thread_with_messages(
    thread_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    thread = await _get_thread_or_404(db, thread_id, current_user.company_id)
    msgs_result = await db.execute(
        select(Message)
        .where(Message.thread_id == thread_id, Message.deleted_at.is_(None))
        .order_by(Message.created_at.asc())
    )
    return {
        "thread": ThreadResponse.model_validate(thread).model_dump(),
        "messages": [MessageResponse.model_validate(m).model_dump() for m in msgs_result.scalars()],
    }


@messages_router.post("/threads/{thread_id}", response_model=MessageResponse)
async def send_message_alias(
    thread_id: str,
    body: MessageCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    return await send_message(thread_id, body, request, current_user, db)


async def _get_thread_or_404(
    db: AsyncSession, thread_id: str, company_id: str
) -> MessageThread:
    result = await db.execute(
        select(MessageThread).where(
            MessageThread.id == thread_id,
            MessageThread.company_id == company_id,
            MessageThread.deleted_at.is_(None),
        )
    )
    thread = result.scalar_one_or_none()
    if not thread:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="스레드를 찾을 수 없습니다.")
    return thread
