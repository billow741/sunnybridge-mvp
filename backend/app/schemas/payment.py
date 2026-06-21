"""Payment schemas for admin payments CRUD."""

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class PaymentCreate(BaseModel):
    """Admin creates a payment record."""
    child_id: UUID
    date: date
    method: str = "微信"
    hours: Decimal = Field(..., gt=0)
    amount: Decimal = Field(..., ge=0)
    note: str | None = None


class PaymentUpdate(BaseModel):
    """Admin updates a payment record."""
    date: date | None = None
    method: str | None = None
    hours: Decimal | None = None
    amount: Decimal | None = None
    note: str | None = None


class PaymentOut(BaseModel):
    id: UUID
    child_id: UUID
    child_name: str = ""
    date: date
    method: str
    hours: Decimal
    amount: Decimal
    note: str | None
    created_at: datetime


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
