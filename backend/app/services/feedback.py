"""Feedback service — business logic for course feedback.

Per TECH-SPEC 5.3 / DB-02:
- Create feedback (teacher only, must be course's own teacher)
- Update feedback (teacher only, must be the feedback author)
- Get feedback (parent/teacher/admin)
- Duplicate feedback → 409 (UNIQUE course_id)
- Create feedback → 自动标课程completed + 扣学员课时 + 生成教师settlement (方案C)
"""

import structlog
from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, status

from app.core.database import get_supabase
from app.schemas.feedback import (
    FeedbackCreate,
    FeedbackOut,
    FeedbackUpdate,
    TeacherNameBrief,
)

logger = structlog.get_logger()


async def _get_teacher_name(teacher_id: str) -> TeacherNameBrief | None:
    """Fetch teacher name for feedback display."""
    sb = get_supabase()
    r = sb.table("teachers").select("id, name").eq("id", teacher_id).limit(1).execute()
    if r.data:
        return TeacherNameBrief(id=r.data[0]["id"], name=r.data[0]["name"])
    return None


async def _enrich_feedback(row: dict) -> FeedbackOut:
    """Enrich feedback record with teacher name."""
    teacher = await _get_teacher_name(row["created_by"])
    row["teacher"] = teacher
    return FeedbackOut(**row)


async def create_feedback(
    course_id: UUID,
    body: FeedbackCreate,
    teacher_id: UUID,
) -> FeedbackOut:
    """Create feedback for a course. Teacher only.

    Checks:
    1. Course exists
    2. Current teacher is the course's assigned teacher
    3. No existing feedback for this course (UNIQUE)

    提交反馈后自动执行:
    - 标课程 status = 'completed'
    - 扣减每个学员 usedhours
    - 生成教师 settlement 行
    """
    sb = get_supabase()
    cid = str(course_id)
    tid = str(teacher_id)

    # 1. Verify course exists
    course = sb.table("courses").select("id, teacher_id").eq("id", cid).limit(1).execute()
    if not course.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "COURSE_NOT_FOUND", "message": "课程不存在"},
        )

    # 2. Verify teacher is the course's assigned teacher
    if course.data[0]["teacher_id"] != tid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "NOT_COURSE_TEACHER", "message": "只有本课程授课教师才能提交反馈"},
        )

    # 3. Check duplicate feedback
    existing = sb.table("feedbacks").select("id").eq("course_id", cid).limit(1).execute()
    if existing.data:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "FEEDBACK_ALREADY_EXISTS", "message": "该课程已有反馈，请使用修改功能"},
        )

    # 4. Insert feedback
    result = sb.table("feedbacks").insert({
        "course_id": cid,
        "content": body.content,
        "homework": body.homework,
        "notes": body.notes,
        "created_by": tid,
    }).execute()

    # ── 方案C: 反馈提交后自动完成课程 + 扣课时 + 生成settlement ──

    # 5. 标课程为 completed
    course = sb.table("courses").select("id, teacher_id, status, hours, date").eq("id", cid).limit(1).execute()
    course_row = course.data[0] if course.data else {}
    old_status = course_row.get("status", "pending")

    if old_status != "completed":
        sb.table("courses").update({
            "status": "completed",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", cid).execute()
        logger.info("course_auto_completed", course_id=cid, trigger="feedback_create")

        course_hours = float(course_row.get("hours") or 1)

        # 6. 扣减每个学员 usedhours
        cs = sb.table("course_students").select("child_id").eq("course_id", cid).execute()
        child_ids = [row["child_id"] for row in (cs.data or [])]

        for child_id in child_ids:
            ch = sb.table("children").select("id, name, usedhours, totalhours").eq("id", child_id).limit(1).execute()
            if ch.data:
                old_used = int(ch.data[0].get("usedhours") or 0)
                total_h = int(ch.data[0].get("totalhours") or 0)
                new_used = old_used + int(course_hours)
                sb.table("children").update({
                    "usedhours": new_used,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }).eq("id", child_id).execute()
                logger.info(
                    "hours_deducted",
                    child_id=child_id,
                    course_id=cid,
                    hours=course_hours,
                    old_usedhours=old_used,
                    new_usedhours=new_used,
                )
                # 课时变动日志
                try:
                    from app.api.hours_log import record_hours_change
                    record_hours_change(
                        child_id=child_id, change_type="deduction", delta=-course_hours,
                        balance_after=total_h - new_used, ref_id=cid,
                        note=f"课程完成扣减 {course_hours}h", created_by=None,
                    )
                except Exception:
                    pass

        # 7. 自动生成 settlement 行
        teacher_id = str(course_row.get("teacher_id") or "")
        if teacher_id:
            try:
                from app.services.course import _auto_create_settlement
                await _auto_create_settlement(sb, teacher_id, course_id, course_hours, dict(course_row))
            except Exception as e:
                logger.warning("auto_settlement_failed", course_id=cid, error=str(e))

    logger.info("feedback_created", course_id=cid, teacher_id=tid)
    return await _enrich_feedback(result.data[0])


async def update_feedback(
    course_id: UUID,
    body: FeedbackUpdate,
    teacher_id: UUID,
) -> FeedbackOut:
    """Update feedback for a course.

    Checks:
    1. Course exists
    2. Feedback exists for this course
    3. Current teacher is the feedback author
    """
    sb = get_supabase()
    cid = str(course_id)
    tid = str(teacher_id)

    # 1. Find existing feedback
    existing = sb.table("feedbacks").select("*").eq("course_id", cid).limit(1).execute()
    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "FEEDBACK_NOT_FOUND", "message": "该课程暂无反馈"},
        )

    fb = existing.data[0]

    # 2. Verify teacher is the author
    if fb["created_by"] != tid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "NOT_FEEDBACK_AUTHOR", "message": "只有反馈作者才能修改反馈"},
        )

    # 3. Build update payload
    update_data = {}
    if body.content is not None:
        update_data["content"] = body.content
    if body.homework is not None:
        update_data["homework"] = body.homework
    if body.notes is not None:
        update_data["notes"] = body.notes

    if not update_data:
        # Nothing to update
        return await _enrich_feedback(fb)

    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    result = sb.table("feedbacks").update(update_data).eq("id", fb["id"]).execute()
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "UPDATE_FAILED", "message": "反馈更新失败"},
        )

    logger.info("feedback_updated", feedback_id=fb["id"], course_id=cid)
    return await _enrich_feedback(result.data[0])


async def get_feedback(course_id: UUID) -> FeedbackOut:
    """Get feedback for a course. parent/teacher/admin.

    No course → 404 COURSE_NOT_FOUND.
    No feedback → 404 FEEDBACK_NOT_FOUND.
    """
    sb = get_supabase()
    cid = str(course_id)

    # 1. Verify course exists
    course = sb.table("courses").select("id").eq("id", cid).limit(1).execute()
    if not course.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "COURSE_NOT_FOUND", "message": "课程不存在"},
        )

    # 2. Find feedback
    result = sb.table("feedbacks").select("*").eq("course_id", cid).limit(1).execute()
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "FEEDBACK_NOT_FOUND", "message": "该课程暂无反馈"},
        )

    return await _enrich_feedback(result.data[0])
