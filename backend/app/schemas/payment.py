"""Payment schemas for admin payments CRUD.

适配 payments 表结构 (2026-06 新增 payment_date, receipt_number, description):
- hours_purchased (而非 hours)
- payment_method (而非 method)
- notes (而非 note)
- payment_date (可选，真实收款日期; 无则 fallback 到 created_at)
- receipt_number (可选)
- description (可选)
- status, package_id, transaction_ref, updated_at
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
    hours_purchased: Decimal = Field(default=Decimal("0"), ge=0)
    amount: Decimal = Field(..., ge=0)
    payment_date: Optional[date] = None
    receipt_number: Optional[str] = None
    description: Optional[str] = None
    notes: Optional[str] = None


class PaymentUpdate(BaseModel):
    """Admin updates a payment record."""
    payment_method: Optional[str] = None
    hours_purchased: Optional[Decimal] = None
    amount: Optional[Decimal] = None
    payment_date: Optional[date] = None
    receipt_number: Optional[str] = None
    description: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None


class PaymentOut(BaseModel):
    id: UUID
    child_id: UUID
    child_name: str = ""
    payment_method: str
    hours_purchased: Decimal
    amount: Decimal
    payment_date: Optional[date] = None
    receipt_number: Optional[str] = None
    description: Optional[str] = None
    status: str = "completed"
    notes: Optional[str] = None
    package_id: Optional[UUID] = None
    transaction_ref: Optional[str] = None
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
