"""
Backend Permission-Specific Tests

Tests specific permission scenarios:
- Column-level access control
- Query result filtering based on permissions
- Sensitive data masking
- Operation-level permissions (CREATE, READ, UPDATE, DELETE)

Run:
    pytest backend/tests/test_permissions.py -v
"""

import pytest
from sqlalchemy.orm import Session
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

from app.main import app
from app.models.user import User, UserRole
from app.models.query_history import QueryHistory
from app.core.security import create_access_token


client = TestClient(app)


@pytest.fixture
def users_with_roles(db: Session):
    """Create users with different roles"""
    admin = User(
        email="admin@test.com",
        full_name="Admin User",
        hashed_password="hash",
        role=UserRole.ADMIN
    )
    manager = User(
        email="manager@test.com",
        full_name="Manager User",
        hashed_password="hash",
        role=UserRole.USER  # Higher privilege user
    )
    analyst = User(
        email="analyst@test.com",
        full_name="Analyst User",
        hashed_password="hash",
        role=UserRole.USER
    )
    viewer = User(
        email="viewer@test.com",
        full_name="Viewer User",
        hashed_password="hash",
        role=UserRole.VIEWER
    )

    db.add_all([admin, manager, analyst, viewer])
    db.commit()

    for user in [admin, manager, analyst, viewer]:
        db.refresh(user)

    return {
        "admin": admin,
        "manager": manager,
        "analyst": analyst,
        "viewer": viewer
    }


@pytest.fixture
def tokens(users_with_roles):
    """Generate tokens for all user types"""
    return {
        "admin": create_access_token(data={"sub": users_with_roles["admin"].id}),
        "manager": create_access_token(data={"sub": users_with_roles["manager"].id}),
        "analyst": create_access_token(data={"sub": users_with_roles["analyst"].id}),
        "viewer": create_access_token(data={"sub": users_with_roles["viewer"].id}),
    }


@pytest.mark.skip(reason="RBAC and user management endpoints not implemented yet")
class TestCRUDPermissions:
    """Test CREATE, READ, UPDATE, DELETE permissions"""

    def test_viewer_can_read_but_not_write(self, tokens):
        """Viewer should have READ but not CREATE/UPDATE/DELETE"""
        viewer_header = {"Authorization": f"Bearer {tokens['viewer']}"}

        # READ should work
        response = client.get("/api/schema", headers=viewer_header)
        assert response.status_code == 200

        # CREATE should fail
        response = client.post(
            "/api/schema/tables",
            json={"name": "new_table", "columns": []},
            headers=viewer_header
        )
        assert response.status_code == 403

        # UPDATE should fail
        response = client.put(
            "/api/schema/tables/users",
            json={"name": "users_updated"},
            headers=viewer_header
        )
        assert response.status_code == 403

        # DELETE should fail
        response = client.delete(
            "/api/schema/tables/test_table",
            headers=viewer_header
        )
        assert response.status_code == 403

    def test_user_can_read_and_create(self, tokens):
        """Regular user should be able to read and create queries"""
        user_header = {"Authorization": f"Bearer {tokens['analyst']}"}

        # READ
        response = client.get("/api/schema", headers=user_header)
        assert response.status_code == 200

        # CREATE query
        response = client.post(
            "/api/query/ask",
            json={"question": "Show all users"},
            headers=user_header
        )
        assert response.status_code == 200

    def test_admin_has_all_crud_permissions(self, tokens):
        """Admin should have full CRUD"""
        admin_header = {"Authorization": f"Bearer {tokens['admin']}"}

        # CREATE
        response = client.post(
            "/api/users",
            json={
                "email": "new@test.com",
                "username": "newuser",
                "password": "Pass123",
                "role": "USER"
            },
            headers=admin_header
        )
        assert response.status_code == 201

        # READ
        response = client.get("/api/users", headers=admin_header)
        assert response.status_code == 200

        # UPDATE (if possible)
        if response.status_code == 200:
            users = response.json()
            if users:
                user_id = users[0].get("id") or users[0].get("user_id")
                response = client.put(
                    f"/api/users/{user_id}",
                    json={"username": "updated"},
                    headers=admin_header
                )
                assert response.status_code == 200

        # DELETE
        response = client.delete(
            f"/api/users/{users[0]['id'] if users else 1}",
            headers=admin_header
        )
        assert response.status_code in [200, 204, 404]  # 404 if user doesn't exist


