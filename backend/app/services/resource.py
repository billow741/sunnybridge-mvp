"""Resource module service — business logic for resource CRUD + upload/download.

Storage migration (2026-06):
- Old: Supabase Storage (pdfs bucket), signed URLs
- New: Local VPS disk (/data/sb-files/), X-Accel-Redirect via Nginx
- DB field pdf_url stores logical path: "resources/{category}/{resource_id}.pdf"
- Frontend downloads via: GET /api/v1/resources/{id}/download
"""

import structlog
from datetime import datetime, timezone
from uuid import UUID, uuid4

import fitz  # PyMuPDF
from fastapi import HTTPException, UploadFile, status
from fastapi.responses import Response

from app.core.config import get_settings
from app.core.database import get_supabase
from app.core.storage import (
    get_storage,
    resource_pdf_path,
    validate_file_size,
    validate_content_type,
    X_ACCEL_PREFIX,
)
from app.schemas.resource import (
    PaginatedResources,
    ResourceCreate,
    ResourceDetail,
    ResourceOut,
    ResourceUpdate,
    UploadPdfOut,
)

logger = structlog.get_logger()
settings = get_settings()

DEFAULT_PAGE = 1
DEFAULT_PAGE_SIZE = 20


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _extract_page_count(file_bytes: bytes) -> int:
    """Extract page count from PDF bytes using PyMuPDF."""
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    count = doc.page_count
    doc.close()
    return count


# ---------------------------------------------------------------------------
# Resource CRUD (admin)
# ---------------------------------------------------------------------------

async def create_resource(body: ResourceCreate) -> ResourceOut:
    """Create a resource. Admin only."""
    sb = get_supabase()

    data = {
        "title": body.title,
        "category": body.category,
        "pdf_url": body.pdf_url,
        "sort_order": body.sort_order,
        "is_active": body.is_active,
    }
    result = sb.table("resources").insert(data).execute()
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "CREATE_FAILED", "message": "创建资源失败"},
        )

    logger.info("resource_created", resource_id=result.data[0]["id"])
    return ResourceOut(**result.data[0])


async def update_resource(resource_id: UUID, body: ResourceUpdate) -> ResourceOut:
    """Update a resource. Admin only."""
    sb = get_supabase()

    existing = (
        sb.table("resources")
        .select("*")
        .eq("id", str(resource_id))
        .limit(1)
        .execute()
    )
    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "RESOURCE_NOT_FOUND", "message": "资源不存在"},
        )

    update_data = {}
    if body.title is not None:
        update_data["title"] = body.title
    if body.category is not None:
        update_data["category"] = body.category
    if body.sort_order is not None:
        update_data["sort_order"] = body.sort_order
    if body.is_active is not None:
        update_data["is_active"] = body.is_active

    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        sb.table("resources").update(update_data).eq("id", str(resource_id)).execute()

    updated = (
        sb.table("resources")
        .select("*")
        .eq("id", str(resource_id))
        .limit(1)
        .execute()
    )
    return ResourceOut(**updated.data[0])


async def delete_resource(resource_id: UUID) -> dict:
    """Delete a resource. Admin only."""
    sb = get_supabase()

    existing = (
        sb.table("resources")
        .select("id")
        .eq("id", str(resource_id))
        .limit(1)
        .execute()
    )
    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "RESOURCE_NOT_FOUND", "message": "资源不存在"},
        )

    sb.table("resources").delete().eq("id", str(resource_id)).execute()
    logger.info("resource_deleted", resource_id=str(resource_id))
    return {"message": "资源已删除", "resource_id": str(resource_id)}


# ---------------------------------------------------------------------------
# Resource PDF upload (admin) — local disk storage
# ---------------------------------------------------------------------------

