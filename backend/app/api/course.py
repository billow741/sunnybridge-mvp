"""Course management router — admin CRUD + role-scoped views.

Per TECH-SPEC 5.2:
- POST   /api/v1/courses            — Create course + enroll students (admin)
- PUT    /api/v1/courses/{id}       — Update course (admin)
- DELETE /api/v1/courses/{id}       — Delete course (admin)
- GET    /api/v1/courses/today      — Today's courses (parent sees own child's, teacher sees own)
- GET    /api/v1/courses/history    — History courses paginated (parent)
- GET    /api/v1/courses/all        — All courses + month filter (teacher, admin)
- GET    /api/v1/courses/{id}       — Course detail with feedback (parent, teacher, admin)
"""

from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.core.deps import get_current_user, require_role
from app.schemas.auth import CurrentUser
from app.schemas.course import (
    CourseCreate,
    CourseDetail,
    CourseOut,
    CourseUpdate,
    PaginatedCourses,
    ConflictCheckRequest,
    ConflictCheckResponse,
)
from app.services.course import (
    create_course,
    delete_course,
    get_all_courses,
    get_course_detail,
    get_history_courses_parent,
    get_today_courses_admin,
    get_today_courses_parent,
    get_today_courses_teacher,
    update_course,
    check_schedule_conflicts,
)

router = APIRouter(prefix="/api/v1/courses", tags=["courses"])


# ---------------------------------------------------------------------------
# Role-scoped list views (MUST be before /{course_id} to avoid path conflicts)
# ---------------------------------------------------------------------------


@router.get("/today", response_model=list[CourseOut])
async def today_courses_endpoint(
    user: CurrentUser = Depends(get_current_user),
) -> list[CourseOut]:
    """Today's courses. Parent → own child's courses. Teacher → own courses. Admin → all today."""
    if user.role == "parent":
        return await get_today_courses_parent(user.id)
    elif user.role == "teacher":
        return await get_today_courses_teacher(user.teacher_id)
    else:
        # Admin: get all today's courses
        return await get_today_courses_admin()


@router.get("/history", response_model=PaginatedCourses)
async def history_courses_endpoint(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=500),
    user: CurrentUser = Depends(require_role("parent")),
) -> PaginatedCourses:
    """Parent's history courses, paginated, date descending."""
    return await get_history_courses_parent(user.id, page=page, page_size=page_size)


@router.get("/all", response_model=PaginatedCourses)
async def all_courses_endpoint(
    month: str | None = Query(None, description="Month filter YYYY-MM"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=500),
    user: CurrentUser = Depends(require_role("teacher", "admin")),
) -> PaginatedCourses:
    """All courses with optional month filter. Teacher sees own courses; Admin sees all."""
    teacher_id = str(user.teacher_id) if user.role == "teacher" and user.teacher_id else None
    return await get_all_courses(month=month, page=page, page_size=page_size, teacher_id=teacher_id)


@router.post("/check-conflicts", response_model=ConflictCheckResponse)
async def check_conflicts_endpoint(
    body: ConflictCheckRequest,
    user: CurrentUser = Depends(require_role("admin")),
) -> ConflictCheckResponse:
    """排课冲突检测: 教师/学员时间冲突 + 学员课时余额. Admin only."""
    return await check_schedule_conflicts(body)


# ---------------------------------------------------------------------------
# Admin CRUD
# ---------------------------------------------------------------------------


@router.post("", response_model=CourseDetail, status_code=201)
async def create_course_endpoint(
    body: CourseCreate,
    user: CurrentUser = Depends(require_role("admin")),
) -> CourseDetail:
    """Create a course + enroll students. Admin only."""
    return await create_course(body)


@router.put("/{course_id}", response_model=CourseDetail)
async def update_course_endpoint(
    course_id: UUID,
    body: CourseUpdate,
    user: CurrentUser = Depends(require_role("admin")),
) -> CourseDetail:
    """Update a course. Admin only."""
    return await update_course(course_id, body)


@router.delete("/{course_id}")
async def delete_course_endpoint(
    course_id: UUID,
    user: CurrentUser = Depends(require_role("admin")),
) -> dict:
    """Delete a course. Admin only."""
    return await delete_course(course_id)


@router.get("/{course_id}", response_model=CourseDetail)
async def get_course_detail_endpoint(
    course_id: UUID,
    user: CurrentUser = Depends(require_role("parent", "teacher", "admin")),
) -> CourseDetail:
    """Get course detail with feedback. Parent/Teacher/Admin.
    
    Parent: only own child's courses. Teacher/Admin: all.
    """
    return await get_course_detail(course_id, user_id=str(user.id), role=user.role)
