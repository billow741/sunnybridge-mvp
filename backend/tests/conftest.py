"""TEST-01: Global test fixtures and helpers for SunnyBridge MVP integration tests.

Provides:
- async httpx client mounted to FastAPI app
- test user setup/teardown (admin, teacher, parent)
- login helpers returning access tokens
- auth_headers helper for Authorization header
- data factories for children, courses, feedback, reading materials
- Redis cleanup fixtures
"""

import pytest
import pytest_asyncio
import redis as sync_redis
from httpx import AsyncClient, ASGITransport
from uuid import uuid4

from app.main import app
from app.core.config import get_settings
from app.core.database import get_supabase
from app.core.redis import get_redis, reset_redis
from app.core.security import hash_password, verify_password

settings = get_settings()
BASE_URL = "http://test"

# ---------------------------------------------------------------------------
# Test user constants (unique prefix to avoid collision with prod/seed data)
# ---------------------------------------------------------------------------

# Admin
ADMIN_USERNAME = "test_it_admin"
ADMIN_PHONE = "13900000001"
ADMIN_PASSWORD = "AdminPass123!"

# Teacher
TEACHER_USERNAME = "test_it_teacher"
TEACHER_PHONE = "13900000002"
TEACHER_NAME = "测试教师"
TEACHER_INITIAL_PW = "Tea@cher1"  # meets complexity

# Parent with password
PARENT_PHONE = "13900000003"
PARENT_PASSWORD = "ParentPass123!"

# Parent without password (SMS-only)
PARENT_NO_PW_PHONE = "13900000004"

# Second parent (for isolation tests)
PARENT2_PHONE = "13900000005"
PARENT2_PASSWORD = "Parent2Pass123!"

# Child
CHILD_NAME = "测试学生"
CHILD_LEVEL = "L2"

# Second child (for parent2)
CHILD2_NAME = "另一个学生"
CHILD2_LEVEL = "L1"

# Reading material
MATERIAL_TITLE = "测试阅读材料"
MATERIAL_LEVEL = "L1"
MATERIAL_CATEGORY = "picture_book"
MATERIAL_PDF_URL = "reading/test/test_material.pdf"


# ---------------------------------------------------------------------------
# Sync DB helpers
# ---------------------------------------------------------------------------

def _sb():
    return get_supabase()


def _sync_redis() -> sync_redis.Redis:
    return sync_redis.from_url(settings.redis_url, decode_responses=True)


def _upsert_admin(username: str, phone: str, password: str) -> str:
    """Create or update an admin user. Returns user ID."""
    sb = _sb()
    password_hash = hash_password(password)
    existing = sb.table("users").select("id").eq("username", username).eq("role", "admin").execute()
    if existing.data:
        uid = existing.data[0]["id"]
        sb.table("users").update({"password_hash": password_hash}).eq("id", uid).execute()
        return uid
    result = sb.table("users").insert({
        "phone": phone, "username": username, "role": "admin", "password_hash": password_hash,
    }).execute()
    return result.data[0]["id"]


def _upsert_parent(phone: str, password: str | None = None) -> str:
    """Create or update a parent user. Returns user ID."""
    sb = _sb()
    existing = sb.table("users").select("id").eq("phone", phone).eq("role", "parent").execute()
    if existing.data:
        uid = existing.data[0]["id"]
        sb.table("users").update({"password_hash": hash_password(password) if password else None}).eq("id", uid).execute()
        return uid
    data = {"phone": phone, "role": "parent"}
    if password:
        data["password_hash"] = hash_password(password)
    result = sb.table("users").insert(data).execute()
    return result.data[0]["id"]


def _upsert_teacher(username: str, phone: str, name: str, password: str) -> str:
    """Create or update a teacher. Returns teacher ID."""
    sb = _sb()
    password_hash = hash_password(password)
    existing = sb.table("teachers").select("id").eq("username", username).execute()
    if existing.data:
        tid = existing.data[0]["id"]
        sb.table("teachers").update({
            "password_hash": password_hash,
            "phone": phone,
            "name": name,
            "is_active": True,
            "must_change_password": False,
        }).eq("id", tid).execute()
        return tid
    result = sb.table("teachers").insert({
        "username": username,
        "phone": phone,
        "name": name,
        "password_hash": password_hash,
        "is_active": True,
        "must_change_password": False,
    }).execute()
    return result.data[0]["id"]


