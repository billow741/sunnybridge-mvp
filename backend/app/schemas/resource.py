"""Resource module Pydantic schemas.

Storage migration (2026-06):
- category: opened from hardcoded regex to free string (max 50 chars)
- pdf_url: now stores logical path like "resources/{category}/{id}.pdf"
- UploadPdfOut.storage_path: logical path, not Supabase path
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Resource CRUD — admin
# ---------------------------------------------------------------------------

class ResourceCreate(BaseModel):
    """Request body for POST /resources."""
    title: str = Field(..., min_length=1, max_length=200)
    category: str = Field(
        ...,
        min_length=1,
        max_length=50,
        description="资源分类，如 phonics/word_card/recommended/song/video 等",
    )
    pdf_url: str = Field("", min_length=0, description="逻辑存储路径，如 resources/phonics/xxx.pdf; 上传后自动填充")
    sort_order: int = Field(0, ge=0)
    is_active: bool = True


class ResourceUpdate(BaseModel):
    """Request body for PUT /resources/{id}. All optional."""
    title: str | None = Field(None, min_length=1, max_length=200)
    category: str | None = Field(None, min_length=1, max_length=50)
    sort_order: int | None = Field(None, ge=0)
    is_active: bool | None = None


class ResourceOut(BaseModel):
    """Resource returned in list views."""
    id: UUID
    title: str
    category: str
    pdf_url: str | None = None
    sort_order: int = 0
    is_active: bool = True
    created_at: datetime
    updated_at: datetime


class ResourceDetail(ResourceOut):
    """Resource detail with download URL."""
    pdf_url: str | None = None  # logical storage path (admin sees raw, user sees download)
    signed_pdf_url: str | None = None  # download endpoint path for parent/teacher


class PaginatedResources(BaseModel):
    """Paginated list response."""
    items: list[ResourceOut]
    total: int
    page: int
    page_size: int


# ---------------------------------------------------------------------------
# Generic PDF upload — admin
# ---------------------------------------------------------------------------

class UploadPdfOut(BaseModel):
    """Response for POST /upload/pdf — generic PDF upload."""
    storage_path: str = Field(..., description="逻辑存储路径 (如 uploads/xxx.pdf)")
    url: str = Field(..., description="同 storage_path，绑定到 resource.pdf_url")
