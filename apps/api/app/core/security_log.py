"""보안 이벤트 전용 로거.

일반 앱 로그와 분리된 'security' 채널을 사용.
운영 환경에서는 이 로거를 Slack Webhook / SIEM / 파일로 라우팅.
"""
from __future__ import annotations

import logging

security_logger = logging.getLogger("security")

# 기본 핸들러 (콘솔) — 운영 환경에서 FileHandler / 외부 핸들러로 교체
if not security_logger.handlers:
    _handler = logging.StreamHandler()
    _handler.setFormatter(
        logging.Formatter("[SECURITY] %(asctime)s %(levelname)s %(message)s")
    )
    security_logger.addHandler(_handler)
    security_logger.setLevel(logging.WARNING)
    security_logger.propagate = False


def log_login_failure(email: str, ip: str | None) -> None:
    security_logger.warning("LOGIN_FAILURE email=%s ip=%s", email, ip or "unknown")


def log_login_success(user_id: str, role: str, ip: str | None) -> None:
    security_logger.info("LOGIN_SUCCESS user_id=%s role=%s ip=%s", user_id, role, ip or "unknown")


def log_forbidden(user_id: str, role: str, path: str, ip: str | None) -> None:
    security_logger.warning(
        "FORBIDDEN user_id=%s role=%s path=%s ip=%s", user_id, role, path, ip or "unknown"
    )


def log_token_invalid(reason: str, ip: str | None) -> None:
    security_logger.warning("TOKEN_INVALID reason=%s ip=%s", reason, ip or "unknown")
