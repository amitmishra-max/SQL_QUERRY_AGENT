from pydantic_settings import BaseSettings
from typing import Optional
import os
from dotenv import load_dotenv

# Load the .env file
load_dotenv()

class Settings(BaseSettings):
    # Database for users, auth, and query history
    APP_DATABASE_URL: str = os.getenv("APP_DATABASE_URL")
    
    # Default target database for querying (sample data)
    DEFAULT_TARGET_DB_URL: str = os.getenv("DEFAULT_TARGET_DB_URL")
    
    # JWT Settings
    SECRET_KEY: str = os.getenv("SECRET_KEY")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
    
    # LLM Settings (Ollama)
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "llama")
    LLAMA_BASE_URL: str = os.getenv("LLAMA_BASE_URL", "http://localhost:11434/api")
    LLAMA_MODEL: str = os.getenv("LLAMA_MODEL", "deepseek-coder:6.7b")
    LLAMA_VERIFY_SSL: bool = os.getenv("LLAMA_VERIFY_SSL", "false").lower() in ("true", "1", "yes")

    # Google/Gemini settings. Keep legacy env aliases so existing .env files continue to work.
    GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY", "")
    GOOGLE_MODEL: str = os.getenv("GOOGLE_MODEL", "gemini-2.5-flash")
    GOOGLE_FALLBACK_MODELS: str = os.getenv(
        "GOOGLE_FALLBACK_MODELS",
        "gemini-2.5-flash-lite,gemini-3-flash-preview,gemini-3.1-flash-lite-preview",
    )
    GEMINI_API_KEY: str = GOOGLE_API_KEY
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")
    
    # Query Settings
    MAX_QUERY_ROWS: int = int(os.getenv("MAX_QUERY_ROWS", "100"))
    QUERY_TIMEOUT_SECONDS: int = int(os.getenv("QUERY_TIMEOUT_SECONDS", "30"))
    MAX_QUESTION_LENGTH: int = int(os.getenv("MAX_QUESTION_LENGTH", "5000"))
    
    @property
    def QUERY_TIMEOUT(self) -> int:
        return self.QUERY_TIMEOUT_SECONDS
    
    class Config:
        env_file = ".env"

settings = Settings()
