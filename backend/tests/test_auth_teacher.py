"""API-02b 教师用户名+密码登录接口测试

验收场景:
1. 正确用户名+密码登录成功 → JWT (role=teacher, teacher_id) + must_change_password
2. 错误密码 → 401 TEACHER_INVALID_CREDENTIALS + attempts_remaining
3. 不存在用户名 → 401 模糊提示 (TEACHER_INVALID_CREDENTIALS)
4. is_active=false → 401 INVALID_CREDENTIALS (防用户名枚举)
5. must_change_password=true → 200 + flag=true
6. 连续5次失败锁定 → 429 TEACHER_LOCKED + locked_until
7. 锁定后正确密码仍被拒 → 429
8. JWT 包含 teacher_id claim (TECH-SPEC 4.3)
9. change-password 端点正常工作
10. 锁定过期后恢复正常登录

依赖: 后端服务运行中 + Redis + Supabase DB
运行: pytest tests/test_auth_teacher.py -v
"""

import pytest
import pytest_asyncio
import redis as sync_redis
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.core.config import get_settings
from app.core.database import get_supabase
from app.core.redis import get_redis, reset_redis
from app.core.security import hash_password


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

BASE_URL = "http://test"
TEST_USERNAME = "test_teacher_001"
TEST_PHONE = "13700000001"
NONEXIST_USERNAME = "nonexist_teacher_999"
TEST_PASSWORD = "TestPass123!"
WRONG_PASSWORD = "WrongPass456!"

settings = get_settings()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _sync_redis() -> sync_redis.Redis:
    """Synchronous Redis for fixture cleanup (avoids event-loop issues)."""
    return sync_redis.from_url(settings.redis_url, decode_responses=True)


def _cleanup_redis_keys(username: str) -> None:
    """Delete teacher lock/fail keys for a username via sync Redis."""
    r = _sync_redis()
    r.delete(f"teacher:lock:{username}", f"teacher:fail:{username}")
    r.close()


def _upsert_teacher(username: str, phone: str, password: str,
                     is_active: bool = True,
                     must_change_password: bool = False) -> str:
    """Create or update a teacher record for testing. Returns teacher ID."""
    sb = get_supabase()
    password_hash = hash_password(password)

    # Check if teacher already exists (by username)
    existing = sb.table("teachers").select("id").eq("username", username).execute()
    if existing.data:
        teacher_id = existing.data[0]["id"]
        sb.table("teachers").update({
            "phone": phone,
            "password_hash": password_hash,
            "is_active": is_active,
            "must_change_password": must_change_password,
        }).eq("id", teacher_id).execute()
        return teacher_id

    result = sb.table("teachers").insert({
        "username": username,
        "phone": phone,
        "name": "测试教师",
        "password_hash": password_hash,
        "is_active": is_active,
        "must_change_password": must_change_password,
    }).execute()
    return result.data[0]["id"]


def _set_teacher_inactive(username: str) -> None:
    """Set a teacher's is_active to false."""
    sb = get_supabase()
    sb.table("teachers").update({"is_active": False}).eq("username", username).execute()


def _set_teacher_must_change(username: str, value: bool) -> None:
    """Set a teacher's must_change_password flag."""
    sb = get_supabase()
    sb.table("teachers").update({"must_change_password": value}).eq("username", username).execute()


def _delete_teacher(username: str) -> None:
    """Delete a teacher record by username."""
    sb = get_supabase()
    sb.table("teachers").delete().eq("username", username).execute()


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture(autouse=True)
async def _reset_redis_client():
    """Reset the async Redis singleton before each test to avoid event-loop leaks."""
    reset_redis()
    yield
    reset_redis()


@pytest.fixture(autouse=True)
def _cleanup_test_data():
    """Sync cleanup of test data before and after each test."""
    # Setup: ensure teacher exists with correct defaults
    _upsert_teacher(TEST_USERNAME, TEST_PHONE, TEST_PASSWORD, is_active=True, must_change_password=False)
    _cleanup_redis_keys(TEST_USERNAME)
    _cleanup_redis_keys(NONEXIST_USERNAME)

    yield

    # Teardown: restore teacher to active state + clean Redis
    _upsert_teacher(TEST_USERNAME, TEST_PHONE, TEST_PASSWORD, is_active=True, must_change_password=False)
    _cleanup_redis_keys(TEST_USERNAME)
    _cleanup_redis_keys(NONEXIST_USERNAME)


