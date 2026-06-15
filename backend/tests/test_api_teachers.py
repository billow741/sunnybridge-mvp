"""API-04 教师管理 CRUD 测试

验收场景:
1. admin 创建教师 → 201 + initial_password(8位) + must_change_password=true + username
2. 重复用户名 → 409 TEACHER_USERNAME_DUPLICATE
3. 重复手机号 → 409 TEACHER_PHONE_DUPLICATE
4. 列表分页正确
5. 非 admin 调用 → 403 (parent + teacher 角色均需覆盖)
6. reset-password → 200 + new_initial_password + must_change_password=true
7. reset 后新密码可登录 (API-02b 联调, 用 username)
8. reset 后旧密码登录失败
9. delete → is_active=false
10. delete 后教师无法登录 (API-02b 联调, 用 username)
11. GET 不返回 password_hash
12. GET /teachers/{id} 不存在 → 404
13. 软删除隔离: GET/PUT/DELETE/RESET 对已删除教师返回 404
14. 软删除手机号可复用: 删除后同手机号可重新创建
15. PUT /teachers/{id} 更新教师
16. teacher 角色 403
17. username 重复校验 (创建+更新)
"""

import re
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.core.database import get_supabase
from app.core.security import create_access_token

settings = get_settings()
BASE = "/api/v1/teachers"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _admin_headers() -> dict:
    """Generate a valid admin JWT for testing."""
    token = create_access_token(subject=str(uuid4()), role="admin")
    return {"Authorization": "Bearer " + token}


def _parent_headers() -> dict:
    """Generate a valid parent JWT — should be rejected (403)."""
    token = create_access_token(subject=str(uuid4()), role="parent")
    return {"Authorization": "Bearer " + token}


def _teacher_headers() -> dict:
    """Generate a valid teacher JWT — should be rejected (403) for admin endpoints."""
    tid = str(uuid4())
    token = create_access_token(subject=tid, role="teacher", extra_claims={"teacher_id": tid})
    return {"Authorization": "Bearer " + token}


def _cleanup_teacher(phone: str):
    """Remove test teacher from DB (hard delete for cleanup)."""
    sb = get_supabase()
    sb.table("teachers").delete().eq("phone", phone).execute()


def _cleanup_teacher_by_username(username: str):
    """Remove test teacher from DB by username."""
    sb = get_supabase()
    sb.table("teachers").delete().eq("username", username).execute()


def _create_teacher_via_api(client: TestClient, username: str, phone: str, name: str = "测试教师"):
    """Create a teacher via API, return response JSON."""
    resp = client.post(
        BASE,
        json={"username": username, "phone": phone, "name": name},
        headers=_admin_headers(),
    )
    return resp


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def client():
    from app.main import app
    with TestClient(app) as c:
        yield c


@pytest.fixture(autouse=True)
def cleanup_test_teachers():
    """Ensure test teachers are cleaned up after each test."""
    yield
    for phone in ["13800001111", "13800002222", "13800003333", "13800004444", "13800005555", "13800009999"]:
        _cleanup_teacher(phone)
    for username in ["test_zhang", "test_li", "test_list1", "test_list2", "test_reset1", "test_reset2", "test_reset3", "test_del1", "test_nologin", "test_field", "test_iso1", "test_iso2", "test_iso3", "test_dbl_del", "test_reuse", "test_upd_name", "test_upd_phone", "test_upd_phone2", "test_conflict1", "test_conflict2", "test_dup_uname", "test_forbidden1", "test_forbidden2", "test_forbidden3", "test_forbidden4", "test_forbidden5", "test_forbidden6", "test_restore1", "test_restore2", "test_restore3", "test_restore4", "test_restore_login", "test_list_inactive"]:
        _cleanup_teacher_by_username(username)


# --- 1. Create teacher success ---

