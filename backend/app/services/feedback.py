"""Feedback service — business logic for course feedback.

Per TECH-SPEC 5.3 / DB-02:
- Create feedback (teacher only, must be course's own teacher)
- Update feedback (teacher only, must be the feedback author)
- Get feedback (parent/teacher/admin)
- Duplicate feedback → 409 (UNIQUE course_id)
- DB trigger `trg_feedback_insert` auto-marks course as completed
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
    """Create feedback for a course.

    Checks:
    1. Course exists
    2. Current teacher is the course's assigned teacher
    3. No existing feedback for this course (UNIQUE)

    DB trigger `trg_feedback_insert` will auto-set course.status = 'completed'.
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

    # 4. Insert feedback (DB trigger will auto-mark course as completed)
    result = sb.table("feedbacks").insert({
        "course_id": cid,
        "content": body.content,
        "homework": body.homework,
        "notes": body.notes,
        "created_by": tid,
    }).execute()

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
