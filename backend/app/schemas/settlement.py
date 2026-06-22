"""教师结算 schemas。"""


from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# 请求
# ---------------------------------------------------------------------------

class SettlementCreateRequest(BaseModel):
    """POST /api/v1/settlements"""
    teacher_id: UUID = Field(..., description="教师 ID")
    period_start: str = Field(..., description="结算开始日期 YYYY-MM-DD")
    period_end: str = Field(..., description="结算结束日期 YYYY-MM-DD")
    hours: float = Field(..., ge=0, description="课时数")
    hourly_rate: float = Field(..., ge=0, description="时薪")
    note: str | None = Field(None, max_length=500, description="备注")


class HoursCalcRequest(BaseModel):
    """POST /api/v1/settlements/calc-hours — 按教师+时间段自动计算课时"""
    teacher_id: UUID = Field(..., description="教师 ID")
    period_start: str = Field(..., description="开始日期 YYYY-MM-DD")
    period_end: str = Field(..., description="结束日期 YYYY-MM-DD")


# ---------------------------------------------------------------------------
# 响应
# ---------------------------------------------------------------------------

class SettlementPayRequest(BaseModel):
    """PUT /api/v1/settlements/{id}/pay"""
    payment_method: str = Field("bank_transfer", description="付款方式: bank_transfer/gcash/cash/other")


class SettlementOut(BaseModel):
    id: UUID
    teacher_id: UUID
    teacher_name: str = ""
    period_start: str
    period_end: str
    hours: float
    hourly_rate: float
    amount: float
    status: str = "pending"   # pending | paid
    payment_method: str | None = None
    paid_at: str | None = None
    note: str | None = None
    created_at: datetime | None = None


class HoursCalcResponse(BaseModel):
    """自动计算课时响应"""
    teacher_id: UUID
    period_start: str
    period_end: str
    total_hours: float = Field(0, description="该时间段内该教师的总课时")
    course_count: int = Field(0, description="课程数量")
    courses: list[dict] = Field(default_factory=list, description="课程明细（日期+课时）")


class SettlementSummaryOut(BaseModel):
    total_pending: float = 0
    total_paid: float = 0
    total_amount: float = 0
    teacher_count: int = 0


class SettlementListResponse(BaseModel):
    items: list[SettlementOut]
    total: int
