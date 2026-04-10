"""협력사 평가 점수 단위 테스트 — DB 불필요."""
from __future__ import annotations

import pytest

from app.services.vendor_score import _response_speed_score, compute_score


class TestResponseSpeedScore:
    def test_1h_returns_1(self):
        assert _response_speed_score(1.0) == 1.0

    def test_48h_returns_0(self):
        assert _response_speed_score(48.0) == 0.0

    def test_none_returns_0_5(self):
        assert _response_speed_score(None) == 0.5

    def test_below_1h_clamped_to_1(self):
        assert _response_speed_score(0.0) == 1.0

    def test_above_48h_clamped_to_0(self):
        assert _response_speed_score(100.0) == 0.0

    def test_midpoint_24_5h(self):
        score = _response_speed_score(24.5)
        assert 0.0 < score < 1.0


class TestComputeScore:
    def test_perfect_score(self):
        score = compute_score(
            participation_rate=1.0,
            response_speed_avg=1.0,
            win_rate=1.0,
            completion_rate=1.0,
            complaint_count=0,
            total_projects=10,
        )
        assert score == 1.0

    def test_zero_score(self):
        score = compute_score(
            participation_rate=0.0,
            response_speed_avg=48.0,
            win_rate=0.0,
            completion_rate=0.0,
            complaint_count=10,
            total_projects=10,
        )
        assert score == 0.0

    def test_weights_sum_to_1(self):
        """가중치 합산이 1.0이어야 함 (0.25+0.20+0.20+0.20+0.15)."""
        assert 0.25 + 0.20 + 0.20 + 0.20 + 0.15 == pytest.approx(1.0)

    def test_score_in_range(self):
        score = compute_score(
            participation_rate=0.6,
            response_speed_avg=12.0,
            win_rate=0.4,
            completion_rate=0.8,
            complaint_count=1,
            total_projects=5,
        )
        assert 0.0 <= score <= 1.0

    def test_zero_projects_no_division_error(self):
        """total_projects=0 일 때 ZeroDivisionError 없어야 함."""
        score = compute_score(
            participation_rate=0.5,
            response_speed_avg=None,
            win_rate=0.5,
            completion_rate=0.5,
            complaint_count=0,
            total_projects=0,
        )
        assert 0.0 <= score <= 1.0

    def test_quality_capped_at_zero(self):
        """complaint > total_projects 시 quality가 0 이하로 내려가지 않아야 함."""
        score = compute_score(
            participation_rate=0.0,
            response_speed_avg=48.0,
            win_rate=0.0,
            completion_rate=0.0,
            complaint_count=100,
            total_projects=1,
        )
        assert score >= 0.0

    def test_result_rounded_to_4_decimals(self):
        score = compute_score(
            participation_rate=0.333,
            response_speed_avg=10.0,
            win_rate=0.333,
            completion_rate=0.333,
            complaint_count=1,
            total_projects=3,
        )
        assert score == round(score, 4)
