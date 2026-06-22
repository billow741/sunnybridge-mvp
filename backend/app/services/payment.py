"""Payment service — CRUD + stats for admin payments.

适配现有 payments 表字段: hours_purchased, payment_method, notes, status 等。
"""

import structlog
from datetime import datetime
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status

from app.core.database import get_supabase
from app.schemas.payment import (
    PaginatedPayments,
    PaymentCreate,
    PaymentOut,
    PaymentStats,
    PaymentUpdate,
)

logger = structlog.get_logger()

DEFAULT_PAGE = 1
DEFAULT_PAGE_SIZE = 20


def _build_out(row: dict) -> PaymentOut:
    child_info = row.get("children")
    child_name = ""
    if isinstance(child_info, dict):
        child_name = child_info.get("name", "")
    return PaymentOut(
        id=row["id"],
        child_id=row["child_id"],
        child_name=child_name,
        payment_method=row.get("payment_method", "现金"),
        hours_purchased=row.get("hours_purchased", 0),
        amount=row.get("amount", 0),
        payment_date=row.get("payment_date"),
        receipt_number=row.get("receipt_number"),
        description=row.get("description"),
        status=row.get("status", "completed"),
        notes=row.get("notes"),
        package_id=row.get("package_id"),
        transaction_ref=row.get("transaction_ref"),
        created_at=row["created_at"],
        updated_at=row.get("updated_at"),
    )


async def list_payments(
    page: int = DEFAULT_PAGE,
    page_size: int = DEFAULT_PAGE_SIZE,
    month: str | None = None,
    child_id: str | None = None,
    payment_method: str | None = None,
) -> PaginatedPayments:
    """List all payments with stats (admin)."""
    sb = get_supabase()

    # ── Stats ──
    all_res = sb.table("payments").select("amount, created_at, payment_date, payment_method").execute()
    total_amount = Decimal("0")
    month_amount = Decimal("0")
    count = len(all_res.data)
    now = datetime.now()
    this_month_start = datetime(now.year, now.month, 1)
    method_stats: dict[str, Decimal] = {}

    for r in all_res.data:
        amt = Decimal(str(r["amount"]))
        total_amount += amt
        # 按支付方式汇总
        m = r.get("payment_method") or "other"
        method_stats[m] = method_stats.get(m, Decimal("0")) + amt
        # 月份判断：优先 payment_date，fallback created_at
        date_str = r.get("payment_date") or r.get("created_at") or ""
        if date_str:
            try:
                # payment_date 是 DATE 类型 (YYYY-MM-DD)，created_at 是 TIMESTAMP
                dt_str = str(date_str)
                if len(dt_str) >= 10:
                    dt = datetime.fromisoformat(dt_str[:10])
                    if dt >= this_month_start:
                        month_amount += amt
            except (ValueError, TypeError):
                pass

    stats = PaymentStats(total_amount=total_amount, month_amount=month_amount, count=count)

    # ── Paginated list ──
    query = sb.table("payments").select("*, children(name)", count="exact").order("created_at", desc=True)

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
            query = query.gte("created_at", start).lt("created_at", end)
        except (ValueError, AttributeError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"code": "INVALID_MONTH", "message": "月份格式应为 YYYY-MM"},
            )

    if child_id:
        query = query.eq("child_id", child_id)
    if payment_method:
        query = query.eq("payment_method", payment_method)

    count_result = query.execute()
    total = count_result.count if count_result.count is not None else 0

    offset = (page - 1) * page_size
    page_query = sb.table("payments").select("*, children(name)").order("created_at", desc=True).range(offset, offset + page_size - 1)

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
            page_query = page_query.gte("created_at", start).lt("created_at", end)
        except (ValueError, AttributeError):
            pass

    if child_id:
        page_query = page_query.eq("child_id", child_id)
    if payment_method:
        page_query = page_query.eq("payment_method", payment_method)

    result = page_query.execute()
    items = [_build_out(row) for row in result.data]

    # 把 method_stats 附到 stats 的额外字段（通过 dict hack）
    stats_dict = stats.model_dump()
    stats_dict["method_stats"] = {k: float(v) for k, v in method_stats.items()}

    return PaginatedPayments(items=items, total=total, page=page, page_size=page_size, stats=stats)


