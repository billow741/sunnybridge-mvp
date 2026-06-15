"""Feedback-related Pydantic schemas.

Per TECH-SPEC 5.3 / DB-02 feedbacks table:
- FeedbackCreate: content (required), homework/notes (optional)
- FeedbackUpdate: all fields optional (partial update)
- FeedbackOut: full feedback record with teacher name
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class FeedbackCreate(BaseModel):
    """Request body for POST /courses/{id}/feedback."""
    content: str = Field(..., min_length=1, description="课堂内容（必填）")
    homework: str | None = Field(None, description="作业（选填）")
    notes: str | None = Field(None, description="备注（选填）")


class FeedbackUpdate(BaseModel):
    """Request body for PUT /courses/{id}/feedback. All fields optional."""
    content: str | None = Field(None, min_length=1)
    homework: str | None = None
    notes: str | None = None


class TeacherNameBrief(BaseModel):
    """Teacher name for feedback display."""
    id: UUID
    name: str


class FeedbackOut(BaseModel):
    """Feedback record returned in API responses."""
    id: UUID
    course_id: UUID
    content: str
    homework: str | None = None
    notes: str | None = None
    created_by: UUID
    teacher: TeacherNameBrief | None = None
    created_at: datetime
    updated_at: datetime