def _create_child(name: str, parent_id: str, level: str | None = None) -> str:
    """Create a child linked to parent. Returns child ID."""
    sb = _sb()
    # Delete existing child for this parent first (UNIQUE constraint on parent_id)
    sb.table("children").delete().eq("parent_id", parent_id).execute()
    data = {"name": name, "parent_id": parent_id}
    if level:
        data["level"] = level
    result = sb.table("children").insert(data).execute()
    return result.data[0]["id"]


def _cleanup_redis():
    """Clean up all test-related Redis keys."""
    r = _sync_redis()
    for prefix in ["admin:", "teacher:", "parent:", "sms:"]:
        # Best-effort: delete specific keys
        for suffix in ["lock", "fail", "rate"]:
            for identifier in [ADMIN_USERNAME, TEACHER_USERNAME, PARENT_PHONE, PARENT_NO_PW_PHONE, PARENT2_PHONE]:
                r.delete(f"{prefix}{suffix}:{identifier}")
    # Clean blacklist keys
    for key in r.scan_iter("blocklist:*"):
        r.delete(key)
    r.close()


def _delete_test_data():
    """Delete all test data created by this test suite."""
    sb = _sb()
    # Clean in reverse dependency order
    for phone in [PARENT_PHONE, PARENT_NO_PW_PHONE, PARENT2_PHONE]:
        # Find children for this parent
        parent = sb.table("users").select("id").eq("phone", phone).eq("role", "parent").execute()
        if parent.data:
            pid = parent.data[0]["id"]
            children = sb.table("children").select("id").eq("parent_id", pid).execute()
            for child in children.data:
                cid = child["id"]
                # Delete course_students for this child
                sb.table("course_students").delete().eq("child_id", cid).execute()
            sb.table("children").delete().eq("parent_id", pid).execute()
            # Delete reading progress for this parent's children
            sb.table("reading_progress").delete().eq("child_id", pid).execute()

    # Delete test courses (by teacher)
    teacher = sb.table("teachers").select("id").eq("username", TEACHER_USERNAME).execute()
    if teacher.data:
        tid = teacher.data[0]["id"]
        courses = sb.table("courses").select("id").eq("teacher_id", tid).execute()
        for c in courses.data:
            cid = c["id"]
            sb.table("feedbacks").delete().eq("course_id", cid).execute()
            sb.table("course_students").delete().eq("course_id", cid).execute()
        sb.table("courses").delete().eq("teacher_id", tid).execute()

    # Delete test reading materials
    sb.table("reading_materials").delete().eq("title", MATERIAL_TITLE).execute()

    # Delete test users
    sb.table("users").delete().eq("username", ADMIN_USERNAME).execute()
    sb.table("users").delete().eq("phone", PARENT_PHONE).eq("role", "parent").execute()
    sb.table("users").delete().eq("phone", PARENT_NO_PW_PHONE).eq("role", "parent").execute()
    sb.table("users").delete().eq("phone", PARENT2_PHONE).eq("role", "parent").execute()
    sb.table("teachers").delete().eq("username", TEACHER_USERNAME).execute()


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture(autouse=True)
async def _reset_redis_client():
    """Reset Redis singleton between tests."""
    reset_redis()
    yield
    reset_redis()


@pytest.fixture(autouse=True)
def _setup_teardown():
    """Setup test data before each test, cleanup after."""
    # Setup: create test users
    admin_id = _upsert_admin(ADMIN_USERNAME, ADMIN_PHONE, ADMIN_PASSWORD)
    teacher_id = _upsert_teacher(TEACHER_USERNAME, TEACHER_PHONE, TEACHER_NAME, TEACHER_INITIAL_PW)
    parent_id = _upsert_parent(PARENT_PHONE, PARENT_PASSWORD)
    _upsert_parent(PARENT_NO_PW_PHONE)  # no password parent
    parent2_id = _upsert_parent(PARENT2_PHONE, PARENT2_PASSWORD)

    # Create children
    child_id = _create_child(CHILD_NAME, parent_id, CHILD_LEVEL)
    child2_id = _create_child(CHILD2_NAME, parent2_id, CHILD2_LEVEL)

    # Clean Redis
    _cleanup_redis()

    yield

    # Teardown: restore defaults + clean Redis
    _cleanup_redis()