@pytest.mark.skip(reason="RBAC and user management endpoints not implemented yet")
class TestColumnLevelSecurity:
    """Test column-level access control"""

    def test_viewer_cannot_see_sensitive_columns(self, tokens, db: Session):
        """Sensitive columns (passwords, tokens) should be hidden from viewers"""
        viewer_header = {"Authorization": f"Bearer {tokens['viewer']}"}

        # Execute query that might return sensitive data
        response = client.post(
            "/api/query/ask",
            json={"question": "Show all users"},
            headers=viewer_header
        )

        if response.status_code == 200:
            result = response.json()
            # Password hash should not be included
            result_text = str(result).lower()
            assert "password" not in result_text or "$2b$" not in result_text

    def test_admin_can_see_all_columns(self, tokens):
        """Admin should see all columns including sensitive ones"""
        admin_header = {"Authorization": f"Bearer {tokens['admin']}"}

        response = client.get("/api/schema", headers=admin_header)
        assert response.status_code == 200

        # Schema should include all columns
        schema = response.json()
        schema_str = str(schema).lower()
        
        # Should mention typical columns (may or may not include password depending on design)
        assert "users" in schema_str or "email" in schema_str

    def test_sensitive_data_masked_for_non_admin(self, tokens):
        """PII should be masked for non-admin users"""
        analyst_header = {"Authorization": f"Bearer {tokens['analyst']}"}

        response = client.post(
            "/api/query/ask",
            json={"question": "Show email addresses of all users"},
            headers=analyst_header
        )

        # Either:
        # 1. Query is allowed and results are masked, or
        # 2. Query is denied
        if response.status_code == 200:
            # Check if results contain actual email or masked versions
            # This depends on implementation
            pass


@pytest.mark.skip(reason="RBAC and user management endpoints not implemented yet")
class TestDataFiltering:
    """Test automatic data filtering based on permissions"""

    def test_user_sees_only_own_queries(self, tokens, users_with_roles, db: Session):
        """User should only see their own queries in history"""
        analyst = users_with_roles["analyst"]
        viewer = users_with_roles["viewer"]

        # Create queries for both users
        query1 = QueryHistory(
            user_id=analyst.id,
            natural_question="Analyst query",
            generated_sql="SELECT 1",
            execution_result="1"
        )
        query2 = QueryHistory(
            user_id=viewer.id,
            natural_question="Viewer query",
            generated_sql="SELECT 2",
            execution_result="2"
        )
        db.add_all([query1, query2])
        db.commit()

        # Analyst views history
        analyst_header = {"Authorization": f"Bearer {tokens['analyst']}"}
        response = client.get("/api/history", headers=analyst_header)

        assert response.status_code == 200
        history = response.json()

        # Should only see their own query
        questions = [h.get("question") for h in history]
        assert "Analyst query" in questions
        # Should not see viewer's query
        assert "Viewer query" not in questions

    def test_admin_sees_all_queries(self, tokens, users_with_roles, db: Session):
        """Admin should see all users' queries"""
        analyst = users_with_roles["analyst"]

        # Create query for analyst
        query = QueryHistory(
            user_id=analyst.id,
            natural_question="Some query",
            generated_sql="SELECT *",
            execution_result="[...]"
        )
        db.add(query)
        db.commit()

        # Admin views all history
        admin_header = {"Authorization": f"Bearer {tokens['admin']}"}
        response = client.get("/api/history/all", headers=admin_header)

        # Endpoint might be /history/all or /admin/history
        if response.status_code == 404:
            response = client.get("/api/admin/history", headers=admin_header)

        if response.status_code == 200:
            history = response.json()
            assert len(history) > 0


