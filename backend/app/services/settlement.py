"""教师结算 service — 业务逻辑。

核心功能：
- 按 teacher_id + 时间段自动统计课时数（查询 courses 表）
- 创建/查看/付款结算记录
"""

import structlog
from datetime import datetime, timezone
from uuid import UUID

from app.core.database import get_supabase
from app.schemas.settlement import (
    HoursCalcResponse,
    SettlementCreateRequest,
    SettlementListResponse,
    SettlementOut,
    SettlementSummaryOut,
)

logger = structlog.get_logger()


async def calc_hours(teacher_id: UUID, period_start: str, period_end: str) -> HoursCalcResponse:
    """按教师 + 时间段自动统计课时数。

    查询 courses 表：teacher_id 匹配 + date 在 [period_start, period_end] 之间。
    """
    sb = get_supabase()

    result = (
        sb.table("courses")
        .select("id, date, hours, start_time, end_time")
        .eq("teacher_id", str(teacher_id))
        .gte("date", period_start)
        .lte("date", period_end)
        .order("date")
        .execute()
    )

    courses = result.data or []
    total_hours = 0.0
    course_details = []
    for c in courses:
        h = c.get("hours") or 1  # 默认1课时
        total_hours += h
        course_details.append({
            "id": c["id"],
            "date": c["date"],
            "hours": h,
            "start_time": c.get("start_time", ""),
            "end_time": c.get("end_time", ""),
        })

    return HoursCalcResponse(
        teacher_id=teacher_id,
        period_start=period_start,
        period_end=period_end,
        total_hours=total_hours,
        course_count=len(courses),
        courses=course_details,
    )


async def create_settlement(body: SettlementCreateRequest) -> SettlementOut:
    """创建结算记录。"""
    sb = get_supabase()

    # 获取教师名
    t = sb.table("teachers").select("id, name, hourly_rate").eq("id", str(body.teacher_id)).limit(1).execute()
    teacher_name = t.data[0]["name"] if t.data else "未知"

    amount = body.hours * body.hourly_rate

    row = {
        "teacher_id": str(body.teacher_id),
        "teacher_name": teacher_name,
        "period_start": body.period_start,
        "period_end": body.period_end,
        "hours": body.hours,
        "hourly_rate": body.hourly_rate,
        "amount": amount,
        "status": "pending",
        "note": body.note,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    result = sb.table("settlements").insert(row).execute()
    if not result.data:
        raise ValueError("创建结算记录失败")

    created = result.data[0]
    return SettlementOut(
        id=created["id"],
        teacher_id=created["teacher_id"],
        teacher_name=teacher_name,
        period_start=created["period_start"],
        period_end=created["period_end"],
        hours=created["hours"],
        hourly_rate=created["hourly_rate"],
        amount=created["amount"],
        status=created.get("status", "pending"),
        paid_at=created.get("paid_at"),
        note=created.get("note"),
        created_at=created.get("created_at"),
    )


async def list_settlements(
    status: str | None = None,
    teacher_id: str | None = None,
    month: str | None = None,
) -> SettlementListResponse:
    """获取所有结算记录（支持筛选）。"""
    sb = get_supabase()

    query = (
        sb.table("settlements")
        .select("*", count="exact")
    )

    if status:
        query = query.eq("status", status)
    if teacher_id:
        query = query.eq("teacher_id", teacher_id)
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
            query = query.gte("period_start", start).lt("period_start", end)
        except (ValueError, AttributeError):
            pass

    result = query.order("created_at", desc=True).execute()

    items = []
    for row in (result.data or []):
        items.append(SettlementOut(
            id=row["id"],
            teacher_id=row["teacher_id"],
            teacher_name=row.get("teacher_name", ""),
            period_start=row["period_start"],
            period_end=row["period_end"],
            hours=row["hours"],
            hourly_rate=row["hourly_rate"],
            amount=row["amount"],
            status=row.get("status", "pending"),
            paid_at=row.get("paid_at"),
            note=row.get("note"),
            created_at=row.get("created_at"),
        ))

    return SettlementListResponse(
        items=items,
        total=result.count if result.count is not None else len(items),
    )


async def pay_settlement(settlement_id: UUID, payment_method: str = "bank_transfer") -> SettlementOut:
    """标记结算为已付款。"""
    sb = get_supabase()

    now = datetime.now(timezone.utc).isoformat()
    result = (
        sb.table("settlements")
        .update({"status": "paid", "payment_method": payment_method, "paid_at": now})
        .eq("id", str(settlement_id))
        .execute()
    )

    if not result.data:
        raise ValueError("结算记录不存在")

    row = result.data[0]
    return SettlementOut(
        id=row["id"],
        teacher_id=row["teacher_id"],
        teacher_name=row.get("teacher_name", ""),
        period_start=row["period_start"],
        period_end=row["period_end"],
        hours=row["hours"],
        hourly_rate=row["hourly_rate"],
        amount=row["amount"],
        status=row.get("status", "paid"),
        payment_method=row.get("payment_method"),
        paid_at=row.get("paid_at"),
        note=row.get("note"),
        created_at=row.get("created_at"),
    )


async def get_summary() -> SettlementSummaryOut:
    """获取结算汇总（待付款/已付款/总额/教师数）。"""
    sb = get_supabase()
    result = sb.table("settlements").select("status, amount, teacher_id").execute()

    rows = result.data or []
    total_pending = sum(r["amount"] for r in rows if r.get("status") == "pending")
    total_paid = sum(r["amount"] for r in rows if r.get("status") == "paid")
    total_amount = sum(r["amount"] for r in rows)
    teacher_ids = {r["teacher_id"] for r in rows if r.get("teacher_id")}

    return SettlementSummaryOut(
        total_pending=total_pending,
        total_paid=total_paid,
        total_amount=total_amount,
        teacher_count=len(teacher_ids),
    )