async def upload_resource_pdf(resource_id: UUID, file: UploadFile) -> ResourceDetail:
    """Upload PDF for a resource. Admin only.

    Storage: writes to /data/sb-files/resources/{category}/{resource_id}.pdf
    DB: stores logical path "resources/{category}/{resource_id}.pdf" in pdf_url
    """
    sb = get_supabase()
    storage = get_storage()

    # Verify resource exists
    existing = (
        sb.table("resources")
        .select("*")
        .eq("id", str(resource_id))
        .limit(1)
        .execute()
    )
    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "RESOURCE_NOT_FOUND", "message": "资源不存在"},
        )

    resource = existing.data[0]

    # Validate content type
    validate_content_type(file.content_type, allowed=("application/pdf",))

    # Read file bytes
    file_bytes = await file.read()

    # Validate file size
    validate_file_size(file_bytes, limit_key="resource_pdf")

    # Generate logical path and save
    logical_path = resource_pdf_path(resource["category"], str(resource_id))
    await storage.save(logical_path, file_bytes, content_type="application/pdf")

    # Update resource record
    update_data = {
        "pdf_url": logical_path,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    sb.table("resources").update(update_data).eq("id", str(resource_id)).execute()

    logger.info(
        "resource_pdf_uploaded",
        resource_id=str(resource_id),
        storage_path=logical_path,
    )

    # Fetch updated record
    updated = (
        sb.table("resources")
        .select("*")
        .eq("id", str(resource_id))
        .limit(1)
        .execute()
    )
    return ResourceDetail(**updated.data[0], signed_pdf_url=None)


# ---------------------------------------------------------------------------
# Resource PDF download (parent + teacher + admin) — X-Accel-Redirect
# ---------------------------------------------------------------------------

async def download_resource_pdf(resource_id: UUID) -> Response:
    """Return Nginx X-Accel-Redirect response for resource PDF download.

    Nginx config must have:
      location /internal-files/ {
          internal;
          alias /data/sb-files/;
      }
    """
    sb = get_supabase()

    result = (
        sb.table("resources")
        .select("*")
        .eq("id", str(resource_id))
        .limit(1)
        .execute()
    )
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "RESOURCE_NOT_FOUND", "message": "资源不存在"},
        )

    row = result.data[0]

    pdf_url = row.get("pdf_url", "")
    if not pdf_url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "FILE_NOT_FOUND", "message": "该资源尚未上传PDF"},
        )

    # Build X-Accel-Redirect header
    internal_path = f"{X_ACCEL_PREFIX}/{pdf_url}"

    filename = f"{row['title']}.pdf"

    return Response(
        status_code=200,
        headers={
            "X-Accel-Redirect": internal_path,
            "Content-Type": "application/pdf",
            "Content-Disposition": f'inline; filename="{filename}"',
        },
    )


# ---------------------------------------------------------------------------
# Resource browsing (parent + teacher)
# ---------------------------------------------------------------------------

async def list_resources(
    category: str | None = None,
    page: int = DEFAULT_PAGE,
    page_size: int = DEFAULT_PAGE_SIZE,
    is_active: bool | None = True,
) -> PaginatedResources:
    """List resources with optional category filter."""
    sb = get_supabase()

    query = sb.table("resources").select("*", count="exact")
    if is_active is not None:
        query = query.eq("is_active", is_active)
    if category:
        query = query.eq("category", category)

    count_result = query.execute()
    total = count_result.count if count_result.count is not None else len(count_result.data)

    offset = (page - 1) * page_size
    page_query = sb.table("resources").select("*")
    if is_active is not None:
        page_query = page_query.eq("is_active", is_active)
    page_query = (
        page_query
        .order("category")
        .order("sort_order")
        .range(offset, offset + page_size - 1)
    )
    if category:
        page_query = page_query.eq("category", category)

    result = page_query.execute()
    items = [ResourceOut(**row) for row in result.data]

    return PaginatedResources(items=items, total=total, page=page, page_size=page_size)


async def get_resource_detail(resource_id: UUID, role: str = "parent") -> ResourceDetail:
    """Get resource detail. Parent/Teacher get download URL; Admin gets raw path."""
    sb = get_supabase()

    result = (
        sb.table("resources")
        .select("*")
        .eq("id", str(resource_id))
        .limit(1)
        .execute()
    )
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "RESOURCE_NOT_FOUND", "message": "资源不存在"},
        )

    row = result.data[0]

    if role != "admin" and not row.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "RESOURCE_NOT_FOUND", "message": "资源不存在"},
        )

    # For parent/teacher: generate download URL
    signed_pdf_url = None
    pdf_url = row.get("pdf_url", "")
    if pdf_url and role != "admin":
        signed_pdf_url = f"/api/v1/resources/{resource_id}/download"

    return ResourceDetail(**row, signed_pdf_url=signed_pdf_url)


# ---------------------------------------------------------------------------
# Generic PDF upload (admin) — local disk storage
# ---------------------------------------------------------------------------

async def upload_pdf_general(file: UploadFile) -> UploadPdfOut:
    """Generic PDF upload — returns logical path for later binding.

    Per TECH-SPEC 5.8: POST /upload/pdf → returns storage path.
    Used by admin frontend: upload first, then bind path when creating resource.
    """
    storage = get_storage()

    # Validate content type
    validate_content_type(file.content_type, allowed=("application/pdf",))

    # Read file bytes
    file_bytes = await file.read()

    # Validate file size
    validate_file_size(file_bytes, limit_key="generic_pdf")

    # Generate a temporary storage path using UUID
    temp_id = str(uuid4())
    logical_path = f"uploads/{temp_id}.pdf"

    # Save to local disk
    await storage.save(logical_path, file_bytes, content_type="application/pdf")

    logger.info("generic_pdf_uploaded", storage_path=logical_path)

    return UploadPdfOut(
        storage_path=logical_path,
        url=logical_path,
    )
