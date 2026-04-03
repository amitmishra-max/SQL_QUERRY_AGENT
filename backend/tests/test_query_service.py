"""
Unit tests for app.services.query_service.QueryService.
Covers: SQL validation whitelist/blacklist logic.
"""
import pytest
from app.services.query_service import QueryService


class TestValidateSql:
    """Tests for QueryService.validate_sql static method."""

    def test_validate_simple_select_passes(self):
        """A basic SELECT query should pass validation."""
        # Arrange
        query = "SELECT * FROM employees"

        # Act
        is_valid, error = QueryService.validate_sql(query)

        # Assert
        assert is_valid is True
        assert error == ""

    def test_validate_select_with_trailing_semicolon_passes(self):
        """SELECT with a single trailing semicolon should be valid."""
        # Arrange
        query = "SELECT id, name FROM users;"

        # Act
        is_valid, error = QueryService.validate_sql(query)

        # Assert
        assert is_valid is True
        assert error == ""

    def test_validate_select_with_joins_passes(self):
        """Complex SELECT with JOINs and WHERE should pass."""
        # Arrange
        query = (
            "SELECT e.name, d.name FROM employees e "
            "JOIN departments d ON e.dept_id = d.id "
            "WHERE e.salary > 50000"
        )

        # Act
        is_valid, error = QueryService.validate_sql(query)

        # Assert
        assert is_valid is True

    def test_validate_insert_query_fails(self):
        """INSERT query should be rejected."""
        # Arrange
        query = "INSERT INTO users (name) VALUES ('hacker')"

        # Act
        is_valid, error = QueryService.validate_sql(query)

        # Assert
        assert is_valid is False
        assert "SELECT" in error

    def test_validate_update_query_fails(self):
        """UPDATE query should be rejected."""
        # Arrange
        query = "UPDATE users SET name='hacked'"

        # Act
        is_valid, error = QueryService.validate_sql(query)

        # Assert
        assert is_valid is False

    def test_validate_delete_query_fails(self):
        """DELETE query should be rejected."""
        # Arrange
        query = "DELETE FROM users"

        # Act
        is_valid, error = QueryService.validate_sql(query)

        # Assert
        assert is_valid is False

    @pytest.mark.parametrize("keyword", [
        "DROP", "DELETE", "TRUNCATE", "ALTER", "INSERT",
        "UPDATE", "CREATE", "GRANT", "REVOKE", "EXEC",
        "EXECUTE", "SHOW", "DESCRIBE",
    ])
    def test_validate_select_with_dangerous_keyword_fails(self, keyword):
        """SELECT containing a dangerous keyword should be blocked."""
        # Arrange — embed keyword as a subquery trick attempt
        query = f"SELECT * FROM users; {keyword} TABLE users"

        # Act
        is_valid, error = QueryService.validate_sql(query)

        # Assert
        assert is_valid is False

    def test_validate_multiple_statements_fails(self):
        """Multiple statements separated by semicolons should fail."""
        # Arrange
        query = "SELECT 1; SELECT 2;"

        # Act
        is_valid, error = QueryService.validate_sql(query)

        # Assert
        assert is_valid is False
        assert "Multiple statements" in error or "Semicolon" in error

    def test_validate_semicolon_in_middle_fails(self):
        """A semicolon in the middle of a query should fail."""
        # Arrange
        query = "SELECT 1; SELECT 2"

        # Act
        is_valid, error = QueryService.validate_sql(query)

        # Assert
        assert is_valid is False

    def test_validate_drop_table_in_select_fails(self):
        """SQL injection attempt with DROP inside a SELECT should fail."""
        # Arrange
        query = "SELECT * FROM users WHERE 1=1; DROP TABLE users;"

        # Act
        is_valid, error = QueryService.validate_sql(query)

        # Assert
        assert is_valid is False

    def test_validate_empty_query_fails(self):
        """An empty string should not pass validation."""
        # Arrange
        query = ""

        # Act
        is_valid, error = QueryService.validate_sql(query)

        # Assert
        assert is_valid is False
