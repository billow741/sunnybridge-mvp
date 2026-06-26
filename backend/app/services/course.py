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


# ---------------------------------------------------------------------------
# P0-B: 自动生成 settlement 辅助函数
# ---------------------------------------------------------------------------


async def _auto_create_settlement(
    sb,
    teacher_id: str,
    course_id: UUID,
    course_hours: float,
    course_row: dict,
) -> None:
    """课程确认完成时，自动为教师创建待结算行.

    规则:
    - 同一课程的 settlement 只生成一次 (course_id 唯一约束)
    - 取教师 hourly_rate 计算 amount = hours × hourly_rate
    - period_start/end = 课程日期
    - status = pending (待确认付款)
    """
    # 查教师时薪
    t = sb.table("teachers").select("id, name, hourly_rate").eq("id", str(teacher_id)).limit(1).execute()
    if not t.data:
        logger.warning("auto_settlement_skip", reason="teacher_not_found", teacher_id=str(teacher_id))
        return
    teacher = t.data[0]
    hourly_rate = float(teacher.get("hourly_rate") or 0)
    teacher_name = teacher.get("name", "未知")
    amount = course_hours * hourly_rate

    # 幂等: 检查是否已有该课程的 settlement (用 note 字段存 source_course_id)
    existing = sb.table("settlements").select("id").eq("note", f"auto:course:{course_id}").limit(1).execute()
    if existing.data:
        logger.info("auto_settlement_skip", reason="already_exists", course_id=str(course_id))
        return

    if amount <= 0:
        logger.info("auto_settlement_skip", reason="zero_amount", teacher_id=str(teacher_id), hours=course_hours, rate=hourly_rate)
        return

    course_date = course_row.get("date", "")
    row = {
        "teacher_id": str(teacher_id),
        "teacher_name": teacher_name,
        "period_start": course_date,
        "period_end": course_date,
        "hours": course_hours,
        "hourly_rate": hourly_rate,
        "amount": amount,
        "status": "pending",
        "note": f"auto:course:{course_id}",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = sb.table("settlements").insert(row).execute()
    if result.data:
        logger.info(
            "auto_settlement_created",
            settlement_id=result.data[0]["id"],
            teacher_id=str(teacher_id),
            course_id=str(course_id),
            hours=course_hours,
            amount=amount,
        )
    else:
        logger.error("auto_settlement_failed", course_id=str(course_id))


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
        "students": children,
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
    """Update a course + optionally replace enrolled students. Admin only.

    When status transitions to 'completed':
      - P0-A: Auto-deduct usedhours for each enrolled student
      - P0-B: Auto-generate a settlement row for the teacher
    """
    sb = get_supabase()

    # Verify exists
    existing = sb.table("courses").select("*").eq("id", str(course_id)).limit(1).execute()
    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "COURSE_NOT_FOUND", "message": "课程不存在"},
        )
    old_status = existing.data[0].get("status", "pending")

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

    # ── P0-A: 确认完成 → 自动扣减学员 usedhours ──
    new_status = update_data.get("status", old_status)
    if new_status == "completed" and old_status != "completed":
        course_hours = update_data.get("hours") or existing.data[0].get("hours") or 1
        # 获取本课程关联的学员列表
        cs = sb.table("course_students").select("child_id").eq("course_id", str(course_id)).execute()
        child_ids = [row["child_id"] for row in (cs.data or [])]

        for cid in child_ids:
            ch = sb.table("children").select("id, name, usedhours").eq("id", cid).limit(1).execute()
            if ch.data:
                old_used = int(ch.data[0].get("usedhours") or 0)
                new_used = old_used + int(course_hours)
                sb.table("children").update({
                    "usedhours": new_used,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }).eq("id", cid).execute()
                logger.info(
                    "hours_deducted",
                    child_id=cid,
                    course_id=str(course_id),
                    hours=course_hours,
                    old_usedhours=old_used,
                    new_usedhours=new_used,
                )
                # ── 1-A: 课时变动日志 ──
                try:
                    from app.api.hours_log import record_hours_change
                    ch_full = sb.table("children").select("totalhours, usedhours").eq("id", cid).limit(1).execute()
                    tu = (ch_full.data or [{}])[0].get("totalhours") or 0
                    uu = (ch_full.data or [{}])[0].get("usedhours") or 0
                    record_hours_change(
                        child_id=cid, change_type="deduction", delta=-course_hours,
                        balance_after=tu - uu, ref_id=str(course_id),
                        note=f"课程完成扣减 {course_hours}h", created_by=None,
                    )
                except Exception:
                    pass  # 日志不阻塞主流程

        # ── P0-B: 确认完成 → 自动生成 settlement 行 ──
        teacher_id = str(update_data.get("teacher_id") or existing.data[0].get("teacher_id") or "")
        if teacher_id:
            await _auto_create_settlement(
                sb,
                teacher_id,
                course_id,
                float(course_hours),
                dict(existing.data[0]),
            )

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

    # Get today's courses for those IDs (exclude cancelled)
    courses = []
    for cid in course_ids:
        c = sb.table("courses").select("*").eq("id", cid).eq("date", today).neq("status", "cancelled").limit(1).execute()
        if c.data:
            courses.append(await _enrich_course(c.data[0], include_feedback=True))

    # Sort by start_time
    courses.sort(key=lambda x: x.start_time)
    return courses


