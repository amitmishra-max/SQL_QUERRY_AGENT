"""
Unit tests for app.services.llm_service.LLMService.
Covers: JSON response parsing, prompt building, schema formatting.
Does NOT make real LLM calls.
"""
import pytest
from app.services.llm_service import LLMService


@pytest.fixture
def llm():
    """Provide an LLMService instance (no real API calls in these tests)."""
    return LLMService()


class TestParseJsonResponse:
    """Tests for LLMService._parse_json_response."""

    def test_parse_clean_json_response(self, llm):
        """A clean JSON string should parse correctly."""
        # Arrange
        raw = '{"sql": "SELECT * FROM users", "explanation": "Fetches all users"}'

        # Act
        result = llm._parse_json_response(raw)

        # Assert
        assert result["sql"] == "SELECT * FROM users"
        assert result["explanation"] == "Fetches all users"

    def test_parse_json_wrapped_in_markdown_fences(self, llm):
        """JSON wrapped in ```json ... ``` fences should parse."""
        # Arrange
        raw = '```json\n{"sql": "SELECT 1", "explanation": "test"}\n```'

        # Act
        result = llm._parse_json_response(raw)

        # Assert
        assert result["sql"] == "SELECT 1"

    def test_parse_json_with_plain_backtick_fences(self, llm):
        """JSON wrapped in plain ``` fences (no language tag) should parse."""
        # Arrange
        raw = '```\n{"sql": "SELECT 1", "explanation": "test"}\n```'

        # Act
        result = llm._parse_json_response(raw)

        # Assert
        assert result["sql"] == "SELECT 1"

    def test_parse_json_embedded_in_text(self, llm):
        """JSON embedded in surrounding text should be extracted."""
        # Arrange
        raw = 'Here is the result: {"sql": "SELECT id FROM t", "explanation": "Gets IDs"} Hope that helps!'

        # Act
        result = llm._parse_json_response(raw)

        # Assert
        assert result["sql"] == "SELECT id FROM t"

    def test_parse_unparseable_response_raises_error(self, llm):
        """Completely unparseable text should raise ValueError."""
        # Arrange
        raw = "This is just some random text with no JSON at all"

        # Act & Assert
        with pytest.raises(ValueError, match="Could not parse JSON"):
            llm._parse_json_response(raw)

    def test_parse_empty_string_raises_error(self, llm):
        """Empty string should raise ValueError."""
        # Act & Assert
        with pytest.raises(ValueError):
            llm._parse_json_response("")


class TestFormatSchema:
    """Tests for LLMService._format_schema."""

    def test_format_schema_produces_readable_text(self, llm):
        """Schema dict should produce a human-readable string with table and column info."""
        # Arrange
        schema = {
            "tables": [
                {
                    "table_name": "employees",
                    "columns": [
                        {"column_name": "id", "data_type": "int", "is_nullable": "NO"},
                        {"column_name": "name", "data_type": "varchar", "is_nullable": "NO"},
                        {"column_name": "salary", "data_type": "decimal", "is_nullable": "YES"},
                    ],
                }
            ]
        }

        # Act
        result = llm._format_schema(schema)

        # Assert
        assert "employees" in result
        assert "id" in result
        assert "salary" in result
        assert "NOT NULL" in result
        assert "NULL" in result

    def test_format_schema_handles_empty_tables(self, llm):
        """Empty tables list should produce empty string."""
        # Arrange
        schema = {"tables": []}

        # Act
        result = llm._format_schema(schema)

        # Assert
        assert result == ""


class TestBuildPrompt:
    """Tests for LLMService._build_prompt."""

    def test_build_prompt_includes_question_and_schema(self, llm):
        """Prompt should contain both the user question and schema text."""
        # Arrange
        question = "Show all employees"
        schema_text = "Table: employees\n  - id: int (NOT NULL)"

        # Act
        result = llm._build_prompt(question, schema_text)

        # Assert
        assert "Show all employees" in result
        assert "employees" in result
        assert "SELECT" in result  # Instructions mention SELECT

    def test_build_prompt_contains_safety_rules(self, llm):
        """Prompt should instruct the LLM to only generate SELECT queries."""
        # Arrange & Act
        result = llm._build_prompt("anything", "any schema")

        # Assert
        assert "SELECT" in result
        assert "INSERT" in result or "DELETE" in result  # Safety rules mention these
        assert "JSON" in result  # Output format instruction
