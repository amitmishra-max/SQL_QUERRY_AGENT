"""
Shared test fixtures for backend tests.
Provides: async test DB (SQLite in-memory OR real MySQL), FastAPI TestClient, auth helpers.

SMART DATABASE DETECTION:
- If TEST_DATABASE_URL env var is set → Uses REAL MySQL (integration tests)
- Otherwise → Uses SQLite in-memory (unit tests)
- In GitHub Actions → Services container provides MySQL automatically
"""
import os
import sys
from datetime import timedelta
from unittest.mock import MagicMock, patch

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import sessionmaker, Session as SyncSession

# ---------------------------------------------------------------------------
# Smart Database Detection: MySQL for integration, SQLite for unit tests
# ---------------------------------------------------------------------------
USE_REAL_MYSQL = bool(os.getenv("TEST_DATABASE_URL"))

if USE_REAL_MYSQL:
    print("🔗 Using REAL MySQL for integration tests")
    DB_URL = os.getenv("TEST_DATABASE_URL")
    SYNC_DB_URL = DB_URL.replace("mysql+aiomysql://", "mysql+pymysql://") if DB_URL.startswith("mysql+aiomysql://") else DB_URL
else:
    DB_PATH = os.path.join(os.path.dirname(__file__), "test.db")
    print(f"📦 Using SQLite file-based DB for unit tests: {DB_PATH}")
    DB_URL = f"sqlite+aiosqlite:///{DB_PATH}"
    SYNC_DB_URL = f"sqlite:///{DB_PATH}"

# ---------------------------------------------------------------------------
# Ensure the backend package is importable
# ---------------------------------------------------------------------------
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# ---------------------------------------------------------------------------
# Set Environment Variables BEFORE app is imported
# ---------------------------------------------------------------------------
os.environ["APP_DATABASE_URL"] = DB_URL
os.environ["DEFAULT_TARGET_DB_URL"] = "sqlite+aiosqlite://"  # Target DB for queries
os.environ["SECRET_KEY"] = "test-secret-key-for-testing"
os.environ["ALGORITHM"] = "HS256"
os.environ["ACCESS_TOKEN_EXPIRE_MINUTES"] = "30"
os.environ["LLM_PROVIDER"] = "test"
os.environ["LLAMA_BASE_URL"] = "http://127.0.0.1:11434"
os.environ["LLAMA_MODEL"] = "deepseek-coder:6.7b"
os.environ["LLAMA_VERIFY_SSL"] = "false"
os.environ["GOOGLE_API_KEY"] = "fake-google-key"
os.environ["OPENAI_API_KEY"] = ""
os.environ["OPENAI_MODEL"] = "gpt-3.5-turbo"
os.environ["MAX_QUERY_ROWS"] = "100"
os.environ["QUERY_TIMEOUT_SECONDS"] = "30"
os.environ["MAX_QUESTION_LENGTH"] = "5000"

# Mute google.genai imports so we don't need a real key
sys.modules["google.genai"] = MagicMock()
sys.modules["google.genai.types"] = MagicMock()

# ---------------------------------------------------------------------------
# Import the app module now that env vars are set
# ---------------------------------------------------------------------------
from app.core.database import app_engine, AppSessionLocal, Base, get_app_db
from app.core.security import create_access_token, get_password_hash, get_current_user
from app.models.user import User
from app.models.query_history import QueryHistory
from app.main import app

# Create a test session maker from the app_engine 
# (which is already configured as SQLite by our env var without pool args)
TestSession = async_sessionmaker(
    app_engine, class_=AsyncSession, expire_on_commit=False,
    autocommit=False, autoflush=False
)

SyncEngine = create_engine(
    SYNC_DB_URL,
    connect_args={"check_same_thread": False} if SYNC_DB_URL.startswith("sqlite") else {},
)
SyncSessionLocal = sessionmaker(bind=SyncEngine, class_=SyncSession)

# ---------------------------------------------------------------------------
# DB dependency override
# ---------------------------------------------------------------------------
async def _override_get_app_db():
    """Dependency override that yields a test session."""
    async with TestSession() as session:
        try:
            yield session
        finally:
            await session.close()

app.dependency_overrides[get_app_db] = _override_get_app_db


@pytest.fixture
def db():
    """Synchronous DB session for tests that require SQLAlchemy Session semantics."""
    session = SyncSessionLocal()
    try:
        yield session
    finally:
        session.close()


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------
@pytest.fixture(autouse=True)
def setup_database_sync():
    """Create all tables before each sync test and drop them after."""
    Base.metadata.drop_all(bind=SyncEngine)
    Base.metadata.create_all(bind=SyncEngine)
    yield
    Base.metadata.drop_all(bind=SyncEngine)


@pytest_asyncio.fixture
async def db_session():
    """Provide a clean async DB session for direct model manipulation."""
    async with TestSession() as session:
        yield session


@pytest_asyncio.fixture
async def client():
    """Async HTTP test client against the FastAPI app."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def test_user(db_session: AsyncSession):
    """Create and return a test user in the DB."""
    user = User(
        email="testuser@example.com",
        hashed_password=get_password_hash("TestPass123"),
        full_name="Test User",
        is_active=True,
    )
    db_session.add(user)
    await db_session.flush()
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def auth_token(test_user: User):
    """Return a valid JWT for the test user."""
    return create_access_token(
        data={"sub": str(test_user.id)},
        expires_delta=timedelta(minutes=30),
    )


@pytest_asyncio.fixture
async def auth_headers(auth_token: str):
    """Return Authorization headers dict."""
    return {"Authorization": f"Bearer {auth_token}"}


@pytest_asyncio.fixture
async def second_user(db_session: AsyncSession):
    """Create a second user for cross-user isolation tests."""
    user = User(
        email="otheruser@example.com",
        hashed_password=get_password_hash("OtherPass123"),
        full_name="Other User",
        is_active=True,
    )
    db_session.add(user)
    await db_session.flush()
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def second_auth_headers(second_user: User):
    """Return Authorization headers for the second user."""
    token = create_access_token(
        data={"sub": str(second_user.id)},
        expires_delta=timedelta(minutes=30),
    )
    return {"Authorization": f"Bearer {token}"}
