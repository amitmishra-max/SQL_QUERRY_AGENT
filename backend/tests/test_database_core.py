import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_target_db_session


@pytest.mark.asyncio
class TestDatabaseCore:
    async def test_get_target_db_session_converts_mysql_url(self):
        session, engine = await get_target_db_session(
            "mysql://user:pass@localhost/testdb"
        )

        assert isinstance(session, AsyncSession)
        assert engine.url.drivername == "mysql+aiomysql"

        await session.close()
        await engine.dispose()

    async def test_get_target_db_session_converts_mysql_pymysql_url(self):
        session, engine = await get_target_db_session(
            "mysql+pymysql://user:pass@localhost/testdb"
        )

        assert isinstance(session, AsyncSession)
        assert engine.url.drivername == "mysql+aiomysql"

        await session.close()
        await engine.dispose()

    async def test_get_target_db_session_uses_sqlite_as_is(self):
        session, engine = await get_target_db_session("sqlite+aiosqlite://")

        assert isinstance(session, AsyncSession)
        assert engine.url.drivername == "sqlite+aiosqlite"

        await session.close()
        await engine.dispose()