@pytest.mark.asyncio
async def test_create_teacher_success(client):
    resp = _create_teacher_via_api(client, "test_zhang", "13800001111", "张老师")
    assert resp.status_code == 201, f"Expected 201, got {resp.status_code}: {resp.text}"
    data = resp.json()

    assert data["username"] == "test_zhang"
    assert data["phone"] == "13800001111"
    assert data["name"] == "张老师"
    assert data["is_active"] is True
    assert data["must_change_password"] is True
    assert "initial_password" in data
    # 8-char password with mixed character types
    pw = data["initial_password"]
    assert len(pw) == 8
    assert re.search(r"[A-Z]", pw), "Password must contain uppercase"
    assert re.search(r"[a-z]", pw), "Password must contain lowercase"
    assert re.search(r"\d", pw), "Password must contain digit"
    assert re.search(r"[!@#$%^&*]", pw), "Password must contain special char"
    # NEVER return password_hash
    assert "password_hash" not in data


# --- 2. Duplicate username → 409 ---

@pytest.mark.asyncio
async def test_create_teacher_duplicate_username(client):
    _create_teacher_via_api(client, "test_dup_uname", "13800002222", "李老师")
    resp = _create_teacher_via_api(client, "test_dup_uname", "13800003333", "李老师2")
    assert resp.status_code == 409
    assert resp.json()["detail"]["code"] == "TEACHER_USERNAME_DUPLICATE"


# --- 2b. Duplicate phone → 409 ---

@pytest.mark.asyncio
async def test_create_teacher_duplicate_phone(client):
    _create_teacher_via_api(client, "test_li", "13800002222", "李老师")
    resp = _create_teacher_via_api(client, "test_li2", "13800002222", "李老师2")
    assert resp.status_code == 409
    assert resp.json()["detail"]["code"] == "TEACHER_PHONE_DUPLICATE"


# --- 3. Paginated list ---

@pytest.mark.asyncio
async def test_teacher_list_paginated(client):
    # Create 2 teachers
    _create_teacher_via_api(client, "test_list1", "13800003333", "列表教师1")
    _create_teacher_via_api(client, "test_list2", "13800004444", "列表教师2")

    resp = client.get(BASE, params={"page": 1, "page_size": 10}, headers=_admin_headers())
    assert resp.status_code == 200
    data = resp.json()

    assert "items" in data
    assert "total" in data
    assert "page" in data
    assert "page_size" in data
    assert data["page"] == 1
    assert data["page_size"] == 10
    assert data["total"] >= 2
    assert len(data["items"]) >= 2

    # Check item structure — no password_hash, has username
    for item in data["items"]:
        assert "id" in item
        assert "username" in item
        assert "phone" in item
        assert "name" in item
        assert "is_active" in item
        assert "must_change_password" in item
        assert "password_hash" not in item


# --- 4. Non-admin → 403 ---

@pytest.mark.asyncio
async def test_teacher_list_non_admin_forbidden(client):
    resp = client.get(BASE, headers=_parent_headers())
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_teacher_create_non_admin_forbidden(client):
    resp = client.post(
        BASE,
        json={"username": "test_forbidden1", "phone": "13800001111", "name": "不应创建"},
        headers=_parent_headers(),
    )
    assert resp.status_code == 403


# --- 4b. Teacher role → 403 on all admin endpoints ---

