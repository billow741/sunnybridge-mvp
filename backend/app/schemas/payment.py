"""Payment schemas for admin payments CRUD.

适配 payments 表结构 (2026-06 新增 type/refund_of):
- type: income(默认) / refund
- refund_of: 退款时关联原收款 ID
- hours_purchased: integer (DB列类型为integer，不能用Decimal避免"2.0"小数语法被PG拒绝)
- payment_method (而非 method)
- notes (而非 note)
- payment_date (可选，真实收款日期; 无则 fallback 到 created_at)
- receipt_number (可选)
- description (可选)
- status: completed / refunded / partial_refund
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class PaymentCreate(BaseModel):
    """Admin creates a payment record."""
    child_id: UUID
    payment_method: str = "cash"
    hours_purchased: int = Field(default=0, ge=0)
    amount: Decimal = Field(..., ge=0)
    payment_date: Optional[date] = None
    receipt_number: Optional[str] = None
    description: Optional[str] = None
    notes: Optional[str] = None


class PaymentUpdate(BaseModel):
    """Admin updates a payment record."""
    payment_method: Optional[str] = None
    hours_purchased: Optional[int] = None
    amount: Optional[Decimal] = None
    payment_date: Optional[date] = None
    receipt_number: Optional[str] = None
    description: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None


class PaymentOut(BaseModel):
    id: UUID
    child_id: UUID | None = None
    child_name: str = ""
    payment_method: str
    hours_purchased: int
    amount: Decimal
    payment_date: Optional[date] = None
    receipt_number: Optional[str] = None
    description: Optional[str] = None
    status: str = "completed"
    notes: Optional[str] = None
    package_id: Optional[UUID] = None
    transaction_ref: Optional[str] = None
    type: str = "income"           # income | refund
    refund_of: Optional[UUID] = None  # 退款时关联原收款 ID
    created_at: datetime
    updated_at: Optional[datetime] = None


class PaymentStats(BaseModel):
    total_amount: Decimal = Decimal("0")
    month_amount: Decimal = Decimal("0")
    count: int = 0


class PaginatedPayments(BaseModel):
    items: list[PaymentOut]
    total: int
    page: int
    page_size: int
    stats: PaymentStats