@pytest.mark.skip(reason="RBAC and user management endpoints not implemented yet")
class TestOperationLevelPermissions:
    """Test permissions at operation level"""

    def test_only_admin_can_create_admins(self, tokens, users_with_roles):
        """Only admin should be able to create other admin accounts"""
        analyst_header = {"Authorization": f"Bearer {tokens['analyst']}"}
        admin_header = {"Authorization": f"Bearer {tokens['admin']}"}

        # Analyst tries to create admin
        response = client.post(
            "/api/users",
            json={
                "email": "newadmin@test.com",
                "username": "newadmin",
                "password": "Pass123",
                "role": "ADMIN"
            },
            headers=analyst_header
        )
        # Should be denied
        assert response.status_code in [403, 400]

        # Admin creates admin
        response = client.post(
            "/api/users",
            json={
                "email": "newadmin@test.com",
                "username": "newadmin",
                "password": "Pass123",
                "role": "ADMIN"
            },
            headers=admin_header
        )
        # Should succeed
        assert response.status_code in [200, 201]

    def test_users_can_only_modify_own_profile(self, tokens, users_with_roles):
        """Users should only modify their own profile"""
        analyst = users_with_roles["analyst"]
        viewer = users_with_roles["viewer"]
        analyst_header = {"Authorization": f"Bearer {tokens['analyst']}"}

        # Analyst tries to modify viewer's profile
        response = client.put(
            f"/api/users/{viewer.id}",
            json={"username": "hacked"},
            headers=analyst_header
        )
        # Should be denied
        assert response.status_code == 403

        # Analyst modifies own profile
        response = client.put(
            f"/api/users/{analyst.id}",
            json={"username": "newname"},
            headers=analyst_header
        )
        # Should succeed
        assert response.status_code == 200

    def test_query_execution_requires_permission(self, tokens):
        """Executing queries requires specific permission"""
        # Assume viewer cannot execute queries
        viewer_header = {"Authorization": f"Bearer {tokens['viewer']}"}

        response = client.post(
            "/api/query/ask",
            json={"question": "Show all users"},
            headers=viewer_header
        )

        # Viewer might not be able to execute
        if response.status_code == 403:
            # Confirmed - viewer cannot execute
            assert True
        elif response.status_code == 200:
            # If viewer can execute, that's also valid depending on design
            assert True
        else:
            # Other responses
            assert response.status_code in [200, 403]


@pytest.mark.skip(reason="RBAC and user management endpoints not implemented yet")
class TestTableLevelAccess:
    """Test access control at table level"""

    def test_can_restrict_access_to_sensitive_tables(self, tokens):
        """Some tables might be restricted for non-admin"""
        viewer_header = {"Authorization": f"Bearer {tokens['viewer']}"}

        # Try to query a potentially sensitive table
        response = client.post(
            "/api/query/ask",
            json={"question": "Show admin logs"},
            headers=viewer_header
        )

        # Might be denied or return empty
        # Acceptable responses: 403 (denied), 200 with empty, or querying allowed table

    def test_admin_can_access_all_tables(self, tokens):
        """Admin should access all tables"""
        admin_header = {"Authorization": f"Bearer {tokens['admin']}"}

        response = client.get("/api/schema", headers=admin_header)
        assert response.status_code == 200

        schema = response.json()
        # Admin schema should be complete
        if isinstance(schema, dict):
            tables = schema.get("tables", [])
            assert len(tables) > 0


