"""
Integration tests for /api/query endpoints.
Covers: /api/query/ask (with mocked LLM), /api/query/schema.
All LLM calls are mocked — no real network requests.
"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from httpx import AsyncClient
from sqlalchemy import select, func

from app.models.query_history import QueryHistory


@pytest.mark.asyncio
class TestAskQuestion:
    """Tests for POST /api/query/ask."""

    async def test_ask_question_requires_auth(self, client: AsyncClient):
        """Calling /ask without a token should return 401."""
        response = await client.post(
            "/api/query/ask",
            json={"question": "Show all employees"},
        )
        assert response.status_code == 401

    @patch("app.api.query.get_target_db_session")
    @patch("app.api.query.llm_service")
    @patch("app.api.query.schema_service")
    @patch("app.api.query.query_service")
    async def test_ask_question_returns_sql_and_results(
        self,
        mock_query_svc,
        mock_schema_svc,
        mock_llm_svc,
        mock_get_target,
        client,
        auth_headers,
    ):
        """Happy path: LLM returns valid SQL, query executes, results returned."""
        # Arrange — mock the target DB session
        mock_session = AsyncMock()
        mock_engine = MagicMock()
        mock_engine.url.database = "test_db"
        mock_engine.dispose = AsyncMock()
        mock_get_target.return_value = (mock_session, mock_engine)

        # Mock schema
        mock_schema_svc.get_database_schema = AsyncMock(return_value={
            "tables": [{"table_name": "employees", "columns": []}]
        })

        # Mock LLM response
        mock_llm_svc.generate_sql = AsyncMock(return_value={
            "sql": "SELECT * FROM employees",
            "explanation": "Fetches all employees",
        })

        # Mock SQL validation
        mock_query_svc.validate_sql.return_value = (True, "")

        # Mock query execution
        mock_query_svc.execute_query = AsyncMock(return_value={
            "success": True,
            "columns": ["id", "name"],
            "rows": [{"id": 1, "name": "Alice"}],
            "row_count": 1,
        })

        # Act
        response = await client.post(
            "/api/query/ask",
            json={"question": "Show all employees"},
            headers=auth_headers,
        )

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["sql"] == "SELECT * FROM employees"
        assert data["explanation"] == "Fetches all employees"
        assert len(data["result"]) == 1

    @patch("app.api.query.get_target_db_session")
    @patch("app.api.query.llm_service")
    @patch("app.api.query.schema_service")
    @patch("app.api.query.query_service")
    async def test_ask_question_saves_to_history(
        self,
        mock_query_svc,
        mock_schema_svc,
        mock_llm_svc,
        mock_get_target,
        client,
        auth_headers,
        test_user,
        db_session,
    ):
        """After a successful ask, a query_history row exists for the user."""
        mock_session = AsyncMock()
        mock_engine = MagicMock()
        mock_engine.url.database = "test_db"
        mock_engine.dispose = AsyncMock()
        mock_get_target.return_value = (mock_session, mock_engine)

        mock_schema_svc.get_database_schema = AsyncMock(return_value={"tables": []})
        mock_llm_svc.generate_sql = AsyncMock(return_value={
            "sql": "SELECT 1",
            "explanation": "Constant",
        })
        mock_query_svc.validate_sql.return_value = (True, "")
        mock_query_svc.execute_query = AsyncMock(return_value={
            "success": True,
            "columns": ["x"],
            "rows": [{"x": 1}],
            "row_count": 1,
        })

        n_before = (
            await db_session.execute(
                select(func.count()).select_from(QueryHistory).where(
                    QueryHistory.user_id == test_user.id
                )
            )
        ).scalar_one()

        response = await client.post(
            "/api/query/ask",
            json={"question": "What is one?"},
            headers=auth_headers,
        )

        assert response.status_code == 200

        n_after = (
            await db_session.execute(
                select(func.count()).select_from(QueryHistory).where(
                    QueryHistory.user_id == test_user.id
                )
            )
        ).scalar_one()
        assert n_after == n_before + 1

    @patch("app.api.query.get_target_db_session")
    @patch("app.api.query.llm_service")
    @patch("app.api.query.schema_service")
    @patch("app.api.query.query_service")
    async def test_ask_question_with_invalid_sql_returns_error(
        self,
        mock_query_svc,
        mock_schema_svc,
        mock_llm_svc,
        mock_get_target,
        client,
        auth_headers,
    ):
        """When LLM produces invalid SQL, validation should catch it and return an error."""
        # Arrange
        mock_session = AsyncMock()
        mock_engine = MagicMock()
        mock_engine.url.database = "test_db"
        mock_engine.dispose = AsyncMock()
        mock_get_target.return_value = (mock_session, mock_engine)

        mock_schema_svc.get_database_schema = AsyncMock(return_value={"tables": []})
        mock_llm_svc.generate_sql = AsyncMock(return_value={
            "sql": "DROP TABLE users",
            "explanation": "Malicious query",
        })
        mock_query_svc.validate_sql.return_value = (False, "Query contains forbidden keyword: DROP")

        # Act
        response = await client.post(
            "/api/query/ask",
            json={"question": "Drop the users table"},
            headers=auth_headers,
        )

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["error"] is not None
        assert "DROP" in data["error"]

    @patch("app.api.query.get_target_db_session")
    @patch("app.api.query.llm_service")
    @patch("app.api.query.schema_service")
    async def test_ask_question_when_llm_returns_empty_sql(
        self,
        mock_schema_svc,
        mock_llm_svc,
        mock_get_target,
        client,
        auth_headers,
    ):
        """When LLM fails to generate SQL, error should be returned."""
        # Arrange
        mock_session = AsyncMock()
        mock_engine = MagicMock()
        mock_engine.url.database = "test_db"
        mock_engine.dispose = AsyncMock()
        mock_get_target.return_value = (mock_session, mock_engine)

        mock_schema_svc.get_database_schema = AsyncMock(return_value={"tables": []})
        mock_llm_svc.generate_sql = AsyncMock(return_value={
            "sql": "",
            "explanation": "",
            "error": "Both primary and fallback LLMs failed.",
        })

        # Act
        response = await client.post(
            "/api/query/ask",
            json={"question": "Something impossible"},
            headers=auth_headers,
        )

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["error"] is not None


@pytest.mark.asyncio
class TestSchemaEndpoint:
    """Tests for POST /api/query/schema."""

    async def test_schema_requires_auth(self, client):
        """Schema endpoint without auth should return 401."""
        response = await client.post("/api/query/schema", json={})
        assert response.status_code == 401

    @patch("app.api.query.get_target_db_session")
    @patch("app.api.query.schema_service")
    async def test_schema_endpoint_returns_tables(
        self, mock_schema_svc, mock_get_target, client, auth_headers
    ):
        """Authenticated schema call returns payload including tables list."""
        mock_session = AsyncMock()
        mock_engine = MagicMock()
        mock_engine.url.database = "test_db"
        mock_engine.dispose = AsyncMock()
        mock_get_target.return_value = (mock_session, mock_engine)

        mock_schema_svc.get_database_schema = AsyncMock(return_value={
            "tables": [
                {
                    "table_name": "employees",
                    "columns": [],
                    "foreign_keys": [],
                },
            ],
        })

        response = await client.post(
            "/api/query/schema",
            json={},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert "tables" in data
        assert len(data["tables"]) == 1
        assert data["tables"][0]["table_name"] == "employees"

    async def test_query_endpoints_require_authentication(self, client):
        """Ask and schema return 401 when unauthenticated."""
        ask = await client.post(
            "/api/query/ask",
            json={"question": "x"},
        )
        schema = await client.post("/api/query/schema", json={})
        assert ask.status_code == 401
        assert schema.status_code == 401
