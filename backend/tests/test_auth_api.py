"""
Integration tests for /api/auth endpoints.
Covers: register, login, /me, token validation.
"""
from datetime import timedelta

import pytest
from httpx import AsyncClient

from app.core.security import create_access_token


@pytest.mark.asyncio
class TestRegister:
    """Tests for POST /api/auth/register."""

    async def test_register_new_user_returns_user_data(self, client: AsyncClient):
        """Registering a new user should return user info with id and email."""
        # Arrange
        payload = {
            "email": "newuser@example.com",
            "password": "SecurePass1",
            "full_name": "New User",
        }

        # Act
        response = await client.post("/api/auth/register", json=payload)

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "newuser@example.com"
        assert data["full_name"] == "New User"
        assert "id" in data
        assert data["is_active"] is True

    async def test_register_duplicate_email_returns_400(self, client: AsyncClient):
        """Registering with an already-used email should return 400."""
        # Arrange
        payload = {
            "email": "duplicate@example.com",
            "password": "Pass123",
            "full_name": "First User",
        }
        await client.post("/api/auth/register", json=payload)

        # Act
        response = await client.post("/api/auth/register", json=payload)

        # Assert
        assert response.status_code == 400
        assert "already registered" in response.json()["detail"].lower()

    async def test_register_password_too_long_returns_error(self, client: AsyncClient):
        """Passwords exceeding 30 characters should be rejected."""
        # Arrange
        payload = {
            "email": "longpass@example.com",
            "password": "a" * 31,
            "full_name": "Long Pass",
        }

        # Act
        response = await client.post("/api/auth/register", json=payload)

        # Assert
        # Either 400 from our handler or 422 from Pydantic Field validation
        assert response.status_code in (400, 422)


@pytest.mark.asyncio
class TestLogin:
    """Tests for POST /api/auth/login."""

    async def test_login_valid_credentials_returns_token(self, client: AsyncClient):
        """Login with correct credentials should return access_token."""
        # Arrange — register first
        await client.post("/api/auth/register", json={
            "email": "logintest@example.com",
            "password": "ValidPass1",
            "full_name": "Login Test",
        })

        # Act
        response = await client.post("/api/auth/login", json={
            "email": "logintest@example.com",
            "password": "ValidPass1",
        })

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    async def test_login_wrong_password_returns_401(self, client: AsyncClient):
        """Login with incorrect password should return 401."""
        # Arrange
        await client.post("/api/auth/register", json={
            "email": "wrongpw@example.com",
            "password": "RightPassword",
            "full_name": "Wrong PW",
        })

        # Act
        response = await client.post("/api/auth/login", json={
            "email": "wrongpw@example.com",
            "password": "WrongPassword",
        })

        # Assert
        assert response.status_code == 401

    async def test_login_nonexistent_email_returns_401(self, client: AsyncClient):
        """Login with an unregistered email should return 401."""
        # Act
        response = await client.post("/api/auth/login", json={
            "email": "nobody@example.com",
            "password": "DoesntMatter",
        })

        # Assert
        assert response.status_code == 401


@pytest.mark.asyncio
class TestGetMe:
    """Tests for GET /api/auth/me."""

    async def test_get_me_with_valid_token(self, client: AsyncClient, auth_headers):
        """Authenticated user should get their info from /me."""
        # Act
        response = await client.get("/api/auth/me", headers=auth_headers)

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "testuser@example.com"

    async def test_get_me_without_token_returns_401(self, client: AsyncClient):
        """Request to /me without token should return 401."""
        # Act
        response = await client.get("/api/auth/me")

        # Assert
        assert response.status_code == 401

    async def test_get_me_with_invalid_token_returns_401(self, client: AsyncClient):
        """Request with a garbage token should return 401."""
        # Act
        response = await client.get(
            "/api/auth/me",
            headers={"Authorization": "Bearer invalid.token.here"},
        )

        # Assert
        assert response.status_code == 401

    async def test_get_me_with_expired_token_returns_401(
        self, client: AsyncClient, test_user
    ):
        """Expired JWT should not grant access to /me."""
        # Arrange
        expired_token = create_access_token(
            data={"sub": str(test_user.id)},
            expires_delta=timedelta(seconds=-60),
        )

        # Act
        response = await client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {expired_token}"},
        )

        # Assert
        assert response.status_code == 401
