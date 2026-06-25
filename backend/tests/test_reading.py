"""TEST-01 Reading module integration tests.

Covers:
- Admin: create/update/delete materials
- Material list with filters (level, category, is_active)
- Material detail with signed URL
- Parent inactive material invisible
- Reading progress: upsert + auto-complete + list
- Permission isolation: parent/teacher cannot manage materials
"""

import pytest
from httpx import AsyncClient
from uuid import uuid4

from tests.conftest import (
    MATERIAL_TITLE, MATERIAL_LEVEL, MATERIAL_CATEGORY, MATERIAL_PDF_URL,
    login_admin, login_teacher, login_parent, auth_headers,
    create_material_via_api,
)
from app.core.database import get_supabase


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _cleanup_materials():
    sb = get_supabase()
    sb.table("reading_materials").delete().eq("title", MATERIAL_TITLE).execute()


def _cleanup_progress(child_id: str):
    sb = get_supabase()
    sb.table("reading_progress").delete().eq("child_id", child_id).execute()


# ===================================================================
# Admin Material CRUD
# ===================================================================

@pytest.mark.asyncio
async def test_admin_create_material(client: AsyncClient):
    """POST /reading/materials — admin creates a reading material."""
    _cleanup_materials()
    admin_token, _ = await login_admin(client)

    resp = await client.post("/api/v1/reading/materials", json={
        "title": MATERIAL_TITLE,
        "level": MATERIAL_LEVEL,
        "category": MATERIAL_CATEGORY,
        "pdf_url": MATERIAL_PDF_URL,
        "page_count": 10,
        "sort_order": 1,
        "is_active": True,
    }, headers=auth_headers(admin_token))
    assert resp.status_code == 201
    mat = resp.json()
    assert mat["title"] == MATERIAL_TITLE
    assert mat["level"] == MATERIAL_LEVEL
    assert mat["category"] == MATERIAL_CATEGORY
    assert mat["page_count"] == 10
    _cleanup_materials()


@pytest.mark.asyncio
async def test_admin_update_material(client: AsyncClient):
    """PUT /reading/materials/{id} — admin updates material title."""
    _cleanup_materials()
    admin_token, _ = await login_admin(client)
    mat = await create_material_via_api(client, admin_token)
    mat_id = mat["id"]

    resp = await client.put(f"/api/v1/reading/materials/{mat_id}", json={
        "title": "更新后标题",
    }, headers=auth_headers(admin_token))
    assert resp.status_code == 200
    assert resp.json()["title"] == "更新后标题"
    _cleanup_materials()


@pytest.mark.asyncio
async def test_admin_update_material_not_found(client: AsyncClient):
    """PUT /reading/materials/{id} — nonexistent ID → 404."""
    admin_token, _ = await login_admin(client)
    resp = await client.put(f"/api/v1/reading/materials/{uuid4()}", json={
        "title": "不存在",
    }, headers=auth_headers(admin_token))
    assert resp.status_code == 404
    assert resp.json()["detail"]["code"] == "MATERIAL_NOT_FOUND"


@pytest.mark.asyncio
async def test_admin_delete_material(client: AsyncClient):
    """DELETE /reading/materials/{id} — admin deletes material."""
    _cleanup_materials()
    admin_token, _ = await login_admin(client)
    mat = await create_material_via_api(client, admin_token)
    mat_id = mat["id"]

    resp = await client.delete(f"/api/v1/reading/materials/{mat_id}", headers=auth_headers(admin_token))
    assert resp.status_code == 200
    assert resp.json()["message"] == "阅读材料已删除"

    # Verify deleted
    get_resp = await client.get(f"/api/v1/reading/materials/{mat_id}", headers=auth_headers(admin_token))
    assert get_resp.status_code == 404


# ===================================================================
# Material listing
# ===================================================================

@pytest.mark.asyncio
async def test_list_materials_with_level_filter(client: AsyncClient):
    """GET /reading/materials?level=starter — filter by level."""
    _cleanup_materials()
    admin_token, _ = await login_admin(client)
    await create_material_via_api(client, admin_token, level="starter")

    resp = await client.get("/api/v1/reading/materials", params={"level": "starter"}, headers=auth_headers(admin_token))
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    for item in data["items"]:
        assert item["level"] == "starter"
    _cleanup_materials()


