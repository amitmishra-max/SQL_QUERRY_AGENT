"""
Locust Load Testing Suite

Simulates realistic user behavior under load:
- User registration + login
- Schema visualization
- Query execution
- History/bookmark operations

Run locally:
  locust -f backend/tests/load_tests.py --host=http://localhost:8000

Run with config:
  locust -f backend/tests/load_tests.py --config backend/locust_config.conf

Run headless (automated):
  locust -f backend/tests/load_tests.py --host=http://localhost:8000 \\
    --users 100 --spawn-rate 10 --run-time 5m --headless --csv=results

Monitor with web UI:
  Open: http://localhost:8089 while tests are running
"""
from locust import HttpUser, task, between, events
import json
import time
from datetime import datetime


class SQLAgentUser(HttpUser):
    """Simulates a realistic user lifecycle."""
    
    wait_time = between(1, 3)  # Wait 1-3 seconds between actions
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.token = None
        self.user_email = None
        self.user_password = "TestPassword123"
        self.response_times = []
    
    def on_start(self):
        """Called when a simulated user starts."""
        self.register_and_login()
    
    def register_and_login(self):
        """Register a new user and get auth token."""
        # Unique email per user
        import uuid
        self.user_email = f"loadtest_{uuid.uuid4().hex[:8]}@example.com"
        
        # Register
        register_payload = {
            "email": self.user_email,
            "password": self.user_password,
            "full_name": "Load Test User"
        }
        
        response = self.client.post(
            "/api/auth/register",
            json=register_payload,
            name="/api/auth/register"
        )
        
        if response.status_code not in (200, 201):
            # User might already exist from previous run, try login
            pass
        
        # Login
        login_payload = {
            "username": self.user_email,
            "password": self.user_password
        }
        
        response = self.client.post(
            "/api/auth/token",
            data=login_payload,
            name="/api/auth/token"
        )
        
        if response.status_code == 200:
            data = response.json()
            self.token = data.get("access_token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
    
    @task(1)
    def get_me(self):
        """Verify user is authenticated."""
        self.client.get(
            "/api/auth/me",
            headers=self.headers,
            name="/api/auth/me"
        )
    
    @task(3)
    def get_schema(self):
        """Fetch database schema."""
        start = time.time()
        response = self.client.get(
            "/api/query/schema",
            headers=self.headers,
            name="/api/query/schema"
        )
        duration = time.time() - start
        self.response_times.append(duration)
        
        if response.status_code != 200:
            self.client.get("/api/query/schema", headers=self.headers).failure(
                f"Schema fetch failed: {response.status_code}"
            )
    
    @task(5)
    def ask_question(self):
        """Execute a query via natural language."""
        questions = [
            "Show me all users",
            "How many records are in the database?",
            "Display the first 10 results",
            "What is the schema structure?",
            "Show recent queries",
        ]
        
        import random
        question = random.choice(questions)
        
        payload = {"question": question}
        
        start = time.time()
        response = self.client.post(
            "/api/query/ask",
            json=payload,
            headers=self.headers,
            name="/api/query/ask"
        )
        duration = time.time() - start
        self.response_times.append(duration)
        
        if response.status_code not in (200, 400):
            response.failure(f"Ask failed: {response.status_code}")
    
    @task(2)
    def get_history(self):
        """Fetch user's query history."""
        start = time.time()
        response = self.client.get(
            "/api/query/history",
            headers=self.headers,
            name="/api/query/history"
        )
        duration = time.time() - start
        self.response_times.append(duration)
        
        if response.status_code != 200:
            response.failure(f"History fetch failed: {response.status_code}")
        
        # Extract a history item if available
        if response.status_code == 200:
            try:
                items = response.json()
                if isinstance(items, list) and len(items) > 0:
                    self.history_id = items[0].get("id")
            except:
                pass
    
    @task(1)
    def toggle_bookmark(self):
        """Toggle bookmark on a query history item."""
        if not hasattr(self, 'history_id'):
            return
        
        response = self.client.post(
            f"/api/query/history/{self.history_id}/bookmark",
            headers=self.headers,
            name="/api/query/history/[id]/bookmark"
        )
        
        if response.status_code not in (200, 404):
            response.failure(f"Bookmark toggle failed: {response.status_code}")


class AdminUser(HttpUser):
    """Admin user performing monitoring tasks."""
    
    wait_time = between(5, 10)
    
    def on_start(self):
        """Admin login with static credentials (if available)."""
        # In production, use different admin account
        self.token = None
    
    @task(1)
    def check_health(self):
        """Periodically check system health."""
        self.client.get(
            "/health",
            name="/health"
        )
    
    @task(1)
    def get_root(self):
        """Fetch root metadata."""
        self.client.get(
            "/",
            name="/"
        )


# Event handlers for reporting
@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """Called when load test starts."""
    print(f"\n{'='*70}")
    print(f"🚀 Load Test Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*70}\n")


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """Called when load test completes."""
    print(f"\n{'='*70}")
    print(f"✅ Load Test Completed: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*70}\n")
    
    print("📊 Response Time Summary:")
    print(f"  Total requests: {environment.stats.total.num_requests}")
    print(f"  Total failures: {environment.stats.total.num_failures}")
    print(f"  Average response time: {environment.stats.total.avg_response_time:.2f}ms")
    print(f"  Median response time: {environment.stats.total.get_response_time_percentile(0.5):.2f}ms")
    print(f"  95th percentile: {environment.stats.total.get_response_time_percentile(0.95):.2f}ms")
    print(f"  99th percentile: {environment.stats.total.get_response_time_percentile(0.99):.2f}ms")
    print(f"  Min response time: {environment.stats.total.min_response_time:.2f}ms")
    print(f"  Max response time: {environment.stats.total.max_response_time:.2f}ms")
    print(f"  Requests/sec: {environment.stats.total.total_rps:.2f}")
    print()
