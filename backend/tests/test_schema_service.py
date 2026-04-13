import pytest
from unittest.mock import AsyncMock, MagicMock

from app.services.schema_service import SchemaService


class MockResult:
    def __init__(self, rows):
        self._rows = rows

    def fetchall(self):
        return self._rows


def create_mock_db(dialect_name: str, execute_side_effect):
    db = AsyncMock()
    db.bind = MagicMock()
    db.bind.dialect = MagicMock()
    db.bind.dialect.name = dialect_name
    db.execute = AsyncMock(side_effect=execute_side_effect)
    return db


@pytest.mark.asyncio
class TestSchemaService:
    async def test_get_database_schema_returns_tables_and_columns_for_mysql(self):
        db = create_mock_db("mysql", [
            MockResult([("employees",), ("departments",)]),
            MockResult([
                ("id", "int", "NO", "PRI", ""),
                ("name", "varchar", "YES", "", ""),
            ]),
            MockResult([
                ("dept_id", "departments", "id"),
            ]),
            MockResult([
                ("dept_id", "int", "NO", "PRI", ""),
            ]),
            MockResult([]),
        ])

        schema = await SchemaService.get_database_schema(db, "sql_agent_db")

        assert schema["tables"][0]["table_name"] == "employees"
        assert schema["tables"][1]["table_name"] == "departments"

        employees = schema["tables"][0]
        assert len(employees["columns"]) == 2
        assert employees["columns"][0]["column_name"] == "id"
        assert employees["columns"][0]["is_primary_key"] is True
        assert employees["foreign_keys"][0]["references_table"] == "departments"

    async def test_get_database_schema_returns_tables_and_columns_for_sqlite(self):
        db = create_mock_db("sqlite", [
            MockResult([("employees",), ("departments",)]),
            MockResult([
                (0, "id", "INTEGER", 0, None, 1),
                (1, "name", "TEXT", 1, None, 0),
            ]),
            MockResult([(0, 0, "departments", "dept_id", "id", "NO", "NO", "NONE")]),
            MockResult([
                (0, "dept_id", "INTEGER", 0, None, 1),
                (1, "title", "TEXT", 1, None, 0),
            ]),
            MockResult([]),
        ])

        schema = await SchemaService.get_database_schema(db, "sql_agent_db")

        assert schema["tables"][0]["table_name"] == "employees"
        assert schema["tables"][1]["table_name"] == "departments"

        employees = schema["tables"][0]
        assert len(employees["columns"]) == 2
        assert employees["columns"][0]["column_name"] == "id"
        assert employees["columns"][0]["is_primary_key"] is True
        assert employees["foreign_keys"][0]["references_table"] == "departments"

    async def test_get_database_schema_returns_empty_when_no_tables(self):
        db = create_mock_db("sqlite", [MockResult([])])

        schema = await SchemaService.get_database_schema(db, "sql_agent_db")

        assert schema == {"tables": []}

    async def test_get_table_schema_handles_no_foreign_keys(self):
        db = create_mock_db("mysql", [
            MockResult([("products",)]),
            MockResult([
                ("id", "int", "NO", "PRI", ""),
                ("name", "varchar", "NO", "", ""),
            ]),
            MockResult([]),
        ])

        schema = await SchemaService.get_database_schema(db, "sql_agent_db")

        assert len(schema["tables"]) == 1
        table = schema["tables"][0]
        assert table["primary_key"] == "id"
        assert table["foreign_keys"] == []

    async def test_get_table_schema_handles_partial_column_metadata(self):
        db = create_mock_db("mysql", [
            MockResult([("customers",)]),
            MockResult([
                ("id", "int", "NO", "PRI", "auto_increment"),
                ("email", "varchar", "YES", "", ""),
            ]),
            MockResult([]),
        ])

        schema = await SchemaService.get_database_schema(db, "sql_agent_db")
        customer = schema["tables"][0]
        assert customer["columns"][0]["is_auto_increment"] is True
        assert customer["columns"][1]["is_nullable"] == "YES"
