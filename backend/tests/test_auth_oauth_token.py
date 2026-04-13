import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
class TestAuthOAuthToken:
    async def test_token_endpoint_returns_bearer_token(self, client: AsyncClient, test_user):
        response = await client.post(
            "/api/auth/token",
            data={"username": test_user.email, "password": "TestPass123"},
        )

        assert response.status_code == 200
        body = response.json()
        assert body["access_token"]
        assert body["token_type"] == "bearer"

    async def test_token_endpoint_rejects_invalid_credentials(self, client: AsyncClient, test_user):
        response = await client.post(
            "/api/auth/token",
            data={"username": test_user.email, "password": "WrongPass"},
        )

        assert response.status_code == 401
        assert response.json()["detail"] == "Incorrect email or password"

    async def test_token_endpoint_requires_form_data(self, client: AsyncClient):
        response = await client.post(
            "/api/auth/token",
            json={"username": "test@example.com", "password": "TestPass123"},
        )

        assert response.status_code == 422
