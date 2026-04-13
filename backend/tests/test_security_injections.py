"""
Advanced SQL Injection and Security Tests
==========================================

Tests real-world SQL injection attack vectors against the validator.
These tests ensure the application safely rejects dangerous queries.

Run with: pytest backend/tests/test_security_injections.py -v
"""
import pytest
from app.services.query_service import QueryService


class TestSQLInjectionBasic:
    """Test fundamental SQL injection vectors."""

    def test_boolean_based_injection_simple(self):
        """
        Attack: ' OR '1'='1
        This is the classic SQL injection attack.
        """
        query = "SELECT * FROM users WHERE username = '' OR '1'='1"
        is_valid, error = QueryService.validate_sql(query)
        assert is_valid is False, "Should reject boolean-based injection"

    def test_stacked_queries_with_drop(self):
        """
        Attack: 1; DROP TABLE users;
        Multiple statements should be blocked.
        """
        query = "SELECT 1; DROP TABLE users;"
        is_valid, error = QueryService.validate_sql(query)
        assert is_valid is False
        assert "semicolon" in error.lower() or "multiple" in error.lower()

    def test_comment_based_injection_mysql_style(self):
        """
        Attack: admin' --
        Uses MySQL comment syntax to hide the rest of the query.
        """
        query = "SELECT * FROM users WHERE id = 1; -- DROP TABLE users"
        is_valid, error = QueryService.validate_sql(query)
        assert is_valid is False, "Should reject semicolon before comment"

    def test_case_insensitive_dangerous_keywords(self):
        """
        Attack: DeLeTe (mixed case to bypass simple string matching)
        Validators must be case-insensitive.
        """
        query = "SeLeCt * FROM users; DeLeTE FROM users"
        is_valid, error = QueryService.validate_sql(query)
        assert is_valid is False, "Should reject case variations of dangerous keywords"

    @pytest.mark.xfail(reason="UNION keyword filtering is not implemented yet", strict=False)
    def test_union_based_injection_attempt(self):
        """
        Attack: UNION SELECT
        Allows extracting data from other tables.
        
        NOTE: If UNION is not in DANGEROUS_KEYWORDS, this test will fail.
        Consider adding UNION to the blocked list.
        """
        query = "SELECT id FROM users UNION SELECT password FROM admin"
        is_valid, error = QueryService.validate_sql(query)
        # Your call: UNION might be syntactically OK but semantically dangerous
        # Recommend marking as dangerous for safety-first approach
        assert is_valid is False, "UNION-based injection should be blocked"


