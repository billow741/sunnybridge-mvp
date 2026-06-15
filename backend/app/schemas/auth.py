"""Auth-related Pydantic schemas.

Per TECH-SPEC 4.3 / 5.1 / 9.1:
- CurrentUser model
- Token response format
- SMS send/verify request/response
- Username+password login schemas (teacher/admin/parent)
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# User identity (from JWT)
# ---------------------------------------------------------------------------

class CurrentUser(BaseModel):
    """Decoded JWT user identity — injected via get_current_user dependency."""

    id: UUID
    role: str = Field(pattern=r"^(parent|teacher|admin)$")
    teacher_id: UUID | None = None  # set when role=teacher


# ---------------------------------------------------------------------------
# Token response
# ---------------------------------------------------------------------------

class TokenResponse(BaseModel):
    """JWT token pair returned after successful authentication."""

    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    expires_in: int  # seconds until access_token expires


class RefreshTokenRequest(BaseModel):
    """Request body for /auth/refresh."""

    refresh_token: str


# ---------------------------------------------------------------------------
# SMS send / verify
# ---------------------------------------------------------------------------

class SMSSendRequest(BaseModel):
    """Request body for POST /auth/sms/send.

    Phone must match Chinese mobile format: 1[3-9] followed by 9 digits (PRD 9.1.3 R1).
    """

    phone: str = Field(
        ...,
        pattern=r"^1[3-9]\d{9}$",
        description="Chinese mobile phone number (11 digits, starts with 1[3-9])",
    )


class SMSSendResponse(BaseModel):
    """Response for POST /auth/sms/send.

    In development mode, includes the fixed verification code.
    In production, code is only delivered via SMS.
    """

    message: str = "Verification code sent"
    dev_code: str | None = Field(
        None,
        description="Fixed code returned only in development mode",
    )


class SMSVerifyRequest(BaseModel):
    """Request body for POST /auth/sms/verify.

    Phone must match Chinese mobile format: 1[3-9] followed by 9 digits (PRD 9.1.3 R1).
    """

    phone: str = Field(..., pattern=r"^1[3-9]\d{9}$")
    code: str = Field(..., min_length=6, max_length=6)


class SMSVerifyResponse(BaseModel):
    """Response for POST /auth/sms/verify on success."""

    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    expires_in: int
    role: str
    is_new_user: bool = Field(
        False,
        description="True if this phone number was auto-registered as parent",
    )


class SMSVerifyErrorResponse(BaseModel):
    """Response for POST /auth/sms/verify on failure."""

    code: str
    message: str
    attempts_remaining: int | None = None
    locked_until: str | None = None


# ---------------------------------------------------------------------------
# Admin login (username + password)
# ---------------------------------------------------------------------------

class AdminLoginRequest(BaseModel):
    """Request body for POST /auth/admin/login."""

    username: str = Field(..., min_length=1, max_length=50, description="Admin username")
    password: str = Field(..., min_length=1, max_length=128, description="Admin password")


class AdminLoginResponse(BaseModel):
    """Response for POST /auth/admin/login on success."""

    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    expires_in: int
    role: str = "admin"


class AdminLoginErrorResponse(BaseModel):
    """Response for POST /auth/admin/login on failure."""

    code: str
    message: str
    attempts_remaining: int | None = None
    locked_until: str | None = None


# ---------------------------------------------------------------------------
# Teacher login (username + password, API-02b)
# ---------------------------------------------------------------------------

class TeacherLoginRequest(BaseModel):
    """Request body for POST /auth/teacher/login."""

    username: str = Field(
        ...,
        min_length=1,
        max_length=50,
        description="Teacher username",
    )
    password: str = Field(..., min_length=1, max_length=128, description="Teacher password")


class TeacherLoginResponse(BaseModel):
    """Response for POST /auth/teacher/login on success."""

    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    expires_in: int
    role: str = "teacher"
    must_change_password: bool = Field(
        ...,
        description="If true, teacher must change password before using the app",
    )


class TeacherLoginErrorResponse(BaseModel):
    """Response for POST /auth/teacher/login on failure."""

    code: str
    message: str
    attempts_remaining: int | None = None
    locked_until: str | None = None


# ---------------------------------------------------------------------------
# Teacher change password (API-02b)
# ---------------------------------------------------------------------------

class TeacherChangePasswordRequest(BaseModel):
    """Request body for POST /auth/teacher/change-password.

    Per CHANGELOG_teacher_password_login.md §2:
    - Requires teacher JWT (not public)
    - old_password: current password for verification
    - new_password: must be ≥8 chars, contain letters + digits (PRD 7.2)
    """

    old_password: str = Field(..., min_length=1, max_length=128, description="Current password")
    new_password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="New password (≥8 chars, letters+digits)",
    )


class TeacherChangePasswordResponse(BaseModel):
    """Response for POST /auth/teacher/change-password on success."""

    message: str = "Password changed successfully"
    must_change_password: bool = False


class TeacherChangePasswordErrorResponse(BaseModel):
    """Response for POST /auth/teacher/change-password on failure."""

    code: str
    message: str


# ---------------------------------------------------------------------------
# Parent login (phone + password, API-03)
# ---------------------------------------------------------------------------

class ParentLoginRequest(BaseModel):
    """Request body for POST /auth/parent/login.

    Parent can login with phone + password (if they have set a password).
    Parents without a password should use SMS verification instead.
    """

    phone: str = Field(
        ...,
        pattern=r"^1[3-9]\d{9}$",
        description="Chinese mobile phone number (11 digits, starts with 1[3-9])",
    )
    password: str = Field(..., min_length=1, max_length=128, description="Parent password")


class ParentLoginResponse(BaseModel):
    """Response for POST /auth/parent/login on success."""

    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    expires_in: int
    role: str = "parent"


class ParentLoginErrorResponse(BaseModel):
    """Response for POST /auth/parent/login on failure."""

    code: str
    message: str
    attempts_remaining: int | None = None
    locked_until: str | None = None
