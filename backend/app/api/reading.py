"""Reading module router — material CRUD + upload + download + progress.

Per TECH-SPEC 5.6 + storage migration:
- GET    /api/v1/reading/materials — list (parent, teacher, admin)
- GET    /api/v1/reading/materials/{id} — detail (parent, teacher, admin)
- POST   /api/v1/reading/materials — create (admin)
- PUT    /api/v1/reading/materials/{id} — update (admin)
- DELETE /api/v1/reading/materials/{id} — delete (admin)
- POST   /api/v1/reading/materials/{id}/upload — upload PDF (admin)
- GET    /api/v1/reading/materials/{id}/download — download PDF via X-Accel-Redirect
- POST   /api/v1/reading/materials/{id}/cover — upload cover image (admin)
- GET    /api/v1/reading/progress — progress list (parent)
- PUT    /api/v1/reading/progress/{material_id} — update progress (parent)
"""

from uuid import UUID

from fastapi import APIRouter, Depends, Query, UploadFile, File
from fastapi.responses import Response

from app.core.deps import get_current_user, require_role
from app.schemas.auth import CurrentUser
from app.schemas.reading import (
    CategoryItem,
    MaterialCreate,
    MaterialDetail,
    MaterialOut,
    MaterialUpdate,
    PaginatedMaterials,
    ProgressOut,
    ProgressUpdate,
)
from app.services.reading import (
    create_material,
    delete_material,
    download_material_pdf,
    get_material_detail,
    get_progress_list,
    list_materials,
    update_material,
    update_progress,
    upload_cover,
    upload_pdf,
)
from app.schemas.reading import CATEGORY_LABELS

router = APIRouter(prefix="/api/v1/reading", tags=["reading"])


# ---------------------------------------------------------------------------
# Category enum — all roles
# ---------------------------------------------------------------------------


@router.get("/categories", response_model=list[CategoryItem])
async def get_categories(
    user: CurrentUser = Depends(get_current_user),
) -> list[CategoryItem]:
    """Return all reading material categories with Chinese labels."""
    return [CategoryItem(value=k, label=v) for k, v in CATEGORY_LABELS.items()]


# ---------------------------------------------------------------------------
# Material browsing (parent + teacher + admin)
# ---------------------------------------------------------------------------


@router.get("/materials", response_model=PaginatedMaterials)
async def list_materials_endpoint(
    level: str | None = Query(None, description="Level filter: L1-L6"),
    category: str | None = Query(None, description="Category filter"),
    is_active: bool | None = Query(None, description="Active filter"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: CurrentUser = Depends(require_role("parent", "teacher", "admin")),
) -> PaginatedMaterials:
    """List reading materials with optional level/category filter."""
    effective_is_active = is_active
    if is_active is None and user.role != "admin":
        effective_is_active = True
    return await list_materials(
        level=level, category=category,
        page=page, page_size=page_size,
        is_active=effective_is_active,
    )


# ---------------------------------------------------------------------------
# Reading Progress (parent)
# ---------------------------------------------------------------------------


@router.get("/progress", response_model=list[ProgressOut])
async def get_progress_endpoint(
    user: CurrentUser = Depends(require_role("parent")),
) -> list[ProgressOut]:
    """Get all reading progress for the current parent's child."""
    return await get_progress_list(user.id)


@router.put("/progress/{material_id}", response_model=ProgressOut)
async def update_progress_endpoint(
    material_id: UUID,
    body: ProgressUpdate,
    user: CurrentUser = Depends(require_role("parent")),
) -> ProgressOut:
    """Update reading progress. Auto-marks completed when reaching last page."""
    return await update_progress(user.id, material_id, body)


# ---------------------------------------------------------------------------
# Material CRUD (admin)
# ---------------------------------------------------------------------------


@router.post("/materials", response_model=MaterialOut, status_code=201)
async def create_material_endpoint(
    body: MaterialCreate,
    user: CurrentUser = Depends(require_role("admin")),
) -> MaterialOut:
    """Create a reading material. Admin only."""
    return await create_material(body)


@router.put("/materials/{material_id}", response_model=MaterialOut)
async def update_material_endpoint(
    material_id: UUID,
    body: MaterialUpdate,
    user: CurrentUser = Depends(require_role("admin")),
) -> MaterialOut:
    """Update a reading material. Admin only."""
    return await update_material(material_id, body)


@router.delete("/materials/{material_id}")
async def delete_material_endpoint(
    material_id: UUID,
    user: CurrentUser = Depends(require_role("admin")),
) -> dict:
    """Delete a reading material. Admin only."""
    return await delete_material(material_id)


@router.post("/materials/{material_id}/upload", response_model=MaterialDetail)
async def upload_pdf_endpoint(
    material_id: UUID,
    file: UploadFile = File(..., description="PDF file, max 30MB"),
    user: CurrentUser = Depends(require_role("admin")),
) -> MaterialDetail:
    """Upload PDF for a reading material. Admin only.

    - Validates: application/pdf only, ≤ 30MB
    - Saves to local disk: /data/sb-files/reading/{level}/{material_id}.pdf
    - Extracts page_count via PyMuPDF
    - Updates material record with pdf_url (logical path) + page_count
    """
    return await upload_pdf(material_id, file)


@router.post("/materials/{material_id}/cover", response_model=MaterialOut)
async def upload_cover_endpoint(
    material_id: UUID,
    file: UploadFile = File(..., description="Cover image (webp/jpeg/png), max 2MB"),
    user: CurrentUser = Depends(require_role("admin")),
) -> MaterialOut:
    """Upload cover image for a reading material. Admin only.

    - Accepts: image/webp, image/jpeg, image/png
    - Stores: /data/sb-files/covers/{material_id}.{ext}
    """
    return await upload_cover(material_id, file)


# ---------------------------------------------------------------------------
# Material download (parent + teacher + admin) — X-Accel-Redirect
# ---------------------------------------------------------------------------


@router.get("/materials/{material_id}/download")
async def download_material_endpoint(
    material_id: UUID,
    user: CurrentUser = Depends(require_role("parent", "teacher", "admin")),
) -> Response:
    """Download PDF for a reading material via Nginx X-Accel-Redirect.

    Auth is checked here; Nginx serves the file from disk.
    """
    return await download_material_pdf(material_id)


# ---------------------------------------------------------------------------
# Material detail — MUST be after specific routes like /download, /upload, /cover
# ---------------------------------------------------------------------------


@router.get("/materials/{material_id}", response_model=MaterialDetail)
async def get_material_detail_endpoint(
    material_id: UUID,
    user: CurrentUser = Depends(require_role("parent", "teacher", "admin")),
) -> MaterialDetail:
    """Get material detail. signed_pdf_url points to download endpoint."""
    return await get_material_detail(material_id, role=user.role)
