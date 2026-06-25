"""TEST-01 Children integration tests.

Covers:
- Admin CRUD: list, create, get, update, delete children
- Parent: GET /children/me (own child)
- Permission isolation: teacher/parent cannot access admin endpoints
- Parent cannot access other parent's child data
- 409 duplicate child (one child per parent)
- 404 not found
"""

import pytest
from httpx import AsyncClient
from uuid import uuid4

from tests.conftest import (
    PARENT_PHONE, PARENT2_PHONE,
    login_admin, login_teacher, login_parent, login_parent2, auth_headers,
)


# ===================================================================
# Admin CRUD
# ===================================================================

@pytest.mark.asyncio
async def test_admin_list_children(client: AsyncClient):
    """GET /children — admin can list all children."""
    token, _ = await login_admin(client)
    resp = await client.get("/api/v1/children", headers=auth_headers(token))
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] >= 1  # at least one child from fixture


@pytest.mark.asyncio
async def test_admin_create_child(client: AsyncClient):
    """POST /children — admin creates a child with new parent phone."""
    token, _ = await login_admin(client)
    # Use a unique phone to avoid collision with fixtures
    new_phone = "13900000999"
    # First ensure this parent doesn't exist by cleaning up
    from app.core.database import get_supabase
    sb = get_supabase()
    existing = sb.table("users").select("id").eq("phone", new_phone).eq("role", "parent").execute()
    if existing.data:
        uid = existing.data[0]["id"]
        sb.table("children").delete().eq("parent_id", uid).execute()

    resp = await client.post("/api/v1/children", json={
        "name": "新建学生",
        "parent_phone": new_phone,
        "level": "A2",
    }, headers=auth_headers(token))
    assert resp.status_code == 201
    child = resp.json()
    assert child["name"] == "新建学生"
    assert child["level"] == "A2"
    assert "parent" in child

    # Cleanup
    if existing.data:
        sb.table("children").delete().eq("parent_id", uid).execute()


@pytest.mark.asyncio
async def test_admin_create_child_duplicate_409(client: AsyncClient):
    """POST /children — second child for same parent → 409."""
    token, _ = await login_admin(client)
    # PARENT_PHONE already has a child (from fixture)
    resp = await client.post("/api/v1/children", json={
        "name": "重复学生",
        "parent_phone": PARENT_PHONE,
    }, headers=auth_headers(token))
    assert resp.status_code == 409
    assert resp.json()["detail"]["code"] == "CHILD_PARENT_DUPLICATE"


@pytest.mark.asyncio
async def test_admin_get_child_by_id(client: AsyncClient):
    """GET /children/{id} — admin gets child detail."""
    token, _ = await login_admin(client)
    # First get list to find a child ID
    list_resp = await client.get("/api/v1/children", headers=auth_headers(token))
    child_id = list_resp.json()["items"][0]["id"]

    resp = await client.get(f"/api/v1/children/{child_id}", headers=auth_headers(token))
    assert resp.status_code == 200
    assert resp.json()["id"] == child_id


@pytest.mark.asyncio
async def test_admin_get_child_not_found(client: AsyncClient):
    """GET /children/{id} — nonexistent ID → 404."""
    token, _ = await login_admin(client)
    fake_id = str(uuid4())
    resp = await client.get(f"/api/v1/children/{fake_id}", headers=auth_headers(token))
    assert resp.status_code == 404
    assert resp.json()["detail"]["code"] == "CHILD_NOT_FOUND"


@pytest.mark.asyncio
async def test_admin_update_child(client: AsyncClient):
    """PUT /children/{id} — admin updates child name."""
    token, _ = await login_admin(client)
    list_resp = await client.get("/api/v1/children", headers=auth_headers(token))
    child_id = list_resp.json()["items"][0]["id"]

    resp = await client.put(f"/api/v1/children/{child_id}", json={
        "name": "更新后名字",
    }, headers=auth_headers(token))
    assert resp.status_code == 200
    assert resp.json()["name"] == "更新后名字"

    # Restore original name
    await client.put(f"/api/v1/children/{child_id}", json={
        "name": "测试学生",
    }, headers=auth_headers(token))


@pytest.mark.asyncio
async def test_admin_delete_child(client: AsyncClient):
    """DELETE /children/{id} — admin deletes a child."""
    token, _ = await login_admin(client)
    # Create a child to delete (unique phone)
    new_phone = "13900000888"
    from app.core.database import get_supabase
    sb = get_supabase()
    existing = sb.table("users").select("id").eq("phone", new_phone).eq("role", "parent").execute()
    if existing.data:
        sb.table("children").delete().eq("parent_id", existing.data[0]["id"]).execute()

    create_resp = await client.post("/api/v1/children", json={
        "name": "待删除学生",
        "parent_phone": new_phone,
    }, headers=auth_headers(token))
    child_id = create_resp.json()["id"]

    resp = await client.delete(f"/api/v1/children/{child_id}", headers=auth_headers(token))
    assert resp.status_code == 200
    assert resp.json()["message"] == "学生已删除"

    # Verify it's gone
    get_resp = await client.get(f"/api/v1/children/{child_id}", headers=auth_headers(token))
    assert get_resp.status_code == 404


# ===================================================================
# Parent self-service
# ===================================================================

@pytest.mark.asyncio
async def test_parent_get_my_child(client: AsyncClient):
    """GET /children/me — parent sees their own child."""
    token, _ = await login_parent(client)
    resp = await client.get("/api/v1/children/me", headers=auth_headers(token))
    assert resp.status_code == 200
    child = resp.json()
    assert "id" in child
    assert "name" in child


# ===================================================================
# Permission isolation
# ===================================================================

@pytest.mark.asyncio
async def test_teacher_cannot_list_children(client: AsyncClient):
    """GET /children with teacher token → 403."""
    token, _ = await login_teacher(client)
    resp = await client.get("/api/v1/children", headers=auth_headers(token))
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_parent_cannot_list_children(client: AsyncClient):
    """GET /children with parent token → 403."""
    token, _ = await login_parent(client)
    resp = await client.get("/api/v1/children", headers=auth_headers(token))
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_teacher_cannot_create_child(client: AsyncClient):
    """POST /children with teacher token → 403."""
    token, _ = await login_teacher(client)
    resp = await client.post("/api/v1/children", json={
        "name": "非法创建",
        "parent_phone": "19999999999",
    }, headers=auth_headers(token))
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_unauthenticated_cannot_access_children(client: AsyncClient):
    """GET /children without token → 401."""
    resp = await client.get("/api/v1/children")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_parent_cannot_get_child_by_id(client: AsyncClient):
    """GET /children/{id} with parent token → 403 (admin-only endpoint)."""
    token, _ = await login_admin(client)
    list_resp = await client.get("/api/v1/children", headers=auth_headers(token))
    child_id = list_resp.json()["items"][0]["id"]

    parent_token, _ = await login_parent(client)
    resp = await client.get(f"/api/v1/children/{child_id}", headers=auth_headers(parent_token))
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_teacher_cannot_get_children_me(client: AsyncClient):
    """GET /children/me with teacher token → 403 (parent-only endpoint)."""
    token, _ = await login_teacher(client)
    resp = await client.get("/api/v1/children/me", headers=auth_headers(token))
    assert resp.status_code == 403
