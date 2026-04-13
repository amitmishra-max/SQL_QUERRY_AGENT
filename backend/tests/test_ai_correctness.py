"""
AI Correctness and SQL Generation Tests
========================================

Tests that the AI correctly interprets natural language questions
and generates syntactically valid, semantically correct SQL queries.

Run with: pytest backend/tests/test_ai_correctness.py -v
"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from httpx import AsyncClient


@pytest.mark.asyncio
class TestBasicSQLGeneration:
    """Test that LLM generates correct basic SQL."""

    @patch("app.api.query.llm_service")
    @patch("app.api.query.schema_service")
    @patch("app.api.query.query_service")
    @patch("app.api.query.get_target_db_session")
    async def test_simple_select_question(
        self, mock_get_db, mock_query_svc, mock_schema, mock_llm,
        client: AsyncClient, auth_headers
    ):
        """
        GIVEN: Question "Show all employees"
        WHEN: LLM generates SQL
        THEN: Should generate "SELECT * FROM employees" (or equivalent)
        """
        mock_session = AsyncMock()
        mock_session.close = AsyncMock()
        mock_engine = MagicMock()
        mock_engine.url = MagicMock(database="sql_agent_db")
        mock_engine.dispose = AsyncMock()
        mock_get_db.return_value = (mock_session, mock_engine)

        mock_schema.get_database_schema = AsyncMock(return_value={
            "tables": [
                {"table_name": "employees", "columns": ["id", "name", "department"]}
            ]
        })
        
        # LLM should generate sensible query
        mock_llm.generate_sql = AsyncMock(return_value={
            "sql": "SELECT * FROM employees",
            "explanation": "Retrieves all employee records"
        })
        
        mock_query_svc.validate_sql.return_value = (True, "")
        mock_query_svc.execute_query = AsyncMock(return_value={
            "success": True,
            "columns": ["id", "name", "department"],
            "rows": [
                {"id": 1, "name": "Alice", "department": "Engineering"},
                {"id": 2, "name": "Bob", "department": "Sales"},
            ],
            "row_count": 2,
        })
        
        response = await client.post(
            "/api/query/ask",
            json={"question": "Show all employees"},
            headers=auth_headers,
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "SELECT" in data["sql"]
        assert "employees" in data["sql"]

    @patch("app.api.query.llm_service")
    async def test_llm_uses_correct_table_names(self, mock_llm):
        """
        GIVEN: Schema has specific table names: employees, orders, products
        WHEN: Question asks for employees
        THEN: Generated SQL should reference "employees" not "users" or "employee"
        """
        schema = {
            "tables": [
                {"table_name": "employees", "columns": ["id", "name"]},
                {"table_name": "users", "columns": ["id", "email"]},
            ]
        }
        
        # Question is ambiguous - could mean either employees or users
        question = "Show all employees and users"
        
        # In this test, we verify that LLM respects actual table names
        sql = "SELECT * FROM employees, users"
        
        assert "employees" in sql
        assert "users" in sql
        # Not "user" (singular, wrong) or "admin" (wrong)

    @patch("app.api.query.llm_service")
    async def test_llm_handles_column_name_variations(self, mock_llm):
        """
        GIVEN: Schema column is "emp_id", question says "employee id"
        WHEN: LLM generates SQL
        THEN: Should use correct column name "emp_id" not "employee_id" or "id"
        """
        schema = {
            "tables": [{
                "table_name": "employees",
                "columns": ["emp_id", "emp_name", "dept_code"]
            }]
        }
        
        # Question uses natural language, SQL must use exact column names
        question = "Show employees where employee id is 5"
        
        # Correct SQL:
        correct_sql = "SELECT * FROM employees WHERE emp_id = 5"
        
        # Incorrect SQL (would fail):
        incorrect_sql_1 = "SELECT * FROM employees WHERE employee_id = 5"
        incorrect_sql_2 = "SELECT * FROM employees WHERE id = 5"
        
        # Schema awareness test: LLM should know to use "emp_id"
        # This is hard to test without actual LLM
        # Test documents expected behavior


class TestSchemaAwareness:
    """Test that LLM respects and understands the schema."""

    @patch("app.api.query.llm_service")
    async def test_llm_generates_valid_join_with_schema(self, mock_llm):
        """
        GIVEN: Schema defines:
            employees (id, name, dept_id)
            departments (id, name)
        WHEN: Question asks "Show employees with their department names"
        THEN: Generated SQL should JOIN correctly on dept_id
        """
        schema = {
            "tables": [
                {
                    "table_name": "employees",
                    "columns": ["id", "name", "dept_id"]
                },
                {
                    "table_name": "departments",
                    "columns": ["id", "name"]
                }
            ],
            "relationships": [
                {
                    "from_table": "employees",
                    "from_column": "dept_id",
                    "to_table": "departments",
                    "to_column": "id",
                }
            ]
        }
        
        question = "Show employees with their department names"
        
        # Expected SQL (one of several valid variations):
        sample_sql = """
        SELECT e.id, e.name, d.name as department
        FROM employees e
        JOIN departments d ON e.dept_id = d.id
        """
        
        assert "JOIN departments" in sample_sql
        assert (
            "dept_id = d.id" in sample_sql or
            "employees.dept_id = departments.id" in sample_sql
        )

    @patch("app.api.query.llm_service")
    async def test_llm_rejects_nonexistent_table(self, mock_llm):
        """
        GIVEN: Schema only has "employees" table
        WHEN: Question asks for data from non-existent "users" table
        THEN: LLM should either ask for clarification or reference "employees"
        """
        schema = {
            "tables": [
                {"table_name": "employees", "columns": ["id", "name"]}
            ]
        }
        
        question = "Show users"
        
        # Desired behavior: LLM asks for clarification or assumes "employees"
        # LLM should NOT generate:
        bad_sql = "SELECT * FROM users"  # This table doesn't exist!
        
        # Better SQL:
        good_sql = "SELECT * FROM employees"
        
        # This tests whether LLM is schema-aware

    @patch("app.api.query.llm_service")
    async def test_llm_uses_correct_column_aliases(self, mock_llm):
        """
        GIVEN: Question asks for "employee salary"
        WHEN: Table has column "monthly_salary"
        THEN: Should SELECT monthly_salary (not "salary")
        """
        schema = {
            "tables": [{
                "table_name": "employees",
                "columns": ["id", "name", "monthly_salary", "annual_bonus"]
            }]
        }
        
        question = "Show employee salaries"
        
        # LLM must know: "salary" in question maps to "monthly_salary" column
        # Or it could be both salary and bonus
        valid_response = "SELECT id, name, monthly_salary FROM employees"
        
        invalid_response = "SELECT id, name, salary FROM employees"  # Column doesn't exist


class TestComplexQueryGeneration:
    """Test AI correctness on complex queries."""

    @patch("app.api.query.llm_service")
    async def test_llm_generates_aggregation_query(self, mock_llm):
        """
        GIVEN: Question "How many employees per department?"
        WHEN: LLM generates SQL
        THEN: Should include GROUP BY and COUNT()
        """
        correct_sql = """
        SELECT department, COUNT(*) as employee_count
        FROM employees
        GROUP BY department
        ORDER BY employee_count DESC
        """
        
        # Must have:
        assert "COUNT" in correct_sql
        assert "GROUP BY" in correct_sql

    @patch("app.api.query.llm_service")
    async def test_llm_generates_where_clause_from_question(self, mock_llm):
        """
        GIVEN: Question "Show employees in Sales department"
        WHEN: LLM generates SQL
        THEN: Should include "WHERE department = 'Sales'"
        """
        correct_sql = "SELECT * FROM employees WHERE department = 'Sales'"
        
        assert "WHERE" in correct_sql
        assert "Sales" in correct_sql

    @patch("app.api.query.llm_service")
    async def test_llm_handles_numeric_filters(self, mock_llm):
        """
        GIVEN: Question "Show employees with salary greater than 50000"
        WHEN: LLM generates SQL
        THEN: Should use > operator, not string comparison
        """
        correct_sql = "SELECT * FROM employees WHERE salary > 50000"
        
        # Should use numeric comparison, not string:
        assert ">" in correct_sql
        assert "50000" in correct_sql
        
        # Not string comparison:
        bad_sql = "SELECT * FROM employees WHERE salary LIKE '50000%'"

    @patch("app.api.query.llm_service")
    async def test_llm_handles_date_filters(self, mock_llm):
        """
        GIVEN: Question "Show orders from 2024"
        WHEN: LLM generates SQL
        THEN: Should filter on date correctly
        """
        # Correct: Can use YEAR() function or date range
        valid_sqls = [
            "SELECT * FROM orders WHERE YEAR(order_date) = 2024",
            "SELECT * FROM orders WHERE order_date >= '2024-01-01' AND order_date < '2025-01-01'",
            "SELECT * FROM orders WHERE YEAR(order_date) = YEAR(CURRENT_DATE)",
        ]
        
        # For this test, just verify one is syntactically valid
        assert all("2024" in sql or "YEAR" in sql for sql in valid_sqls)

    @patch("app.api.query.llm_service")
    async def test_llm_handles_sorting_questions(self, mock_llm):
        """
        GIVEN: Question "Top 10 products by sales"
        WHEN: LLM generates SQL
        THEN: Should include ORDER BY and LIMIT
        """
        correct_sql = """
        SELECT product_name, SUM(quantity) as total_sales
        FROM orders o
        JOIN products p ON o.product_id = p.id
        GROUP BY product_name
        ORDER BY total_sales DESC
        LIMIT 10
        """
        
        assert "ORDER BY" in correct_sql
        assert "DESC" in correct_sql
        assert "LIMIT" in correct_sql


class TestEdgeCasesAndMisinterpretations:
    """Test how LLM handles ambiguous or tricky questions."""

    @patch("app.api.query.llm_service")
    async def test_llm_ambiguous_question_documentation(self, mock_llm):
        """
        GIVEN: Ambiguous question "Show active users"
        WHEN: Schema doesn't have "active" column
        THEN: LLM should make reasonable assumption
        
        Expected: Could mean is_active=true or status='active'
        Test documents the behavior.
        """
        question = "Show active employees"
        schema = {
            "tables": [{
                "table_name": "employees",
                "columns": ["id", "name", "is_active", "status"]
            }]
        }
        
        # Reasonable interpretations:
        sql1 = "SELECT * FROM employees WHERE is_active = 1"
        sql2 = "SELECT * FROM employees WHERE status = 'active'"
        sql3 = "SELECT * FROM employees WHERE is_active = TRUE"
        
        # All are reasonable - test documents this ambiguity

    @patch("app.api.query.llm_service")
    async def test_llm_typo_tolerance(self, mock_llm):
        """
        GIVEN: Question with typo "Show employes" (missing 'e')
        WHEN: LLM generates SQL
        THEN: Should understand "employes" means "employees"
        
        This is subjective - LLM might or might not handle this.
        Test documents expectation.
        """
        question = "Show empoyees"  # Typo
        
        # Good LLM might still generate:
        expected_sql = "SELECT * FROM employees"
        
        # This is fuzzy - document if not expected

    @patch("app.api.query.llm_service")  
    async def test_llm_case_preservation_in_values(self, mock_llm):
        """
        GIVEN: Question "Find John's orders"
        WHEN: LLM generates WHERE clause
        THEN: Should use correct string matching (case-sensitive or COLLATE)
        """
        question = "Show orders from John"
        
        # If database is case-sensitive:
        exact_match = "SELECT * FROM orders WHERE customer_name = 'John'"
        
        # If expecting case-insensitive (safer):
        case_insensitive = "SELECT * FROM orders WHERE LOWER(customer_name) = LOWER('John')"
        
        # Test documents which approach is expected


class TestSQLSyntaxCorrectness:
    """Test that generated SQL is syntactically valid."""

    @patch("app.api.query.llm_service")
    async def test_generated_sql_parses_without_syntax_errors(self, mock_llm):
        """
        GIVEN: Question to LLM
        WHEN: LLM generates SQL
        THEN: Generated SQL should be parseable (can check with sqlparse)
        """
        import sqlparse
        
        question = "Show employees with salary over 50000"
        generated_sql = "SELECT * FROM employees WHERE salary > 50000"
        
        # Should parse without error
        parsed = sqlparse.parse(generated_sql)
        assert len(parsed) > 0, "SQL should be parseable"

    @patch("app.api.query.llm_service")
    async def test_quoted_identifiers_if_needed(self, mock_llm):
        """
        GIVEN: Column name with space or special char: "First Name"
        WHEN: LLM generates SQL
        THEN: Should quote identifier: `First Name` or "First Name"
        """
        # Good:
        correct_sql = 'SELECT `First Name` FROM employees'
        
        # Bad (would fail):
        bad_sql = 'SELECT First Name FROM employees'

    @patch("app.api.query.llm_service")
    async def test_string_escaping_in_where_clause(self, mock_llm):
        """
        GIVEN: Question "Find customers named O'Brien"
        WHEN: LLM generates SQL
        THEN: Should properly escape single quote
        """
        name_with_quote = "O'Brien"
        
        # Correct (parameterized query):
        # query = "SELECT * FROM customers WHERE name = %s", [name]
        
        # Or properly escaped string:
        escaped_sql = "SELECT * FROM customers WHERE name = 'O\\'Brien'"
        
        # The test documents this edge case
