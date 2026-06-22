"""Child management router — admin CRUD + parent self-service.

Per TECH-SPEC 5.5:
- GET    /api/v1/children          — List children (admin, paginated)
- POST   /api/v1/children          — Create child (admin, auto-create parent)
- GET    /api/v1/children/{id}     — Get child detail (admin)
- PUT    /api/v1/children/{id}     — Update child (admin)
- DELETE /api/v1/children/{id}     — Delete child (admin)
- GET    /api/v1/children/me       — Parent views own child
"""

from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.core.deps import get_current_user, require_role
from app.schemas.auth import CurrentUser
from app.schemas.child import (
    ChildCreate,
    ChildOut,
    ChildUpdate,
    PaginatedChildren,
)
from app.services.child import (
    create_child,
    delete_child,
    get_child,
    get_my_child,
    list_children,
    update_child,
)

router = APIRouter(prefix="/api/v1/children", tags=["children"])


# ---------------------------------------------------------------------------
# Admin endpoints
# ---------------------------------------------------------------------------


@router.get("", response_model=PaginatedChildren)
async def list_children_endpoint(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=500, description="Items per page"),
    user: CurrentUser = Depends(require_role("admin")),
) -> PaginatedChildren:
    """List all children with pagination. Admin only."""
    return await list_children(page=page, page_size=page_size)


@router.post("", response_model=ChildOut, status_code=201)
async def create_child_endpoint(
    body: ChildCreate,
    user: CurrentUser = Depends(require_role("admin")),
) -> ChildOut:
    """Create a child. Auto-create parent if phone not found. Admin only."""
    return await create_child(body)


@router.get("/me", response_model=ChildOut)
async def get_my_child_endpoint(
    user: CurrentUser = Depends(require_role("parent")),
) -> ChildOut:
    """Parent views their own child. Parent only."""
    return await get_my_child(user.id)


@router.get("/{child_id}", response_model=ChildOut)
async def get_child_endpoint(
    child_id: UUID,
    user: CurrentUser = Depends(require_role("admin")),
) -> ChildOut:
    """Get child detail by ID. Admin only."""
    return await get_child(child_id)


@router.put("/{child_id}", response_model=ChildOut)
async def update_child_endpoint(
    child_id: UUID,
    body: ChildUpdate,
    user: CurrentUser = Depends(require_role("admin")),
) -> ChildOut:
    """Update child fields. Admin only."""
    return await update_child(child_id, body)


@router.delete("/{child_id}")
async def delete_child_endpoint(
    child_id: UUID,
    user: CurrentUser = Depends(require_role("admin")),
) -> dict:
    """Delete a child. Admin only."""
    return await delete_child(child_id)
