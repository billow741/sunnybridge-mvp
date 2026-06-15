"""TEST-01 Auth integration tests.

Covers:
- Admin login success / failure
- Teacher login success / failure
- Parent login success / failure / no-password
- Refresh token success / failure
- Logout + token blacklist
- Permission guard endpoints (/me, /admin-only, /teacher-or-admin)
"""

import pytest
from httpx import AsyncClient

from tests.conftest import (
    ADMIN_USERNAME, ADMIN_PASSWORD,
    TEACHER_USERNAME, TEACHER_INITIAL_PW,
    PARENT_PHONE, PARENT_PASSWORD, PARENT_NO_PW_PHONE,
    login_admin, login_teacher, login_parent, auth_headers,
)


# ===================================================================
# Admin Login
# ===================================================================

@pytest.mark.asyncio
async def test_admin_login_success(client: AsyncClient):
    """POST /auth/admin/login with correct credentials → 200 + JWT (role=admin)."""
    resp = await client.post("/api/v1/auth/admin/login", json={
        "username": ADMIN_USERNAME,
        "password": ADMIN_PASSWORD,
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["role"] == "admin"
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "Bearer"
    assert data["expires_in"] > 0


@pytest.mark.asyncio
async def test_admin_login_wrong_password(client: AsyncClient):
    """POST /auth/admin/login with wrong password → 401."""
    resp = await client.post("/api/v1/auth/admin/login", json={
        "username": ADMIN_USERNAME,
        "password": "WrongPassword123!",
    })
    assert resp.status_code == 401
    assert resp.json()["detail"]["code"] == "ADMIN_PASSWORD_WRONG"


@pytest.mark.asyncio
async def test_admin_login_nonexistent(client: AsyncClient):
    """POST /auth/admin/login with unknown username → 401."""
    resp = await client.post("/api/v1/auth/admin/login", json={
        "username": "nonexistent_admin_xyz",
        "password": "Whatever123!",
    })
    assert resp.status_code == 401
    assert resp.json()["detail"]["code"] == "ADMIN_NOT_FOUND"


# ===================================================================
# Teacher Login
# ===================================================================

@pytest.mark.asyncio
async def test_teacher_login_success(client: AsyncClient):
    """POST /auth/teacher/login with correct credentials → 200 + role=teacher + must_change_password."""
    resp = await client.post("/api/v1/auth/teacher/login", json={
        "username": TEACHER_USERNAME,
        "password": TEACHER_INITIAL_PW,
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["role"] == "teacher"
    assert "access_token" in data
    assert "refresh_token" in data
    assert "must_change_password" in data


@pytest.mark.asyncio
async def test_teacher_login_wrong_password(client: AsyncClient):
    """POST /auth/teacher/login with wrong password → 401."""
    resp = await client.post("/api/v1/auth/teacher/login", json={
        "username": TEACHER_USERNAME,
        "password": "WrongPassword123!",
    })
    assert resp.status_code == 401
    detail = resp.json()["detail"]
    assert detail["code"] == "TEACHER_INVALID_CREDENTIALS"


@pytest.mark.asyncio
async def test_teacher_login_nonexistent(client: AsyncClient):
    """POST /auth/teacher/login with unknown username → 401 (same error to prevent enumeration)."""
    resp = await client.post("/api/v1/auth/teacher/login", json={
        "username": "nonexistent_teacher_xyz",
        "password": "Whatever123!",
    })
    assert resp.status_code == 401


# ===================================================================
# Parent Login
# ===================================================================

@pytest.mark.asyncio
async def test_parent_login_success(client: AsyncClient):
    """POST /auth/parent/login with correct phone+password → 200 + role=parent."""
    resp = await client.post("/api/v1/auth/parent/login", json={
        "phone": PARENT_PHONE,
        "password": PARENT_PASSWORD,
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["role"] == "parent"
    assert "access_token" in data
    assert "refresh_token" in data


@pytest.mark.asyncio
async def test_parent_login_no_password(client: AsyncClient):
    """POST /auth/parent/login for parent without password → 401 PARENT_NO_PASSWORD."""
    resp = await client.post("/api/v1/auth/parent/login", json={
        "phone": PARENT_NO_PW_PHONE,
        "password": "AnyPassword123!",
    })
    assert resp.status_code == 401
    detail = resp.json()["detail"]
    assert detail["code"] == "PARENT_NO_PASSWORD"


@pytest.mark.asyncio
async def test_parent_login_wrong_password(client: AsyncClient):
    """POST /auth/parent/login with wrong password → 401."""
    resp = await client.post("/api/v1/auth/parent/login", json={
        "phone": PARENT_PHONE,
        "password": "WrongPassword123!",
    })
    assert resp.status_code == 401
    detail = resp.json()["detail"]
    assert detail["code"] == "PARENT_PASSWORD_WRONG"


@pytest.mark.asyncio
async def test_parent_login_nonexistent(client: AsyncClient):
    """POST /auth/parent/login with unknown phone → 401.

    Note: parent_login service finds no user → returns PARENT_NOT_FOUND (401).
    But if a previous SMS login auto-created this phone as parent (no password),
    the code becomes PARENT_NO_PASSWORD instead. Use a truly unique phone.
    """
    resp = await client.post("/api/v1/auth/parent/login", json={
        "phone": "19888888888",
        "password": "Whatever123!",
    })
    assert resp.status_code == 401
    detail = resp.json()["detail"]
    # Could be PARENT_NOT_FOUND or PARENT_NO_PASSWORD depending on DB state
    assert detail["code"] in ("PARENT_NOT_FOUND", "PARENT_NO_PASSWORD")


# ===================================================================
# Refresh Token
# ===================================================================

@pytest.mark.asyncio
async def test_refresh_success(client: AsyncClient):
    """POST /auth/refresh with valid refresh token → new access token."""
    _, refresh_token = await login_admin(client)
    resp = await client.post("/api/v1/auth/refresh", json={
        "refresh_token": refresh_token,
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "Bearer"
    assert data["expires_in"] > 0


@pytest.mark.asyncio
async def test_refresh_with_access_token_fails(client: AsyncClient):
    """POST /auth/refresh with access token (not refresh) → 401."""
    access_token, _ = await login_admin(client)
    resp = await client.post("/api/v1/auth/refresh", json={
        "refresh_token": access_token,
    })
    assert resp.status_code == 401
    detail = resp.json()["detail"]
    assert detail["code"] == "NOT_REFRESH_TOKEN"


@pytest.mark.asyncio
async def test_refresh_with_fake_token_fails(client: AsyncClient):
    """POST /auth/refresh with garbage token → 401."""
    resp = await client.post("/api/v1/auth/refresh", json={
        "refresh_token": "totally.fake.token",
    })
    assert resp.status_code == 401
    detail = resp.json()["detail"]
    assert detail["code"] == "INVALID_REFRESH_TOKEN"


# ===================================================================
# Logout + Token Blacklist
# ===================================================================

@pytest.mark.asyncio
async def test_logout_invalidates_token(client: AsyncClient):
    """POST /auth/logout → token blacklisted → subsequent request returns 401."""
    access_token, _ = await login_admin(client)
    headers = auth_headers(access_token)

    # Verify token works before logout
    resp = await client.get("/api/v1/auth/me", headers=headers)
    assert resp.status_code == 200

    # Logout
    resp = await client.post("/api/v1/auth/logout", headers=headers)
    assert resp.status_code == 200

    # Same token should now be rejected
    resp = await client.get("/api/v1/auth/me", headers=headers)
    assert resp.status_code == 401
    detail = resp.json()["detail"]
    assert detail["code"] == "TOKEN_REVOKED"


# ===================================================================
# Permission Guards
# ===================================================================

@pytest.mark.asyncio
async def test_unauthenticated_access_returns_401(client: AsyncClient):
    """Accessing protected endpoint without token → 401."""
    resp = await client.get("/api/v1/auth/me")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_admin_only_endpoint_allows_admin(client: AsyncClient):
    """GET /auth/admin-only with admin JWT → 200."""
    access_token, _ = await login_admin(client)
    resp = await client.get("/api/v1/auth/admin-only", headers=auth_headers(access_token))
    assert resp.status_code == 200
    assert resp.json()["message"] == "Welcome, admin!"


@pytest.mark.asyncio
async def test_admin_only_endpoint_rejects_teacher(client: AsyncClient):
    """GET /auth/admin-only with teacher JWT → 403."""
    access_token, _ = await login_teacher(client)
    resp = await client.get("/api/v1/auth/admin-only", headers=auth_headers(access_token))
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_admin_only_endpoint_rejects_parent(client: AsyncClient):
    """GET /auth/admin-only with parent JWT → 403."""
    access_token, _ = await login_parent(client)
    resp = await client.get("/api/v1/auth/admin-only", headers=auth_headers(access_token))
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_teacher_or_admin_allows_teacher(client: AsyncClient):
    """GET /auth/teacher-or-admin with teacher JWT → 200."""
    access_token, _ = await login_teacher(client)
    resp = await client.get("/api/v1/auth/teacher-or-admin", headers=auth_headers(access_token))
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_teacher_or_admin_allows_admin(client: AsyncClient):
    """GET /auth/teacher-or-admin with admin JWT → 200."""
    access_token, _ = await login_admin(client)
    resp = await client.get("/api/v1/auth/teacher-or-admin", headers=auth_headers(access_token))
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_teacher_or_admin_rejects_parent(client: AsyncClient):
    """GET /auth/teacher-or-admin with parent JWT → 403."""
    access_token, _ = await login_parent(client)
    resp = await client.get("/api/v1/auth/teacher-or-admin", headers=auth_headers(access_token))
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_me_returns_correct_identity(client: AsyncClient):
    """GET /auth/me returns correct role and id."""
    access_token, _ = await login_teacher(client)
    resp = await client.get("/api/v1/auth/me", headers=auth_headers(access_token))
    assert resp.status_code == 200
    data = resp.json()
    assert data["role"] == "teacher"
    assert "id" in data
    assert "teacher_id" in data
