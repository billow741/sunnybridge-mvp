"""Reading module router — material CRUD + upload + progress.

Per TECH-SPEC 5.6:
- GET  /api/v1/reading/materials — material list with level/category filter (parent, teacher)
- GET  /api/v1/reading/materials/{id} — material detail with signed PDF URL (parent, teacher)
- POST /api/v1/reading/materials — create material (admin)
- PUT  /api/v1/reading/materials/{id} — update material (admin)
- DELETE /api/v1/reading/materials/{id} — delete material (admin)
- POST /api/v1/reading/materials/{id}/upload — upload PDF (admin)
- GET  /api/v1/reading/progress — reading progress list (parent)
- PUT  /api/v1/reading/progress/{material_id} — update progress (parent)
"""

from uuid import UUID

from fastapi import APIRouter, Depends, Query, UploadFile, File

from app.core.deps import get_current_user, require_role
from app.schemas.auth import CurrentUser
from app.schemas.reading import (
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
    get_material_detail,
    get_progress_list,
    list_materials,
    update_material,
    update_progress,
    upload_pdf,
)

router = APIRouter(prefix="/api/v1/reading", tags=["reading"])


# ---------------------------------------------------------------------------
# Material browsing (parent + teacher) — MUST be before /{material_id}
# ---------------------------------------------------------------------------


@router.get("/materials", response_model=PaginatedMaterials)
async def list_materials_endpoint(
    level: str | None = Query(None, description="Level filter: L1-L6"),
    category: str | None = Query(None, description="Category filter: picture_book/short_text/story/read_aloud"),
    is_active: bool | None = Query(None, description="Active filter: true=active only, false=inactive only, None=all. Default: true for parent/teacher, all for admin"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: CurrentUser = Depends(require_role("parent", "teacher", "admin")),
) -> PaginatedMaterials:
    """List reading materials with optional level/category filter.

    Parent/Teacher: only is_active=true materials (default).
    Admin: can pass is_active=false to see inactive, or omit to see all.
    """
    # Default: parent/teacher see active only; admin sees all if not specified
    effective_is_active = is_active
    if is_active is None and user.role != "admin":
        effective_is_active = True
    return await list_materials(level=level, category=category, page=page, page_size=page_size, is_active=effective_is_active)


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
    """Update reading progress for a material.

    Upsert: creates new progress or updates existing.
    Auto-marks completed=true when current_page reaches page_count.
    """
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
    file: UploadFile = File(..., description="PDF file, max 50MB"),
    user: CurrentUser = Depends(require_role("admin")),
) -> MaterialDetail:
    """Upload PDF for a reading material. Admin only.

    - Validates: application/pdf only, ≤ 50MB
    - Uploads to Supabase Storage: reading/{level}/{material_id}.pdf
    - Extracts page_count via PyMuPDF
    - Updates material record with pdf_url + page_count
    """
    return await upload_pdf(material_id, file)


# ---------------------------------------------------------------------------
# Material detail (parent + teacher) — MUST be after admin CRUD routes
# ---------------------------------------------------------------------------


@router.get("/materials/{material_id}", response_model=MaterialDetail)
async def get_material_detail_endpoint(
    material_id: UUID,
    user: CurrentUser = Depends(require_role("parent", "teacher", "admin")),
) -> MaterialDetail:
    """Get material detail with signed PDF URL. Parent/Teacher/Admin.

    Signed URL expires in 1 hour.
    Admin can view inactive materials; parent/teacher only see active.
    """
    return await get_material_detail(material_id, role=user.role)