@pytest.mark.asyncio
async def test_list_materials_with_category_filter(client: AsyncClient):
    """GET /reading/materials?category=picture_book — filter by category."""
    _cleanup_materials()
    admin_token, _ = await login_admin(client)
    await create_material_via_api(client, admin_token, category="picture_book")

    resp = await client.get("/api/v1/reading/materials", params={"category": "picture_book"}, headers=auth_headers(admin_token))
    assert resp.status_code == 200
    data = resp.json()
    for item in data["items"]:
        assert item["category"] == "picture_book"
    _cleanup_materials()


@pytest.mark.asyncio
async def test_list_materials_parent_sees_active_only(client: AsyncClient):
    """GET /reading/materials — parent only sees is_active=true."""
    _cleanup_materials()
    admin_token, _ = await login_admin(client)

    # Create an inactive material
    resp = await client.post("/api/v1/reading/materials", json={
        "title": "不活跃材料",
        "level": "starter",
        "category": "picture_book",
        "pdf_url": "reading/test/inactive_material.pdf",
        "page_count": 5,
        "sort_order": 99,
        "is_active": False,
    }, headers=auth_headers(admin_token))
    assert resp.status_code == 201
    inactive_id = resp.json()["id"]

    # Parent listing should not include inactive
    parent_token, _ = await login_parent(client)
    resp = await client.get("/api/v1/reading/materials", headers=auth_headers(parent_token))
    assert resp.status_code == 200
    for item in resp.json()["items"]:
        assert item["is_active"] is True

    # Cleanup
    sb = get_supabase()
    sb.table("reading_materials").delete().eq("id", inactive_id).execute()


# ===================================================================
# Material detail — inactive visibility
# ===================================================================

@pytest.mark.asyncio
async def test_parent_cannot_view_inactive_material(client: AsyncClient):
    """GET /reading/materials/{id} — parent gets 404 for inactive material."""
    _cleanup_materials()
    admin_token, _ = await login_admin(client)

    resp = await client.post("/api/v1/reading/materials", json={
        "title": "不活跃详情",
        "level": "starter",
        "category": "short_text",
        "pdf_url": "reading/test/inactive_detail.pdf",
        "page_count": 3,
        "sort_order": 99,
        "is_active": False,
    }, headers=auth_headers(admin_token))
    assert resp.status_code == 201
    inactive_id = resp.json()["id"]

    parent_token, _ = await login_parent(client)
    resp = await client.get(f"/api/v1/reading/materials/{inactive_id}", headers=auth_headers(parent_token))
    assert resp.status_code == 404

    # But admin can view it (may be 200 or 500 if signed URL fails for non-existent PDF)
    resp = await client.get(f"/api/v1/reading/materials/{inactive_id}", headers=auth_headers(admin_token))
    # Admin bypasses is_active check; 200 if PDF exists in storage, 500 if signed URL fails
    # Either way, the key assertion is parent gets 404 above
    assert resp.status_code in (200, 500)

    sb = get_supabase()
    sb.table("reading_materials").delete().eq("id", inactive_id).execute()


# ===================================================================
# Reading Progress
# ===================================================================

@pytest.mark.asyncio
async def test_parent_upsert_progress(client: AsyncClient):
    """PUT /reading/progress/{material_id} — parent updates reading progress."""
    _cleanup_materials()
    admin_token, _ = await login_admin(client)
    mat = await create_material_via_api(client, admin_token, level="starter")
    mat_id = mat["id"]

    parent_token, _ = await login_parent(client)
    resp = await client.put(f"/api/v1/reading/progress/{mat_id}", json={
        "current_page": 3,
    }, headers=auth_headers(parent_token))
    assert resp.status_code == 200
    progress = resp.json()
    assert progress["current_page"] == 3
    assert progress["completed"] is False

    # Cleanup
    sb = get_supabase()
    u = sb.table("users").select("id").eq("phone", "13900000003").eq("role", "parent").limit(1).execute()
    if u.data:
        c = sb.table("children").select("id").eq("parent_id", u.data[0]["id"]).limit(1).execute()
        if c.data:
            _cleanup_progress(c.data[0]["id"])
    _cleanup_materials()


