"""API-03 管理员用户名+密码登录 + 家长手机号+密码登录 测试

验收场景 (Admin):
1. 正确用户名+密码登录成功 → JWT (role=admin)
2. 错误密码 → 401 ADMIN_PASSWORD_WRONG
3. 不存在用户名 → 401 ADMIN_NOT_FOUND
4. 连续5次失败锁定 → 429 ADMIN_LOCKED
5. 锁定过期后恢复

验收场景 (Parent):
6. 有密码的家长 → 正确手机号+密码登录成功 → JWT (role=parent)
7. 未设密码的家长 → 401 PARENT_NO_PASSWORD (提示用验证码登录)
8. 错误密码 → 401 PARENT_PASSWORD_WRONG
9. 不存在手机号 → 401 PARENT_NOT_FOUND
10. 连续5次失败锁定 → 429 PARENT_LOCKED

依赖: 后端服务运行中 + Redis + Supabase DB
运行: pytest tests/test_auth_admin_parent.py -v
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
settings = get_settings()

# Admin test data
ADMIN_USERNAME = "test_admin_001"
ADMIN_PHONE = "00000000001"
ADMIN_PASSWORD = "AdminPass123!"
WRONG_PASSWORD = "WrongPass456!"

# Parent test data
PARENT_PHONE = "13700000999"
PARENT_PASSWORD = "ParentPass123!"
NO_PW_PARENT_PHONE = "13700000888"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _sync_redis() -> sync_redis.Redis:
    return sync_redis.from_url(settings.redis_url, decode_responses=True)


def _cleanup_admin_redis(username: str) -> None:
    r = _sync_redis()
    r.delete(f"admin:lock:{username}", f"admin:fail:{username}")
    r.close()


def _cleanup_parent_redis(phone: str) -> None:
    r = _sync_redis()
    r.delete(f"parent:lock:{phone}", f"parent:fail:{phone}")
    r.close()


def _upsert_admin(username: str, phone: str, password: str) -> str:
    """Create or update an admin user for testing. Returns user ID."""
    sb = get_supabase()
    password_hash = hash_password(password)

    existing = sb.table("users").select("id").eq("username", username).eq("role", "admin").execute()
    if existing.data:
        user_id = existing.data[0]["id"]
        sb.table("users").update({"password_hash": password_hash}).eq("id", user_id).execute()
        return user_id

    result = sb.table("users").insert({
        "phone": phone,
        "username": username,
        "role": "admin",
        "password_hash": password_hash,
    }).execute()
    return result.data[0]["id"]


def _upsert_parent_with_password(phone: str, password: str) -> str:
    """Create or update a parent user with password. Returns user ID."""
    sb = get_supabase()
    password_hash = hash_password(password)

    existing = sb.table("users").select("id").eq("phone", phone).eq("role", "parent").execute()
    if existing.data:
        user_id = existing.data[0]["id"]
        sb.table("users").update({"password_hash": password_hash}).eq("id", user_id).execute()
        return user_id

    result = sb.table("users").insert({
        "phone": phone,
        "role": "parent",
        "password_hash": password_hash,
    }).execute()
    return result.data[0]["id"]


def _upsert_parent_no_password(phone: str) -> str:
    """Create or update a parent user WITHOUT password. Returns user ID."""
    sb = get_supabase()

    existing = sb.table("users").select("id").eq("phone", phone).eq("role", "parent").execute()
    if existing.data:
        user_id = existing.data[0]["id"]
        sb.table("users").update({"password_hash": None}).eq("id", user_id).execute()
        return user_id

    result = sb.table("users").insert({
        "phone": phone,
        "role": "parent",
    }).execute()
    return result.data[0]["id"]


def _delete_user(phone: str) -> None:
    sb = get_supabase()
    sb.table("users").delete().eq("phone", phone).execute()


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture(autouse=True)
async def _reset_redis_client():
    reset_redis()
    yield
    reset_redis()


@pytest.fixture(autouse=True)
def _cleanup_test_data():
    """Setup + teardown for each test."""
    _upsert_admin(ADMIN_USERNAME, ADMIN_PHONE, ADMIN_PASSWORD)
    _upsert_parent_with_password(PARENT_PHONE, PARENT_PASSWORD)
    _upsert_parent_no_password(NO_PW_PARENT_PHONE)
    _cleanup_admin_redis(ADMIN_USERNAME)
    _cleanup_parent_redis(PARENT_PHONE)
    _cleanup_parent_redis(NO_PW_PARENT_PHONE)

    yield

    # Restore defaults
    _upsert_admin(ADMIN_USERNAME, ADMIN_PHONE, ADMIN_PASSWORD)
    _upsert_parent_with_password(PARENT_PHONE, PARENT_PASSWORD)
    _upsert_parent_no_password(NO_PW_PARENT_PHONE)
    _cleanup_admin_redis(ADMIN_USERNAME)
    _cleanup_parent_redis(PARENT_PHONE)
    _cleanup_parent_redis(NO_PW_PARENT_PHONE)


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url=BASE_URL) as ac:
        yield ac


# ===================================================================
# ADMIN LOGIN TESTS
# ===================================================================

@pytest.mark.asyncio
async def test_admin_login_success(client: AsyncClient):
    """正确用户名+密码 → 200 + JWT (role=admin)。"""
    resp = await client.post("/api/v1/auth/admin/login", json={
        "username": ADMIN_USERNAME,
        "password": ADMIN_PASSWORD,
    })
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert data["role"] == "admin"
    assert data["access_token"]
    assert data["refresh_token"]
    assert data["token_type"] == "Bearer"
    assert data["expires_in"] > 0


@pytest.mark.asyncio
async def test_admin_login_wrong_password(client: AsyncClient):
    """错误密码 → 401 ADMIN_PASSWORD_WRONG + attempts_remaining。"""
    resp = await client.post("/api/v1/auth/admin/login", json={
        "username": ADMIN_USERNAME,
        "password": WRONG_PASSWORD,
    })
    assert resp.status_code == 401
    detail = resp.json()["detail"]
    assert detail["code"] in ("ADMIN_PASSWORD_WRONG", "ADMIN_NOT_FOUND")
    assert "attempts_remaining" in detail


@pytest.mark.asyncio
async def test_admin_login_nonexistent_username(client: AsyncClient):
    """不存在用户名 → 401。"""
    resp = await client.post("/api/v1/auth/admin/login", json={
        "username": "nonexist_admin_999",
        "password": ADMIN_PASSWORD,
    })
    assert resp.status_code == 401
    detail = resp.json()["detail"]
    assert detail["code"] == "ADMIN_NOT_FOUND"


@pytest.mark.asyncio
async def test_admin_login_lockout_after_5_failures(client: AsyncClient):
    """连续5次密码错误 → 429 ADMIN_LOCKED。"""
    for i in range(5):
        resp = await client.post("/api/v1/auth/admin/login", json={
            "username": ADMIN_USERNAME,
            "password": WRONG_PASSWORD,
        })
        if i < 4:
            assert resp.status_code == 401, f"第{i+1}次应返回401, got {resp.status_code}"
        else:
            assert resp.status_code == 429, f"第5次应返回429, got {resp.status_code}"
            detail = resp.json()["detail"]
            assert detail["code"] == "ADMIN_LOCKED"
            assert "locked_until" in detail


@pytest.mark.asyncio
async def test_admin_login_lockout_expiry(client: AsyncClient):
    """锁定过期后恢复正常登录。"""
    # Trigger 5 failures
    for _ in range(5):
        await client.post("/api/v1/auth/admin/login", json={
            "username": ADMIN_USERNAME,
            "password": WRONG_PASSWORD,
        })

    # Confirm locked
    resp = await client.post("/api/v1/auth/admin/login", json={
        "username": ADMIN_USERNAME,
        "password": ADMIN_PASSWORD,
    })
    assert resp.status_code == 429

    # Flush lock keys
    redis = await get_redis()
    await redis.delete(f"admin:lock:{ADMIN_USERNAME}")
    await redis.delete(f"admin:fail:{ADMIN_USERNAME}")

    # Should now succeed
    resp2 = await client.post("/api/v1/auth/admin/login", json={
        "username": ADMIN_USERNAME,
        "password": ADMIN_PASSWORD,
    })
    assert resp2.status_code == 200


# ===================================================================
# PARENT LOGIN TESTS
# ===================================================================

@pytest.mark.asyncio
async def test_parent_login_success(client: AsyncClient):
    """有密码的家长 → 正确手机号+密码 → 200 + JWT (role=parent)。"""
    resp = await client.post("/api/v1/auth/parent/login", json={
        "phone": PARENT_PHONE,
        "password": PARENT_PASSWORD,
    })
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert data["role"] == "parent"
    assert data["access_token"]
    assert data["refresh_token"]


@pytest.mark.asyncio
async def test_parent_login_no_password(client: AsyncClient):
    """未设密码的家长 → 401 PARENT_NO_PASSWORD (提示用验证码登录)。"""
    resp = await client.post("/api/v1/auth/parent/login", json={
        "phone": NO_PW_PARENT_PHONE,
        "password": "AnyPassword1",
    })
    assert resp.status_code == 401
    detail = resp.json()["detail"]
    assert detail["code"] == "PARENT_NO_PASSWORD"
    assert "验证码" in detail["message"]


@pytest.mark.asyncio
async def test_parent_login_wrong_password(client: AsyncClient):
    """错误密码 → 401 PARENT_PASSWORD_WRONG。"""
    resp = await client.post("/api/v1/auth/parent/login", json={
        "phone": PARENT_PHONE,
        "password": WRONG_PASSWORD,
    })
    assert resp.status_code == 401
    detail = resp.json()["detail"]
    assert detail["code"] == "PARENT_PASSWORD_WRONG"
    assert "attempts_remaining" in detail


@pytest.mark.asyncio
async def test_parent_login_nonexistent_phone(client: AsyncClient):
    """不存在手机号 → 401 PARENT_NOT_FOUND。"""
    resp = await client.post("/api/v1/auth/parent/login", json={
        "phone": "15999999999",
        "password": PARENT_PASSWORD,
    })
    assert resp.status_code == 401
    detail = resp.json()["detail"]
    assert detail["code"] == "PARENT_NOT_FOUND"


@pytest.mark.asyncio
async def test_parent_login_lockout_after_5_failures(client: AsyncClient):
    """连续5次密码错误 → 429 PARENT_LOCKED。"""
    for i in range(5):
        resp = await client.post("/api/v1/auth/parent/login", json={
            "phone": PARENT_PHONE,
            "password": WRONG_PASSWORD,
        })
        if i < 4:
            assert resp.status_code == 401
        else:
            assert resp.status_code == 429
            detail = resp.json()["detail"]
            assert detail["code"] == "PARENT_LOCKED"
