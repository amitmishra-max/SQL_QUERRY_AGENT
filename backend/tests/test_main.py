import pytest


@pytest.mark.asyncio
class TestMainApp:
    async def test_root_endpoint_returns_metadata(self, client):
        response = await client.get("/")

        assert response.status_code == 200
        body = response.json()
        assert body["message"] == "SQL Query Builder Agent API"
        assert body["docs"] == "/docs"
        assert body["version"] == "1.0.0"

    async def test_health_endpoint_returns_healthy(self, client):
        response = await client.get("/health")

        assert response.status_code == 200
        assert response.json() == {"status": "healthy"}