@pytest_asyncio.fixture
async def client():
    """Async test client."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url=BASE_URL) as ac:
        yield ac


# ---------------------------------------------------------------------------
# 1. 正确用户名+密码登录成功
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_teacher_login_success(client: AsyncClient):
    """正确用户名+密码 → 200 + JWT (role=teacher) + must_change_password=false。"""
    resp = await client.post("/api/v1/auth/teacher/login", json={
        "username": TEST_USERNAME,
        "password": TEST_PASSWORD,
    })
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert data["role"] == "teacher"
    assert data["access_token"]
    assert data["refresh_token"]
    assert data["token_type"] == "Bearer"
    assert data["expires_in"] > 0
    assert data["must_change_password"] is False


# ---------------------------------------------------------------------------
# 2. 错误密码返回 401
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_teacher_login_wrong_password(client: AsyncClient):
    """错误密码 → 401 TEACHER_INVALID_CREDENTIALS + attempts_remaining。"""
    resp = await client.post("/api/v1/auth/teacher/login", json={
        "username": TEST_USERNAME,
        "password": WRONG_PASSWORD,
    })
    assert resp.status_code == 401
    detail = resp.json()["detail"]
    assert detail["code"] == "TEACHER_INVALID_CREDENTIALS"
    assert detail["message"] == "用户名或密码错误"
    assert "attempts_remaining" in detail
    assert detail["attempts_remaining"] < 5


# ---------------------------------------------------------------------------
# 3. 不存在用户名返回模糊 401
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_teacher_login_nonexistent_username(client: AsyncClient):
    """不存在用户名 → 401 TEACHER_INVALID_CREDENTIALS (不泄露账号是否存在)。"""
    resp = await client.post("/api/v1/auth/teacher/login", json={
        "username": NONEXIST_USERNAME,
        "password": TEST_PASSWORD,
    })
    assert resp.status_code == 401
    detail = resp.json()["detail"]
    assert detail["code"] == "TEACHER_INVALID_CREDENTIALS"
    assert detail["message"] == "用户名或密码错误"
    # 与错误密码返回完全相同的错误码和消息
    assert "attempts_remaining" in detail


# ---------------------------------------------------------------------------
# 4. is_active=false → 401 INVALID_CREDENTIALS (anti-enumeration)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_teacher_login_inactive(client: AsyncClient):
    """is_active=false → 401 TEACHER_INVALID_CREDENTIALS (same as wrong password)."""
    _set_teacher_inactive(TEST_USERNAME)

    resp = await client.post("/api/v1/auth/teacher/login", json={
        "username": TEST_USERNAME,
        "password": TEST_PASSWORD,
    })
    assert resp.status_code == 401
    detail = resp.json()["detail"]
    assert detail["code"] == "TEACHER_INVALID_CREDENTIALS"
    assert "用户名或密码错误" in detail["message"]


# ---------------------------------------------------------------------------
# 5. must_change_password=true
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_teacher_login_must_change_password(client: AsyncClient):
    """must_change_password=true → 200 + flag=true。"""
    _set_teacher_must_change(TEST_USERNAME, True)

    resp = await client.post("/api/v1/auth/teacher/login", json={
        "username": TEST_USERNAME,
        "password": TEST_PASSWORD,
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["role"] == "teacher"
    assert data["must_change_password"] is True


# ---------------------------------------------------------------------------
# 6. 连续5次失败锁定
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_teacher_login_lockout_after_5_failures(client: AsyncClient):
    """连续5次密码错误 → 429 TEACHER_LOCKED + locked_until。"""
    for i in range(5):
        resp = await client.post("/api/v1/auth/teacher/login", json={
            "username": TEST_USERNAME,
            "password": WRONG_PASSWORD,
        })
        if i < 4:
            assert resp.status_code == 401, f"第{i+1}次错误应返回 401, got {resp.status_code}"
        else:
            assert resp.status_code == 429, f"第5次错误应返回 429(锁定), got {resp.status_code}"
            detail = resp.json()["detail"]
            assert detail["code"] == "TEACHER_LOCKED"
            assert "locked_until" in detail
            assert detail["attempts_remaining"] == 0


# ---------------------------------------------------------------------------
# 7. 锁定后正确密码仍被拒
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_teacher_login_locked_blocks_correct_password(client: AsyncClient):
    """锁定期间用正确密码仍返回 429。"""
    # 先触发5次失败锁定
    for _ in range(5):
        await client.post("/api/v1/auth/teacher/login", json={
            "username": TEST_USERNAME,
            "password": WRONG_PASSWORD,
        })

    # 用正确密码登录，仍应被锁定
    resp = await client.post("/api/v1/auth/teacher/login", json={
        "username": TEST_USERNAME,
        "password": TEST_PASSWORD,
    })
    assert resp.status_code == 429
    detail = resp.json()["detail"]
    assert detail["code"] == "TEACHER_LOCKED"


# ---------------------------------------------------------------------------
# 8. JWT contains teacher_id claim
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_teacher_login_jwt_contains_teacher_id(client: AsyncClient):
    """JWT must include teacher_id claim (TECH-SPEC 4.3)."""
    _upsert_teacher(TEST_USERNAME, TEST_PHONE, TEST_PASSWORD, is_active=True, must_change_password=False)
    resp = await client.post("/api/v1/auth/teacher/login", json={
        "username": TEST_USERNAME,
        "password": TEST_PASSWORD,
    })
    assert resp.status_code == 200
    token = resp.json()["access_token"]
    # Decode JWT payload (no signature check needed)
    import base64, json
    payload_b64 = token.split(".")[1]
    payload_b64 += "=" * (4 - len(payload_b64) % 4)
    payload = json.loads(base64.urlsafe_b64decode(payload_b64))
    assert "teacher_id" in payload, f"JWT missing teacher_id claim. Got keys: {list(payload.keys())}"
    assert payload["role"] == "teacher"


# ---------------------------------------------------------------------------
# 9. change-password endpoint
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_teacher_change_password(client: AsyncClient):
    """POST /auth/teacher/change-password works correctly."""
    _upsert_teacher(TEST_USERNAME, TEST_PHONE, "OldPass123", is_active=True, must_change_password=True)
    # Login first
    login_resp = await client.post("/api/v1/auth/teacher/login", json={
        "username": TEST_USERNAME,
        "password": "OldPass123",
    })
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]

    # Change password
    resp = await client.post(
        "/api/v1/auth/teacher/change-password",
        json={"old_password": "OldPass123", "new_password": "NewPass456"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["must_change_password"] is False

    # Login with new password
    login2 = await client.post("/api/v1/auth/teacher/login", json={
        "username": TEST_USERNAME,
        "password": "NewPass456",
    })
    assert login2.status_code == 200
    assert login2.json()["must_change_password"] is False


@pytest.mark.asyncio
async def test_teacher_change_password_wrong_old(client: AsyncClient):
    """change-password with wrong old_password → 401."""
    _upsert_teacher(TEST_USERNAME, TEST_PHONE, "OldPass123", is_active=True, must_change_password=False)
    login_resp = await client.post("/api/v1/auth/teacher/login", json={
        "username": TEST_USERNAME,
        "password": "OldPass123",
    })
    token = login_resp.json()["access_token"]

    resp = await client.post(
        "/api/v1/auth/teacher/change-password",
        json={"old_password": "WrongPass999", "new_password": "NewPass456"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 401
    assert resp.json()["detail"]["code"] == "TEACHER_OLD_PASSWORD_WRONG"


@pytest.mark.asyncio
async def test_teacher_change_password_weak_new(client: AsyncClient):
    """change-password with weak new_password → 422."""
    _upsert_teacher(TEST_USERNAME, TEST_PHONE, "OldPass123", is_active=True, must_change_password=False)
    login_resp = await client.post("/api/v1/auth/teacher/login", json={
        "username": TEST_USERNAME,
        "password": "OldPass123",
    })
    token = login_resp.json()["access_token"]

    # Too short
    resp = await client.post(
        "/api/v1/auth/teacher/change-password",
        json={"old_password": "OldPass123", "new_password": "Ab1"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 422

    # No digits
    resp2 = await client.post(
        "/api/v1/auth/teacher/change-password",
        json={"old_password": "OldPass123", "new_password": "abcdefgh"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp2.status_code == 422


# ---------------------------------------------------------------------------
# 10. 锁定过期后恢复正常登录
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_teacher_login_lockout_expiry(client: AsyncClient):
    """After lockout key expires in Redis, login should succeed again."""
    _upsert_teacher(TEST_USERNAME, TEST_PHONE, TEST_PASSWORD, is_active=True, must_change_password=False)
    # Trigger 5 failures
    for _ in range(5):
        await client.post("/api/v1/auth/teacher/login", json={
            "username": TEST_USERNAME,
            "password": WRONG_PASSWORD,
        })

    # Confirm locked
    resp = await client.post("/api/v1/auth/teacher/login", json={
        "username": TEST_USERNAME,
        "password": TEST_PASSWORD,
    })
    assert resp.status_code == 429

    # Flush lock keys to simulate TTL expiry
    redis = await get_redis()
    lock_key = f"teacher:lock:{TEST_USERNAME}"
    fail_key = f"teacher:fail:{TEST_USERNAME}"
    await redis.delete(lock_key)
    await redis.delete(fail_key)

    # Should now succeed
    resp2 = await client.post("/api/v1/auth/teacher/login", json={
        "username": TEST_USERNAME,
        "password": TEST_PASSWORD,
    })
    assert resp2.status_code == 200
