"""Course CRUD service — business logic for course management.

Per TECH-SPEC 5.2 / DB-02:
- Create course + enroll students (admin)
- Update course + replace enrolled students (admin)
- Delete course (admin, cascade deletes course_students + feedbacks)
- Get course detail with feedback (parent/teacher/admin)
- Today courses: parent → own child's, teacher → own courses
- History courses: parent, paginated descending
- All courses: teacher/admin, month filter + paginated
"""

import structlog
from datetime import date, datetime, timezone
from uuid import UUID

from fastapi import HTTPException, status

from app.core.database import get_supabase
from app.schemas.course import (
    ChildBrief,
    CourseCreate,
    CourseDetail,
    CourseOut,
    CourseUpdate,
    FeedbackBrief,
    PaginatedCourses,
    TeacherBrief,
)

logger = structlog.get_logger()

DEFAULT_PAGE = 1
DEFAULT_PAGE_SIZE = 20


async def _get_teacher_brief(teacher_id: str) -> TeacherBrief | None:
    """Fetch teacher brief info."""
    sb = get_supabase()
    r = sb.table("teachers").select("id, name").eq("id", teacher_id).limit(1).execute()
    if r.data:
        return TeacherBrief(id=r.data[0]["id"], name=r.data[0]["name"])
    return None


async def _get_children_for_course(course_id: str) -> list[ChildBrief]:
    """Fetch children enrolled in a course via course_students."""
    sb = get_supabase()
    cs = sb.table("course_students").select("child_id").eq("course_id", course_id).execute()
    if not cs.data:
        return []

    child_ids = [row["child_id"] for row in cs.data]
    children = []
    for cid in child_ids:
        c = sb.table("children").select("id, name").eq("id", cid).limit(1).execute()
        if c.data:
            children.append(ChildBrief(id=c.data[0]["id"], name=c.data[0]["name"]))
    return children


async def _get_feedback_for_course(course_id: str) -> FeedbackBrief | None:
    """Fetch feedback for a course (one-to-one)."""
    sb = get_supabase()
    r = sb.table("feedbacks").select("*").eq("course_id", course_id).limit(1).execute()
    if r.data:
        return FeedbackBrief(**r.data[0])
    return None


async def _enrich_course(row: dict, include_feedback: bool = False) -> CourseOut | CourseDetail:
    """Enrich a course row with teacher + children + optional feedback."""
    teacher = await _get_teacher_brief(row["teacher_id"])
    children = await _get_children_for_course(row["id"])

    enriched = {
        **row,
        "teacher": teacher,
        "children": children,
    }

    if include_feedback:
        enriched["feedback"] = await _get_feedback_for_course(row["id"])
        return CourseDetail(**enriched)

    return CourseOut(**enriched)


# ---------------------------------------------------------------------------
# Admin CRUD
# ---------------------------------------------------------------------------


async def create_course(body: CourseCreate) -> CourseDetail:
    """Create a course + enroll students. Admin only."""
    sb = get_supabase()

    # Verify teacher exists
    t = sb.table("teachers").select("id").eq("id", str(body.teacher_id)).limit(1).execute()
    if not t.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "TEACHER_NOT_FOUND", "message": "教师不存在"},
        )

    # Insert course
    course_data = {
        "date": body.date.isoformat(),
        "start_time": body.start_time.isoformat(),
        "end_time": body.end_time.isoformat(),
        "teacher_id": str(body.teacher_id),
        "meeting_link": body.meeting_link,
    }
    if body.hours is not None:
        course_data["hours"] = body.hours
    result = sb.table("courses").insert(course_data).execute()
    course_id = result.data[0]["id"]

    # Enroll students
    for child_id in body.child_ids:
        # Verify child exists
        c = sb.table("children").select("id").eq("id", str(child_id)).limit(1).execute()
        if not c.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "CHILD_NOT_FOUND", "message": f"学生 {child_id} 不存在"},
            )
        sb.table("course_students").insert({
            "course_id": course_id,
            "child_id": str(child_id),
        }).execute()

    logger.info("course_created", course_id=course_id, child_count=len(body.child_ids))

    # Return detail
    full = sb.table("courses").select("*").eq("id", course_id).limit(1).execute()
    return await _enrich_course(full.data[0], include_feedback=True)


