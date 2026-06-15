"""Reading module service — business logic for reading materials + progress.

Per TECH-SPEC 5.6 / 6.1 / 7.1:
- Material CRUD (admin)
- PDF upload to Supabase Storage + page_count extraction via PyMuPDF
- Signed URL generation (1h expiry)
- Reading progress: list + upsert (auto-mark completed)
"""

import io
import structlog
from datetime import datetime, timezone
from uuid import UUID

import fitz  # PyMuPDF
from fastapi import HTTPException, UploadFile, status

from app.core.config import get_settings
from app.core.database import get_supabase
from app.schemas.reading import (
    MaterialCreate,
    MaterialDetail,
    MaterialOut,
    MaterialUpdate,
    PaginatedMaterials,
    ProgressOut,
    ProgressUpdate,
)

logger = structlog.get_logger()
settings = get_settings()

DEFAULT_PAGE = 1
DEFAULT_PAGE_SIZE = 20

# Category display names (English enum → Chinese label)
CATEGORY_LABELS = {
    "picture_book": "绘本",
    "short_text": "短文",
    "story": "故事",
    "read_aloud": "跟读",
}


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


def _generate_storage_path(level: str, material_id: str) -> str:
    """Generate Supabase Storage path for a reading material PDF.

    Per TECH-SPEC 7.2: reading/{level}/{material_id}.pdf
    """
    return f"reading/{level}/{material_id}.pdf"


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
        signed_url = result.get("signedURL") or result.get("signedUrl") or result.get("signed_url")
        if not signed_url:
            # Some versions return the URL directly
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
# Material CRUD (admin)
# ---------------------------------------------------------------------------

async def create_material(body: MaterialCreate) -> MaterialOut:
    """Create a reading material. Admin only."""
    sb = get_supabase()

    data = {
        "title": body.title,
        "level": body.level,
        "category": body.category,
        "cover_url": body.cover_url,
        "pdf_url": body.pdf_url,
        "page_count": body.page_count,
        "sort_order": body.sort_order,
        "is_active": body.is_active,
    }
    result = sb.table("reading_materials").insert(data).execute()
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "CREATE_FAILED", "message": "创建阅读材料失败"},
        )

    logger.info("material_created", material_id=result.data[0]["id"])
    return MaterialOut(**result.data[0])


async def update_material(material_id: UUID, body: MaterialUpdate) -> MaterialOut:
    """Update a reading material. Admin only."""
    sb = get_supabase()

    # Verify exists
    existing = sb.table("reading_materials").select("*").eq("id", str(material_id)).limit(1).execute()
    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "MATERIAL_NOT_FOUND", "message": "阅读材料不存在"},
        )

    # Build update data (only non-None fields)
    update_data = {}
    if body.title is not None:
        update_data["title"] = body.title
    if body.level is not None:
        update_data["level"] = body.level
    if body.category is not None:
        update_data["category"] = body.category
    if body.cover_url is not None:
        update_data["cover_url"] = body.cover_url
    if body.sort_order is not None:
        update_data["sort_order"] = body.sort_order
    if body.is_active is not None:
        update_data["is_active"] = body.is_active

    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        sb.table("reading_materials").update(update_data).eq("id", str(material_id)).execute()

    # Fetch updated
    updated = sb.table("reading_materials").select("*").eq("id", str(material_id)).limit(1).execute()
    return MaterialOut(**updated.data[0])


async def delete_material(material_id: UUID) -> dict:
    """Delete a reading material. Admin only."""
    sb = get_supabase()

    existing = sb.table("reading_materials").select("id").eq("id", str(material_id)).limit(1).execute()
    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "MATERIAL_NOT_FOUND", "message": "阅读材料不存在"},
        )

    sb.table("reading_materials").delete().eq("id", str(material_id)).execute()
    logger.info("material_deleted", material_id=str(material_id))
    return {"message": "阅读材料已删除", "material_id": str(material_id)}


