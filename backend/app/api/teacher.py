"""Teacher management router (API-04).

All endpoints require admin role.
Admin-02 (教务后台) consumes these endpoints for teacher CRUD + password reset.

Endpoints:
- GET /api/v1/teachers — List teachers (paginated)
- POST /api/v1/teachers — Create teacher (auto-generate initial password)
- GET /api/v1/teachers/{id} — Get teacher detail
- PUT /api/v1/teachers/{id} — Update teacher
- DELETE /api/v1/teachers/{id} — Soft-delete teacher (is_active=false)
- PUT /api/v1/teachers/{id}/restore — Restore soft-deleted teacher (is_active=true)
- PUT /api/v1/teachers/{id}/reset-password — Reset password
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.core.deps import CurrentUser, require_role, require_permission
from app.schemas.teacher import (
    TeacherCreateRequest,
    TeacherCreateResponse,
    TeacherDeleteResponse,
    TeacherListResponse,
    TeacherOut,
    TeacherResetPasswordResponse,
    TeacherRestoreResponse,
    TeacherUpdateRequest,
)
from app.services.teacher import (
    create_teacher,
    delete_teacher,
    get_teacher,
    list_teachers,
    reset_teacher_password,
    restore_teacher,
    update_teacher,
)

router = APIRouter(prefix="/api/v1/teachers", tags=["teachers"])


# ---------------------------------------------------------------------------
# GET /teachers/me — 教师查自己的资料
# ---------------------------------------------------------------------------

@router.get("/me", response_model=TeacherOut)
async def teacher_me(
    user: CurrentUser = Depends(require_role("teacher")),
) -> TeacherOut:
    """当前登录教师查看自己的资料。"""
    if not user.teacher_id:
        raise HTTPException(400, detail="当前用户无教师身份")
    teacher = get_teacher(user.teacher_id)
    if teacher is None:
        raise HTTPException(404, detail={"code": "TEACHER_NOT_FOUND", "message": "教师不存在"})
    return teacher


# ---------------------------------------------------------------------------
# PUT /teachers/me — 教师修改自己的资料
# ---------------------------------------------------------------------------

class TeacherSelfUpdateRequest(BaseModel):
    """教师自改：仅允许改昵称和手机号"""
    name: str | None = Field(None, min_length=1, max_length=50, description="姓名")
    phone: str | None = Field(None, min_length=5, max_length=20, description="手机号")

@router.put("/me", response_model=TeacherOut)
async def teacher_update_me(
    body: TeacherSelfUpdateRequest,
    user: CurrentUser = Depends(require_role("teacher")),
) -> TeacherOut:
    """当前登录教师修改自己的资料（仅姓名、手机号）。"""
    if not user.teacher_id:
        raise HTTPException(400, detail="当前用户无教师身份")
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        # 无修改，直接返回当前数据
        teacher = get_teacher(user.teacher_id)
        if teacher is None:
            raise HTTPException(404, detail={"code": "TEACHER_NOT_FOUND", "message": "教师不存在"})
        return teacher
    try:
        result = update_teacher(user.teacher_id, **updates)
    except ValueError as e:
        raise HTTPException(409, detail={"code": "TEACHER_PHONE_DUPLICATE", "message": str(e)})
    if result is None:
        raise HTTPException(404, detail={"code": "TEACHER_NOT_FOUND", "message": "教师不存在"})
    return result


# ---------------------------------------------------------------------------
# GET /teachers — paginated list
# ---------------------------------------------------------------------------

@router.get("", response_model=TeacherListResponse)
async def teacher_list(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页条数"),
    include_inactive: bool = Query(True, description="是否包含已停用教师"),
    _admin: CurrentUser = Depends(require_permission("teachers:read")),
) -> TeacherListResponse:
    """List teachers (paginated). Admin only.

    By default includes both active and inactive teachers.
    Set include_inactive=false to only list active teachers.
    """
    return list_teachers(page=page, page_size=page_size, include_inactive=include_inactive)


# ---------------------------------------------------------------------------
# POST /teachers — create teacher
# ---------------------------------------------------------------------------

@router.post("", response_model=TeacherCreateResponse, status_code=status.HTTP_201_CREATED)
async def teacher_create(
    body: TeacherCreateRequest,
    _admin: CurrentUser = Depends(require_permission("teachers:write")),
) -> TeacherCreateResponse:
    """Create a teacher with auto-generated initial password. Admin only."""
    try:
        return create_teacher(username=body.username, phone=body.phone, name=body.name, hourly_rate=body.hourly_rate)
    except ValueError as e:
        error_msg = str(e)
        if "用户名" in error_msg:
            code = "TEACHER_USERNAME_DUPLICATE"
        else:
            code = "TEACHER_PHONE_DUPLICATE"
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": code, "message": error_msg},
        )


# ---------------------------------------------------------------------------
# GET /teachers/{id} — single teacher
# ---------------------------------------------------------------------------

@router.get("/{teacher_id}", response_model=TeacherOut)
async def teacher_detail(
    teacher_id: UUID,
    _admin: CurrentUser = Depends(require_permission("teachers:read")),
) -> TeacherOut:
    """Get a single teacher by ID. Admin only."""
    teacher = get_teacher(teacher_id)
    if teacher is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "TEACHER_NOT_FOUND", "message": "教师不存在"},
        )
    return teacher


# ---------------------------------------------------------------------------
# PUT /teachers/{id}/restore — restore soft-deleted teacher
# IMPORTANT: Must be registered BEFORE PUT /{teacher_id} to avoid route
# shadowing (FastAPI would match "restore" as a UUID → 422).
# ---------------------------------------------------------------------------

@router.put("/{teacher_id}/restore", response_model=TeacherRestoreResponse)
async def teacher_restore(
    teacher_id: UUID,
    _admin: CurrentUser = Depends(require_permission("teachers:write")),
) -> TeacherRestoreResponse:
    """Restore a soft-deleted teacher (set is_active=true). Admin only.

    Side effects:
    - is_active set to true
    - password reset to new auto-generated initial password
    - must_change_password set to true
    """
    result = restore_teacher(teacher_id)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "TEACHER_NOT_FOUND", "message": "教师不存在"},
        )
    return result


# ---------------------------------------------------------------------------
# PUT /teachers/{id} — update teacher
# ---------------------------------------------------------------------------

@router.put("/{teacher_id}", response_model=TeacherOut)
async def teacher_update(
    teacher_id: UUID,
    body: TeacherUpdateRequest,
    _admin: CurrentUser = Depends(require_permission("teachers:write")),
) -> TeacherOut:
    """Update teacher fields (username, phone, name, avatar_url). Admin only."""
    try:
        result = update_teacher(
            teacher_id,
            username=body.username,
            phone=body.phone,
            name=body.name,
            avatar_url=body.avatar_url,
            hourly_rate=body.hourly_rate,
        )
    except ValueError as e:
        error_msg = str(e)
        if "用户名" in error_msg:
            code = "TEACHER_USERNAME_DUPLICATE"
        else:
            code = "TEACHER_PHONE_DUPLICATE"
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": code, "message": error_msg},
        )
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "TEACHER_NOT_FOUND", "message": "教师不存在"},
        )
    return result


# ---------------------------------------------------------------------------
# DELETE /teachers/{id} — soft delete
# ---------------------------------------------------------------------------

@router.delete("/{teacher_id}", response_model=TeacherDeleteResponse)
async def teacher_delete(
    teacher_id: UUID,
    _admin: CurrentUser = Depends(require_permission("teachers:delete")),
) -> TeacherDeleteResponse:
    """Soft-delete teacher (set is_active=false). Admin only."""
    result = delete_teacher(teacher_id)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "TEACHER_NOT_FOUND", "message": "教师不存在"},
        )
    return result


# ---------------------------------------------------------------------------
# PUT /teachers/{id}/reset-password
# ---------------------------------------------------------------------------

@router.put("/{teacher_id}/reset-password", response_model=TeacherResetPasswordResponse)
async def teacher_reset_password(
    teacher_id: UUID,
    _admin: CurrentUser = Depends(require_permission("teachers:write")),
) -> TeacherResetPasswordResponse:
    """Reset teacher password to a new auto-generated initial password. Admin only.

    Side effects:
    - password_hash updated
    - must_change_password set to true
    - password_updated_at set to now()
    """
    result = reset_teacher_password(teacher_id)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "TEACHER_NOT_FOUND", "message": "教师不存在"},
        )
    return result