async def update_course(course_id: UUID, body: CourseUpdate) -> CourseDetail:
    """Update a course + optionally replace enrolled students. Admin only."""
    sb = get_supabase()

    # Verify exists
    existing = sb.table("courses").select("*").eq("id", str(course_id)).limit(1).execute()
    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "COURSE_NOT_FOUND", "message": "课程不存在"},
        )

    # Build update data
    update_data = {}
    if body.date is not None:
        update_data["date"] = body.date.isoformat()
    if body.start_time is not None:
        update_data["start_time"] = body.start_time.isoformat()
    if body.end_time is not None:
        update_data["end_time"] = body.end_time.isoformat()
    if body.teacher_id is not None:
        # Verify teacher exists
        t = sb.table("teachers").select("id").eq("id", str(body.teacher_id)).limit(1).execute()
        if not t.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "TEACHER_NOT_FOUND", "message": "教师不存在"},
            )
        update_data["teacher_id"] = str(body.teacher_id)
    if body.meeting_link is not None:
        update_data["meeting_link"] = body.meeting_link
    if body.status is not None:
        update_data["status"] = body.status
    if body.hours is not None:
        update_data["hours"] = body.hours

    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        sb.table("courses").update(update_data).eq("id", str(course_id)).execute()

    # Replace enrolled students if child_ids provided
    if body.child_ids is not None:
        # Delete existing enrollments
        sb.table("course_students").delete().eq("course_id", str(course_id)).execute()
        # Insert new enrollments
        for child_id in body.child_ids:
            c = sb.table("children").select("id").eq("id", str(child_id)).limit(1).execute()
            if not c.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail={"code": "CHILD_NOT_FOUND", "message": f"学生 {child_id} 不存在"},
                )
            sb.table("course_students").insert({
                "course_id": str(course_id),
                "child_id": str(child_id),
            }).execute()

    # Return updated detail
    full = sb.table("courses").select("*").eq("id", str(course_id)).limit(1).execute()
    return await _enrich_course(full.data[0], include_feedback=True)


async def delete_course(course_id: UUID) -> dict:
    """Delete a course (cascades to course_students + feedbacks). Admin only."""
    sb = get_supabase()

    existing = sb.table("courses").select("id").eq("id", str(course_id)).limit(1).execute()
    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "COURSE_NOT_FOUND", "message": "课程不存在"},
        )

    sb.table("courses").delete().eq("id", str(course_id)).execute()
    logger.info("course_deleted", course_id=str(course_id))
    return {"message": "课程已删除", "course_id": str(course_id)}


async def get_course_detail(course_id: UUID, user_id: str | None = None, role: str | None = None) -> CourseDetail:
    """Get course detail with feedback. parent/teacher/admin.

    Parent: only allowed if one of their children is enrolled in this course.
    Teacher/Admin: no ownership restriction.
    """
    sb = get_supabase()

    result = sb.table("courses").select("*").eq("id", str(course_id)).limit(1).execute()
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "COURSE_NOT_FOUND", "message": "课程不存在"},
        )

    # Parent ownership check: verify one of their children is enrolled
    if role == "parent" and user_id:
        child_result = sb.table("children").select("id").eq("parent_id", str(user_id)).limit(1).execute()
        if not child_result.data:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"code": "FORBIDDEN", "message": "无权查看此课程"},
            )
        child_id = child_result.data[0]["id"]
        enrolled = sb.table("course_students").select("course_id").eq("course_id", str(course_id)).eq("child_id", child_id).limit(1).execute()
        if not enrolled.data:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"code": "FORBIDDEN", "message": "无权查看此课程"},
            )

    return await _enrich_course(result.data[0], include_feedback=True)


# ---------------------------------------------------------------------------
# Role-scoped list views
# ---------------------------------------------------------------------------


