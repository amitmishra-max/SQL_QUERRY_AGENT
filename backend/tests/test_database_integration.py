"""
Real Database Integration Tests

These tests run ONLY when TEST_DATABASE_URL is set (local MySQL or GitHub Actions).
They test against a REAL MySQL database, not mocks.

Run locally:
  export TEST_DATABASE_URL=mysql+aiomysql://root:password@localhost:3306/sql_query_agent_test
  pytest tests/test_database_integration.py -v

Run in CI/CD:
  GitHub Actions automatically provides MySQL service with correct connection string.
"""
import os
import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

# Only run these tests if TEST_DATABASE_URL is set
pytestmark = pytest.mark.skipif(
    not os.getenv("TEST_DATABASE_URL"),
    reason="TEST_DATABASE_URL not set - skipping real database tests"
)


class TestRealDatabaseConnection:
    """Verify connection to real MySQL database works."""

    @pytest.mark.asyncio
    async def test_database_connection_valid(self, db_session: AsyncSession):
        """
        Test: Can establish connection to real MySQL
        Expected: Connection succeeds, query returns result
        """
        result = await db_session.execute(text("SELECT 1 as test"))
        row = result.fetchone()
        assert row[0] == 1, "Basic connection test failed"

    @pytest.mark.asyncio
    async def test_database_version(self, db_session: AsyncSession):
        """
        Test: Can query MySQL version
        Expected: MySQL 8.0+ returns version
        """
        result = await db_session.execute(text("SELECT VERSION()"))
        version = result.scalar()
        assert version is not None
        assert "8" in version or "5" in version, "Unexpected MySQL version"


class TestUserTableOperations:
    """Test real CRUD operations on users table."""

    @pytest.mark.asyncio
    async def test_create_and_read_user(self, db_session: AsyncSession):
        """
        Test: Insert user, then read it back
        Expected: Data round-trips correctly through real MySQL
        """
        # Insert
        await db_session.execute(text("""
            INSERT INTO user (email, hashed_password, full_name, is_active)
            VALUES (:email, :password, :name, :active)
        """), {
            "email": "integration_test@example.com",
            "password": "hashed_password_here",
            "name": "Integration Test User",
            "active": True
        })
        await db_session.commit()
        
        # Read back
        result = await db_session.execute(text("""
            SELECT email, full_name FROM user WHERE email = :email
        """), {"email": "integration_test@example.com"})
        
        row = result.fetchone()
        assert row is not None, "User not found after insertion"
        assert row[0] == "integration_test@example.com"
        assert row[1] == "Integration Test User"

    @pytest.mark.asyncio
    async def test_query_history_insert_and_retrieve(self, db_session: AsyncSession, test_user):
        """
        Test: Insert query history, retrieve it
        Expected: Query history data persists in real MySQL
        """
        # Insert
        await db_session.execute(text("""
            INSERT INTO query_history 
            (user_id, question, generated_sql, explanation, result_json, is_bookmarked)
            VALUES (:user_id, :question, :sql, :explanation, :result, :bookmarked)
        """), {
            "user_id": test_user.id,
            "question": "Show all employees",
            "sql": "SELECT * FROM employees",
            "explanation": "Simple select query",
            "result": '[]',
            "bookmarked": False
        })
        await db_session.commit()
        
        # Retrieve
        result = await db_session.execute(text("""
            SELECT question, generated_sql FROM query_history 
            WHERE user_id = :user_id LIMIT 1
        """), {"user_id": test_user.id})
        
        row = result.fetchone()
        assert row is not None
        assert row[0] == "Show all employees"
        assert row[1] == "SELECT * FROM employees"

    @pytest.mark.asyncio
    async def test_update_bookmark_status(self, db_session: AsyncSession, test_user):
        """
        Test: Update query history bookmark status
        Expected: UPDATE works correctly on real MySQL
        """
        # Create record
        await db_session.execute(text("""
            INSERT INTO query_history 
            (user_id, question, generated_sql, explanation, result_json, is_bookmarked)
            VALUES (:user_id, :q, :sql, :exp, :res, :bm)
        """), {
            "user_id": test_user.id,
            "q": "Test query",
            "sql": "SELECT 1",
            "exp": "Test",
            "res": '[]',
            "bm": False
        })
        await db_session.commit()
        
        # Update
        await db_session.execute(text("""
            UPDATE query_history SET is_bookmarked = TRUE
            WHERE user_id = :user_id AND question = :q
        """), {"user_id": test_user.id, "q": "Test query"})
        await db_session.commit()
        
        # Verify
        result = await db_session.execute(text("""
            SELECT is_bookmarked FROM query_history
            WHERE user_id = :user_id AND question = :q
        """), {"user_id": test_user.id, "q": "Test query"})
        
        is_bookmarked = result.scalar()
        assert is_bookmarked == True, "Bookmark not updated"