@pytest_asyncio.fixture
async def client():
    """Async HTTP client mounted to FastAPI app."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url=BASE_URL) as ac:
        yield ac


# ---------------------------------------------------------------------------
# Login helpers — return (access_token, refresh_token)
# ---------------------------------------------------------------------------

async def login_admin(client: AsyncClient) -> tuple[str, str]:
    """Login as admin, return (access_token, refresh_token)."""
    resp = await client.post("/api/v1/auth/admin/login", json={
        "username": ADMIN_USERNAME,
        "password": ADMIN_PASSWORD,
    })
    assert resp.status_code == 200, f"Admin login failed: {resp.text}"
    data = resp.json()
    return data["access_token"], data["refresh_token"]


async def login_teacher(client: AsyncClient) -> tuple[str, str]:
    """Login as teacher, return (access_token, refresh_token)."""
    resp = await client.post("/api/v1/auth/teacher/login", json={
        "username": TEACHER_USERNAME,
        "password": TEACHER_INITIAL_PW,
    })
    assert resp.status_code == 200, f"Teacher login failed: {resp.text}"
    data = resp.json()
    return data["access_token"], data["refresh_token"]


async def login_parent(client: AsyncClient) -> tuple[str, str]:
    """Login as parent (with password), return (access_token, refresh_token)."""
    resp = await client.post("/api/v1/auth/parent/login", json={
        "phone": PARENT_PHONE,
        "password": PARENT_PASSWORD,
    })
    assert resp.status_code == 200, f"Parent login failed: {resp.text}"
    data = resp.json()
    return data["access_token"], data["refresh_token"]


async def login_parent2(client: AsyncClient) -> tuple[str, str]:
    """Login as parent2, return (access_token, refresh_token)."""
    resp = await client.post("/api/v1/auth/parent/login", json={
        "phone": PARENT2_PHONE,
        "password": PARENT2_PASSWORD,
    })
    assert resp.status_code == 200, f"Parent2 login failed: {resp.text}"
    data = resp.json()
    return data["access_token"], data["refresh_token"]


def auth_headers(token: str) -> dict:
    """Return Authorization header dict."""
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# Data factory helpers — create entities via API for test setup
# ---------------------------------------------------------------------------

async def create_child_via_api(client: AsyncClient, admin_token: str, name: str, parent_phone: str, level: str | None = None) -> dict:
    """Create a child via admin API. Returns response JSON."""
    body = {"name": name, "parent_phone": parent_phone}
    if level:
        body["level"] = level
    resp = await client.post("/api/v1/children", json=body, headers=auth_headers(admin_token))
    assert resp.status_code == 201, f"Create child failed: {resp.text}"
    return resp.json()


async def create_course_via_api(client: AsyncClient, admin_token: str, date_str: str, start: str, end: str, teacher_id: str, child_ids: list[str]) -> dict:
    """Create a course via admin API. Returns response JSON."""
    body = {
        "date": date_str,
        "start_time": start,
        "end_time": end,
        "teacher_id": teacher_id,
        "child_ids": child_ids,
    }
    resp = await client.post("/api/v1/courses", json=body, headers=auth_headers(admin_token))
    assert resp.status_code == 201, f"Create course failed: {resp.text}"
    return resp.json()


async def create_material_via_api(client: AsyncClient, admin_token: str, title: str = MATERIAL_TITLE, level: str = MATERIAL_LEVEL, category: str = MATERIAL_CATEGORY) -> dict:
    """Create a reading material via admin API. Returns response JSON."""
    body = {
        "title": title,
        "level": level,
        "category": category,
        "pdf_url": MATERIAL_PDF_URL,
        "page_count": 10,
    }
    resp = await client.post("/api/v1/reading/materials", json=body, headers=auth_headers(admin_token))
    assert resp.status_code == 201, f"Create material failed: {resp.text}"
    return resp.json()
