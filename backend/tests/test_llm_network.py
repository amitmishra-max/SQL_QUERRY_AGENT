import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.services.llm_service import LLMService


@pytest.mark.asyncio
class TestLLMNetwork:
    async def test_call_llm_returns_raw_response(self):
        llm = LLMService()
        async_client_mock = AsyncMock()
        mock_response = MagicMock(status_code=200, json=lambda: {"response": "raw output"})
        async_client_mock.__aenter__.return_value = async_client_mock
        async_client_mock.post.return_value = mock_response

        with patch("app.services.llm_service.httpx.AsyncClient", return_value=async_client_mock):
            raw = await llm._call_llm("prompt")

        assert raw == "raw output"

    async def test_call_llm_raises_on_non_200(self):
        llm = LLMService()
        async_client_mock = AsyncMock()
        mock_response = MagicMock(status_code=500, text="Server Error")
        async_client_mock.__aenter__.return_value = async_client_mock
        async_client_mock.post.return_value = mock_response

        with patch("app.services.llm_service.httpx.AsyncClient", return_value=async_client_mock):
            with pytest.raises(Exception, match="Ollama API error"):
                await llm._call_llm("prompt")

    async def test_call_llm_raises_on_empty_response(self):
        llm = LLMService()
        async_client_mock = AsyncMock()
        mock_response = MagicMock(status_code=200, json=lambda: {"response": ""})
        async_client_mock.__aenter__.return_value = async_client_mock
        async_client_mock.post.return_value = mock_response

        with patch("app.services.llm_service.httpx.AsyncClient", return_value=async_client_mock):
            with pytest.raises(Exception, match="Empty response from Ollama"):
                await llm._call_llm("prompt")

    async def test_call_google_llm_raises_on_empty_response(self):
        llm = LLMService()
        llm.google_client.models.generate_content = MagicMock(return_value=MagicMock(text=""))

        with pytest.raises(Exception, match="Empty response from Google GenAI"):
            await llm._call_google_llm("prompt")

    async def test_generate_sql_falls_back_to_google(self):
        llm = LLMService()
        llm._call_llm = AsyncMock(side_effect=Exception("Ollama failed"))
        llm._call_google_llm = AsyncMock(return_value='{"sql": "SELECT 1", "explanation": "ok"}')

        result = await llm.generate_sql("question", {"tables": []})

        assert result["sql"] == "SELECT 1"
        assert result["explanation"] == "ok"

    async def test_generate_sql_returns_error_when_both_providers_fail(self):
        llm = LLMService()
        llm._call_llm = AsyncMock(side_effect=Exception("Ollama failed"))
        llm._call_google_llm = AsyncMock(side_effect=Exception("Google failed"))

        result = await llm.generate_sql("question", {"tables": []})

        assert result["sql"] == ""
        assert "error" in result
        assert result["error"] == "Both primary and fallback LLMs failed."
