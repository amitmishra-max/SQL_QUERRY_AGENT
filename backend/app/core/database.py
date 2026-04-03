from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from app.core.config import settings

# Engine/session for App DB (auth, profiles, query history)
app_engine_args = {
    "echo": False,
    "pool_pre_ping": True,
}
if "sqlite" not in settings.APP_DATABASE_URL:
    app_engine_args["pool_size"] = 10
    app_engine_args["max_overflow"] = 20

app_engine = create_async_engine(settings.APP_DATABASE_URL, **app_engine_args)

AppSessionLocal = async_sessionmaker(
    app_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

Base = declarative_base()

# Dependency for App/Auth DB
async def get_app_db():
    async with AppSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

# Dynamic session generator for Target DB
async def get_target_db_session(connection_string: str = None) -> AsyncSession:
    """
    Creates and returns an AsyncSession for a specific target database.
    If connection_string is None, falls back to DEFAULT_TARGET_DB_URL.
    NOTE: Caller is responsible for awaiting session.close() when done.
    """
    target_url = connection_string or settings.DEFAULT_TARGET_DB_URL
    
    # Ensure async driver
    if target_url.startswith("mysql://") or target_url.startswith("mysql+pymysql://"):
        target_url = target_url.replace("mysql://", "mysql+aiomysql://").replace("mysql+pymysql://", "mysql+aiomysql://")
        
    engine_args = {
        "echo": False,
        "pool_pre_ping": True,
    }
    if "sqlite" not in target_url:
        engine_args["pool_recycle"] = 3600
        
    engine = create_async_engine(target_url, **engine_args)
    TargetSessionLocal = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False
    )
    
    return TargetSessionLocal(), engine

async def init_db():
    async with app_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
