"""
PROMPT-09: AI 자동응답 Provider 인터페이스 + Mock 구현

구조:
  AiReplyProvider (인터페이스)
    ↳ MockAiReplyProvider  — 현재 구현 (패턴 매칭)
    ↳ ClaudeAiReplyProvider — 향후 교체 가능 (Anthropic API)

Escalate 흐름:
1. AI canHandle() = false → escalate_flag = true
2. NotificationQueue에 관리자 알림 적재
3. 관리자 대시보드 카운트 증가
4. 관리자 답변 후 escalated_at 기록 해제
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class ThreadContext:
    thread_type: str
    project_id: str
    vendor_id: str
    company_id: str
    recent_messages: list[str]


class AiReplyProvider(ABC):
    """AI 자동응답 Provider 인터페이스."""

    @abstractmethod
    async def can_handle(self, message: str) -> bool:
        """이 메시지를 AI가 처리할 수 있으면 True."""
        ...

    @abstractmethod
    async def reply(self, message: str, context: ThreadContext) -> str:
        """자동 응답 생성."""
        ...


# 패턴 매칭 기반 FAQ 딕셔너리
_FAQ_PATTERNS: dict[str, str] = {
    "발주": "발주 관련 문의는 담당자가 검토 후 연락드립니다.",
    "견적": "견적서는 /bid-requests에서 확인하신 후 제출해주세요.",
    "마감": "마감일은 발주 상세 화면에서 확인하실 수 있습니다.",
    "지급": "정산/지급 관련 문의는 담당 회계팀에서 처리합니다.",
    "계산서": "세금계산서는 정산 요청 시 업로드해주세요.",
    "등록": "협력사 등록은 /join 페이지에서 진행해주세요.",
    "비밀번호": "비밀번호 재설정은 로그인 페이지의 '비밀번호 찾기'를 이용해주세요.",
    "연락처": "고객센터: 02-0000-0000 / 평일 09:00-18:00",
}


class MockAiReplyProvider(AiReplyProvider):
    """패턴 매칭 기반 Mock AI 응답 (향후 ClaudeAiReplyProvider로 교체 가능)."""

    async def can_handle(self, message: str) -> bool:
        return any(keyword in message for keyword in _FAQ_PATTERNS)

    async def reply(self, message: str, context: ThreadContext) -> str:
        for keyword, answer in _FAQ_PATTERNS.items():
            if keyword in message:
                return answer
        return "안녕하세요. 문의 내용을 확인 중입니다. 잠시만 기다려주세요."


class ClaudeAiReplyProvider(AiReplyProvider):
    """향후 Anthropic Claude API 연동 구현체 (플레이스홀더)."""

    def __init__(self, api_key: str, model: str = "claude-sonnet-4-6") -> None:
        self.api_key = api_key
        self.model = model

    async def can_handle(self, message: str) -> bool:
        # Claude는 모든 메시지를 처리할 수 있다고 가정
        return True

    async def reply(self, message: str, context: ThreadContext) -> str:
        # TODO: anthropic SDK 연동
        # import anthropic
        # client = anthropic.AsyncAnthropic(api_key=self.api_key)
        # response = await client.messages.create(...)
        raise NotImplementedError("ClaudeAiReplyProvider는 아직 구현되지 않았습니다.")


# 싱글턴 (설정에 따라 교체)
def get_ai_provider() -> AiReplyProvider:
    return MockAiReplyProvider()
