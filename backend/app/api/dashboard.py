"""Dashboard API — 真实运营数据聚合（替换前端 mock）。

端点:
- GET /api/v1/dashboard/summary  — 四大提醒计数
- GET /api/v1/dashboard/alerts    — 结构化提醒列表
"""

import structlog
from datetime import datetime, date
from decimal import Decimal
from fastapi import APIRouter, Depends, Query

from app.core.database import get_supabase
from app.core.deps import require_role
from app.schemas.auth import CurrentUser
from pydantic import BaseModel

logger = structlog.get_logger()
router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard"])


# ── Schemas ──

class DashboardSummary(BaseModel):
    pending_courses: int = 0
    missing_feedback: int = 0
    low_hours_count: int = 0
    pending_settlement: int = 0

class AlertItem(BaseModel):
    id: str
    type: str          # course_pending | feedback_missing | low_hours | settlement_pending
    title: str
    description: str
    severity: str      # high | medium | low
    action_path: str

class RecentVisit(BaseModel):
    entity_type: str    # student | teacher | course
    entity_id: str
    name: str
    path: str


# ── Summary ──

@router.get("/summary", response_model=DashboardSummary)
async def get_summary(
    user: CurrentUser = Depends(require_role("admin")),
) -> DashboardSummary:
    sb = get_supabase()
    today = date.today().isoformat()

    # 1) 今日待确认课程 (status=pending, date<=today)
    try:
        pending = sb.table("courses").select("id", count="exact")\
            .eq("status", "pending").lte("date", today).execute()
        pending_count = pending.count or 0
    except Exception:
        pending_count = 0

    # 2) 待补反馈 (completed 课程无 feedback)
    try:
        completed = sb.table("courses").select("id")\
            .eq("status", "completed").execute()
        completed_ids = [r["id"] for r in completed.data]
        if completed_ids:
            fbs = sb.table("feedbacks").select("course_id")\
                .in_("course_id", completed_ids).execute()
            fb_course_ids = set(r["course_id"] for r in fbs.data)
            missing_fb = len(completed_ids) - len(fb_course_ids)
        else:
            missing_fb = 0
    except Exception:
        missing_fb = 0

    # 3) 低课时预警 (remaining_hours <= 5)
    try:
        low = sb.table("children").select("id", count="exact")\
            .lte("remaining_hours", 5).gt("remaining_hours", 0).execute()
        low_hours_count = low.count or 0
    except Exception:
        low_hours_count = 0

    # 4) 待结算教师 (settlements status=pending)
    try:
        ps = sb.table("settlements").select("id", count="exact")\
            .eq("status", "pending").execute()
        pending_settlement = ps.count or 0
    except Exception:
        pending_settlement = 0

    return DashboardSummary(
        pending_courses=pending_count,
        missing_feedback=missing_fb,
        low_hours_count=low_hours_count,
        pending_settlement=pending_settlement,
    )


# ── Alerts ──

@router.get("/alerts", response_model=list[AlertItem])
async def get_alerts(
    user: CurrentUser = Depends(require_role("admin")),
) -> list[AlertItem]:
    sb = get_supabase()
    today = date.today().isoformat()
    alerts: list[AlertItem] = []

    # 1) 今日待确认课程
    try:
        pending = sb.table("courses").select("id, date, teacher_id, teachers(name)")\
            .eq("status", "pending").lte("date", today).execute()
        if pending.data:
            alerts.append(AlertItem(
                id="alert-pending-courses",
                type="course_pending",
                title="今日待确认课程",
                description=f"有 {len(pending.data)} 节课程需确认完成",
                severity="high",
                action_path="/courses",
            ))
    except Exception:
        pass

    # 2) 待补反馈
    try:
        completed = sb.table("courses").select("id").eq("status", "completed").execute()
        completed_ids = [r["id"] for r in completed.data]
        if completed_ids:
            fbs = sb.table("feedbacks").select("course_id").in_("course_id", completed_ids).execute()
            fb_ids = set(r["course_id"] for r in fbs.data)
            missing = len(completed_ids) - len(fb_ids)
            if missing > 0:
                alerts.append(AlertItem(
                    id="alert-missing-feedback",
                    type="feedback_missing",
                    title="待补反馈",
                    description=f"有 {missing} 节已完成课程未填写反馈",
                    severity="medium",
                    action_path="/courses",
                ))
    except Exception:
        pass

    # 3) 低课时预警
    try:
        low = sb.table("children").select("id, name, remaining_hours")\
            .lte("remaining_hours", 5).gt("remaining_hours", 0).execute()
        if low.data:
            names = ", ".join(r["name"] for r in low.data[:3])
            suffix = f"等 {len(low.data)} 名" if len(low.data) > 3 else ""
            alerts.append(AlertItem(
                id="alert-low-hours",
                type="low_hours",
                title="低课时预警学员",
                description=f"{names}{suffix} 剩余课时不足 5h",
                severity="medium",
                action_path="/students",
            ))
    except Exception:
        pass

    # 4) 待结算教师
    try:
        ps = sb.table("settlements").select("id, teacher_id, teachers(name)")\
            .eq("status", "pending").execute()
        if ps.data:
            teacher_names = list(set(
                r["teachers"]["name"] if isinstance(r.get("teachers"), dict) else "未知"
                for r in ps.data if r.get("teachers")
            ))
            desc = "、".join(teacher_names[:3])
            suffix = f" 等 {len(teacher_names)} 位" if len(teacher_names) > 3 else ""
            alerts.append(AlertItem(
                id="alert-settlement-pending",
                type="settlement_pending",
                title="待结算教师",
                description=f"{desc}{suffix} 有待结算记录",
                severity="low",
                action_path="/finance/settlements",
            ))
    except Exception:
        pass

    return alerts
