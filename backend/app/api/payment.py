"""Payment management router — admin CRUD for payments.

- GET    /api/v1/payments           — List payments + stats (admin)
- POST   /api/v1/payments           — Create payment (admin)
- PUT    /api/v1/payments/{id}      — Update payment (admin)
- DELETE /api/v1/payments/{id}      — Delete payment (admin)
"""

from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.core.deps import get_current_user, require_role
from app.schemas.auth import CurrentUser
from app.schemas.payment import PaymentCreate, PaymentOut, PaginatedPayments, PaymentUpdate
from app.services.payment import (
    create_payment,
    delete_payment,
    list_payments,
    update_payment,
)

router = APIRouter(prefix="/payments", tags=["payments"])


@router.get("", response_model=PaginatedPayments)
async def list_payments_endpoint(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    month: str | None = Query(None),
    user: CurrentUser = Depends(require_role("admin")),
) -> PaginatedPayments:
    """List all payments with stats. Admin only."""
    return await list_payments(page=page, page_size=page_size, month=month)


@router.post("", response_model=PaymentOut)
async def create_payment_endpoint(
    body: PaymentCreate,
    user: CurrentUser = Depends(require_role("admin")),
) -> PaymentOut:
    """Create a payment + update child hours. Admin only."""
    return await create_payment(body)


@router.put("/{payment_id}", response_model=PaymentOut)
async def update_payment_endpoint(
    payment_id: UUID,
    body: PaymentUpdate,
    user: CurrentUser = Depends(require_role("admin")),
) -> PaymentOut:
    """Update a payment. Admin only."""
    return await update_payment(payment_id, body)


@router.delete("/{payment_id}")
async def delete_payment_endpoint(
    payment_id: UUID,
    user: CurrentUser = Depends(require_role("admin")),
) -> dict:
    """Delete a payment and deduct child hours. Admin only."""
    return await delete_payment(payment_id)
