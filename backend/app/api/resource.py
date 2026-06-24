"""Resource module router — resource CRUD + upload + download.

Per TECH-SPEC 5.7 / 5.8 + storage migration:
- GET    /api/v1/resources — list (parent, teacher, admin)
- GET    /api/v1/resources/{id} — detail (parent, teacher, admin)
- POST   /api/v1/resources — create (admin)
- PUT    /api/v1/resources/{id} — update (admin)
- DELETE /api/v1/resources/{id} — delete (admin)
- POST   /api/v1/resources/{id}/upload — upload PDF (admin)
- GET    /api/v1/resources/{id}/download — download PDF via X-Accel-Redirect
- POST   /api/v1/upload/pdf — generic PDF upload → returns storage path (admin)
"""

from uuid import UUID

from fastapi import APIRouter, Depends, Query, UploadFile, File
from fastapi.responses import Response

from app.core.deps import require_role, require_permission
from app.schemas.auth import CurrentUser
from app.schemas.resource import (
    PaginatedResources,
    ResourceCreate,
    ResourceDetail,
    ResourceOut,
    ResourceUpdate,
    UploadPdfOut,
)
from app.services.resource import (
    create_resource,
    delete_resource,
    download_resource_pdf,
    get_resource_detail,
    list_resources,
    update_resource,
    upload_pdf_general,
    upload_resource_pdf,
)

router = APIRouter(prefix="/api/v1", tags=["resources"])


# ---------------------------------------------------------------------------
# Resource browsing (parent + teacher + admin)
# ---------------------------------------------------------------------------


@router.get("/resources", response_model=PaginatedResources)
async def list_resources_endpoint(
    category: str | None = Query(None, description="Category filter"),
    is_active: bool | None = Query(None, description="Active filter"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: CurrentUser = Depends(require_role("parent", "teacher", "admin")),
) -> PaginatedResources:
    """List resources with optional category filter."""
    effective_is_active = is_active
    if is_active is None and user.role != "admin":
        effective_is_active = True
    return await list_resources(
        category=category, page=page, page_size=page_size,
        is_active=effective_is_active,
    )


# ---------------------------------------------------------------------------
# Resource CRUD (admin)
# ---------------------------------------------------------------------------


@router.post("/resources", response_model=ResourceOut, status_code=201)
async def create_resource_endpoint(
    body: ResourceCreate,
    user: CurrentUser = Depends(require_permission("resources:write")),
) -> ResourceOut:
    """Create a resource. Admin only."""
    return await create_resource(body)


@router.put("/resources/{resource_id}", response_model=ResourceOut)
async def update_resource_endpoint(
    resource_id: UUID,
    body: ResourceUpdate,
    user: CurrentUser = Depends(require_permission("resources:write")),
) -> ResourceOut:
    """Update a resource. Admin only."""
    return await update_resource(resource_id, body)


@router.delete("/resources/{resource_id}")
async def delete_resource_endpoint(
    resource_id: UUID,
    user: CurrentUser = Depends(require_permission("resources:delete")),
) -> dict:
    """Delete a resource. Admin only."""
    return await delete_resource(resource_id)


@router.post("/resources/{resource_id}/upload", response_model=ResourceDetail)
async def upload_resource_pdf_endpoint(
    resource_id: UUID,
    file: UploadFile = File(..., description="PDF file, max 30MB"),
    user: CurrentUser = Depends(require_permission("resources:write")),
) -> ResourceDetail:
    """Upload PDF for a resource. Admin only.

    - Validates: application/pdf only, ≤ 30MB
    - Saves to local disk: /data/sb-files/resources/{category}/{resource_id}.pdf
    - Updates resource record with pdf_url (logical path)
    """
    return await upload_resource_pdf(resource_id, file)


# ---------------------------------------------------------------------------
# Resource download (parent + teacher + admin) — X-Accel-Redirect
# ---------------------------------------------------------------------------


@router.get("/resources/{resource_id}/download")
async def download_resource_endpoint(
    resource_id: UUID,
    user: CurrentUser = Depends(require_role("parent", "teacher", "admin")),
) -> Response:
    """Download PDF for a resource via Nginx X-Accel-Redirect."""
    return await download_resource_pdf(resource_id)


# ---------------------------------------------------------------------------
# Resource detail — MUST be after specific routes like /download, /upload
# ---------------------------------------------------------------------------


@router.get("/resources/{resource_id}", response_model=ResourceDetail)
async def get_resource_detail_endpoint(
    resource_id: UUID,
    user: CurrentUser = Depends(require_role("parent", "teacher", "admin")),
) -> ResourceDetail:
    """Get resource detail. signed_pdf_url points to download endpoint."""
    return await get_resource_detail(resource_id, role=user.role)


# ---------------------------------------------------------------------------
# Generic PDF upload (admin)
# ---------------------------------------------------------------------------


@router.post("/upload/pdf", response_model=UploadPdfOut)
async def upload_pdf_general_endpoint(
    file: UploadFile = File(..., description="PDF file, max 50MB"),
    user: CurrentUser = Depends(require_permission("resources:write")),
) -> UploadPdfOut:
    """Generic PDF upload — returns logical path for later binding."""
    return await upload_pdf_general(file)
