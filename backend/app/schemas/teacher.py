"""Teacher management schemas (API-04).

Used by ADMIN-02 for teacher CRUD + password reset.
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------

class TeacherCreateRequest(BaseModel):
    """POST /api/v1/teachers"""
    username: str = Field(..., min_length=1, max_length=50, pattern=r"^[a-zA-Z0-9_]+$", description="教师登录用户名")
    phone: str = Field(..., pattern=r"^1[3-9]\d{9}$", description="手机号")
    name: str = Field(..., min_length=1, max_length=50, description="教师姓名")
    hourly_rate: float | None = Field(None, ge=0, description="时薪 (元/小时)")


class TeacherUpdateRequest(BaseModel):
    """PUT /api/v1/teachers/{id} — all fields optional"""
    username: str | None = Field(None, min_length=1, max_length=50, pattern=r"^[a-zA-Z0-9_]+$", description="教师登录用户名")
    phone: str | None = Field(None, pattern=r"^1[3-9]\d{9}$", description="手机号")
    name: str | None = Field(None, min_length=1, max_length=50, description="教师姓名")
    avatar_url: str | None = Field(None, description="头像 URL")
    hourly_rate: float | None = Field(None, ge=0, description="时薪 (元/小时)")


class TeacherListParams(BaseModel):
    """Query params for GET /api/v1/teachers"""
    page: int = Field(1, ge=1, description="页码")
    page_size: int = Field(20, ge=1, le=100, description="每页条数")


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------

class TeacherOut(BaseModel):
    """Teacher response — never includes password_hash."""
    id: UUID
    username: str
    phone: str | None = None
    name: str
    avatar_url: str | None = None
    hourly_rate: float | None = None
    is_active: bool
    must_change_password: bool
    created_at: datetime
    updated_at: datetime


class TeacherCreateResponse(TeacherOut):
    """POST /teachers response — includes initial_password."""
    initial_password: str = Field(..., description="8位初始密码，需告知教师")


class TeacherListResponse(BaseModel):
    """GET /teachers paginated response."""
    items: list[TeacherOut]
    total: int
    page: int
    page_size: int


class TeacherDeleteResponse(BaseModel):
    """DELETE /teachers/{id} response."""
    id: UUID
    is_active: bool


class TeacherResetPasswordResponse(BaseModel):
    """PUT /teachers/{id}/reset-password response."""
    id: UUID
    new_initial_password: str = Field(..., description="8位新初始密码，需告知教师")
    must_change_password: bool = True


class TeacherRestoreResponse(BaseModel):
    """PUT /teachers/{id}/restore response."""
    id: UUID
    is_active: bool = True
    new_initial_password: str = Field(..., description="恢复时自动重置的8位初始密码，需告知教师")
    must_change_password: bool = True