async def get_today_courses_parent(user_id: UUID) -> list[CourseOut]:
    """Today's courses for a parent (only their child's courses)."""
    sb = get_supabase()
    today = date.today().isoformat()

    # Find parent's child
    child_result = sb.table("children").select("id").eq("parent_id", str(user_id)).limit(1).execute()
    if not child_result.data:
        return []

    child_id = child_result.data[0]["id"]

    # Find courses for this child via course_students
    cs = sb.table("course_students").select("course_id").eq("child_id", child_id).execute()
    if not cs.data:
        return []

    course_ids = [row["course_id"] for row in cs.data]

    # Get today's courses for those IDs
    courses = []
    for cid in course_ids:
        c = sb.table("courses").select("*").eq("id", cid).eq("date", today).limit(1).execute()
        if c.data:
            courses.append(await _enrich_course(c.data[0]))

    # Sort by start_time
    courses.sort(key=lambda x: x.start_time)
    return courses


async def get_today_courses_teacher(teacher_id: UUID) -> list[CourseOut]:
    """Today's courses for a teacher (only their own courses)."""
    sb = get_supabase()
    today = date.today().isoformat()

    result = sb.table("courses").select("*").eq("teacher_id", str(teacher_id)).eq("date", today).order("start_time").execute()

    courses = []
    for row in result.data:
        courses.append(await _enrich_course(row))
    return courses


async def get_today_courses_admin() -> list[CourseOut]:
    """Today's all courses for admin."""
    sb = get_supabase()
    today = date.today().isoformat()

    result = sb.table("courses").select("*").eq("date", today).order("start_time").execute()

    courses = []
    for row in result.data:
        courses.append(await _enrich_course(row))
    return courses


async def get_history_courses_parent(
    user_id: UUID,
    page: int = DEFAULT_PAGE,
    page_size: int = DEFAULT_PAGE_SIZE,
) -> PaginatedCourses:
    """Parent's history courses, paginated, date descending."""
    sb = get_supabase()

    # Find parent's child
    child_result = sb.table("children").select("id").eq("parent_id", str(user_id)).limit(1).execute()
    if not child_result.data:
        return PaginatedCourses(items=[], total=0, page=page, page_size=page_size)

    child_id = child_result.data[0]["id"]

    # Find all course_ids for this child
    cs = sb.table("course_students").select("course_id").eq("child_id", child_id).execute()
    if not cs.data:
        return PaginatedCourses(items=[], total=0, page=page, page_size=page_size)

    course_ids = [row["course_id"] for row in cs.data]

    # Get courses in one batch (IN query)
    all_courses_res = sb.table("courses").select("*").in_("id", course_ids).order("date", desc=True).order("start_time", desc=True).execute()
    all_courses = sorted(all_courses_res.data, key=lambda x: (x["date"], x.get("start_time", "")), reverse=True)

    total = len(all_courses)
    offset = (page - 1) * page_size
    page_data = all_courses[offset:offset + page_size]

    # Bulk preload teachers + children
    teacher_ids = list({r["teacher_id"] for r in page_data if r.get("teacher_id")})
    teacher_map: dict[str, TeacherBrief] = {}
    if teacher_ids:
        t_res = sb.table("teachers").select("id, name").in_("id", teacher_ids).execute()
        for t in t_res.data:
            teacher_map[t["id"]] = TeacherBrief(id=t["id"], name=t["name"])

    p_course_ids = [r["id"] for r in page_data]
    cs_map: dict[str, list[str]] = {cid: [] for cid in p_course_ids}
    child_map: dict[str, ChildBrief] = {}
    if p_course_ids:
        cs_res = sb.table("course_students").select("course_id, child_id").in_("course_id", p_course_ids).execute()
        child_ids_set: set[str] = set()
        for cs in cs_res.data:
            cs_map.setdefault(cs["course_id"], []).append(cs["child_id"])
            child_ids_set.add(cs["child_id"])
        if child_ids_set:
            ch_res = sb.table("children").select("id, name").in_("id", list(child_ids_set)).execute()
            for ch in ch_res.data:
                child_map[ch["id"]] = ChildBrief(id=ch["id"], name=ch["name"])

    items = []
    for row in page_data:
        t_id = row.get("teacher_id")
        teacher = teacher_map.get(t_id) if t_id else None
        children = [child_map[cid] for cid in cs_map.get(row["id"], []) if cid in child_map]
        enriched = {**row, "teacher": teacher, "children": children}
        items.append(CourseOut(**enriched))

    return PaginatedCourses(items=items, total=total, page=page, page_size=page_size)


