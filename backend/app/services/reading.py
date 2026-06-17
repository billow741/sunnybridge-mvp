"""Reading module service — business logic for reading materials + progress.

Per TECH-SPEC 5.6 / 6.1 / 7.1:
- Material CRUD (admin)
- PDF upload to local disk storage (→ /data/sb-files/) with X-Accel-Redirect
- Cover image upload (webp)
- Reading progress: list + upsert (auto-mark completed)

Storage migration note (2026-06):
- Old: Supabase Storage (pdfs bucket), signed URLs
- New: Local VPS disk (/data/sb-files/), X-Accel-Redirect via Nginx
- DB field pdf_url now stores logical path: "reading/L3/{id}.pdf"
- Frontend downloads via: GET /api/v1/reading/materials/{id}/download
"""

import structlog
from datetime import datetime, timezone
from uuid import UUID

import fitz  # PyMuPDF
from fastapi import HTTPException, UploadFile, status
from fastapi.responses import Response

from app.core.config import get_settings
from app.core.database import get_supabase
from app.core.storage import (
    get_storage,
    reading_pdf_path,
    cover_path,
    validate_file_size,
    validate_content_type,
    SIZE_LIMITS,
    X_ACCEL_PREFIX,
)
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
    """Extract page count from PDF bytes using PyMuPDF."""
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    count = doc.page_count
    doc.close()
    return count


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

    existing = sb.table("reading_materials").select("*").eq("id", str(material_id)).limit(1).execute()
    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "MATERIAL_NOT_FOUND", "message": "阅读材料不存在"},
        )

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

    Storage: writes to /data/sb-files/reading/{level}/{material_id}.pdf
    DB: stores logical path "reading/{level}/{material_id}.pdf" in pdf_url
    """
    sb = get_supabase()
    storage = get_storage()

    # Verify material exists
    existing = sb.table("reading_materials").select("*").eq("id", str(material_id)).limit(1).execute()
    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "MATERIAL_NOT_FOUND", "message": "阅读材料不存在"},
        )

    material = existing.data[0]

    # Validate content type
    validate_content_type(file.content_type, allowed=("application/pdf",))

    # Read file bytes
    file_bytes = await file.read()

    # Validate file size
    validate_file_size(file_bytes, limit_key="reading_pdf")

    # Extract page count
    try:
        page_count = _extract_page_count(file_bytes)
    except Exception as e:
        logger.error("page_count_extract_failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "PDF_PARSE_ERROR", "message": "无法解析 PDF 页数"},
        )

    # Generate logical path and save
    logical_path = reading_pdf_path(material["level"], str(material_id))
    await storage.save(logical_path, file_bytes, content_type="application/pdf")

    # Update material record with logical path + page_count + file_size
    update_data = {
        "pdf_url": logical_path,
        "page_count": page_count,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    sb.table("reading_materials").update(update_data).eq("id", str(material_id)).execute()

    logger.info(
        "pdf_uploaded",
        material_id=str(material_id),
        storage_path=logical_path,
        page_count=page_count,
    )

    # Fetch updated record
    updated = sb.table("reading_materials").select("*").eq("id", str(material_id)).limit(1).execute()
    return MaterialDetail(**updated.data[0], signed_pdf_url=None)


async def upload_cover(material_id: UUID, file: UploadFile) -> MaterialOut:
    """Upload cover image for a reading material. Admin only.

    Accepts: image/webp, image/jpeg, image/png
    Stores as: covers/{material_id}.webp
    DB: stores logical path in cover_url
    """
    sb = get_supabase()
    storage = get_storage()

    # Verify material exists
    existing = sb.table("reading_materials").select("id").eq("id", str(material_id)).limit(1).execute()
    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "MATERIAL_NOT_FOUND", "message": "阅读材料不存在"},
        )

    # Validate content type
    validate_content_type(
        file.content_type,
        allowed=("image/webp", "image/jpeg", "image/png"),
    )

    # Read and validate size
    file_bytes = await file.read()
    validate_file_size(file_bytes, limit_key="cover_image")

    # Determine extension
    ext_map = {"image/webp": "webp", "image/jpeg": "jpg", "image/png": "png"}
    ext = ext_map.get(file.content_type, "webp")

    # Save to storage
    logical_path = cover_path(str(material_id), ext=ext)
    await storage.save(logical_path, file_bytes, content_type=file.content_type)

    # Update material record
    update_data = {
        "cover_url": logical_path,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    sb.table("reading_materials").update(update_data).eq("id", str(material_id)).execute()

    logger.info("cover_uploaded", material_id=str(material_id), path=logical_path)

    updated = sb.table("reading_materials").select("*").eq("id", str(material_id)).limit(1).execute()
    return MaterialOut(**updated.data[0])


# ---------------------------------------------------------------------------
# Material download (parent + teacher + admin) — X-Accel-Redirect
# ---------------------------------------------------------------------------

async def download_material_pdf(material_id: UUID) -> Response:
    """Return Nginx X-Accel-Redirect response for PDF download.

    Nginx config must have:
      location /internal-files/ {
          internal;
          alias /data/sb-files/;
      }
    """
    sb = get_supabase()

    result = sb.table("reading_materials").select("*").eq("id", str(material_id)).limit(1).execute()
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "MATERIAL_NOT_FOUND", "message": "阅读材料不存在"},
        )

    row = result.data[0]

    # Only active materials for non-admin (check handled by router if needed)
    pdf_url = row.get("pdf_url", "")
    if not pdf_url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "FILE_NOT_FOUND", "message": "该材料尚未上传PDF"},
        )

    # Build X-Accel-Redirect header
    # pdf_url is like "reading/L3/xxx.pdf"
    # Nginx internal path: /internal-files/reading/L3/xxx.pdf
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
# Material browsing (parent + teacher)
# ---------------------------------------------------------------------------

async def list_materials(
    level: str | None = None,
    category: str | None = None,
    page: int = DEFAULT_PAGE,
    page_size: int = DEFAULT_PAGE_SIZE,
    is_active: bool | None = True,
) -> PaginatedMaterials:
    """List reading materials with optional level/category filter."""
    sb = get_supabase()

    query = sb.table("reading_materials").select("*", count="exact")
    if is_active is not None:
        query = query.eq("is_active", is_active)

    if level:
        query = query.eq("level", level)
    if category:
        query = query.eq("category", category)

    count_result = query.execute()
    total = count_result.count if count_result.count is not None else len(count_result.data)

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
    """Get material detail. Parent/Teacher get download URL; Admin gets raw path."""
    sb = get_supabase()

    result = sb.table("reading_materials").select("*").eq("id", str(material_id)).limit(1).execute()
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "MATERIAL_NOT_FOUND", "message": "阅读材料不存在"},
        )

    row = result.data[0]

    if role != "admin" and not row.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "MATERIAL_NOT_FOUND", "message": "阅读材料不存在"},
        )

    # For parent/teacher: generate download URL
    # For admin: return raw logical path
    pdf_url = row.get("pdf_url", "")
    signed_pdf_url = None

    if pdf_url and role != "admin":
        # Frontend should use: GET /api/v1/reading/materials/{id}/download
        # We return the path here for backward compat; frontend will be
        # updated to use the dedicated download endpoint.
        signed_pdf_url = f"/api/v1/reading/materials/{material_id}/download"

    return MaterialDetail(**row, signed_pdf_url=signed_pdf_url)


# ---------------------------------------------------------------------------
# Reading Progress (parent)
# ---------------------------------------------------------------------------

async def get_progress_list(parent_id: UUID) -> list[ProgressOut]:
    """Get all reading progress for the parent's child."""
    sb = get_supabase()

    child_result = sb.table("children").select("id").eq("parent_id", str(parent_id)).limit(1).execute()
    if not child_result.data:
        return []

    child_id = child_result.data[0]["id"]

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
    """Upsert reading progress for a material."""
    sb = get_supabase()

    child_result = sb.table("children").select("id").eq("parent_id", str(parent_id)).limit(1).execute()
    if not child_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "CHILD_NOT_FOUND", "message": "未找到关联的孩子信息"},
        )

    child_id = child_result.data[0]["id"]

    mat = sb.table("reading_materials").select("id, page_count, title, level, category, cover_url, is_active").eq("id", str(material_id)).limit(1).execute()
    if not mat.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "MATERIAL_NOT_FOUND", "message": "阅读材料不存在"},
        )

    material = mat.data[0]

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

    logger.info(
        "progress_updated",
        child_id=child_id,
        material_id=str(material_id),
        current_page=body.current_page,
        completed=completed,
    )

    # Return enriched progress
    return ProgressOut(
        id=result.data[0]["id"],
        material_id=result.data[0]["material_id"],
        child_id=result.data[0]["child_id"],
        current_page=result.data[0]["current_page"],
        completed=result.data[0]["completed"],
        last_read_at=result.data[0]["last_read_at"],
        title=material.get("title"),
        level=material.get("level"),
        category=material.get("category"),
        cover_url=material.get("cover_url"),
        page_count=material.get("page_count"),
    )
