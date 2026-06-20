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

from app.core.deps import CurrentUser, require_role
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
# GET /teachers — paginated list
# ---------------------------------------------------------------------------

@router.get("", response_model=TeacherListResponse)
async def teacher_list(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页条数"),
    include_inactive: bool = Query(True, description="是否包含已停用教师"),
    _admin: CurrentUser = Depends(require_role("admin")),
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
    _admin: CurrentUser = Depends(require_role("admin")),
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
    _admin: CurrentUser = Depends(require_role("admin")),
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
    _admin: CurrentUser = Depends(require_role("admin")),
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
    _admin: CurrentUser = Depends(require_role("admin")),
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
    _admin: CurrentUser = Depends(require_role("admin")),
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
    _admin: CurrentUser = Depends(require_role("admin")),
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
