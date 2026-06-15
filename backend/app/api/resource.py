"""Resource module router — resource CRUD + upload + generic upload.

Per TECH-SPEC 5.7 / 5.8:
- GET  /api/v1/resources — resource list with category filter (parent, teacher)
- GET  /api/v1/resources/{id} — resource detail with signed PDF URL (parent, teacher)
- POST /api/v1/resources — create resource (admin)
- PUT  /api/v1/resources/{id} — update resource (admin)
- DELETE /api/v1/resources/{id} — delete resource (admin)
- POST /api/v1/resources/{id}/upload — upload PDF (admin)
- POST /api/v1/upload/pdf — generic PDF upload → returns storage path (admin)
"""

from uuid import UUID

from fastapi import APIRouter, Depends, Query, UploadFile, File

from app.core.deps import require_role
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
    get_resource_detail,
    list_resources,
    update_resource,
    upload_pdf_general,
    upload_resource_pdf,
)

router = APIRouter(prefix="/api/v1", tags=["resources"])


# ---------------------------------------------------------------------------
# Resource browsing (parent + teacher) — MUST be before /{resource_id}
# ---------------------------------------------------------------------------


@router.get("/resources", response_model=PaginatedResources)
async def list_resources_endpoint(
    category: str | None = Query(
        None, description="Category filter: phonics/word_card/recommended"
    ),
    is_active: bool | None = Query(None, description="Active filter: true=active only, false=inactive only, None=all. Parent/teacher default true; admin can override"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: CurrentUser = Depends(require_role("parent", "teacher", "admin")),
) -> PaginatedResources:
    """List active resources with optional category filter.

    Parent/Teacher: default is_active=true.
    Admin: can pass is_active=false to see inactive, or omit (None) to see all.
    """
    effective_is_active = is_active
    if is_active is None and user.role != "admin":
        effective_is_active = True
    return await list_resources(category=category, page=page, page_size=page_size, is_active=effective_is_active)


# ---------------------------------------------------------------------------
# Resource CRUD (admin)
# ---------------------------------------------------------------------------


@router.post("/resources", response_model=ResourceOut, status_code=201)
async def create_resource_endpoint(
    body: ResourceCreate,
    user: CurrentUser = Depends(require_role("admin")),
) -> ResourceOut:
    """Create a resource. Admin only."""
    return await create_resource(body)


@router.put("/resources/{resource_id}", response_model=ResourceOut)
async def update_resource_endpoint(
    resource_id: UUID,
    body: ResourceUpdate,
    user: CurrentUser = Depends(require_role("admin")),
) -> ResourceOut:
    """Update a resource. Admin only."""
    return await update_resource(resource_id, body)


@router.delete("/resources/{resource_id}")
async def delete_resource_endpoint(
    resource_id: UUID,
    user: CurrentUser = Depends(require_role("admin")),
) -> dict:
    """Delete a resource. Admin only."""
    return await delete_resource(resource_id)


@router.post("/resources/{resource_id}/upload", response_model=ResourceDetail)
async def upload_resource_pdf_endpoint(
    resource_id: UUID,
    file: UploadFile = File(..., description="PDF file, max 50MB"),
    user: CurrentUser = Depends(require_role("admin")),
) -> ResourceDetail:
    """Upload PDF for a resource. Admin only.

    - Validates: application/pdf only, ≤ 50MB
    - Uploads to Supabase Storage: resources/{category}/{resource_id}.pdf
    - Updates resource record with pdf_url
    """
    return await upload_resource_pdf(resource_id, file)


# ---------------------------------------------------------------------------
# Resource detail (parent + teacher) — MUST be after admin CRUD routes
# ---------------------------------------------------------------------------


@router.get("/resources/{resource_id}", response_model=ResourceDetail)
async def get_resource_detail_endpoint(
    resource_id: UUID,
    user: CurrentUser = Depends(require_role("parent", "teacher", "admin")),
) -> ResourceDetail:
    """Get resource detail with signed PDF URL. Parent/Teacher/Admin.

    Signed URL expires in 1 hour.
    """
    return await get_resource_detail(resource_id)


# ---------------------------------------------------------------------------
# Generic PDF upload (admin)
# ---------------------------------------------------------------------------


@router.post("/upload/pdf", response_model=UploadPdfOut)
async def upload_pdf_general_endpoint(
    file: UploadFile = File(..., description="PDF file, max 50MB"),
    user: CurrentUser = Depends(require_role("admin")),
) -> UploadPdfOut:
    """Generic PDF upload — returns storage path for later binding.

    Per TECH-SPEC 5.8: POST /upload/pdf → returns storage path.
    Use this to upload a PDF first, then bind the path when creating a resource.
    """
    return await upload_pdf_general(file)
