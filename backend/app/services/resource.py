"""Resource module service — business logic for resource CRUD + upload.

Per TECH-SPEC 5.7 / 5.8 / 7.1-7.4:
- Resource CRUD (admin)
- PDF upload to Supabase Storage (resources/{category}/{resource_id}.pdf)
- Generic PDF upload (POST /upload/pdf → returns storage path)
- Signed URL generation (1h expiry)
"""

import structlog
from datetime import datetime, timezone
from uuid import UUID

import fitz  # PyMuPDF
from fastapi import HTTPException, UploadFile, status

from app.core.config import get_settings
from app.core.database import get_supabase
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
    """Extract page count from PDF bytes using PyMuPDF.

    Per TECH-SPEC 7.5.
    """
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    count = doc.page_count
    doc.close()
    return count


def _generate_storage_path(category: str, resource_id: str) -> str:
    """Generate Supabase Storage path for a resource PDF.

    Per TECH-SPEC 7.2: resources/{category}/{resource_id}.pdf
    """
    return f"resources/{category}/{resource_id}.pdf"


async def _get_signed_url(storage_path: str, expires_in: int = 3600) -> str:
    """Generate a signed URL for a file in the 'pdfs' bucket.

    Per TECH-SPEC 7.3: signed URL with 1h expiry.
    """
    sb = get_supabase()
    try:
        result = sb.storage.from_("pdfs").create_signed_url(
            storage_path, expires_in
        )
        # supabase-py returns {"signedURL": "..."} or {"signedUrl": "..."}
        signed_url = (
            result.get("signedURL")
            or result.get("signedUrl")
            or result.get("signed_url")
        )
        if not signed_url:
            if isinstance(result, str):
                return result
            logger.error("signed_url_parse_failed", result=result)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={"code": "SIGNED_URL_FAILED", "message": "生成签名URL失败"},
            )
        return signed_url
    except HTTPException:
        raise
    except Exception as e:
        logger.error("signed_url_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "SIGNED_URL_FAILED", "message": "生成签名URL失败"},
        )


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

    # Verify exists
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

    # Build update data (only non-None fields)
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

    # Fetch updated
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


async def upload_resource_pdf(resource_id: UUID, file: UploadFile) -> ResourceDetail:
    """Upload PDF for a resource. Admin only.

    Per TECH-SPEC 7.1 / 7.4:
    - Validate: application/pdf only, ≤ 50MB
    - Upload to Supabase Storage: resources/{category}/{resource_id}.pdf
    - Update resource record with pdf_url
    """
    sb = get_supabase()

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
    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "INVALID_FILE_TYPE", "message": "仅支持 PDF 文件"},
        )

    # Read file bytes
    file_bytes = await file.read()

    # Validate file size (50MB)
    max_size = 50 * 1024 * 1024  # 50MB
    if len(file_bytes) > max_size:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "FILE_TOO_LARGE", "message": "PDF 文件大小不能超过 50MB"},
        )

    # Upload to Supabase Storage
    storage_path = _generate_storage_path(resource["category"], str(resource_id))
    try:
        sb.storage.from_("pdfs").upload(
            storage_path,
            file_bytes,
            {"content-type": "application/pdf"},
        )
    except Exception as e:
        # May already exist — try update
        logger.warning("storage_upload_retry", error=str(e))
        try:
            sb.storage.from_("pdfs").update(
                storage_path,
                file_bytes,
                {"content-type": "application/pdf"},
            )
        except Exception as e2:
            logger.error("storage_upload_failed", error=str(e2))
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={"code": "UPLOAD_FAILED", "message": "PDF 上传失败"},
            )

    # Update resource record
    update_data = {
        "pdf_url": storage_path,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    sb.table("resources").update(update_data).eq("id", str(resource_id)).execute()

    logger.info(
        "resource_pdf_uploaded",
        resource_id=str(resource_id),
        storage_path=storage_path,
    )

    # Fetch updated record
    updated = (
        sb.table("resources")
        .select("*")
        .eq("id", str(resource_id))
        .limit(1)
        .execute()
    )
    return ResourceDetail(
        **updated.data[0],
        signed_pdf_url=None,  # admin doesn't need signed URL
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
    """List active resources with optional category filter.

    Per TECH-SPEC 5.7: parent/teacher see only is_active=true.
    Admin can pass is_active=false to see inactive, or None to see all.
    """
    sb = get_supabase()

    query = sb.table("resources").select("*", count="exact")
    if is_active is not None:
        query = query.eq("is_active", is_active)

    if category:
        query = query.eq("category", category)

    # Get total count
    count_result = query.execute()
    total = count_result.count if count_result.count is not None else len(count_result.data)

    # Paginated query
    offset = (page - 1) * page_size
    page_query = (
        sb.table("resources")
        .select("*")
    )
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


async def get_resource_detail(resource_id: UUID) -> ResourceDetail:
    """Get resource detail with signed PDF URL. Parent/Teacher.

    Per TECH-SPEC 7.3: signed URL with 1h expiry.
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

    # Only active resources visible to parent/teacher
    if not row.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "RESOURCE_NOT_FOUND", "message": "资源不存在"},
        )

    # Generate signed URL for the PDF
    signed_url = None
    pdf_url = row.get("pdf_url", "")
    if pdf_url:
        signed_url = await _get_signed_url(pdf_url, expires_in=3600)

    return ResourceDetail(
        **row,
        signed_pdf_url=signed_url,
    )


# ---------------------------------------------------------------------------
# Generic PDF upload (admin)
# ---------------------------------------------------------------------------

async def upload_pdf_general(file: UploadFile) -> UploadPdfOut:
    """Generic PDF upload — returns storage path for later binding.

    Per TECH-SPEC 5.8: POST /upload/pdf → returns storage path.
    Used by admin frontend: upload first, then bind path when creating resource.
    """
    sb = get_supabase()

    # Validate content type
    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "INVALID_FILE_TYPE", "message": "仅支持 PDF 文件"},
        )

    # Read file bytes
    file_bytes = await file.read()

    # Validate file size (50MB)
    max_size = 50 * 1024 * 1024  # 50MB
    if len(file_bytes) > max_size:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "FILE_TOO_LARGE", "message": "PDF 文件大小不能超过 50MB"},
        )

    # Generate a temporary storage path using UUID
    from uuid import uuid4
    temp_id = str(uuid4())
    storage_path = f"uploads/{temp_id}.pdf"

    # Upload to Supabase Storage
    try:
        sb.storage.from_("pdfs").upload(
            storage_path,
            file_bytes,
            {"content-type": "application/pdf"},
        )
    except Exception as e:
        logger.error("generic_upload_failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "UPLOAD_FAILED", "message": "PDF 上传失败"},
        )

    logger.info("generic_pdf_uploaded", storage_path=storage_path)

    return UploadPdfOut(
        storage_path=storage_path,
        url=storage_path,  # path for binding to resource.pdf_url
    )
