"""TEST-01 Course + Feedback integration tests.

Covers:
- Admin: create/update/delete courses
- Course list views: today/history/all with role isolation
- Course detail: parent ownership check → 403 if not enrolled
- Teacher: can only see own courses in /all
- Feedback submission + retrieval
- Permission guards: parent/teacher cannot create courses
"""

import pytest
from datetime import date, timedelta
from httpx import AsyncClient
from uuid import uuid4

from tests.conftest import (
    TEACHER_USERNAME,
    login_admin, login_teacher, login_parent, login_parent2, auth_headers,
)
from app.core.database import get_supabase


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_teacher_id() -> str:
    sb = get_supabase()
    r = sb.table("teachers").select("id").eq("username", TEACHER_USERNAME).limit(1).execute()
    assert r.data, "Test teacher not found in DB"
    return r.data[0]["id"]


def _get_child_id_for_parent(phone: str) -> str | None:
    sb = get_supabase()
    u = sb.table("users").select("id").eq("phone", phone).eq("role", "parent").limit(1).execute()
    if not u.data:
        return None
    c = sb.table("children").select("id").eq("parent_id", u.data[0]["id"]).limit(1).execute()
    return c.data[0]["id"] if c.data else None


def _cleanup_courses(teacher_id: str):
    """Delete all test courses for this teacher."""
    sb = get_supabase()
    courses = sb.table("courses").select("id").eq("teacher_id", teacher_id).execute()
    for c in courses.data:
        cid = c["id"]
        sb.table("feedbacks").delete().eq("course_id", cid).execute()
        sb.table("course_students").delete().eq("course_id", cid).execute()
    sb.table("courses").delete().eq("teacher_id", teacher_id).execute()


async def _setup_course(client: AsyncClient, admin_token: str, teacher_id: str, child_id: str,
                         course_date: str | None = None) -> dict:
    """Create a course and return its JSON."""
    today = course_date or date.today().isoformat()
    body = {
        "date": today,
        "start_time": "10:00:00",
        "end_time": "11:00:00",
        "teacher_id": teacher_id,
        "child_ids": [child_id],
    }
    resp = await client.post("/api/v1/courses", json=body, headers=auth_headers(admin_token))
    assert resp.status_code == 201, f"Setup course failed: {resp.text}"
    return resp.json()


# ===================================================================
# Admin CRUD
# ===================================================================

@pytest.mark.asyncio
async def test_admin_create_course(client: AsyncClient):
    """POST /courses — admin creates a course."""
    admin_token, _ = await login_admin(client)
    teacher_id = _get_teacher_id()
    child_id = _get_child_id_for_parent("13900000003")
    assert child_id, "No child for test parent"

    _cleanup_courses(teacher_id)
    course = await _setup_course(client, admin_token, teacher_id, child_id)
    assert course["teacher_id"] == teacher_id
    assert "children" in course
    _cleanup_courses(teacher_id)


@pytest.mark.asyncio
async def test_admin_create_course_nonexistent_teacher_404(client: AsyncClient):
    """POST /courses with fake teacher_id → 404."""
    admin_token, _ = await login_admin(client)
    child_id = _get_child_id_for_parent("13900000003")
    body = {
        "date": date.today().isoformat(),
        "start_time": "10:00:00",
        "end_time": "11:00:00",
        "teacher_id": str(uuid4()),
        "child_ids": [child_id],
    }
    resp = await client.post("/api/v1/courses", json=body, headers=auth_headers(admin_token))
    assert resp.status_code == 404
    assert resp.json()["detail"]["code"] == "TEACHER_NOT_FOUND"


@pytest.mark.asyncio
async def test_admin_update_course(client: AsyncClient):
    """PUT /courses/{id} — admin updates course meeting_link."""
    admin_token, _ = await login_admin(client)
    teacher_id = _get_teacher_id()
    child_id = _get_child_id_for_parent("13900000003")
    _cleanup_courses(teacher_id)

    course = await _setup_course(client, admin_token, teacher_id, child_id)
    course_id = course["id"]

    resp = await client.put(f"/api/v1/courses/{course_id}", json={
        "meeting_link": "https://updated-link.example.com",
    }, headers=auth_headers(admin_token))
    assert resp.status_code == 200
    assert resp.json()["meeting_link"] == "https://updated-link.example.com"
    _cleanup_courses(teacher_id)


@pytest.mark.asyncio
async def test_admin_update_course_status(client: AsyncClient):
    """PUT /courses/{id} — admin updates course status to completed."""
    admin_token, _ = await login_admin(client)
    teacher_id = _get_teacher_id()
    child_id = _get_child_id_for_parent("13900000003")
    _cleanup_courses(teacher_id)

    course = await _setup_course(client, admin_token, teacher_id, child_id)
    course_id = course["id"]

    resp = await client.put(f"/api/v1/courses/{course_id}", json={
        "status": "completed",
    }, headers=auth_headers(admin_token))
    assert resp.status_code == 200
    assert resp.json()["status"] == "completed"
    _cleanup_courses(teacher_id)


