"""Auth router — SMS send/verify (parents only) + username/password login
(teacher/admin/parent) + refresh + logout + test endpoints.

Endpoints:
- POST /api/v1/auth/sms/send — Send SMS verification code (API-02, parents only)
- POST /api/v1/auth/sms/verify — Verify code → JWT (API-02, parents only)
- POST /api/v1/auth/teacher/login — Teacher username+password login (API-02b)
- POST /api/v1/auth/admin/login — Admin username+password login (API-03)
- POST /api/v1/auth/parent/login — Parent phone+password login (API-03)
- POST /api/v1/auth/refresh — Refresh access token (API-03)
- POST /api/v1/auth/logout — Logout + blacklist token (API-03)
- GET /api/v1/auth/me — Current user identity (API-01)
- GET /api/v1/auth/admin-only — Role guard test (API-01)
- GET /api/v1/auth/teacher-or-admin — Role guard test (API-01)
"""

from fastapi import APIRouter, Depends, Request

from app.core.deps import get_current_user, require_role
from app.schemas.auth import (
    AdminLoginRequest,
    AdminLoginResponse,
    CurrentUser,
    ParentLoginRequest,
    ParentLoginResponse,
    RefreshTokenRequest,
    SMSSendRequest,
    SMSSendResponse,
    SMSVerifyRequest,
    SMSVerifyResponse,
    TeacherChangePasswordRequest,
    TeacherChangePasswordResponse,
    TeacherLoginRequest,
    TeacherLoginResponse,
)
from app.services.auth import (
    admin_login,
    logout_user,
    parent_login,
    refresh_access_token,
    send_sms_code,
    teacher_change_password,
    teacher_login,
    verify_sms_code,
)

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


# ---------------------------------------------------------------------------
# API-03: Admin login (username + password)
# ---------------------------------------------------------------------------


@router.post("/admin/login", response_model=AdminLoginResponse)
async def admin_login_endpoint(body: AdminLoginRequest) -> AdminLoginResponse:
    """Admin login with username + password.

    - 5 failed attempts → 15 min lockout
    - Returns JWT with role=admin
    """
    return await admin_login(body.username, body.password)


# ---------------------------------------------------------------------------
# API-02b: Teacher login (username + password)
# ---------------------------------------------------------------------------


@router.post("/teacher/login", response_model=TeacherLoginResponse)
async def teacher_login_endpoint(body: TeacherLoginRequest) -> TeacherLoginResponse:
    """Teacher login with username + password.

    - 5 failed attempts → 15 min lockout
    - Returns JWT with role=teacher
    - must_change_password flag indicates if first-login password change is required
    """
    return await teacher_login(body.username, body.password)


@router.post("/teacher/change-password", response_model=TeacherChangePasswordResponse)
async def teacher_change_password_endpoint(
    body: TeacherChangePasswordRequest,
    user: CurrentUser = Depends(require_role("teacher")),
) -> TeacherChangePasswordResponse:
    """Teacher change password (requires teacher JWT).

    - Verifies old password
    - New password: ≥8 chars, letters+digits
    - Sets must_change_password=false
    """
    return await teacher_change_password(
        teacher_id=str(user.teacher_id or user.id),
        old_password=body.old_password,
        new_password=body.new_password,
    )


# ---------------------------------------------------------------------------
# API-03: Parent login (phone + password)
# ---------------------------------------------------------------------------


@router.post("/parent/login", response_model=ParentLoginResponse)
async def parent_login_endpoint(body: ParentLoginRequest) -> ParentLoginResponse:
    """Parent login with phone + password.

    Only works if the parent has set a password.
    Parents without a password should use SMS verification (/auth/sms/send + /auth/sms/verify).
    - 5 failed attempts → 15 min lockout
    - Returns JWT with role=parent
    """
    return await parent_login(body.phone, body.password)


# ---------------------------------------------------------------------------
# API-03: Token refresh + logout
# ---------------------------------------------------------------------------


@router.post("/refresh")
async def refresh_endpoint(body: RefreshTokenRequest) -> dict:
    """Exchange a refresh token for a new access token."""
    return await refresh_access_token(body.refresh_token)


@router.post("/logout")
async def logout_endpoint(
    request: Request,
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    """Logout — add current access token to Redis blacklist.

    The Authorization header token is blacklisted with TTL = remaining expiry.
    """
    auth_header = request.headers.get("authorization", "")
    raw_token = auth_header.replace("Bearer ", "") if auth_header.startswith("Bearer ") else ""
    if raw_token:
        return await logout_user(raw_token)
    return {"message": "已登出"}


# ---------------------------------------------------------------------------
# API-02: SMS verification (parents only)
# ---------------------------------------------------------------------------


@router.post("/sms/send", response_model=SMSSendResponse)
async def sms_send(body: SMSSendRequest) -> SMSSendResponse:
    """Send a 6-digit SMS verification code (parents only).

    - Dev mode: returns fixed code 888888
    - 60s rate limit per phone number
    - Code expires in 5 minutes
    - Teachers should use /auth/teacher/login (API-02b)
    """
    return await send_sms_code(body.phone)


@router.post("/sms/verify", response_model=SMSVerifyResponse)
async def sms_verify(body: SMSVerifyRequest) -> SMSVerifyResponse:
    """Verify SMS code and return JWT tokens (parents only).

    - New phone numbers auto-register as role=parent
    - Only queries users table — never touches teachers table
    - 5 failed attempts → 30 min lockout
    - Teachers should use /auth/teacher/login (API-02b)
    """
    return await verify_sms_code(body.phone, body.code)


# ---------------------------------------------------------------------------
# API-01: Test endpoints (kept for verification)
# ---------------------------------------------------------------------------


@router.get("/me", response_model=CurrentUser)
async def get_me(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    """Return the current authenticated user identity."""
    return user


@router.get("/admin-only")
async def admin_only(user: CurrentUser = Depends(require_role("admin"))) -> dict:
    """Test endpoint — only admin role can access."""
    return {"message": "Welcome, admin!", "user_id": str(user.id)}


@router.get("/teacher-or-admin")
async def teacher_or_admin(
    user: CurrentUser = Depends(require_role("teacher", "admin")),
) -> dict:
    """Test endpoint — teacher or admin role can access."""
    return {"message": f"Welcome, {user.role}!", "user_id": str(user.id)}
