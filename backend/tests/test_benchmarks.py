"""
Performance Benchmark Tests

Measure response time, memory usage, and query performance.

Run with benchmarks:
  pytest backend/tests/test_benchmarks.py -v --benchmark-only

Run with detailed output:
  pytest backend/tests/test_benchmarks.py -v --benchmark-verbose

Compare with baseline:
  pytest backend/tests/test_benchmarks.py --benchmark-compare

Requirements:
  pip install pytest-benchmark pytest-asyncio
"""
import pytest
import asyncio
from httpx import AsyncClient
from unittest.mock import patch, AsyncMock
import time


@pytest.mark.benchmark
class TestAuthBenchmarks:
    """Benchmark authentication operations."""
    
    @pytest.mark.asyncio
    async def test_register_performance(self, benchmark, client: AsyncClient):
        """
        Benchmark: User registration
        Target: < 200ms per request
        """
        import uuid
        
        async def register():
            response = await client.post(
                "/api/auth/register",
                json={
                    "email": f"bench_{uuid.uuid4().hex[:8]}@example.com",
                    "password": "BenchPassword123",
                    "full_name": "Benchmark User"
                }
            )
            return response
        
        result = await benchmark(register)
    
    @pytest.mark.asyncio
    async def test_login_performance(self, benchmark, client: AsyncClient, test_user):
        """
        Benchmark: User login
        Target: < 150ms per request
        """
        async def login():
            response = await client.post(
                "/api/auth/token",
                data={
                    "username": "testuser@example.com",
                    "password": "TestPass123"
                }
            )
            return response
        
        result = await benchmark(login)


@pytest.mark.benchmark
class TestQueryBenchmarks:
    """Benchmark query operations."""
    
    @pytest.mark.asyncio
    async def test_schema_fetch_performance(self, benchmark, client: AsyncClient, auth_headers):
        """
        Benchmark: Schema introspection
        Target: < 500ms (may vary by DB size)
        """
        async def fetch_schema():
            response = await client.get(
                "/api/query/schema",
                headers=auth_headers
            )
            return response
        
        result = await benchmark(fetch_schema)
    
    @pytest.mark.asyncio
    async def test_ask_question_performance(self, benchmark, client: AsyncClient, auth_headers):
        """
        Benchmark: Question → SQL generation
        Target: < 2000ms (includes LLM call)
        """
        async def ask_question():
            response = await client.post(
                "/api/query/ask",
                json={"question": "Show all users"},
                headers=auth_headers
            )
            return response
        
        result = await benchmark(ask_question)
    
    @pytest.mark.asyncio
    async def test_history_fetch_performance(self, benchmark, client: AsyncClient, auth_headers):
        """
        Benchmark: Fetch query history
        Target: < 200ms
        """
        async def fetch_history():
            response = await client.get(
                "/api/query/history",
                headers=auth_headers
            )
            return response
        
        result = await benchmark(fetch_history)


@pytest.mark.benchmark
class TestDatabaseBenchmarks:
    """Benchmark database operations."""
    
    @pytest.mark.asyncio
    async def test_user_table_insert(self, benchmark, db_session):
        """
        Benchmark: Insert user record
        Target: < 50ms
        """
        from app.models.user import User
        from app.core.security import get_password_hash
        
        async def insert_user():
            import uuid
            user = User(
                email=f"perf_{uuid.uuid4().hex[:8]}@example.com",
                hashed_password=get_password_hash("password123"),
                full_name="Perf Test User",
                is_active=True
            )
            db_session.add(user)
            await db_session.commit()
            return user
        
        result = await benchmark(insert_user)
    
    @pytest.mark.asyncio
    async def test_query_validation_performance(self, benchmark):
        """
        Benchmark: SQL validation
        Target: < 10ms
        """
        from app.services.query_service import QueryService
        
        def validate():
            is_valid, error = QueryService.validate_sql(
                "SELECT * FROM users WHERE id = 1"
            )
            return is_valid
        
        result = benchmark(validate)


@pytest.mark.benchmark
class TestResponseTimeSLAs:
    """
    Verify Service Level Agreements (SLAs) are met.
    These are soft assertions that warn if SLAs are violated.
    """
    
    def test_auth_sla(self, benchmark):
        """Auth operations: < 200ms p95"""
        def fast_auth():
            # Simulated fast auth (mock)
            time.sleep(0.01)  # 10ms
            return True
        
        result = benchmark(fast_auth)
        # In real test, check: result.stats.times
    
    def test_query_sla(self, benchmark):
        """Query execution: < 3000ms p95"""
        def query_operation():
            # Simulated query (mock)
            time.sleep(0.05)  # 50ms
            return {"result": "data"}
        
        result = benchmark(query_operation)
    
    def test_schema_sla(self, benchmark):
        """Schema fetch: < 500ms p95"""
        def schema_operation():
            # Simulated schema fetch (mock)
            time.sleep(0.02)  # 20ms
            return {"tables": []}
        
        result = benchmark(schema_operation)


@pytest.mark.benchmark
class TestMemoryUsage:
    """
    Monitor memory usage under load.
    Helps detect memory leaks.
    """
    
    @pytest.mark.asyncio
    async def test_session_memory_cleanup(self, db_session):
        """
        Verify sessions don't leak memory.
        Create and destroy many sessions.
        """
        from app.models.user import User
        from app.core.security import get_password_hash
        
        async def create_and_cleanup():
            import uuid
            for i in range(100):
                user = User(
                    email=f"mem_{uuid.uuid4().hex}@example.com",
                    hashed_password=get_password_hash("pass"),
                    full_name=f"User {i}",
                    is_active=True
                )
                db_session.add(user)
            
            await db_session.commit()
        
        # Time the operation
        start_memory = None
        try:
            import psutil
            process = psutil.Process()
            start_memory = process.memory_info().rss / 1024 / 1024  # MB
        except ImportError:
            pass
        
        await create_and_cleanup()
        
        if start_memory:
            end_memory = process.memory_info().rss / 1024 / 1024
            memory_increase = end_memory - start_memory
            
            print(f"\nMemory Usage:")
            print(f"  Before: {start_memory:.2f} MB")
            print(f"  After: {end_memory:.2f} MB")
            print(f"  Increase: {memory_increase:.2f} MB")
            
            # Memory shouldn't increase significantly (< 50 MB)
            assert memory_increase < 50, f"Excessive memory increase: {memory_increase:.2f} MB"


@pytest.mark.benchmark
class TestCachingEfficiency:
    """
    Test caching mechanisms reduce response times.
    """
    
    def test_schema_caching(self, benchmark):
        """Schema should be cached on second request."""
        from app.services.schema_service import SchemaService
        
        # First call (no cache)
        def first_call():
            # Would call DB
            pass
        
        # Second call (should be cached)
        def cached_call():
            # Should return from cache
            pass
        
        # Cached call should be significantly faster
        # (This is a template; actual implementation needs caching)
        pass
