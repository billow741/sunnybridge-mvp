"""Feedback router — create/update/view course feedback.

Per TECH-SPEC 5.3:
- POST   /api/v1/courses/{id}/feedback  — Create feedback (teacher only)
- PUT    /api/v1/courses/{id}/feedback  — Update feedback (teacher only)
- GET    /api/v1/courses/{id}/feedback  — View feedback (parent, teacher, admin)
"""

from uuid import UUID

from fastapi import APIRouter, Depends

from app.core.deps import require_role
from app.schemas.auth import CurrentUser
from app.schemas.feedback import FeedbackCreate, FeedbackOut, FeedbackUpdate
from app.services.feedback import create_feedback, get_feedback, update_feedback

router = APIRouter(prefix="/api/v1/courses", tags=["feedback"])


@router.post("/{course_id}/feedback", response_model=FeedbackOut, status_code=201)
async def create_feedback_endpoint(
    course_id: UUID,
    body: FeedbackCreate,
    user: CurrentUser = Depends(require_role("teacher")),
) -> FeedbackOut:
    """Create feedback for a course. Teacher only.

    DB trigger auto-marks course as completed on insert.
    Duplicate feedback for same course → 409.
    """
    # teacher_id is stored in JWT claims
    if not user.teacher_id:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "NOT_COURSE_TEACHER", "message": "无效的教师身份"},
        )
    return await create_feedback(course_id, body, user.teacher_id)


@router.put("/{course_id}/feedback", response_model=FeedbackOut)
async def update_feedback_endpoint(
    course_id: UUID,
    body: FeedbackUpdate,
    user: CurrentUser = Depends(require_role("teacher")),
) -> FeedbackOut:
    """Update feedback for a course. Teacher only (must be author)."""
    if not user.teacher_id:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "NOT_FEEDBACK_AUTHOR", "message": "无效的教师身份"},
        )
    return await update_feedback(course_id, body, user.teacher_id)


@router.get("/{course_id}/feedback", response_model=FeedbackOut)
async def get_feedback_endpoint(
    course_id: UUID,
    user: CurrentUser = Depends(require_role("parent", "teacher", "admin")),
) -> FeedbackOut:
    """View feedback for a course. Parent/Teacher/Admin.
    
    Parent: only own child's courses.
    """
    # Parent ownership check (reuse course detail logic)
    if user.role == "parent":
        from app.services.course import get_course_detail
        await get_course_detail(course_id, user_id=str(user.id), role=user.role)
    return await get_feedback(course_id)