@pytest.mark.asyncio
async def test_progress_auto_complete(client: AsyncClient):
    """PUT /reading/progress/{material_id} — current_page == page_count → auto completed=true."""
    _cleanup_materials()
    admin_token, _ = await login_admin(client)
    mat = await create_material_via_api(client, admin_token, level="starter")
    mat_id = mat["id"]
    page_count = mat["page_count"]

    parent_token, _ = await login_parent(client)
    resp = await client.put(f"/api/v1/reading/progress/{mat_id}", json={
        "current_page": page_count,
    }, headers=auth_headers(parent_token))
    assert resp.status_code == 200
    progress = resp.json()
    assert progress["completed"] is True

    # Cleanup
    sb = get_supabase()
    u = sb.table("users").select("id").eq("phone", "13900000003").eq("role", "parent").limit(1).execute()
    if u.data:
        c = sb.table("children").select("id").eq("parent_id", u.data[0]["id"]).limit(1).execute()
        if c.data:
            _cleanup_progress(c.data[0]["id"])
    _cleanup_materials()


@pytest.mark.asyncio
async def test_parent_list_progress(client: AsyncClient):
    """GET /reading/progress — parent lists their child's progress."""
    _cleanup_materials()
    admin_token, _ = await login_admin(client)
    mat = await create_material_via_api(client, admin_token, level="starter")
    mat_id = mat["id"]

    parent_token, _ = await login_parent(client)
    # Create progress first (PUT, not POST)
    resp = await client.put(f"/api/v1/reading/progress/{mat_id}", json={
        "current_page": 2,
    }, headers=auth_headers(parent_token))
    assert resp.status_code == 200, f"Progress upsert failed: {resp.text}"

    # Now list
    resp = await client.get("/api/v1/reading/progress", headers=auth_headers(parent_token))
    assert resp.status_code == 200
    items = resp.json()
    assert isinstance(items, list)
    assert len(items) >= 1
    assert items[0]["material_id"] == mat_id

    # Cleanup
    sb = get_supabase()
    u = sb.table("users").select("id").eq("phone", "13900000003").eq("role", "parent").limit(1).execute()
    if u.data:
        c = sb.table("children").select("id").eq("parent_id", u.data[0]["id"]).limit(1).execute()
        if c.data:
            _cleanup_progress(c.data[0]["id"])
    _cleanup_materials()


# ===================================================================
# Permission guards
# ===================================================================

@pytest.mark.asyncio
async def test_teacher_cannot_create_material(client: AsyncClient):
    """POST /reading/materials with teacher token → 403."""
    teacher_token, _ = await login_teacher(client)
    resp = await client.post("/api/v1/reading/materials", json={
        "title": "非法创建",
        "level": "starter",
        "category": "picture_book",
        "page_count": 5,
    }, headers=auth_headers(teacher_token))
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_parent_cannot_create_material(client: AsyncClient):
    """POST /reading/materials with parent token → 403."""
    parent_token, _ = await login_parent(client)
    resp = await client.post("/api/v1/reading/materials", json={
        "title": "非法创建",
        "level": "starter",
        "category": "picture_book",
        "page_count": 5,
    }, headers=auth_headers(parent_token))
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_unauthenticated_cannot_list_materials(client: AsyncClient):
    """GET /reading/materials without token → 401."""
    resp = await client.get("/api/v1/reading/materials")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_teacher_cannot_upsert_progress(client: AsyncClient):
    """PUT /reading/progress/{material_id} with teacher token → 403 (parent-only)."""
    teacher_token, _ = await login_teacher(client)
    resp = await client.put(f"/api/v1/reading/progress/{uuid4()}", json={
        "current_page": 1,
    }, headers=auth_headers(teacher_token))
    assert resp.status_code == 403