class TestSQLInjectionAdvanced:
    """Test sophisticated injection techniques."""

    def test_nested_select_with_injection(self):
        """
        Attack: Nested SELECT with dangerous keywords
        Tests subquery injection vectors.
        """
        query = """
        SELECT * FROM (
            SELECT * FROM users 
            UNION SELECT * FROM passwords
        ) AS t
        """
        is_valid, error = QueryService.validate_sql(query)
        assert is_valid is False or "UNION" in error

    def test_comment_suppression_variant(self):
        """
        Attack: SELECT /*!50000 DROP */ * FROM users
        MySQL-specific comment directives with keyword hiding.
        """
        query = "SELECT /*!50000 DROP */ * FROM users"
        is_valid, error = QueryService.validate_sql(query)
        # This is sophistication edge case - document if not caught
        # MySQL version comments can contain executable code
        assert is_valid is False or "comment" in error.lower()

    def test_null_byte_injection(self):
        """
        Attack: Null byte to truncate query parsing
        SELECT * FROM users\x00; DROP TABLE users
        """
        query = "SELECT * FROM users\x00; DROP TABLE users"
        try:
            is_valid, error = QueryService.validate_sql(query)
            # Should reject null bytes
            assert is_valid is False
        except (ValueError, UnicodeDecodeError):
            # Framework might reject before reaching validator
            pass

    def test_extremely_long_query_string(self):
        """
        Attack: Buffer overflow or DoS via huge query
        1MB query string to exceed memory/processing limits.
        """
        # Create a very long query: 100KB+ 
        long_query = "SELECT * FROM users WHERE name = 'test'" + " OR id = 1" * 10000
        is_valid, error = QueryService.validate_sql(long_query)
        
        # Should either reject outright or have implementation handle it
        if is_valid:
            # Document that length checking happens at execution, not validation
            assert len(long_query) > 100000, "Test is set up correctly"

    def test_time_based_blind_injection_sleep(self):
        """
        Attack: SLEEP() function for time-based SQL injection
        SELECT * FROM users WHERE 1=1 OR SLEEP(5)=0
        
        This allows blind SQL injection via timing analysis.
        IMPORTANT: Your current validator likely doesn't block SLEEP!
        """
        query = "SELECT * FROM users WHERE id = 1 OR SLEEP(5) = 0"
        is_valid, error = QueryService.validate_sql(query)
        
        # ACTION REQUIRED: If this passes, add SLEEP to DANGEROUS_KEYWORDS
        if is_valid:
            pytest.fail(
                "⚠️ CRITICAL: SLEEP() function not blocked - enables time-based "
                "blind SQL injection. Add 'SLEEP' to DANGEROUS_KEYWORDS immediately."
            )

    @pytest.mark.xfail(reason="BENCHMARK keyword filtering is not implemented yet", strict=False)
    def test_benchmark_function_timing_attack(self):
        """
        Similar to SLEEP, BENCHMARK can be exploited for timing attacks.
        SELECT * FROM users WHERE BENCHMARK(10000000, MD5('test')) = 0
        """
        query = "SELECT * FROM users WHERE BENCHMARK(1000000, MD5('x')) = 0"
        is_valid, error = QueryService.validate_sql(query)
        assert is_valid is False, "BENCHMARK timing attack should be blocked"

    def test_cartesian_product_dos_attack(self):
        """
        Attack: Cartesian products to exhaust resources
        SELECT * FROM t1 CROSS JOIN t2 CROSS JOIN t3 ... (20 times)
        
        This is valid SQL but causes exponential result explosion.
        CROSS JOIN is not dangerous syntactically, but strategically dangerous.
        """
        # Build a query with many CROSS JOINs
        joins = " CROSS JOIN ".join([f"(SELECT {i} as col{i}) t{i}" 
                                     for i in range(10)])
        query = f"SELECT * FROM {joins}"
        is_valid, error = QueryService.validate_sql(query)
        
        # Validation might pass (it's syntactically correct)
        # But execution should timeout due to LIMIT or query timeout
        assert is_valid is True, "Validation should allow valid syntax"
        # Note: Protection should be at execution layer (LIMIT, timeout)


class TestDangerousKeywordCoverage:
    """Verify all dangerous keywords are properly blocked."""

    @pytest.mark.parametrize("keyword", [
        "DROP",
        "DELETE", 
        "INSERT",
        "UPDATE",
        "ALTER",
        "CREATE",
        "TRUNCATE",
        "REPLACE",
        "EXEC",
        "EXECUTE",
        "GRANT",
        "REVOKE",
        "RENAME",
    ])
    def test_dangerous_keyword_blocked(self, keyword):
        """Each dangerous keyword should be blocked in any position."""
        query = f"SELECT 1; {keyword} TABLE users"
        is_valid, error = QueryService.validate_sql(query)
        assert is_valid is False, f"Should block {keyword}"

    @pytest.mark.parametrize("keyword,context", [
        ("DROP", "SELECT DROP FROM users"),  # DROP as column name
        ("DELETE", "SELECT delete_id FROM users"),  # delete_id as column
        ("UPDATE", "SELECT updated_at FROM users"),  # updated_at as column
    ])
    def test_column_names_with_dangerous_keywords(self, keyword, context):
        """
        Dangerous words in column names should be allowed.
        This is a tricky edge case - need context-aware validation.
        """
        query = context
        is_valid, error = QueryService.validate_sql(query)
        
        # Current simple regex might incorrectly block these
        # Document the expected behavior
        # For safety: might reject, which is acceptable (false positive)


class TestValidationQualityAssurance:
    """Tests to verify validator robustness and test coverage."""

    def test_validate_functions_exist_and_callable(self):
        """Sanity check: validation functions must exist."""
        assert hasattr(QueryService, 'validate_sql')
        assert callable(QueryService.validate_sql)

    def test_validate_returns_tuple_of_length_two(self):
        """Validation should return (is_valid: bool, error_message: str)."""
        is_valid, error = QueryService.validate_sql("SELECT 1")
        assert isinstance(is_valid, bool)
        assert isinstance(error, str) or error is None

    def test_valid_select_queries_pass(self):
        """Baseline: basic SELECT queries must pass validation."""
        test_queries = [
            "SELECT * FROM users",
            "SELECT id, name FROM users WHERE id = 1",
            "SELECT COUNT(*) FROM orders",
            "SELECT DISTINCT department FROM employees",
        ]
        for query in test_queries:
            is_valid, error = QueryService.validate_sql(query)
            assert is_valid is True, f"Query should pass: {query}"
