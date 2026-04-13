import pytest
from unittest.mock import AsyncMock, MagicMock
from datetime import datetime, date
from decimal import Decimal

from app.services.query_service import QueryService


@pytest.mark.asyncio
class TestQueryExecution:
    async def test_execute_query_adds_limit_when_missing(self):
        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.fetchall.return_value = [(1, date(2020, 1, 1), Decimal("12.34"), None)]
        mock_result.keys.return_value = ["id", "created_at", "amount", "notes"]
        mock_db.execute.return_value = mock_result

        response = await QueryService.execute_query(mock_db, "SELECT id, created_at, amount, notes FROM transactions")

        mock_db.execute.assert_awaited()
        assert response["success"] is True
        assert response["row_count"] == 1
        assert response["rows"][0]["created_at"] == "2020-01-01"
        assert response["rows"][0]["amount"] == 12.34
        assert response["rows"][0]["notes"] is None

    async def test_execute_query_preserves_existing_limit(self):
        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.fetchall.return_value = [(1,)]
        mock_result.keys.return_value = ["count"]
        mock_db.execute.return_value = mock_result

        response = await QueryService.execute_query(mock_db, "SELECT COUNT(*) FROM transactions LIMIT 5")

        assert response["success"] is True
        assert response["row_count"] == 1
        # Ensure the query executed contained LIMIT once, not appended twice
        executed_sql = mock_db.execute.call_args.args[0].text
        assert executed_sql.count("LIMIT") == 1

    async def test_execute_query_returns_error_on_exception(self):
        mock_db = AsyncMock()
        mock_db.execute.side_effect = Exception("syntax error")

        response = await QueryService.execute_query(mock_db, "SELECT * FROM invalid")

        assert response["success"] is False
        assert "syntax error" in response["error"]
        assert response["rows"] == []
        assert response["row_count"] == 0
