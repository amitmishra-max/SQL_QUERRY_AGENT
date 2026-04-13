from pathlib import Path
from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

ENV_FILE = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Database for users, auth, and query history
    APP_DATABASE_URL: str  
    
    # Default target database for querying (sample data)
    DEFAULT_TARGET_DB_URL: str  
    
    # JWT Settings
    SECRET_KEY: str = Field(min_length=16)
    ALGORITHM: str  
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(gt=0)
    
    # LLM Settings (Ollama)
    LLM_PROVIDER: str  
    LLAMA_BASE_URL: str  
    LLAMA_MODEL: str  
    LLAMA_VERIFY_SSL: bool  
    
    # Gemini/OpenAI Settings (alternative)
    GOOGLE_API_KEY: str  
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str  
    
    # Query Settings
    MAX_QUERY_ROWS: int = Field(ge=100, le=50000)
    QUERY_TIMEOUT_SECONDS: int = Field(gt=0, le=300)
    MAX_QUESTION_LENGTH: int = Field(ge=100, le=100000)

    @property
    def QUERY_TIMEOUT(self) -> int:
        return self.QUERY_TIMEOUT_SECONDS


settings = Settings()