async def get_today_courses_teacher(teacher_id: UUID) -> list[CourseOut]:
    """Today's courses for a teacher (only their own courses)."""
    sb = get_supabase()
    today = date.today().isoformat()

    result = sb.table("courses").select("*").eq("teacher_id", str(teacher_id)).eq("date", today).neq("status", "cancelled").order("start_time").execute()

    courses = []
    for row in result.data:
        courses.append(await _enrich_course(row, include_feedback=True))
    return courses


async def get_today_courses_admin() -> list[CourseOut]:
    """Today's all courses for admin."""
    sb = get_supabase()
    today = date.today().isoformat()

    result = sb.table("courses").select("*").eq("date", today).order("start_time").execute()

    courses = []
    for row in result.data:
        courses.append(await _enrich_course(row, include_feedback=True))
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

    # Get courses in one batch (IN query), exclude cancelled
    all_courses_res = sb.table("courses").select("*").in_("id", course_ids).neq("status", "cancelled").order("date", desc=True).order("start_time", desc=True).execute()
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

    # Bulk preload feedbacks
    fb_map: dict[str, dict] = {}
    if p_course_ids:
        fb_res = sb.table("feedbacks").select("*").in_("course_id", p_course_ids).execute()
        for fb in fb_res.data:
            fb_map[fb["course_id"]] = fb

    items = []
    for row in page_data:
        t_id = row.get("teacher_id")
        teacher = teacher_map.get(t_id) if t_id else None
        children = [child_map[cid] for cid in cs_map.get(row["id"], []) if cid in child_map]
        fb_data = fb_map.get(row["id"])
        feedback = None
        if fb_data:
            from app.schemas.course import FeedbackBrief
            feedback = FeedbackBrief(**fb_data)
        enriched = {**row, "teacher": teacher, "students": children, "feedback": feedback}
        items.append(CourseOut(**enriched))

    return PaginatedCourses(items=items, total=total, page=page, page_size=page_size)


async def get_all_courses(
    month: str | None = None,
    page: int = DEFAULT_PAGE,
    page_size: int = DEFAULT_PAGE_SIZE,
    teacher_id: str | None = None,
    course_status: str | None = None,
) -> PaginatedCourses:
    """All courses with optional month/status filter + teacher isolation.

    If teacher_id is provided, only that teacher's courses are returned.
    Otherwise (admin), all courses are returned.
    """
    sb = get_supabase()

    query = sb.table("courses").select("*", count="exact")

    # Teacher isolation: only show own courses + hide cancelled
    if teacher_id:
        query = query.eq("teacher_id", teacher_id).neq("status", "cancelled")

    # Status filter
    if course_status:
        query = query.eq("status", course_status)

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
        page_query = page_query.eq("teacher_id", teacher_id).neq("status", "cancelled")

    # Status filter on page query too
    if course_status:
        page_query = page_query.eq("status", course_status)

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

    # 3. Feedback: batch fetch for visible courses
    feedback_map: dict[str, list] = {}
    if course_ids:
        fb_res = sb.table("feedbacks").select("*").in_("course_id", course_ids).execute()
        for fb in fb_res.data or []:
            feedback_map.setdefault(fb["course_id"], []).append(fb)

    # 4. Assemble without per-row queries
    items = []
    for row in courses_data:
        t_id = row.get("teacher_id")
        teacher = teacher_map.get(t_id) if t_id else None
        children = [child_map[cid] for cid in cs_map.get(row["id"], []) if cid in child_map]
        feedbacks = feedback_map.get(row["id"], [])
        # First feedback as singular "feedback" for frontend compatibility
        feedback = FeedbackBrief(**feedbacks[0]) if feedbacks else None
        enriched = {**row, "teacher": teacher, "students": children, "feedbacks": feedbacks, "feedback": feedback}
        items.append(CourseOut(**enriched))

    return PaginatedCourses(items=items, total=total, page=page, page_size=page_size)


