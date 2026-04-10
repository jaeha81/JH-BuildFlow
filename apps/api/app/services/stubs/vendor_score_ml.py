"""
PROMPT-15: VendorScore ML 파이프라인 연결 stub

현재 구현은 rule-based 가중 합산(vendor_score.py).
향후 외부 ML 서비스(SageMaker, Vertex AI 등)로 교체 가능한 인터페이스.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class VendorScoreFeatures:
    vendor_id: str
    participation_rate: float
    response_speed_avg_hours: float
    win_rate: float
    completion_rate: float
    complaint_count: int
    total_projects: int


@dataclass
class VendorScorePrediction:
    vendor_id: str
    score: float          # 0.0 ~ 1.0
    confidence: float     # 모델 신뢰도
    model_version: str


class VendorScoreMLConnector(ABC):
    """외부 ML 파이프라인 점수 예측 인터페이스."""

    @abstractmethod
    async def predict(self, features: VendorScoreFeatures) -> VendorScorePrediction:
        """ML 모델로 협력사 점수 예측."""
        ...

    @abstractmethod
    async def batch_predict(self, features_list: list[VendorScoreFeatures]) -> list[VendorScorePrediction]:
        """배치 예측."""
        ...


class RemoteMLVendorScoreConnector(VendorScoreMLConnector):
    """외부 ML 서비스 HTTP 연동 stub (SageMaker endpoint 등)."""

    def __init__(self, endpoint_url: str, api_key: str) -> None:
        self.endpoint_url = endpoint_url
        self.api_key = api_key

    async def predict(self, features: VendorScoreFeatures) -> VendorScorePrediction:
        # TODO: POST {endpoint_url}/predict with features payload
        raise NotImplementedError("RemoteMLVendorScoreConnector는 아직 구현되지 않았습니다.")

    async def batch_predict(self, features_list: list[VendorScoreFeatures]) -> list[VendorScorePrediction]:
        raise NotImplementedError("RemoteMLVendorScoreConnector는 아직 구현되지 않았습니다.")


def get_score_connector() -> VendorScoreMLConnector | None:
    """None 반환 시 기존 rule-based vendor_score.py 사용."""
    return None