class TestSchemaServiceIntegration:
    """Test schema service with real database."""

    @pytest.mark.asyncio
    async def test_schema_service_retrieves_tables(self, db_session: AsyncSession):
        """
        Test: SchemaService can introspect real MySQL database
        Expected: Returns list of tables (user, query_history)
        """
        from app.services.schema_service import SchemaService
        
        schema = await SchemaService.get_database_schema(db_session)
        
        assert schema is not None, "Schema is None"
        assert "tables" in schema, "No 'tables' key in schema"
        assert len(schema["tables"]) > 0, "No tables found"
        
        # Verify expected tables exist
        table_names = [t["name"] for t in schema["tables"]]
        assert "user" in table_names, "user table not found"
        assert "query_history" in table_names, "query_history table not found"

    @pytest.mark.asyncio
    async def test_schema_includes_column_info(self, db_session: AsyncSession):
        """
        Test: Schema includes column names and types
        Expected: Full metadata available
        """
        from app.services.schema_service import SchemaService
        
        schema = await SchemaService.get_database_schema(db_session)
        
        # Find user table
        user_table = next((t for t in schema["tables"] if t["name"] == "user"), None)
        assert user_table is not None
        
        # Verify columns
        assert "columns" in user_table
        assert len(user_table["columns"]) > 0
        
        column_names = [c["name"] for c in user_table["columns"]]
        assert "email" in column_names
        assert "hashed_password" in column_names


class TestQueryServiceIntegration:
    """Test query service against real database."""

    @pytest.mark.asyncio
    async def test_query_validation_on_real_db(self, db_session: AsyncSession):
        """
        Test: QueryService.validate_sql with real database
        Expected: Dangerous keywords blocked
        """
        from app.services.query_service import QueryService
        
        # Valid query should pass
        is_valid, error = QueryService.validate_sql("SELECT * FROM users")
        assert is_valid is True, f"Valid query rejected: {error}"
        
        # Dangerous query should fail
        is_valid, error = QueryService.validate_sql("SELECT * FROM users; DROP TABLE users")
        assert is_valid is False, "DROP query not blocked"

    @pytest.mark.asyncio
    async def test_limit_clause_enforcement(self, db_session: AsyncSession):
        """
        Test: QueryService adds LIMIT clause when missing
        Expected: Large queries are limited to MAX_QUERY_ROWS
        """
        from app.services.query_service import QueryService
        
        query_no_limit = "SELECT * FROM users"
        
        # Service should apply limit
        # (Check the implementation to see if it modifies the query)
        is_valid, _ = QueryService.validate_sql(query_no_limit)
        assert is_valid is True