async def get_all_courses(
    month: str | None = None,
    page: int = DEFAULT_PAGE,
    page_size: int = DEFAULT_PAGE_SIZE,
    teacher_id: str | None = None,
) -> PaginatedCourses:
    """All courses with optional month filter + teacher isolation.

    If teacher_id is provided, only that teacher's courses are returned.
    Otherwise (admin), all courses are returned.
    """
    sb = get_supabase()

    query = sb.table("courses").select("*", count="exact")

    # Teacher isolation: only show own courses
    if teacher_id:
        query = query.eq("teacher_id", teacher_id)

    # Month filter: ?month=2026-06 → filter date >= 2026-06-01 AND date < 2026-07-01
    if month:
        try:
            year, m = month.split("-")
            start = f"{year}-{m}-01"
            # Next month
            m_int = int(m)
            y_int = int(year)
            if m_int == 12:
                end = f"{y_int + 1}-01-01"
            else:
                end = f"{y_int}-{m_int + 1:02d}-01"
            query = query.gte("date", start).lt("date", end)
        except (ValueError, AttributeError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"code": "INVALID_MONTH", "message": "月份格式应为 YYYY-MM"},
            )

    count_result = query.execute()
    total = count_result.count if count_result.count is not None else 0

    # Paginated query (separate because Supabase count + range don't always work together)
    offset = (page - 1) * page_size
    page_query = sb.table("courses").select("*").order("date", desc=True).order("start_time", desc=True).range(offset, offset + page_size - 1)

    # Teacher isolation on page query too
    if teacher_id:
        page_query = page_query.eq("teacher_id", teacher_id)

    if month:
        try:
            year, m = month.split("-")
            start = f"{year}-{m}-01"
            m_int = int(m)
            y_int = int(year)
            if m_int == 12:
                end = f"{y_int + 1}-01-01"
            else:
                end = f"{y_int}-{m_int + 1:02d}-01"
            page_query = page_query.gte("date", start).lt("date", end)
        except (ValueError, AttributeError):
            pass # Already raised above

    result = page_query.execute()
    courses_data = result.data

    # ── Bulk preload to avoid N+1 ──────────────────
    # 1. Teachers: batch fetch by teacher_ids
    teacher_ids = list({r["teacher_id"] for r in courses_data if r.get("teacher_id")})
    teacher_map: dict[str, TeacherBrief] = {}
    if teacher_ids:
        t_res = sb.table("teachers").select("id, name").in_("id", teacher_ids).execute()
        for t in t_res.data:
            teacher_map[t["id"]] = TeacherBrief(id=t["id"], name=t["name"])

    # 2. Course-Students + Children: batch fetch
    course_ids = [r["id"] for r in courses_data]
    cs_map: dict[str, list[str]] = {cid: [] for cid in course_ids}
    child_map: dict[str, ChildBrief] = {}
    if course_ids:
        cs_res = sb.table("course_students").select("course_id, child_id").in_("course_id", course_ids).execute()
        child_ids_set: set[str] = set()
        for cs in cs_res.data:
            cs_map.setdefault(cs["course_id"], []).append(cs["child_id"])
            child_ids_set.add(cs["child_id"])
        if child_ids_set:
            ch_res = sb.table("children").select("id, name").in_("id", list(child_ids_set)).execute()
            for ch in ch_res.data:
                child_map[ch["id"]] = ChildBrief(id=ch["id"], name=ch["name"])

    # 3. Assemble without per-row queries
    items = []
    for row in courses_data:
        t_id = row.get("teacher_id")
        teacher = teacher_map.get(t_id) if t_id else None
        children = [child_map[cid] for cid in cs_map.get(row["id"], []) if cid in child_map]
        enriched = {**row, "teacher": teacher, "children": children}
        items.append(CourseOut(**enriched))

    return PaginatedCourses(items=items, total=total, page=page, page_size=page_size)
