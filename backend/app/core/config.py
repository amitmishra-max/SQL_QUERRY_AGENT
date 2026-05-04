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
    
    # Groq Fallback LLM Settings (replaces Google Gemini)
    GROQ_API_KEY: Optional[str] = os.getenv("GROQ_API_KEY")
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
    
    # Query Settings
    MAX_QUERY_ROWS: int = int(os.getenv("MAX_QUERY_ROWS", "100"))
    QUERY_TIMEOUT_SECONDS: int = int(os.getenv("QUERY_TIMEOUT_SECONDS", "120"))
    MAX_QUESTION_LENGTH: int = int(os.getenv("MAX_QUESTION_LENGTH", "5000"))
    
    # LLM Timeout Settings (for faster fallback to Groq when Ollama is slow/unavailable)
    OLLAMA_TIMEOUT_SECONDS: int = int(os.getenv("OLLAMA_TIMEOUT_SECONDS", "120"))
    OLLAMA_CONNECT_TIMEOUT_SECONDS: int = int(os.getenv("OLLAMA_CONNECT_TIMEOUT_SECONDS", "120"))
    LLM_OPERATION_TIMEOUT_SECONDS: int = int(os.getenv("LLM_OPERATION_TIMEOUT_SECONDS", "120"))
    
    @property
    def QUERY_TIMEOUT(self) -> int:
        return self.QUERY_TIMEOUT_SECONDS
    
    class Config:
        env_file = ".env"
        extra = "ignore"  # Ignore extra fields for backward compatibility

settings = Settings()