@pytest.mark.asyncio
async def test_admin_delete_course(client: AsyncClient):
    """DELETE /courses/{id} — admin deletes course."""
    admin_token, _ = await login_admin(client)
    teacher_id = _get_teacher_id()
    child_id = _get_child_id_for_parent("13900000003")
    _cleanup_courses(teacher_id)

    course = await _setup_course(client, admin_token, teacher_id, child_id)
    course_id = course["id"]

    resp = await client.delete(f"/api/v1/courses/{course_id}", headers=auth_headers(admin_token))
    assert resp.status_code == 200

    # Verify deleted
    get_resp = await client.get(f"/api/v1/courses/{course_id}", headers=auth_headers(admin_token))
    assert get_resp.status_code == 404


# ===================================================================
# Course list views — role isolation
# ===================================================================

@pytest.mark.asyncio
async def test_parent_today_courses(client: AsyncClient):
    """GET /courses/today — parent sees only their child's courses."""
    admin_token, _ = await login_admin(client)
    teacher_id = _get_teacher_id()
    child_id = _get_child_id_for_parent("13900000003")
    _cleanup_courses(teacher_id)

    await _setup_course(client, admin_token, teacher_id, child_id)

    parent_token, _ = await login_parent(client)
    resp = await client.get("/api/v1/courses/today", headers=auth_headers(parent_token))
    assert resp.status_code == 200
    courses = resp.json()
    assert isinstance(courses, list)
    _cleanup_courses(teacher_id)


@pytest.mark.asyncio
async def test_teacher_today_courses(client: AsyncClient):
    """GET /courses/today — teacher sees only own courses."""
    admin_token, _ = await login_admin(client)
    teacher_id = _get_teacher_id()
    child_id = _get_child_id_for_parent("13900000003")
    _cleanup_courses(teacher_id)

    await _setup_course(client, admin_token, teacher_id, child_id)

    teacher_token, _ = await login_teacher(client)
    resp = await client.get("/api/v1/courses/today", headers=auth_headers(teacher_token))
    assert resp.status_code == 200
    courses = resp.json()
    assert isinstance(courses, list)
    # All courses should belong to this teacher
    for c in courses:
        assert c["teacher_id"] == teacher_id
    _cleanup_courses(teacher_id)


@pytest.mark.asyncio
async def test_admin_today_courses(client: AsyncClient):
    """GET /courses/today — admin sees all courses."""
    admin_token, _ = await login_admin(client)
    teacher_id = _get_teacher_id()
    child_id = _get_child_id_for_parent("13900000003")
    _cleanup_courses(teacher_id)

    await _setup_course(client, admin_token, teacher_id, child_id)

    resp = await client.get("/api/v1/courses/today", headers=auth_headers(admin_token))
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
    _cleanup_courses(teacher_id)


@pytest.mark.asyncio
async def test_parent_history_courses(client: AsyncClient):
    """GET /courses/history — parent gets paginated history."""
    admin_token, _ = await login_admin(client)
    teacher_id = _get_teacher_id()
    child_id = _get_child_id_for_parent("13900000003")
    _cleanup_courses(teacher_id)

    # Create a course in the past
    yesterday = (date.today() - timedelta(days=1)).isoformat()
    await _setup_course(client, admin_token, teacher_id, child_id, course_date=yesterday)

    parent_token, _ = await login_parent(client)
    resp = await client.get("/api/v1/courses/history", headers=auth_headers(parent_token))
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] >= 1
    _cleanup_courses(teacher_id)


@pytest.mark.asyncio
async def test_teacher_all_courses_isolation(client: AsyncClient):
    """GET /courses/all — teacher only sees own courses (not other teachers')."""
    teacher_token, _ = await login_teacher(client)
    resp = await client.get("/api/v1/courses/all", headers=auth_headers(teacher_token))
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    # All items belong to this teacher (if any)
    teacher_id = _get_teacher_id()
    for item in data["items"]:
        assert item["teacher_id"] == teacher_id


@pytest.mark.asyncio
async def test_admin_all_courses(client: AsyncClient):
    """GET /courses/all — admin sees all courses."""
    admin_token, _ = await login_admin(client)
    resp = await client.get("/api/v1/courses/all", headers=auth_headers(admin_token))
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data


# ===================================================================
# Course detail — parent ownership check
# ===================================================================

