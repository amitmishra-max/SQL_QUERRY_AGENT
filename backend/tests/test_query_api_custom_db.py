import pytest
from unittest.mock import AsyncMock, MagicMock, patch


@pytest.mark.asyncio
class TestQueryApiCustomDB:
    @patch("app.api.query.get_target_db_session")
    @patch("app.api.query.schema_service")
    async def test_schema_endpoint_with_custom_connection_string(
        self, mock_schema_svc, mock_get_target, client, auth_headers
    ):
        mock_session = AsyncMock()
        mock_engine = MagicMock()
        mock_engine.url.database = "custom_db"
        mock_engine.dispose = AsyncMock()
        mock_get_target.return_value = (mock_session, mock_engine)

        mock_schema_svc.get_database_schema = AsyncMock(return_value={
            "tables": [{"table_name": "employees", "columns": [], "foreign_keys": []}]
        })

        response = await client.post(
            "/api/query/schema",
            json={"connection_string": "sqlite+aiosqlite://"},
            headers=auth_headers,
        )

        assert response.status_code == 200
        assert response.json()["tables"][0]["table_name"] == "employees"

    @patch("app.api.query.get_target_db_session")
    @patch("app.api.query.llm_service")
    @patch("app.api.query.schema_service")
    @patch("app.api.query.query_service")
    async def test_ask_question_with_custom_connection_string(
        self, mock_query_svc, mock_schema_svc, mock_llm_svc, mock_get_target, client, auth_headers
    ):
        mock_session = AsyncMock()
        mock_engine = MagicMock()
        mock_engine.url.database = "custom_db"
        mock_engine.dispose = AsyncMock()
        mock_get_target.return_value = (mock_session, mock_engine)

        mock_schema_svc.get_database_schema = AsyncMock(return_value={"tables": []})
        mock_llm_svc.generate_sql = AsyncMock(return_value={
            "sql": "SELECT 1",
            "explanation": "OK",
        })
        mock_query_svc.validate_sql.return_value = (True, "")
        mock_query_svc.execute_query = AsyncMock(return_value={
            "success": True,
            "columns": ["x"],
            "rows": [{"x": 1}],
            "row_count": 1,
        })

        response = await client.post(
            "/api/query/ask",
            json={"question": "Show one", "connection_string": "sqlite+aiosqlite://"},
            headers=auth_headers,
        )

        assert response.status_code == 200
        assert response.json()["sql"] == "SELECT 1"

    @patch("app.api.query.get_target_db_session")
    async def test_schema_endpoint_invalid_connection_string_returns_400(
        self, mock_get_target, client, auth_headers
    ):
        mock_get_target.side_effect = Exception("Invalid database URL")

        response = await client.post(
            "/api/query/schema",
            json={"connection_string": "invalid://"},
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "Failed to connect" in response.json()["detail"]

    @patch("app.api.query.get_target_db_session")
    async def test_ask_question_invalid_connection_string_returns_400(
        self, mock_get_target, client, auth_headers
    ):
        mock_get_target.side_effect = Exception("Invalid database URL")

        response = await client.post(
            "/api/query/ask",
            json={"question": "Show all", "connection_string": "invalid://"},
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "Failed to connect" in response.json()["detail"]
