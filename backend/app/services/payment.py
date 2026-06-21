"""Payment service — CRUD + stats for admin payments."""

import structlog
from datetime import date, datetime
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
    return PaymentOut(
        id=row["id"],
        child_id=row["child_id"],
        child_name=row.get("child_name", ""),
        date=row["date"],
        method=row["method"],
        hours=row["hours"],
        amount=row["amount"],
        note=row.get("note"),
        created_at=row["created_at"],
    )


async def list_payments(
    page: int = DEFAULT_PAGE,
    page_size: int = DEFAULT_PAGE_SIZE,
    month: str | None = None,
) -> PaginatedPayments:
    """List all payments with stats (admin)."""
    sb = get_supabase()

    # ── Stats ──
    all_res = sb.table("payments").select("amount, date").execute()
    total_amount = Decimal("0")
    month_amount = Decimal("0")
    count = len(all_res.data)
    now = date.today()
    this_month_start = date(now.year, now.month, 1)

    for r in all_res.data:
        amt = Decimal(str(r["amount"]))
        total_amount += amt
        d = r["date"] if isinstance(r["date"], date) else date.fromisoformat(str(r["date"]))
        if d >= this_month_start:
            month_amount += amt

    stats = PaymentStats(total_amount=total_amount, month_amount=month_amount, count=count)

    # ── Paginated list ──
    query = sb.table("payments").select("*, children(name)", count="exact").order("date", desc=True)

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
            query = query.gte("date", start).lt("date", end)
        except (ValueError, AttributeError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"code": "INVALID_MONTH", "message": "月份格式应为 YYYY-MM"},
            )

    count_result = query.execute()
    total = count_result.count if count_result.count is not None else 0

    offset = (page - 1) * page_size
    page_query = sb.table("payments").select("*, children(name)").order("date", desc=True).range(offset, offset + page_size - 1)

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
            page_query = page_query.gte("date", start).lt("date", end)
        except (ValueError, AttributeError):
            pass

    result = page_query.execute()

    items = []
    for row in result.data:
        child_name = row.get("children", {}).get("name", "") if isinstance(row.get("children"), dict) else ""
        row["child_name"] = child_name
        items.append(_build_out(row))

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
        "date": body.date.isoformat(),
        "method": body.method,
        "hours": float(body.hours),
        "amount": float(body.amount),
        "note": body.note,
    }).execute()

    # Update child totalhours
    old_hours = Decimal(str(child.data[0].get("totalhours", 0)))
    sb.table("children").update({"totalhours": float(old_hours + body.hours)}).eq("id", str(body.child_id)).execute()

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
    for field in ("date", "method", "hours", "amount", "note"):
        val = getattr(body, field, None)
        if val is not None:
            updates[field] = val.isoformat() if isinstance(val, date) else float(val) if isinstance(val, Decimal) else val

    result = sb.table("payments").update(updates).eq("id", str(payment_id)).execute()
    row = result.data[0]

    # Adjust child totalhours if hours changed
    if "hours" in updates:
        diff = Decimal(str(updates["hours"])) - Decimal(str(old["hours"]))
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
        new_total = max(Decimal("0"), Decimal(str(child.data[0]["totalhours"])) - Decimal(str(old["hours"])))
        sb.table("children").update({"totalhours": float(new_total)}).eq("id", old["child_id"]).execute()

    return {"ok": True}
