"""Payment schemas for admin payments CRUD.

适配现有 payments 表结构:
- hours_purchased (而非 hours)
- payment_method (而非 method)
- notes (而非 note)
- status, package_id, transaction_ref, updated_at
- 无独立 date 字段，用 created_at
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class PaymentCreate(BaseModel):
    """Admin creates a payment record."""
    child_id: UUID
    payment_method: str = "现金"
    hours_purchased: Decimal = Field(..., gt=0)
    amount: Decimal = Field(..., ge=0)
    notes: Optional[str] = None


class PaymentUpdate(BaseModel):
    """Admin updates a payment record."""
    payment_method: Optional[str] = None
    hours_purchased: Optional[Decimal] = None
    amount: Optional[Decimal] = None
    notes: Optional[str] = None
    status: Optional[str] = None


class PaymentOut(BaseModel):
    id: UUID
    child_id: UUID
    child_name: str = ""
    payment_method: str
    hours_purchased: Decimal
    amount: Decimal
    status: str = "completed"
    notes: Optional[str]
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