async def create_payment(body: PaymentCreate) -> PaymentOut:
    """Create a payment + update child totalhours."""
    sb = get_supabase()

    # Verify child
    child = sb.table("children").select("id, name, totalhours").eq("id", str(body.child_id)).limit(1).execute()
    if not child.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"code": "CHILD_NOT_FOUND", "message": "学生不存在"})

    # Insert payment
    ins = sb.table("payments").insert({
        "child_id": str(body.child_id),
        "payment_method": body.payment_method,
        "hours_purchased": float(body.hours_purchased),
        "amount": float(body.amount),
        "payment_date": str(body.payment_date) if body.payment_date else None,
        "receipt_number": body.receipt_number,
        "description": body.description,
        "notes": body.notes,
        "status": "completed",
    }).execute()

    # Update child totalhours
    old_hours = Decimal(str(child.data[0].get("totalhours", 0)))
    sb.table("children").update({"totalhours": float(old_hours + body.hours_purchased)}).eq("id", str(body.child_id)).execute()

    row = ins.data[0]
    row["child_name"] = child.data[0]["name"]
    return _build_out(row)


async def update_payment(payment_id: UUID, body: PaymentUpdate) -> PaymentOut:
    """Update a payment record (and adjust child hours if hours changed)."""
    sb = get_supabase()

    existing = sb.table("payments").select("*").eq("id", str(payment_id)).limit(1).execute()
    if not existing.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"code": "PAYMENT_NOT_FOUND", "message": "收款记录不存在"})

    old = existing.data[0]
    updates: dict = {}
    field_map = {
        "payment_method": str,
        "hours_purchased": lambda v: float(v),
        "amount": lambda v: float(v),
        "payment_date": lambda v: str(v) if v else None,
        "receipt_number": str,
        "description": str,
        "notes": str,
        "status": str,
    }
    for field, caster in field_map.items():
        val = getattr(body, field, None)
        if val is not None:
            updates[field] = caster(val)

    result = sb.table("payments").update(updates).eq("id", str(payment_id)).execute()
    row = result.data[0]

    # Adjust child totalhours if hours changed
    if "hours_purchased" in updates:
        diff = Decimal(str(updates["hours_purchased"])) - Decimal(str(old["hours_purchased"]))
        child = sb.table("children").select("totalhours").eq("id", old["child_id"]).limit(1).execute()
        if child.data:
            new_total = Decimal(str(child.data[0]["totalhours"])) + diff
            sb.table("children").update({"totalhours": float(new_total)}).eq("id", old["child_id"]).execute()

    # Get child_name
    child = sb.table("children").select("name").eq("id", row["child_id"]).limit(1).execute()
    row["child_name"] = child.data[0]["name"] if child.data else ""
    return _build_out(row)


async def delete_payment(payment_id: UUID) -> dict:
    """Delete a payment and deduct hours from child."""
    sb = get_supabase()

    existing = sb.table("payments").select("*").eq("id", str(payment_id)).limit(1).execute()
    if not existing.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"code": "PAYMENT_NOT_FOUND", "message": "收款记录不存在"})

    old = existing.data[0]
    sb.table("payments").delete().eq("id", str(payment_id)).execute()

    # Deduct child totalhours
    child = sb.table("children").select("totalhours").eq("id", old["child_id"]).limit(1).execute()
    if child.data:
        new_total = max(Decimal("0"), Decimal(str(child.data[0]["totalhours"])) - Decimal(str(old["hours_purchased"])))
        sb.table("children").update({"totalhours": float(new_total)}).eq("id", old["child_id"]).execute()

    return {"ok": True}