@pytest.mark.asyncio
async def test_teacher_list_teacher_role_forbidden(client):
    """BUG-004: teacher role should also get 403 on admin endpoints."""
    resp = client.get(BASE, headers=_teacher_headers())
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_teacher_create_teacher_role_forbidden(client):
    """BUG-004: teacher role cannot create teachers."""
    resp = client.post(
        BASE,
        json={"username": "test_forbidden2", "phone": "13800005555", "name": "教师角色不应创建"},
        headers=_teacher_headers(),
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_teacher_detail_teacher_role_forbidden(client):
    """BUG-004: teacher role cannot GET teacher detail."""
    resp = client.get(f"{BASE}/{str(uuid4())}", headers=_teacher_headers())
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_teacher_update_teacher_role_forbidden(client):
    """BUG-004: teacher role cannot PUT update teacher."""
    resp = client.put(
        f"{BASE}/{str(uuid4())}",
        json={"name": "不应更新"},
        headers=_teacher_headers(),
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_teacher_delete_teacher_role_forbidden(client):
    """BUG-004: teacher role cannot DELETE teacher."""
    resp = client.delete(f"{BASE}/{str(uuid4())}", headers=_teacher_headers())
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_teacher_reset_pw_teacher_role_forbidden(client):
    """BUG-004: teacher role cannot reset another teacher's password."""
    resp = client.put(
        f"{BASE}/{str(uuid4())}/reset-password",
        headers=_teacher_headers(),
    )
    assert resp.status_code == 403


# --- 5. Reset password ---

@pytest.mark.asyncio
async def test_reset_password(client):
    # Create teacher
    create_resp = _create_teacher_via_api(client, "test_reset1", "13800001111", "重置教师")
    teacher_id = create_resp.json()["id"]
    old_password = create_resp.json()["initial_password"]

    # Reset password
    reset_resp = client.put(
        f"{BASE}/{teacher_id}/reset-password",
        headers=_admin_headers(),
    )
    assert reset_resp.status_code == 200
    reset_data = reset_resp.json()

    assert reset_data["id"] == teacher_id
    assert reset_data["must_change_password"] is True
    assert "new_initial_password" in reset_data
    new_pw = reset_data["new_initial_password"]
    assert len(new_pw) == 8
    assert new_pw != old_password  # New password must differ from old


# --- 6. Reset → new password can login (API-02b integration, via username) ---

@pytest.mark.asyncio
async def test_reset_password_new_password_login(client):
    create_resp = _create_teacher_via_api(client, "test_reset2", "13800002222", "登录教师")
    teacher_id = create_resp.json()["id"]
    username = create_resp.json()["username"]

    # Reset password
    reset_resp = client.put(
        f"{BASE}/{teacher_id}/reset-password",
        headers=_admin_headers(),
    )
    new_pw = reset_resp.json()["new_initial_password"]

    # Login with new password via API-02b (using username)
    login_resp = client.post(
        "/api/v1/auth/teacher/login",
        json={"username": username, "password": new_pw},
    )
    assert login_resp.status_code == 200
    login_data = login_resp.json()
    assert login_data["role"] == "teacher"
    assert login_data["must_change_password"] is True


# --- 7. Reset → old password fails ---

@pytest.mark.asyncio
async def test_reset_password_old_password_fails(client):
    create_resp = _create_teacher_via_api(client, "test_reset3", "13800003333", "旧密码教师")
    teacher_id = create_resp.json()["id"]
    username = create_resp.json()["username"]
    old_pw = create_resp.json()["initial_password"]

    # Reset password
    client.put(f"{BASE}/{teacher_id}/reset-password", headers=_admin_headers())

    # Login with OLD password → 401 (using username)
    login_resp = client.post(
        "/api/v1/auth/teacher/login",
        json={"username": username, "password": old_pw},
    )
    assert login_resp.status_code == 401


# --- 8. Soft delete → is_active=false ---

@pytest.mark.asyncio
async def test_soft_delete(client):
    create_resp = _create_teacher_via_api(client, "test_del1", "13800004444", "删除教师")
    teacher_id = create_resp.json()["id"]

    del_resp = client.delete(f"{BASE}/{teacher_id}", headers=_admin_headers())
    assert del_resp.status_code == 200
    del_data = del_resp.json()
    assert del_data["is_active"] is False


# --- 9. Delete → teacher cannot login (API-02b integration, via username) ---

@pytest.mark.asyncio
async def test_deleted_teacher_cannot_login(client):
    create_resp = _create_teacher_via_api(client, "test_nologin", "13800001111", "停用教师")
    teacher_id = create_resp.json()["id"]
    username = create_resp.json()["username"]
    password = create_resp.json()["initial_password"]

    # Soft delete
    client.delete(f"{BASE}/{teacher_id}", headers=_admin_headers())

    # Login → 401 (INVALID_CREDENTIALS — anti-enumeration, using username)
    login_resp = client.post(
        "/api/v1/auth/teacher/login",
        json={"username": username, "password": password},
    )
    assert login_resp.status_code == 401
    assert login_resp.json()["detail"]["code"] == "TEACHER_INVALID_CREDENTIALS"


# --- 10. GET never returns password_hash ---

@pytest.mark.asyncio
async def test_get_teacher_no_password_hash(client):
    create_resp = _create_teacher_via_api(client, "test_field", "13800002222", "字段检查")
    teacher_id = create_resp.json()["id"]

    resp = client.get(f"{BASE}/{teacher_id}", headers=_admin_headers())
    assert resp.status_code == 200
    data = resp.json()
    assert "password_hash" not in data
    assert "initial_password" not in data  # GET detail never shows initial_password
    assert "must_change_password" in data
    assert "is_active" in data
    assert "username" in data


# --- 11. GET /teachers/{id} not found → 404 ---

@pytest.mark.asyncio
async def test_get_teacher_not_found(client):
    fake_id = str(uuid4())
    resp = client.get(f"{BASE}/{fake_id}", headers=_admin_headers())
    assert resp.status_code == 404
    assert resp.json()["detail"]["code"] == "TEACHER_NOT_FOUND"


# --- 12. Soft-delete isolation — GET/PUT/DELETE/RESET on deleted teacher → 404 ---

@pytest.mark.asyncio
async def test_deleted_teacher_get_returns_404(client):
    """GET /teachers/{id} on soft-deleted teacher returns 404."""
    create_resp = _create_teacher_via_api(client, "test_iso1", "13800005555", "隔离教师")
    teacher_id = create_resp.json()["id"]

    # Soft delete
    client.delete(f"{BASE}/{teacher_id}", headers=_admin_headers())

    # GET → 404
    resp = client.get(f"{BASE}/{teacher_id}", headers=_admin_headers())
    assert resp.status_code == 404
    assert resp.json()["detail"]["code"] == "TEACHER_NOT_FOUND"


@pytest.mark.asyncio
async def test_deleted_teacher_update_returns_404(client):
    """PUT /teachers/{id} on soft-deleted teacher returns 404."""
    create_resp = _create_teacher_via_api(client, "test_iso2", "13800005555", "隔离更新")
    teacher_id = create_resp.json()["id"]

    # Soft delete
    client.delete(f"{BASE}/{teacher_id}", headers=_admin_headers())

    # PUT → 404
    resp = client.put(
        f"{BASE}/{teacher_id}",
        json={"name": "不应更新"},
        headers=_admin_headers(),
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_deleted_teacher_reset_password_returns_404(client):
    """PUT /teachers/{id}/reset-password on soft-deleted teacher returns 404."""
    create_resp = _create_teacher_via_api(client, "test_iso3", "13800005555", "隔离重置")
    teacher_id = create_resp.json()["id"]

    # Soft delete
    client.delete(f"{BASE}/{teacher_id}", headers=_admin_headers())

    # RESET → 404
    resp = client.put(
        f"{BASE}/{teacher_id}/reset-password",
        headers=_admin_headers(),
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_double_delete_returns_404(client):
    """DELETE on already-deleted teacher returns 404."""
    create_resp = _create_teacher_via_api(client, "test_dbl_del", "13800005555", "重复删除")
    teacher_id = create_resp.json()["id"]

    # First delete → 200
    resp1 = client.delete(f"{BASE}/{teacher_id}", headers=_admin_headers())
    assert resp1.status_code == 200

    # Second delete → 404
    resp2 = client.delete(f"{BASE}/{teacher_id}", headers=_admin_headers())
    assert resp2.status_code == 404


# --- 13. Soft-deleted teacher phone can be reused ---

@pytest.mark.asyncio
async def test_deleted_teacher_phone_reusable(client):
    """After soft-deleting a teacher, same phone can be reused.

    The soft-deleted row is reactivated (same ID, updated name/password/username)
    to avoid violating the DB UNIQUE constraint on phone.
    """
    create_resp = _create_teacher_via_api(client, "test_reuse", "13800005555", "原教师")
    teacher_id = create_resp.json()["id"]

    # Soft delete
    client.delete(f"{BASE}/{teacher_id}", headers=_admin_headers())

    # Re-create with same phone (different username) → 201 (not 409)
    resp = _create_teacher_via_api(client, "test_reuse2", "13800005555", "新教师")
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "新教师"
    assert data["id"] == teacher_id  # Same row reactivated
    assert data["is_active"] is True


# --- 14. PUT /teachers/{id} update teacher ---

@pytest.mark.asyncio
async def test_update_teacher_name(client):
    """PUT /teachers/{id} can update teacher name."""
    create_resp = _create_teacher_via_api(client, "test_upd_name", "13800001111", "原名")
    teacher_id = create_resp.json()["id"]

    resp = client.put(
        f"{BASE}/{teacher_id}",
        json={"name": "新名"},
        headers=_admin_headers(),
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "新名"
    assert data["phone"] == "13800001111"  # Unchanged
    assert data["username"] == "test_upd_name"  # Unchanged


@pytest.mark.asyncio
async def test_update_teacher_phone(client):
    """PUT /teachers/{id} can update teacher phone."""
    create_resp = _create_teacher_via_api(client, "test_upd_phone", "13800001111", "改号教师")
    teacher_id = create_resp.json()["id"]

    resp = client.put(
        f"{BASE}/{teacher_id}",
        json={"phone": "13800009999"},
        headers=_admin_headers(),
    )
    assert resp.status_code == 200
    assert resp.json()["phone"] == "13800009999"

    # Cleanup: the old phone is freed; clean the new phone too
    _cleanup_teacher("13800009999")


@pytest.mark.asyncio
async def test_update_teacher_username(client):
    """PUT /teachers/{id} can update teacher username."""
    create_resp = _create_teacher_via_api(client, "test_upd_phone2", "13800002222", "改用户名教师")
    teacher_id = create_resp.json()["id"]

    resp = client.put(
        f"{BASE}/{teacher_id}",
        json={"username": "test_new_username"},
        headers=_admin_headers(),
    )
    assert resp.status_code == 200
    assert resp.json()["username"] == "test_new_username"

    # Cleanup
    _cleanup_teacher_by_username("test_new_username")


@pytest.mark.asyncio
async def test_update_teacher_phone_conflict(client):
    """PUT /teachers/{id} with conflicting phone returns 409."""
    _create_teacher_via_api(client, "test_conflict1", "13800002222", "占号教师")
    create_resp2 = _create_teacher_via_api(client, "test_conflict2", "13800001111", "冲突教师")
    teacher_id2 = create_resp2.json()["id"]

    resp = client.put(
        f"{BASE}/{teacher_id2}",
        json={"phone": "13800002222"},
        headers=_admin_headers(),
    )
    assert resp.status_code == 409
    assert resp.json()["detail"]["code"] == "TEACHER_PHONE_DUPLICATE"


@pytest.mark.asyncio
async def test_update_teacher_username_conflict(client):
    """PUT /teachers/{id} with conflicting username returns 409."""
    _create_teacher_via_api(client, "test_conflict1", "13800002222", "占号教师")
    create_resp2 = _create_teacher_via_api(client, "test_conflict2", "13800001111", "冲突教师")
    teacher_id2 = create_resp2.json()["id"]

    resp = client.put(
        f"{BASE}/{teacher_id2}",
        json={"username": "test_conflict1"},
        headers=_admin_headers(),
    )
    assert resp.status_code == 409
    assert resp.json()["detail"]["code"] == "TEACHER_USERNAME_DUPLICATE"


@pytest.mark.asyncio
async def test_update_teacher_not_found(client):
    """PUT /teachers/{id} with non-existent ID returns 404."""
    resp = client.put(
        f"{BASE}/{str(uuid4())}",
        json={"name": "不存在"},
        headers=_admin_headers(),
    )
    assert resp.status_code == 404


# --- 15. List includes inactive teachers by default ---

@pytest.mark.asyncio
async def test_list_includes_inactive_teachers(client):
    """GET /teachers includes soft-deleted teachers by default."""
    create_resp = _create_teacher_via_api(client, "test_list_inactive", "13800004444", "列表含停用")
    teacher_id = create_resp.json()["id"]

    # Soft delete
    client.delete(f"{BASE}/{teacher_id}", headers=_admin_headers())

    # Default list (include_inactive=true) should show the deleted teacher
    resp = client.get(BASE, params={"page": 1, "page_size": 100}, headers=_admin_headers())
    assert resp.status_code == 200
    data = resp.json()
    found = any(item["id"] == teacher_id for item in data["items"])
    assert found, "Deleted teacher should appear in default list (include_inactive=true)"

    # List with include_inactive=false should NOT show the deleted teacher
    resp2 = client.get(BASE, params={"page": 1, "page_size": 100, "include_inactive": "false"}, headers=_admin_headers())
    assert resp2.status_code == 200
    data2 = resp2.json()
    found2 = any(item["id"] == teacher_id for item in data2["items"])
    assert not found2, "Deleted teacher should NOT appear when include_inactive=false"


# --- 16. Restore soft-deleted teacher ---

@pytest.mark.asyncio
async def test_restore_teacher_success(client):
    """PUT /teachers/{id}/restore restores a soft-deleted teacher."""
    create_resp = _create_teacher_via_api(client, "test_restore1", "13800001111", "恢复教师")
    teacher_id = create_resp.json()["id"]

    # Soft delete
    client.delete(f"{BASE}/{teacher_id}", headers=_admin_headers())

    # Restore
    restore_resp = client.put(f"{BASE}/{teacher_id}/restore", headers=_admin_headers())
    assert restore_resp.status_code == 200
    restore_data = restore_resp.json()
    assert restore_data["is_active"] is True
    assert restore_data["must_change_password"] is True
    assert "new_initial_password" in restore_data
    new_pw = restore_data["new_initial_password"]
    assert len(new_pw) == 8
    assert re.search(r"[A-Z]", new_pw)
    assert re.search(r"[a-z]", new_pw)
    assert re.search(r"\d", new_pw)


@pytest.mark.asyncio
async def test_restore_teacher_can_login(client):
    """After restore, teacher can login with the new initial password."""
    create_resp = _create_teacher_via_api(client, "test_restore_login", "13800002222", "恢复登录")
    teacher_id = create_resp.json()["id"]
    username = create_resp.json()["username"]
    old_password = create_resp.json()["initial_password"]

    # Soft delete
    client.delete(f"{BASE}/{teacher_id}", headers=_admin_headers())

    # Restore
    restore_resp = client.put(f"{BASE}/{teacher_id}/restore", headers=_admin_headers())
    new_pw = restore_resp.json()["new_initial_password"]

    # Login with new password → 200
    login_resp = client.post(
        "/api/v1/auth/teacher/login",
        json={"username": username, "password": new_pw},
    )
    assert login_resp.status_code == 200

    # Old password no longer works
    old_login_resp = client.post(
        "/api/v1/auth/teacher/login",
        json={"username": username, "password": old_password},
    )
    assert old_login_resp.status_code == 401


@pytest.mark.asyncio
async def test_restore_not_found(client):
    """PUT /teachers/{id}/restore on non-existent teacher returns 404."""
    resp = client.put(f"{BASE}/{str(uuid4())}/restore", headers=_admin_headers())
    assert resp.status_code == 404
    assert resp.json()["detail"]["code"] == "TEACHER_NOT_FOUND"


@pytest.mark.asyncio
async def test_restore_already_active_teacher(client):
    """PUT /teachers/{id}/restore on already-active teacher returns 200 (idempotent, no password reset)."""
    create_resp = _create_teacher_via_api(client, "test_restore2", "13800003333", "已激活教师")
    teacher_id = create_resp.json()["id"]

    # Restore without deleting first — idempotent
    restore_resp = client.put(f"{BASE}/{teacher_id}/restore", headers=_admin_headers())
    assert restore_resp.status_code == 200
    data = restore_resp.json()
    assert data["is_active"] is True
    assert data["new_initial_password"] == ""
    assert data["must_change_password"] is False


@pytest.mark.asyncio
async def test_restore_teacher_role_forbidden(client):
    """Teacher role cannot restore teachers (403)."""
    resp = client.put(
        f"{BASE}/{str(uuid4())}/restore",
        headers=_teacher_headers(),
    )
    assert resp.status_code == 403
