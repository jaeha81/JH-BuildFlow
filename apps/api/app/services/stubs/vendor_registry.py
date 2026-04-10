"""
PROMPT-15: VendorRegistry 외부 연동 stub

향후 외부 협력사 데이터베이스 / 공공 API 연결 포인트.
현재는 NotImplementedError 반환.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class VendorRegistryEntry:
    business_no: str
    company_name: str
    representative: str
    address: str
    trade_types: list[str]
    is_verified: bool


class VendorRegistryConnector(ABC):
    """외부 협력사 레지스트리 조회 인터페이스."""

    @abstractmethod
    async def lookup(self, business_no: str) -> VendorRegistryEntry | None:
        """사업자번호로 협력사 정보 조회."""
        ...

    @abstractmethod
    async def verify(self, business_no: str) -> bool:
        """사업자 유효성 검증."""
        ...


class PublicApiVendorRegistry(VendorRegistryConnector):
    """공공데이터포털 사업자 API 연동 stub (향후 구현)."""

    def __init__(self, api_key: str) -> None:
        self.api_key = api_key

    async def lookup(self, business_no: str) -> VendorRegistryEntry | None:
        # TODO: 공공데이터포털 사업자 상태조회 API 연동
        # https://www.data.go.kr/data/15081808/openapi.do
        raise NotImplementedError("PublicApiVendorRegistry는 아직 구현되지 않았습니다.")

    async def verify(self, business_no: str) -> bool:
        raise NotImplementedError("PublicApiVendorRegistry는 아직 구현되지 않았습니다.")


class NullVendorRegistry(VendorRegistryConnector):
    """항상 None 반환 (개발 환경 기본값)."""

    async def lookup(self, business_no: str) -> VendorRegistryEntry | None:
        return None

    async def verify(self, business_no: str) -> bool:
        return True


def get_vendor_registry() -> VendorRegistryConnector:
    return NullVendorRegistry()
