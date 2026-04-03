"""
Shared test fixtures for backend tests.
Provides: async test DB (SQLite in-memory), FastAPI TestClient, auth helpers.
"""
import os
import sys
from datetime import timedelta
from unittest.mock import MagicMock, patch

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

# ---------------------------------------------------------------------------
# Ensure the backend package is importable
# ---------------------------------------------------------------------------
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# ---------------------------------------------------------------------------
# Set Environment Variables BEFORE app is imported
# ---------------------------------------------------------------------------
os.environ["APP_DATABASE_URL"] = "sqlite+aiosqlite://"
os.environ["DEFAULT_TARGET_DB_URL"] = "sqlite+aiosqlite://"
os.environ["SECRET_KEY"] = "test-secret-key-for-testing"
os.environ["ALGORITHM"] = "HS256"
os.environ["ACCESS_TOKEN_EXPIRE_MINUTES"] = "30"
os.environ["LLM_PROVIDER"] = "llama"
os.environ["GOOGLE_API_KEY"] = "fake-google-key"

# Mute google.genai imports so we don't need a real key
sys.modules["google.genai"] = MagicMock()
sys.modules["google.genai.types"] = MagicMock()

# ---------------------------------------------------------------------------
# Import the app module now that env vars are set
# ---------------------------------------------------------------------------
from app.core.database import app_engine, AppSessionLocal, Base, get_app_db
from app.core.security import create_access_token, get_password_hash
from app.models.user import User
from app.models.query_history import QueryHistory
from app.main import app

# Create a test session maker from the app_engine 
# (which is already configured as SQLite by our env var without pool args)
TestSession = async_sessionmaker(
    app_engine, class_=AsyncSession, expire_on_commit=False,
    autocommit=False, autoflush=False
)

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


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------
@pytest_asyncio.fixture(autouse=True)
async def setup_database():
    """Create all tables before each test and drop them after."""
    async with app_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with app_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


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
