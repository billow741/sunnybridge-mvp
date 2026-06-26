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
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.deps import get_current_user, require_role, require_permission
from app.schemas.auth import CurrentUser
from app.schemas.course import (
    CourseCreate,
    CourseDetail,
    CourseOut,
    CourseUpdate,
    PaginatedCourses,
    ConflictCheckRequest,
    ConflictCheckResponse,
    MeetingLinkUpdate,
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
from app.core.database import get_supabase

router = APIRouter(prefix="/api/v1/courses", tags=["courses"])


# ---------------------------------------------------------------------------
# GET /courses/teacher/me/students — 教师查自己的学员列表
# ---------------------------------------------------------------------------

@router.get("/teacher/me/students")
async def teacher_my_students(
    user: CurrentUser = Depends(require_role("teacher")),
) -> list[dict]:
    """当前教师的所有学员（从课程聚合去重）。

    返回: [{ id, name, cefr_level, parent_phone, total_hours, last_course_date }]
    """
    if not user.teacher_id:
        raise HTTPException(400, detail="当前用户无教师身份")
    sb = get_supabase()
    tid = str(user.teacher_id).strip("{}")

    # 查该教师所有课程的 course_students
    courses = sb.table("courses").select("id, date, hours").eq("teacher_id", tid).execute()
    if not courses.data:
        return []

    course_ids = [c["id"] for c in courses.data]
    # 构建课程元数据 map
    course_meta = {c["id"]: {"date": c["date"], "hours": c.get("hours") or 1} for c in courses.data}

    # 查 course_students 获取所有 child_id
    all_cs = []
    for i in range(0, len(course_ids), 50):
        batch = course_ids[i:i+50]
        cs = sb.table("course_students").select("course_id, child_id").in_("course_id", batch).execute()
        all_cs.extend(cs.data or [])

    if not all_cs:
        return []

    # 去重 child_id
    child_ids = list({row["child_id"] for row in all_cs})

    # 查学员详情
    children = sb.table("children").select("id, name, level, parent_id").in_("id", child_ids).execute()
    child_map = {}
    parent_ids = set()
    for ch in (children.data or []):
        child_map[str(ch["id"])] = ch
        if ch.get("parent_id"):
            parent_ids.add(ch["parent_id"])

    # 查家长手机号（parents 是 users 表里 role=parent 的记录）
    parent_phones = {}
    if parent_ids:
        pids = list(parent_ids)
        for i in range(0, len(pids), 50):
            batch = pids[i:i+50]
            parents = sb.table("users").select("id, phone").in_("id", batch).execute()
            for p in (parents.data or []):
                parent_phones[str(p["id"])] = p.get("phone") or ""

    # 聚合每个学员的课时和最近日期
    child_course_map: dict[str, list] = {}
    for row in all_cs:
        cid = row["child_id"]
        child_course_map.setdefault(cid, []).append(row["course_id"])

    result = []
    for child_id_str, ch in child_map.items():
        cids = child_course_map.get(child_id_str, [])
        total_hours = sum(course_meta.get(cid, {}).get("hours", 1) for cid in cids)
        last_date = max((course_meta.get(cid, {}).get("date", "") for cid in cids), default="")
        pid = ch.get("parent_id")
        parent_phone = parent_phones.get(str(pid), "") if pid else ""
        result.append({
            "id": str(ch["id"]),
            "name": ch.get("name", ""),
            "cefr_level": ch.get("level") or "starter",
            "parent_phone": parent_phone,
            "total_hours": total_hours,
            "last_course_date": last_date,
        })

    # 按最近上课日期降序
    result.sort(key=lambda x: x["last_course_date"], reverse=True)
    return result


# ---------------------------------------------------------------------------
# Role-scoped list views (MUST be before /{course_id} to avoid path conflicts)
# ---------------------------------------------------------------------------


# ── Teacher: 更新课程会议链接 ──
@router.put("/{course_id}/meeting-link", response_model=CourseDetail)
async def update_meeting_link_endpoint(
    course_id: UUID,
    body: MeetingLinkUpdate,
    user: CurrentUser = Depends(require_role("teacher")),
) -> CourseDetail:
    """教师更新自己课程的腾讯会议链接."""
    sb = get_supabase()
    tid = str(user.teacher_id).strip("{}") if user.teacher_id else ""
    if not tid:
        raise HTTPException(403, detail="无效的教师身份")

    # 验证课程属于该教师
    course = sb.table("courses").select("id, teacher_id").eq("id", str(course_id)).limit(1).execute()
    if not course.data:
        raise HTTPException(404, detail={"code": "COURSE_NOT_FOUND", "message": "课程不存在"})
    if course.data[0]["teacher_id"] != tid:
        raise HTTPException(403, detail={"code": "NOT_COURSE_TEACHER", "message": "只能更新自己的课程"})

    sb.table("courses").update({
        "meeting_link": body.meeting_link,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", str(course_id)).execute()

    return await get_course_detail(course_id, user_id=str(user.id), role=user.role)


# ── Teacher/Parent-scoped: 保留 get_current_user + 属主过滤 ──
@router.get("/today", response_model=list[CourseOut])
async def today_courses_endpoint(
    user: CurrentUser = Depends(require_role("parent", "teacher")),
) -> list[CourseOut]:
    """Today's courses. Parent → own child's. Teacher → own courses."""
    if user.role == "parent":
        return await get_today_courses_parent(user.id)
    else:
        return await get_today_courses_teacher(user.teacher_id)


# ── Admin-scoped: require_permission 接管 ──
@router.get("/today/admin", response_model=list[CourseOut])
async def today_courses_admin_endpoint(
    user: CurrentUser = Depends(require_permission("courses:read")),
) -> list[CourseOut]:
    """Today's all courses (admin). Requires courses:read permission."""
    return await get_today_courses_admin()


@router.get("/history", response_model=PaginatedCourses)
async def history_courses_endpoint(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=500),
    user: CurrentUser = Depends(require_role("parent")),
) -> PaginatedCourses:
    """Parent's history courses, paginated, date descending."""
    return await get_history_courses_parent(user.id, page=page, page_size=page_size)


# ── Teacher-scoped: 保留 require_role + 属主过滤 ──
@router.get("/all/teacher", response_model=PaginatedCourses)
async def all_courses_teacher_endpoint(
    month: str | None = Query(None, description="Month filter YYYY-MM"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=500),
    status: str | None = Query(None, description="状态筛选: pending/completed/cancelled"),
    user: CurrentUser = Depends(require_role("teacher")),
) -> PaginatedCourses:
    """Teacher's own courses with optional month/status filter."""
    teacher_id = str(user.teacher_id) if user.teacher_id else None
    return await get_all_courses(month=month, page=page, page_size=page_size,
                                 teacher_id=teacher_id, course_status=status)


# ── Admin-scoped: require_permission 接管 ──
@router.get("/all", response_model=PaginatedCourses)
async def all_courses_admin_endpoint(
    month: str | None = Query(None, description="Month filter YYYY-MM"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=500),
    status: str | None = Query(None, description="状态筛选: pending/completed/cancelled"),
    user: CurrentUser = Depends(require_permission("courses:read")),
) -> PaginatedCourses:
    """All courses (admin). Requires courses:read permission. No teacher-id filter."""
    return await get_all_courses(month=month, page=page, page_size=page_size,
                                 teacher_id=None, course_status=status)


@router.post("/check-conflicts", response_model=ConflictCheckResponse)
async def check_conflicts_endpoint(
    body: ConflictCheckRequest,
    user: CurrentUser = Depends(require_permission("courses:write")),
) -> ConflictCheckResponse:
    """排课冲突检测: 教师/学员时间冲突 + 学员课时余额. Admin only."""
    return await check_schedule_conflicts(body)


# ---------------------------------------------------------------------------
# Admin CRUD
# ---------------------------------------------------------------------------


@router.post("", response_model=CourseDetail, status_code=201)
async def create_course_endpoint(
    body: CourseCreate,
    user: CurrentUser = Depends(require_permission("courses:write")),
) -> CourseDetail:
    """Create a course + enroll students. Admin only."""
    return await create_course(body)


@router.put("/{course_id}", response_model=CourseDetail)
async def update_course_endpoint(
    course_id: UUID,
    body: CourseUpdate,
    user: CurrentUser = Depends(require_permission("courses:write")),
) -> CourseDetail:
    """Update a course. Admin only."""
    return await update_course(course_id, body)


@router.delete("/{course_id}")
async def delete_course_endpoint(
    course_id: UUID,
    user: CurrentUser = Depends(require_permission("courses:delete")),
) -> dict:
    """Delete a course. Admin only."""
    return await delete_course(course_id)


# ── Teacher/Parent-scoped: 保留 require_role ──
@router.get("/{course_id}", response_model=CourseDetail)
async def get_course_detail_endpoint(
    course_id: UUID,
    user: CurrentUser = Depends(require_role("parent", "teacher")),
) -> CourseDetail:
    """Get course detail with feedback. Parent: own child's courses. Teacher: all."""
    return await get_course_detail(course_id, user_id=str(user.id), role=user.role)


# ── Admin-scoped: require_permission ──
@router.get("/{course_id}/admin", response_model=CourseDetail)
async def get_course_detail_admin_endpoint(
    course_id: UUID,
    user: CurrentUser = Depends(require_permission("courses:read")),
) -> CourseDetail:
    """Get course detail (admin). Requires courses:read permission."""
    return await get_course_detail(course_id, user_id=str(user.id), role=user.role)
