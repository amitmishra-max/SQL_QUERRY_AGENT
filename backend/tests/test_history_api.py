"""
Integration tests for /api/history endpoints.
Covers: list, get by id, bookmark toggle, delete, cross-user isolation.
"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.query_history import QueryHistory
from app.models.user import User


async def _create_history_entry(
    db: AsyncSession,
    user_id: int,
    question: str = "Show all employees",
    sql: str = "SELECT * FROM employees",
    bookmarked: bool = False,
) -> QueryHistory:
    """Helper to insert a history entry directly into the DB."""
    entry = QueryHistory(
        user_id=user_id,
        natural_question=question,
        generated_sql=sql,
        is_bookmarked=bookmarked,
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry


@pytest.mark.asyncio
class TestGetHistory:
    """Tests for GET /api/history/."""

    async def test_get_history_returns_user_queries(
        self, client: AsyncClient, auth_headers, test_user, db_session
    ):
        """Should return a list of the user's past queries."""
        # Arrange
        await _create_history_entry(db_session, test_user.id)
        await _create_history_entry(db_session, test_user.id, question="Count departments")

        # Act
        response = await client.get("/api/history/", headers=auth_headers)

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2

    async def test_get_history_only_returns_own_queries(
        self, client, auth_headers, test_user, second_user, db_session
    ):
        """User A should NOT see User B's history."""
        # Arrange
        await _create_history_entry(db_session, test_user.id, question="My query")
        await _create_history_entry(db_session, second_user.id, question="Other query")

        # Act
        response = await client.get("/api/history/", headers=auth_headers)

        # Assert
        data = response.json()
        assert len(data) == 1
        assert data[0]["natural_question"] == "My query"

    async def test_get_history_with_bookmark_filter(
        self, client, auth_headers, test_user, db_session
    ):
        """bookmarked_only=true should only return bookmarked items."""
        # Arrange
        await _create_history_entry(db_session, test_user.id, bookmarked=True)
        await _create_history_entry(db_session, test_user.id, bookmarked=False)

        # Act
        response = await client.get(
            "/api/history/", headers=auth_headers, params={"bookmarked_only": True}
        )

        # Assert
        data = response.json()
        assert len(data) == 1
        assert data[0]["is_bookmarked"] is True

    async def test_get_history_requires_auth(self, client):
        """History endpoint without auth should return 401."""
        response = await client.get("/api/history/")
        assert response.status_code == 401


@pytest.mark.asyncio
class TestGetHistoryItem:
    """Tests for GET /api/history/{id}."""

    async def test_get_history_item_by_id(
        self, client, auth_headers, test_user, db_session
    ):
        """Should return a single history item by ID."""
        # Arrange
        entry = await _create_history_entry(db_session, test_user.id)

        # Act
        response = await client.get(f"/api/history/{entry.id}", headers=auth_headers)

        # Assert
        assert response.status_code == 200
        assert response.json()["id"] == entry.id

    async def test_get_nonexistent_history_returns_404(self, client, auth_headers):
        """Requesting a non-existent ID should return 404."""
        response = await client.get("/api/history/99999", headers=auth_headers)
        assert response.status_code == 404

    async def test_cannot_access_other_users_history_item(
        self, client, auth_headers, second_user, db_session
    ):
        """User A should not access User B's history item → 404."""
        # Arrange
        entry = await _create_history_entry(db_session, second_user.id)

        # Act
        response = await client.get(f"/api/history/{entry.id}", headers=auth_headers)

        # Assert
        assert response.status_code == 404


@pytest.mark.asyncio
class TestToggleBookmark:
    """Tests for POST /api/history/{id}/bookmark."""

    async def test_toggle_bookmark_flips_status(
        self, client, auth_headers, test_user, db_session
    ):
        """Toggling bookmark should flip is_bookmarked from False→True."""
        # Arrange
        entry = await _create_history_entry(db_session, test_user.id, bookmarked=False)

        # Act
        response = await client.post(
            f"/api/history/{entry.id}/bookmark", headers=auth_headers
        )

        # Assert
        assert response.status_code == 200
        assert response.json()["bookmarked"] is True

    async def test_toggle_bookmark_twice_returns_to_original(
        self, client, auth_headers, test_user, db_session
    ):
        """Toggling twice should restore original state."""
        # Arrange
        entry = await _create_history_entry(db_session, test_user.id, bookmarked=False)

        # Act
        await client.post(f"/api/history/{entry.id}/bookmark", headers=auth_headers)
        response = await client.post(
            f"/api/history/{entry.id}/bookmark", headers=auth_headers
        )

        # Assert
        assert response.json()["bookmarked"] is False


@pytest.mark.asyncio
class TestDeleteHistory:
    """Tests for DELETE /api/history/{id}."""

    async def test_delete_history_item_removes_entry(
        self, client, auth_headers, test_user, db_session
    ):
        """Deleting should return success and item should be gone."""
        # Arrange
        entry = await _create_history_entry(db_session, test_user.id)

        # Act
        response = await client.delete(
            f"/api/history/{entry.id}", headers=auth_headers
        )

        # Assert
        assert response.status_code == 200
        # Verify it's gone
        get_resp = await client.get(f"/api/history/{entry.id}", headers=auth_headers)
        assert get_resp.status_code == 404

    async def test_delete_nonexistent_returns_404(self, client, auth_headers):
        """Deleting a non-existent item should return 404."""
        response = await client.delete("/api/history/99999", headers=auth_headers)
        assert response.status_code == 404
