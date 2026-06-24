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
    hours: float | None = Field(None, ge=0, description="本次课程消耗课时 (默认1)")

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
    hours: float | None = Field(None, ge=0, description="本次课程消耗课时")

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
    hours: float = 1
    students: list[ChildBrief] = []
    feedbacks: list[FeedbackBrief] = []
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


# ── 排课冲突检测 ──────────────────────────────────────

class ConflictCheckRequest(BaseModel):
    """排课冲突检测请求."""
    date: date_type = Field(..., description="课程日期")
    start_time: time_type = Field(..., description="开始时间")
    end_time: time_type = Field(..., description="结束时间")
    teacher_id: UUID | None = Field(None, description="教师ID (可选)")
    child_ids: list[UUID] = Field(default_factory=list, description="学员ID列表")
    exclude_course_id: UUID | None = Field(None, description="编辑时排除自身ID")

    @model_validator(mode="after")
    def check_time_order(self) -> "ConflictCheckRequest":
        if self.start_time >= self.end_time:
            raise ValueError("start_time must be before end_time")
        return self


class ConflictItem(BaseModel):
    """单个冲突记录."""
    course_id: UUID
    date: date_type
    start_time: time_type
    end_time: time_type
    teacher_name: str | None = None
    child_name: str | None = None
    conflict_type: str = Field(..., description="teacher_conflict | student_conflict")


class ConflictCheckResponse(BaseModel):
    """排课冲突检测响应."""
    conflicts: list[ConflictItem] = []
    student_hours: list[dict] = Field(default_factory=list, description="学员课时信息 [{id, name, remaining, hours_after}]")
