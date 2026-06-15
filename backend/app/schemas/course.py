"""Course-related Pydantic schemas.

Per TECH-SPEC 5.2 / DB-02 courses + course_students + feedbacks tables:
- CourseCreate: date, start_time, end_time, teacher_id, meeting_link, child_ids
- CourseUpdate: same fields, all optional
- CourseOut: basic course record (list views)
- CourseDetail: course + student names + feedback (detail view)
- PaginatedCourses: TECH-SPEC 5.9 list response format
"""

from datetime import date as date_type, datetime, time as time_type
from uuid import UUID

from pydantic import BaseModel, Field, model_validator


class ChildBrief(BaseModel):
    """Brief child info in course responses."""
    id: UUID
    name: str


class TeacherBrief(BaseModel):
    """Brief teacher info in course responses."""
    id: UUID
    name: str


class FeedbackBrief(BaseModel):
    """Feedback info embedded in course detail."""
    id: UUID
    content: str
    homework: str | None = None
    notes: str | None = None
    created_by: UUID
    created_at: datetime
    updated_at: datetime


class CourseCreate(BaseModel):
    """Request body for POST /courses."""
    date: date_type = Field(..., description="Course date")
    start_time: time_type = Field(..., description="Start time (HH:MM)")
    end_time: time_type = Field(..., description="End time (HH:MM)")
    teacher_id: UUID = Field(..., description="Teacher UUID")
    meeting_link: str | None = Field(None, description="Tencent meeting link")
    child_ids: list[UUID] = Field(default_factory=list, description="Student UUIDs to enroll")

    @model_validator(mode="after")
    def check_time_order(self) -> "CourseCreate":
        if self.start_time >= self.end_time:
            raise ValueError("start_time must be before end_time")
        return self


class CourseUpdate(BaseModel):
    """Request body for PUT /courses/{id}. All fields optional."""
    date: date_type | None = None
    start_time: time_type | None = None
    end_time: time_type | None = None
    teacher_id: UUID | None = None
    meeting_link: str | None = None
    status: str | None = Field(None, pattern=r"^(pending|completed|cancelled)$")
    child_ids: list[UUID] | None = Field(None, description="Replace enrolled students (full replacement)")

    @model_validator(mode="after")
    def check_time_order(self) -> "CourseUpdate":
        if self.start_time is not None and self.end_time is not None:
            if self.start_time >= self.end_time:
                raise ValueError("start_time must be before end_time")
        return self


class CourseOut(BaseModel):
    """Course record returned in list views."""
    id: UUID
    date: date_type
    start_time: time_type
    end_time: time_type
    teacher_id: UUID
    teacher: TeacherBrief | None = None
    meeting_link: str | None = None
    status: str = "pending"
    children: list[ChildBrief] = []
    created_at: datetime
    updated_at: datetime


class CourseDetail(CourseOut):
    """Course detail with feedback (if any)."""
    feedback: FeedbackBrief | None = None


class PaginatedCourses(BaseModel):
    """Paginated list response per TECH-SPEC 5.9."""
    items: list[CourseOut]
    total: int
    page: int
    page_size: int