@pytest.mark.asyncio
async def test_parent_can_view_own_child_course(client: AsyncClient):
    """GET /courses/{id} — parent can view course their child is enrolled in."""
    admin_token, _ = await login_admin(client)
    teacher_id = _get_teacher_id()
    child_id = _get_child_id_for_parent("13900000003")
    _cleanup_courses(teacher_id)

    course = await _setup_course(client, admin_token, teacher_id, child_id)
    course_id = course["id"]

    parent_token, _ = await login_parent(client)
    resp = await client.get(f"/api/v1/courses/{course_id}", headers=auth_headers(parent_token))
    assert resp.status_code == 200
    _cleanup_courses(teacher_id)


@pytest.mark.asyncio
async def test_parent_cannot_view_other_child_course(client: AsyncClient):
    """GET /courses/{id} — parent2 cannot view parent1's child course → 403."""
    admin_token, _ = await login_admin(client)
    teacher_id = _get_teacher_id()
    child_id = _get_child_id_for_parent("13900000003")  # parent1's child
    _cleanup_courses(teacher_id)

    course = await _setup_course(client, admin_token, teacher_id, child_id)
    course_id = course["id"]

    # parent2's child is NOT enrolled
    parent2_token, _ = await login_parent2(client)
    resp = await client.get(f"/api/v1/courses/{course_id}", headers=auth_headers(parent2_token))
    assert resp.status_code == 403
    _cleanup_courses(teacher_id)


# ===================================================================
# Permission guards
# ===================================================================

@pytest.mark.asyncio
async def test_parent_cannot_create_course(client: AsyncClient):
    """POST /courses with parent token → 403."""
    parent_token, _ = await login_parent(client)
    resp = await client.post("/api/v1/courses", json={
        "date": date.today().isoformat(),
        "start_time": "10:00:00",
        "end_time": "11:00:00",
        "teacher_id": str(uuid4()),
        "child_ids": [],
    }, headers=auth_headers(parent_token))
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_teacher_cannot_create_course(client: AsyncClient):
    """POST /courses with teacher token → 403."""
    teacher_token, _ = await login_teacher(client)
    resp = await client.post("/api/v1/courses", json={
        "date": date.today().isoformat(),
        "start_time": "10:00:00",
        "end_time": "11:00:00",
        "teacher_id": str(uuid4()),
        "child_ids": [],
    }, headers=auth_headers(teacher_token))
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_unauthenticated_cannot_access_courses(client: AsyncClient):
    """GET /courses/today without token → 401."""
    resp = await client.get("/api/v1/courses/today")
    assert resp.status_code == 401


# ===================================================================
# Feedback
# ===================================================================

@pytest.mark.asyncio
async def test_teacher_submit_feedback(client: AsyncClient):
    """POST /courses/{id}/feedback — teacher submits feedback."""
    admin_token, _ = await login_admin(client)
    teacher_id = _get_teacher_id()
    child_id = _get_child_id_for_parent("13900000003")
    _cleanup_courses(teacher_id)

    course = await _setup_course(client, admin_token, teacher_id, child_id)
    course_id = course["id"]

    # Update course status to completed first
    await client.put(f"/api/v1/courses/{course_id}", json={
        "status": "completed",
    }, headers=auth_headers(admin_token))

    teacher_token, _ = await login_teacher(client)
    resp = await client.post(f"/api/v1/courses/{course_id}/feedback", json={
        "content": "本节课学生表现很好，积极参与课堂互动。",
        "homework": "复习今天学过的单词。",
    }, headers=auth_headers(teacher_token))
    assert resp.status_code in (200, 201), f"Feedback submit failed: {resp.text}"
    _cleanup_courses(teacher_id)


@pytest.mark.asyncio
async def test_feedback_visible_in_course_detail(client: AsyncClient):
    """GET /courses/{id} — feedback is included in course detail."""
    admin_token, _ = await login_admin(client)
    teacher_id = _get_teacher_id()
    child_id = _get_child_id_for_parent("13900000003")
    _cleanup_courses(teacher_id)

    course = await _setup_course(client, admin_token, teacher_id, child_id)
    course_id = course["id"]

    # Complete + submit feedback
    await client.put(f"/api/v1/courses/{course_id}", json={
        "status": "completed",
    }, headers=auth_headers(admin_token))

    teacher_token, _ = await login_teacher(client)
    await client.post(f"/api/v1/courses/{course_id}/feedback", json={
        "content": "反馈内容测试",
        "homework": "作业测试",
    }, headers=auth_headers(teacher_token))

    # Verify feedback appears in course detail
    resp = await client.get(f"/api/v1/courses/{course_id}", headers=auth_headers(admin_token))
    assert resp.status_code == 200
    detail = resp.json()
    assert detail.get("feedback") is not None
    assert detail["feedback"]["content"] == "反馈内容测试"
    _cleanup_courses(teacher_id)
