"""보안 관련 단위 테스트."""
from __future__ import annotations

import pytest

from app.core.audit import _mask
from app.core.security import validate_password_policy


class TestPasswordPolicy:
    def test_valid_password(self):
        assert validate_password_policy("Admin1234!") == "Admin1234!"

    def test_too_short(self):
        with pytest.raises(ValueError):
            validate_password_policy("Ab1!")

    def test_no_uppercase(self):
        with pytest.raises(ValueError):
            validate_password_policy("admin1234!")

    def test_no_lowercase(self):
        with pytest.raises(ValueError):
            validate_password_policy("ADMIN1234!")

    def test_no_digit(self):
        with pytest.raises(ValueError):
            validate_password_policy("AdminPass!")

    def test_no_special_char(self):
        with pytest.raises(ValueError):
            validate_password_policy("Admin12345")


class TestAuditMask:
    def test_masks_phone(self):
        result = _mask({"company_name": "테스트", "phone": "010-1234-5678"})
        assert result["phone"] == "***"
        assert result["company_name"] == "테스트"

    def test_masks_business_no(self):
        result = _mask({"business_no": "123-45-67890"})
        assert result["business_no"] == "***"

    def test_none_input_returns_none(self):
        assert _mask(None) is None

    def test_empty_dict(self):
        assert _mask({}) == {}

    def test_non_sensitive_fields_unchanged(self):
        result = _mask({"company_name": "abc", "email": "x@y.com"})
        assert result == {"company_name": "abc", "email": "x@y.com"}