async def upload_pdf(material_id: UUID, file: UploadFile) -> MaterialDetail:
    """Upload PDF for a reading material. Admin only.

    Per TECH-SPEC 7.1 / 7.4:
    - Validate: application/pdf only, ≤ 50MB
    - Upload to Supabase Storage: reading/{level}/{material_id}.pdf
    - Extract page_count via PyMuPDF
    - Update material record with pdf_url + page_count
    """
    sb = get_supabase()

    # Verify material exists
    existing = sb.table("reading_materials").select("*").eq("id", str(material_id)).limit(1).execute()
    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "MATERIAL_NOT_FOUND", "message": "阅读材料不存在"},
        )

    material = existing.data[0]

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

    # Extract page count
    try:
        page_count = _extract_page_count(file_bytes)
    except Exception as e:
        logger.error("page_count_extract_failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "PDF_PARSE_ERROR", "message": "无法解析 PDF 页数"},
        )

    # Upload to Supabase Storage
    storage_path = _generate_storage_path(material["level"], str(material_id))
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

    # Update material record
    update_data = {
        "pdf_url": storage_path,
        "page_count": page_count,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    sb.table("reading_materials").update(update_data).eq("id", str(material_id)).execute()

    logger.info(
        "pdf_uploaded",
        material_id=str(material_id),
        storage_path=storage_path,
        page_count=page_count,
    )

    # Fetch updated record
    updated = sb.table("reading_materials").select("*").eq("id", str(material_id)).limit(1).execute()
    return MaterialDetail(
        **updated.data[0],
        signed_pdf_url=None,  # admin doesn't need signed URL
    )


# ---------------------------------------------------------------------------
# Material browsing (parent + teacher)
# ---------------------------------------------------------------------------

async def list_materials(
    level: str | None = None,
    category: str | None = None,
    page: int = DEFAULT_PAGE,
    page_size: int = DEFAULT_PAGE_SIZE,
    is_active: bool | None = True,
) -> PaginatedMaterials:
    """List reading materials with optional level/category filter.

    Per TECH-SPEC 5.6: parent/teacher see only is_active=true.
    Admin can pass is_active=false to see inactive, or None to see all.
    """
    sb = get_supabase()

    query = sb.table("reading_materials").select("*", count="exact")
    if is_active is not None:
        query = query.eq("is_active", is_active)

    if level:
        query = query.eq("level", level)
    if category:
        query = query.eq("category", category)

    # Get total count
    count_result = query.execute()
    total = count_result.count if count_result.count is not None else len(count_result.data)

    # Paginated query
    offset = (page - 1) * page_size
    page_query = (
        sb.table("reading_materials")
        .select("*")
    )
    if is_active is not None:
        page_query = page_query.eq("is_active", is_active)

    page_query = (
        page_query
        .order("level")
        .order("sort_order")
        .range(offset, offset + page_size - 1)
    )
    if level:
        page_query = page_query.eq("level", level)
    if category:
        page_query = page_query.eq("category", category)

    result = page_query.execute()
    items = [MaterialOut(**row) for row in result.data]

    return PaginatedMaterials(items=items, total=total, page=page, page_size=page_size)


async def get_material_detail(material_id: UUID, role: str = "parent") -> MaterialDetail:
    """Get material detail with signed PDF URL. Parent/Teacher/Admin.

    Per TECH-SPEC 7.3: signed URL with 1h expiry.
    Admin can view inactive materials; parent/teacher only see active.
    """
    sb = get_supabase()

    result = sb.table("reading_materials").select("*").eq("id", str(material_id)).limit(1).execute()
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "MATERIAL_NOT_FOUND", "message": "阅读材料不存在"},
        )

    row = result.data[0]

    # Only active materials visible to parent/teacher; admin can see all
    if role != "admin" and not row.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "MATERIAL_NOT_FOUND", "message": "阅读材料不存在"},
        )

    # Generate signed URL for the PDF
    signed_url = None
    pdf_url = row.get("pdf_url", "")
    if pdf_url:
        signed_url = await _get_signed_url(pdf_url, expires_in=3600)

    return MaterialDetail(
        **row,
        signed_pdf_url=signed_url,
    )


