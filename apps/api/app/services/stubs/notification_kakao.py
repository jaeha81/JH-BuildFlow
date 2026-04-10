"""
PROMPT-15: 카카오 알림톡 NotificationQueue stub

향후 카카오 비즈니스 API 연결 포인트.
현재는 콘솔 출력으로 대체.
"""
from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class NotificationMessage:
    recipient_phone: str
    template_code: str
    variables: dict[str, str] = field(default_factory=dict)
    fallback_sms: str | None = None


class NotificationProvider(ABC):
    """알림 발송 인터페이스."""

    @abstractmethod
    async def send(self, message: NotificationMessage) -> bool:
        """알림 발송. 성공 시 True 반환."""
        ...


class KakaoAiProvider(NotificationProvider):
    """카카오 알림톡 API 연동 stub (향후 구현)."""

    def __init__(self, sender_key: str, kakao_api_url: str) -> None:
        self.sender_key = sender_key
        self.kakao_api_url = kakao_api_url

    async def send(self, message: NotificationMessage) -> bool:
        # TODO: kakao_api_url/message POST 요청
        # 카카오 채널 발신 프로필 키(sender_key) + 알림톡 템플릿 코드 사용
        raise NotImplementedError("KakaoAiProvider는 아직 구현되지 않았습니다.")


class ConsoleNotificationProvider(NotificationProvider):
    """개발 환경: 콘솔 출력 (기본값)."""

    async def send(self, message: NotificationMessage) -> bool:
        logger.info(
            "[NOTIFICATION] to=%s template=%s vars=%s",
            message.recipient_phone,
            message.template_code,
            message.variables,
        )
        return True


def get_notification_provider() -> NotificationProvider:
    return ConsoleNotificationProvider()