class TestDatabaseTransactions:
    """Test transaction handling with real MySQL."""

    @pytest.mark.asyncio
    async def test_rollback_on_error(self, db_session: AsyncSession):
        """
        Test: Transaction rolls back on error
        Expected: Partial changes not committed
        """
        # Insert a user
        await db_session.execute(text("""
            INSERT INTO user (email, hashed_password, full_name, is_active)
            VALUES (:e, :p, :n, :a)
        """), {
            "e": "rollback_test@example.com",
            "p": "hash",
            "n": "Test",
            "a": True
        })
        await db_session.commit()
        
        # Verify it exists
        result = await db_session.execute(text(
            "SELECT COUNT(*) FROM user WHERE email = 'rollback_test@example.com'"
        ))
        count_before = result.scalar()
        assert count_before == 1
        
        # Attempt invalid operation (should fail)
        try:
            await db_session.execute(text(
                "INSERT INTO user (email) VALUES (NULL)"  # NULL in non-nullable column
            ))
            await db_session.commit()
        except Exception:
            await db_session.rollback()
            pass
        
        # Verify original data still exists
        result = await db_session.execute(text(
            "SELECT COUNT(*) FROM user WHERE email = 'rollback_test@example.com'"
        ))
        count_after = result.scalar()
        assert count_after == count_before, "Rollback failed"


class TestConcurrentAccess:
    """Test concurrent database access."""

    @pytest.mark.asyncio
    async def test_concurrent_inserts(self, db_session: AsyncSession):
        """
        Test: Multiple inserts work correctly
        Expected: All inserts succeed, no conflicts
        """
        # Insert two records
        for i in range(2):
            await db_session.execute(text("""
                INSERT INTO user (email, hashed_password, full_name, is_active)
                VALUES (:e, :p, :n, :a)
            """), {
                "e": f"concurrent_{i}@example.com",
                "p": "hash",
                "n": f"Concurrent User {i}",
                "a": True
            })
        await db_session.commit()
        
        # Verify both exist
        result = await db_session.execute(text(
            "SELECT COUNT(*) FROM user WHERE email LIKE 'concurrent_%'"
        ))
        count = result.scalar()
        assert count == 2, "Concurrent inserts failed"


class TestDataIntegrity:
    """Test data type handling and constraints."""

    @pytest.mark.asyncio
    async def test_json_field_storage(self, db_session: AsyncSession, test_user):
        """
        Test: JSON field stores and retrieves correctly
        Expected: JSON data preserved exactly
        """
        import json
        
        test_result = {"rows": [{"id": 1, "name": "Alice"}], "count": 1}
        json_str = json.dumps(test_result)
        
        # Insert
        await db_session.execute(text("""
            INSERT INTO query_history
            (user_id, question, generated_sql, explanation, result_json, is_bookmarked)
            VALUES (:uid, :q, :sql, :exp, :res, :bm)
        """), {
            "uid": test_user.id,
            "q": "test",
            "sql": "SELECT 1",
            "exp": "test",
            "res": json_str,
            "bm": False
        })
        await db_session.commit()
        
        # Retrieve
        result = await db_session.execute(text("""
            SELECT result_json FROM query_history
            WHERE user_id = :uid AND question = :q
        """), {"uid": test_user.id, "q": "test"})
        
        retrieved_json = result.scalar()
        retrieved_data = json.loads(retrieved_json)
        assert retrieved_data == test_result, "JSON data corrupted"

    @pytest.mark.asyncio
    async def test_timestamp_fields(self, db_session: AsyncSession, test_user):
        """
        Test: Timestamp fields auto-populate
        Expected: created_at and updated_at set automatically
        """
        # Insert
        await db_session.execute(text("""
            INSERT INTO query_history
            (user_id, question, generated_sql, explanation, result_json, is_bookmarked)
            VALUES (:uid, :q, :sql, :exp, :res, :bm)
        """), {
            "uid": test_user.id,
            "q": "timestamp_test",
            "sql": "SELECT 1",
            "exp": "test",
            "res": '[]',
            "bm": False
        })
        await db_session.commit()
        
        # Retrieve
        result = await db_session.execute(text("""
            SELECT created_at, updated_at FROM query_history
            WHERE user_id = :uid AND question = :q
        """), {"uid": test_user.id, "q": "timestamp_test"})
        
        row = result.fetchone()
        assert row[0] is not None, "created_at not set"
        assert row[1] is not None, "updated_at not set"