# ---------------------------------------------------------------------------
# Schedule conflict detection
# ---------------------------------------------------------------------------

async def check_schedule_conflicts(body):  # ConflictCheckRequest
    """检查排课时段冲突 + 学员课时余额."""
    from app.schemas.course import ConflictCheckRequest, ConflictCheckResponse, ConflictItem

    sb = get_supabase()
    conflicts: list[ConflictItem] = []
    date_str = body.date.isoformat()
    start_str = body.start_time.isoformat() if hasattr(body.start_time, "isoformat") else str(body.start_time)
    end_str = body.end_time.isoformat() if hasattr(body.end_time, "isoformat") else str(body.end_time)

    # ── 1. 教师冲突 ──
    if body.teacher_id:
        q = sb.table("courses").select("id, date, start_time, end_time, teacher_id, status").eq("date", date_str).eq("teacher_id", str(body.teacher_id)).neq("status", "cancelled")
        if body.exclude_course_id:
            q = q.neq("id", str(body.exclude_course_id))
        t_res = q.execute()
        for row in (t_res.data or []):
            if _time_overlaps(start_str, end_str, row["start_time"], row["end_time"]):
                t_info = await _get_teacher_brief(str(body.teacher_id))
                conflicts.append(ConflictItem(
                    course_id=row["id"],
                    date=row["date"],
                    start_time=row["start_time"],
                    end_time=row["end_time"],
                    teacher_name=t_info.name if t_info else None,
                    conflict_type="teacher_conflict",
                ))

    # ── 2. 学员冲突 ──
    if body.child_ids:
        child_ids_str = [str(cid) for cid in body.child_ids]
        cs_res = sb.table("course_students").select("course_id, child_id").in_("child_id", child_ids_str).execute()
        child_courses: dict[str, list[str]] = {}
        for cs in (cs_res.data or []):
            child_courses.setdefault(cs["child_id"], []).append(cs["course_id"])

        all_course_ids = list({cs["course_id"] for cs in (cs_res.data or [])})
        if all_course_ids:
            c_res = sb.table("courses").select("id, date, start_time, end_time, status").eq("date", date_str).neq("status", "cancelled").in_("id", all_course_ids).execute()
            if body.exclude_course_id:
                c_res.data = [r for r in (c_res.data or []) if r["id"] != str(body.exclude_course_id)]
            for row in (c_res.data or []):
                if not _time_overlaps(start_str, end_str, row["start_time"], row["end_time"]):
                    continue
                for cid, cids in child_courses.items():
                    if row["id"] in cids:
                        ch = sb.table("children").select("id, name").eq("id", cid).limit(1).execute()
                        ch_name = ch.data[0]["name"] if ch.data else None
                        conflicts.append(ConflictItem(
                            course_id=row["id"],
                            date=row["date"],
                            start_time=row["start_time"],
                            end_time=row["end_time"],
                            child_name=ch_name,
                            conflict_type="student_conflict",
                        ))

    # ── 3. 学员课时余额 ──
    student_hours: list[dict] = []
    if body.child_ids:
        duration_hours = _calc_duration_hours(start_str, end_str)
        for cid in body.child_ids:
            ch_res = sb.table("children").select("id, name, totalhours, usedhours").eq("id", str(cid)).limit(1).execute()
            if ch_res.data:
                ch = ch_res.data[0]
                remaining = (ch.get("totalhours") or 0) - (ch.get("usedhours") or 0)
                student_hours.append({
                    "id": ch["id"],
                    "name": ch["name"],
                    "remaining": remaining,
                    "hours_after": remaining - duration_hours,
                })

    return ConflictCheckResponse(conflicts=conflicts, student_hours=student_hours)


def _time_overlaps(a_start: str, a_end: str, b_start: str, b_end: str) -> bool:
    """判断两个时间段是否有重叠."""
    def _norm(t: str) -> str:
        return t[:5] if t else "00:00"
    return _norm(a_start) < _norm(b_end) and _norm(b_start) < _norm(a_end)


def _calc_duration_hours(start: str, end: str) -> float:
    """计算两时间之间的小时数."""
    def _to_min(t: str) -> int:
        t = t[:5]
        parts = t.split(":")
        return int(parts[0]) * 60 + int(parts[1])
    return (_to_min(end) - _to_min(start)) / 60
