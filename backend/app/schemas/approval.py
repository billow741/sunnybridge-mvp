"""审批流 schemas — 3-D MVP settlement only."""

from datetime import datetime
from uuid import UUID

from typing import Literal
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# 请求
# ---------------------------------------------------------------------------

class ApprovalSubmitRequest(BaseModel):
    """POST /api/v1/approvals — 提交审批"""
    target_type: Literal["settlement"] = "settlement"
    target_id: UUID


class ApprovalReviewRequest(BaseModel):
    """PUT /api/v1/approvals/{id}/approve | reject"""
    comment: str | None = Field(None, max_length=500, description="审批备注/驳回理由")


# ---------------------------------------------------------------------------
# 响应
# ---------------------------------------------------------------------------

class ApprovalOut(BaseModel):
    id: UUID
    target_type: str
    target_id: UUID
    status: str  # pending | approved | rejected
    requested_by: UUID
    requested_by_name: str = ""
    reviewed_by: UUID | None = None
    reviewed_by_name: str | None = None
    comment: str | None = None
    created_at: datetime | None = None
    reviewed_at: datetime | None = None
    # 附带 target 摘要
    target_summary: dict | None = None  # { teacher_name, amount, period_start, period_end }


class ApprovalListResponse(BaseModel):
    items: list[ApprovalOut]
    total: int