# ---------------------------------------------------------------------------
# Reading Progress (parent)
# ---------------------------------------------------------------------------

async def get_progress_list(parent_id: UUID) -> list[ProgressOut]:
    """Get all reading progress for the parent's child.

    Per TECH-SPEC 5.6: parent sees their child's progress only.
    """
    sb = get_supabase()

    # Find parent's child
    child_result = sb.table("children").select("id").eq("parent_id", str(parent_id)).limit(1).execute()
    if not child_result.data:
        return []

    child_id = child_result.data[0]["id"]

    # Get all progress records for this child
    progress_result = (
        sb.table("reading_progress")
        .select("*")
        .eq("child_id", child_id)
        .order("last_read_at", desc=True)
        .execute()
    )

    if not progress_result.data:
        return []

    # Batch-fetch all related materials in one query (fix N+1)
    material_ids = [row["material_id"] for row in progress_result.data]
    mat_result = (
        sb.table("reading_materials")
        .select("id, title, level, category, cover_url, page_count, is_active")
        .in_("id", material_ids)
        .execute()
    )
    mat_map = {str(m["id"]): m for m in mat_result.data}

    # Enrich each progress with material info
    items = []
    for row in progress_result.data:
        mat_info = mat_map.get(str(row["material_id"]), {})

        items.append(ProgressOut(
            id=row["id"],
            material_id=row["material_id"],
            child_id=row["child_id"],
            current_page=row["current_page"],
            completed=row["completed"],
            last_read_at=row["last_read_at"],
            title=mat_info.get("title"),
            level=mat_info.get("level"),
            category=mat_info.get("category"),
            cover_url=mat_info.get("cover_url"),
            page_count=mat_info.get("page_count"),
        ))

    return items


async def update_progress(
    parent_id: UUID,
    material_id: UUID,
    body: ProgressUpdate,
) -> ProgressOut:
    """Upsert reading progress for a material.

    Per TECH-SPEC 5.6:
    - current_page == page_count → auto mark completed=true
    - Upsert on UNIQUE(child_id, material_id)
    """
    sb = get_supabase()

    # Find parent's child
    child_result = sb.table("children").select("id").eq("parent_id", str(parent_id)).limit(1).execute()
    if not child_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "CHILD_NOT_FOUND", "message": "未找到关联的孩子信息"},
        )

    child_id = child_result.data[0]["id"]

    # Verify material exists and is active
    mat = sb.table("reading_materials").select("id, page_count, title, level, category, cover_url, is_active").eq("id", str(material_id)).limit(1).execute()
    if not mat.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "MATERIAL_NOT_FOUND", "message": "阅读材料不存在"},
        )

    material = mat.data[0]

    # Clamp current_page to [1, page_count] and auto-mark completed
    # when current_page == page_count (exact match, prevents skip-to-end cheat)
    page_count = material.get("page_count", 0)
    clamped_page = body.current_page
    if page_count > 0:
        clamped_page = min(body.current_page, page_count)
    completed = (clamped_page == page_count) if page_count > 0 else False

    now = datetime.now(timezone.utc).isoformat()

    upsert_data = {
        "child_id": child_id,
        "material_id": str(material_id),
        "current_page": clamped_page,
        "completed": completed,
        "last_read_at": now,
    }
    result = (
        sb.table("reading_progress")
        .upsert(upsert_data, on_conflict="child_id,material_id")
        .execute()
    )
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "PROGRESS_UPDATE_FAILED", "message": "阅读进度更新失败"},
        )
    progress_id = result.data[0]["id"]

    logger.info(
        "progress_updated",
        child_id=child_id,
        material_id=str(material_id),
        current_page=body.current_page,
        completed=completed,
    )

    return ProgressOut(
    id=progress_id,
    material_id=material_id,
    child_id=UUID(child_id),
    current_page=clamped_page,
    completed=completed,
        last_read_at=datetime.now(timezone.utc),
        title=material.get("title"),
        level=material.get("level"),
        category=material.get("category"),
        cover_url=material.get("cover_url"),
        page_count=material.get("page_count"),
    )
