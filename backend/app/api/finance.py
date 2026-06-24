"""财务对账 API — 收款 vs 结算差额汇总（P0-C）。

端点:
- GET /api/v1/finance/reconciliation — 按月汇总收款/结算/差额
"""

import structlog
from datetime import date, timedelta
from fastapi import APIRouter, Depends, Query

from app.core.database import get_supabase
from app.core.deps import require_role
from app.schemas.auth import CurrentUser
from pydantic import BaseModel

logger = structlog.get_logger()
router = APIRouter(prefix="/api/v1/finance", tags=["finance"])


# ── Schemas ──

class MonthRec(BaseModel):
    month: str
    payment_count: int = 0
    payment_total: float = 0
    hours_purchased: int = 0
    settlement_count: int = 0
    settlement_total: float = 0
    settlement_hours: float = 0
    balance: float = 0


class ReconciliationData(BaseModel):
    months: list[MonthRec] = []
    grand_payment: float = 0
    grand_settlement: float = 0
    grand_balance: float = 0


# ── Reconciliation ──

@router.get("/reconciliation", response_model=ReconciliationData)
async def get_reconciliation(
    months: int = Query(6, ge=1, le=24, description="回看月数"),
    user: CurrentUser = Depends(require_role("admin")),
) -> ReconciliationData:
    """按月汇总：收款(payments) vs 结算(settlements), 计算差额。

    口径:
    - payment_total: SUM(amount) FROM payments WHERE payment_date IN month
    - hours_purchased: SUM(hours_purchased) FROM payments WHERE payment_date IN month
    - settlement_total: SUM(amount) FROM settlements WHERE period_end IN month
    - settlement_hours: SUM(hours) FROM settlements WHERE period_end IN month
    - balance = payment_total - settlement_total
    """
    sb = get_supabase()
    today = date.today()

    result_months: list[MonthRec] = []
    grand_p = 0.0
    grand_s = 0.0
    grand_h = 0
    grand_sh = 0.0

    for i in range(months - 1, -1, -1):
        # 计算该月范围
        first_of_month = (today.replace(day=1) - timedelta(days=1)).replace(day=1) if i > 0 else today.replace(day=1)
        if i > 0:
            # 往前推 i 个月
            target = today - timedelta(days=30 * i)
            first_of_month = target.replace(day=1)
        month_label = first_of_month.strftime("%Y-%m")
        month_start = first_of_month.isoformat()
        # 下月1号
        if first_of_month.month == 12:
            next_first = first_of_month.replace(year=first_of_month.year + 1, month=1)
        else:
            next_first = first_of_month.replace(month=first_of_month.month + 1)
        month_end = (next_first - timedelta(days=1)).isoformat()
        next_month_start = next_first.isoformat()

        # 收款汇总（用 Supabase ORM 替代 exec_sql）
        p_total = 0.0
        p_count = 0
        hp = 0
        try:
            pay_result = (
                sb.table("payments")
                .select("amount, hours_purchased")
                .gte("payment_date", month_start)
                .lt("payment_date", next_month_start)
                .execute()
            )
            rows = pay_result.data or []
            p_count = len(rows)
            for r in rows:
                p_total += float(r.get("amount") or 0)
                hp += int(float(r.get("hours_purchased") or 0))
        except Exception as e:
            logger.warning("reconciliation_payment_fail", month=month_label, error=str(e))

        # 结算汇总（用 Supabase ORM 替代 exec_sql）
        s_total = 0.0
        s_count = 0
        sh = 0.0
        try:
            set_result = (
                sb.table("settlements")
                .select("amount, hours")
                .gte("period_end", month_start)
                .lt("period_end", next_month_start)
                .execute()
            )
            rows = set_result.data or []
            s_count = len(rows)
            for r in rows:
                s_total += float(r.get("amount") or 0)
                sh += float(r.get("hours") or 0)
        except Exception as e:
            logger.warning("reconciliation_settlement_fail", month=month_label, error=str(e))

        balance = p_total - s_total
        rec = MonthRec(
            month=month_label,
            payment_count=p_count,
            payment_total=round(p_total, 2),
            hours_purchased=hp,
            settlement_count=s_count,
            settlement_total=round(s_total, 2),
            settlement_hours=round(sh, 2),
            balance=round(balance, 2),
        )
        result_months.append(rec)
        grand_p += p_total
        grand_s += s_total
        grand_h += hp
        grand_sh += sh

    return ReconciliationData(
        months=result_months,
        grand_payment=round(grand_p, 2),
        grand_settlement=round(grand_s, 2),
        grand_balance=round(grand_p - grand_s, 2),
    )
