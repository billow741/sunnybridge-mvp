"""退款处理 router — POST /api/v1/payments/refund

P2-D: 退款功能
- 在 payments 表中增加 type 列区分 income/refund
- 退款时扣减 child.totalhours + 插入一条 type=refund 的负数/零金额记录
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.deps import CurrentUser, require_role
from app.core.database import get_supabase
from app.schemas.payment import PaymentOut
from pydantic import BaseModel, Field
from decimal import Decimal

router = APIRouter(prefix="/api/v1/payments", tags=["payments"])


class RefundRequest(BaseModel):
    """退款请求体。"""
    payment_id: UUID = Field(..., description="原收款记录 ID")
    refund_amount: Decimal = Field(..., ge=0, description="退款金额")
    refund_hours: int = Field(0, ge=0, description="退课时数（0=不退课时）")
    reason: str | None = Field(None, max_length=500, description="退款原因")


@router.post("/refund", response_model=PaymentOut)
async def refund_payment(
    body: RefundRequest,
    _admin: CurrentUser = Depends(require_role("admin")),
) -> PaymentOut:
    """对原收款记录执行退款：插入一条 type=refund 的负数记录 + 扣减 totalhours。"""
    sb = get_supabase()

    # 1. 查原收款记录
    origin = sb.table("payments").select("*").eq("id", str(body.payment_id)).limit(1).execute()
    if not origin.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail={"code": "PAYMENT_NOT_FOUND", "message": "原收款记录不存在"})

    old = origin.data[0]
    if old.get("type") == "refund":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail={"code": "ALREADY_REFUNDED", "message": "不能对退款项再次退款"})
    if old.get("status") == "refunded":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail={"code": "ALREADY_REFUNDED", "message": "该收款已全额退款"})

    # 2. 插入退款项（type=refund, 金额为负数）
    from datetime import datetime, timezone
    refund_row = {
        "child_id": old["child_id"],
        "payment_method": old.get("payment_method", "cash"),
        "hours_purchased": -int(body.refund_hours),  # 负数表示退课时
        "amount": -float(body.refund_amount),  # 负数表示退金额
        "payment_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "description": f"退款：{body.reason or '原收款 ' + str(old['id'])[:8]}",
        "status": "completed",
        "type": "refund",
        "refund_of": str(body.payment_id),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    ins = sb.table("payments").insert(refund_row).execute()
    if not ins.data:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail={"code": "REFUND_CREATE_FAILED", "message": "退款项创建失败"})

    new_row = ins.data[0]

    # 3. 扣减 child.totalhours
    if body.refund_hours > 0:
        child = sb.table("children").select("id, name, totalhours").eq("id", old["child_id"]).limit(1).execute()
        if child.data:
            old_hours = int(child.data[0].get("totalhours", 0) or 0)
            new_hours = max(0, old_hours - int(body.refund_hours))
            sb.table("children").update({"totalhours": new_hours}).eq("id", old["child_id"]).execute()

            # ── 课时变动日志 ──
            try:
                from app.api.hours_log import record_hours_change
                ch2 = sb.table("children").select("totalhours, usedhours").eq("id", old["child_id"]).limit(1).execute()
                tu = (ch2.data or [{}])[0].get("totalhours") or 0
                uu = (ch2.data or [{}])[0].get("usedhours") or 0
                record_hours_change(
                    child_id=old["child_id"], change_type="refund",
                    delta=-float(body.refund_hours),
                    balance_after=int(tu) - int(uu),
                    ref_id=str(new_row["id"]),
                    note=f"退款退课时 {int(body.refund_hours)}h", created_by=None,
                )
            except Exception:
                pass  # 日志不阻塞主流程

    # 4. 标记原记录（如全额退款则标记 status=refunded）
    refund_total_amount = float(body.refund_amount)
    origin_amount = float(old.get("amount", 0))
    if refund_total_amount >= origin_amount and int(body.refund_hours) >= int(old.get("hours_purchased", 0)):
        sb.table("payments").update({"status": "refunded"}).eq("id", str(body.payment_id)).execute()
    else:
        sb.table("payments").update({"status": "partial_refund"}).eq("id", str(body.payment_id)).execute()

    # 构造 PaymentOut
    child_info = sb.table("children").select("name").eq("id", old["child_id"]).limit(1).execute()
    child_name = child_info.data[0]["name"] if child_info.data else ""

    return PaymentOut(
        id=new_row["id"],
        child_id=new_row["child_id"],
        child_name=child_name,
        payment_method=new_row.get("payment_method", "cash"),
        hours_purchased=new_row.get("hours_purchased", 0),
        amount=Decimal(str(new_row.get("amount", 0))),
        payment_date=new_row.get("payment_date"),
        receipt_number=new_row.get("receipt_number"),
        description=new_row.get("description"),
        status=new_row.get("status", "completed"),
        notes=new_row.get("notes"),
        package_id=new_row.get("package_id"),
        transaction_ref=new_row.get("transaction_ref"),
        created_at=new_row.get("created_at", ""),
        updated_at=new_row.get("updated_at"),
    )
