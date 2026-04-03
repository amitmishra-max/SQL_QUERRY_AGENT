"""
Unit tests for app.core.security module.
Covers: password hashing, JWT creation, JWT decoding.
"""
import pytest
from datetime import timedelta, datetime
from unittest.mock import patch

from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    decode_token,
)


class TestPasswordHashing:
    """Tests for bcrypt password hashing and verification."""

    def test_password_hashing_and_verification(self):
        """A hashed password should verify against the original plain text."""
        # Arrange
        plain = "MySecurePass1"

        # Act
        hashed = get_password_hash(plain)

        # Assert
        assert verify_password(plain, hashed) is True

    def test_password_hash_does_not_match_wrong_password(self):
        """Verification with a wrong password should return False."""
        # Arrange
        hashed = get_password_hash("CorrectPassword")

        # Act & Assert
        assert verify_password("WrongPassword", hashed) is False

    def test_password_exceeding_30_chars_raises_error(self):
        """Passwords longer than 30 characters should raise ValueError."""
        # Arrange
        long_password = "a" * 31

        # Act & Assert
        with pytest.raises(ValueError, match="30 characters"):
            get_password_hash(long_password)

    def test_password_exactly_30_chars_succeeds(self):
        """A password of exactly 30 characters should be accepted."""
        # Arrange
        password = "a" * 30

        # Act
        hashed = get_password_hash(password)

        # Assert
        assert verify_password(password, hashed) is True


class TestJWT:
    """Tests for JWT token creation and decoding."""

    def test_create_access_token_contains_sub_and_exp(self):
        """Token payload should contain 'sub' and 'exp' claims."""
        # Arrange & Act
        token = create_access_token(data={"sub": "42"})
        payload = decode_token(token)

        # Assert
        assert payload is not None
        assert payload["sub"] == "42"
        assert "exp" in payload

    def test_create_access_token_with_custom_expiry(self):
        """Token with custom expiry delta should have matching exp claim."""
        # Arrange
        delta = timedelta(minutes=5)

        # Act
        token = create_access_token(data={"sub": "1"}, expires_delta=delta)
        payload = decode_token(token)

        # Assert
        assert payload is not None
        exp_time = datetime.utcfromtimestamp(payload["exp"])
        # The expiry should be ~5 min from now (allow 10s tolerance)
        diff = (exp_time - datetime.utcnow()).total_seconds()
        assert 290 < diff < 310  # roughly 5 minutes

    def test_decode_valid_token(self):
        """A valid token should decode to a dict with the original claims."""
        # Arrange
        token = create_access_token(data={"sub": "99", "role": "admin"})

        # Act
        payload = decode_token(token)

        # Assert
        assert payload is not None
        assert payload["sub"] == "99"

    def test_decode_invalid_token_returns_none(self):
        """A malformed/tampered token should return None."""
        # Arrange
        bad_token = "this.is.not.a.valid.jwt"

        # Act
        result = decode_token(bad_token)

        # Assert
        assert result is None

    def test_decode_expired_token_returns_none(self):
        """An expired token should return None on decode."""
        # Arrange — create a token that expired 1 hour ago
        token = create_access_token(
            data={"sub": "1"},
            expires_delta=timedelta(hours=-1),
        )

        # Act
        result = decode_token(token)

        # Assert
        assert result is None