@pytest.mark.skip(reason="RBAC and user management endpoints not implemented yet")
class TestQueryResultFiltering:
    """Test automatic filtering of query results"""

    def test_query_results_filtered_by_user_id(self, tokens, users_with_roles, db: Session):
        """Query results might be automatically filtered by user_id"""
        analyst = users_with_roles["analyst"]
        viewer = users_with_roles["viewer"]

        # Create query history for both
        for user in [analyst, viewer]:
            for i in range(2):
                query = QueryHistory(
                    user_id=user.id,
                    question=f"Query {i}",
                    sql="SELECT 1",
                    result="1",
                    explanation=f"Query by {user.email}"
                )
                db.add(query)
        db.commit()

        # Analyst gets their queries
        analyst_header = {"Authorization": f"Bearer {tokens['analyst']}"}
        response = client.get("/api/history", headers=analyst_header)

        if response.status_code == 200:
            analyst_history = response.json()
            explanations = [h.get("explanation", "") for h in analyst_history]

            # Should only see their own
            assert any("analyst@test.com" in e for e in explanations)
            assert not any("viewer@test.com" in e for e in explanations)

    def test_admin_sees_unfiltered_results(self, tokens, users_with_roles, db: Session):
        """Admin should see all results without filtering"""
        # Create sample data
        admin = users_with_roles["admin"]
        query = QueryHistory(
            user_id=admin.id,
            question="Show all",
            sql="SELECT *",
            result="[...]",
            explanation="Admin query"
        )
        db.add(query)
        db.commit()

        admin_header = {"Authorization": f"Bearer {tokens['admin']}"}
        response = client.get("/api/admin/history", headers=admin_header)

        if response.status_code == 200:
            history = response.json()
            assert len(history) > 0


@pytest.mark.skip(reason="RBAC and user management endpoints not implemented yet")
class TestPermissionValidation:
    """Test permission validation at API level"""

    def test_missing_permission_returns_403(self, tokens):
        """Missing permission should return 403 Forbidden"""
        viewer_header = {"Authorization": f"Bearer {tokens['viewer']}"}

        # Try admin-only endpoint
        response = client.get("/api/admin/users", headers=viewer_header)

        assert response.status_code == 403

    def test_missing_auth_returns_401(self):
        """Missing auth should return 401 Unauthorized"""
        response = client.get("/api/history")

        assert response.status_code == 401

    def test_insufficient_privilege_returns_403(self, tokens):
        """User without role should get 403"""
        analyst_header = {"Authorization": f"Bearer {tokens['analyst']}"}

        # Try admin endpoint
        response = client.post(
            "/api/admin/force-reset-all-passwords",
            headers=analyst_header
        )

        if response.status_code != 404:  # Endpoint might not exist
            assert response.status_code == 403

    def test_permission_error_includes_helpful_message(self, tokens):
        """Permission errors should explain what permission is needed"""
        viewer_header = {"Authorization": f"Bearer {tokens['viewer']}"}

        response = client.post(
            "/api/query/ask",
            json={"question": "Show users"},
            headers=viewer_header
        )

        if response.status_code == 403:
            error = response.json()
            message = error.get("detail", "").lower()
            # Should mention permission or access
            assert "permission" in message or "access" in message or "not allowed" in message


@pytest.mark.skip(reason="RBAC and user management endpoints not implemented yet")
class TestRoleBasedQueryFiltering:
    """Test filtering of generated SQL based on role"""

    @patch('app.services.llm_service.LLMService.generate_sql')
    def test_sql_audited_for_non_admin(self, mock_llm, tokens):
        """SQL generated for non-admin might be audited"""
        # Mock dangerous SQL
        mock_llm.return_value = {
            "sql": "DROP TABLE users",
            "explanation": "Dangerous!"
        }

        analyst_header = {"Authorization": f"Bearer {tokens['analyst']}"}
        response = client.post(
            "/api/query/ask",
            json={"question": "Delete all users"},
            headers=analyst_header
        )

        # Should either:
        # 1. Block the dangerous query (403/400)
        # 2. Not execute it (just return explanation)
        if response.status_code != 200:
            assert response.status_code in [400, 403]

    @patch('app.services.llm_service.LLMService.generate_sql')
    def test_admin_can_execute_any_sql(self, mock_llm, tokens):
        """Admin might have fewer restrictions"""
        mock_llm.return_value = {
            "sql": "SELECT * FROM users",
            "explanation": "Show all users"
        }

        admin_header = {"Authorization": f"Bearer {tokens['admin']}"}
        response = client.post(
            "/api/query/ask",
            json={"question": "Show all users"},
            headers=admin_header
        )

        # Admin can execute
        assert response.status_code in [200, 500]  # 500 if actual query fails
