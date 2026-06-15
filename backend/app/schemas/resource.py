"""Resource module Pydantic schemas.

Per TECH-SPEC 5.7 / 6.1 / DB-04:
- ResourceCreate / ResourceUpdate: admin CRUD
- ResourceOut / ResourceDetail: list + detail responses
- PaginatedResources: TECH-SPEC 5.9 list response format
- UploadPdfOut: generic PDF upload response
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
        pattern=r"^(phonics|word_card|recommended)$",
        description="自然拼读/单词卡/推荐",
    )
    pdf_url: str = Field(..., min_length=1, description="PDF file URL in Supabase Storage")
    sort_order: int = Field(0, ge=0)
    is_active: bool = True


class ResourceUpdate(BaseModel):
    """Request body for PUT /resources/{id}. All optional."""
    title: str | None = Field(None, min_length=1, max_length=200)
    category: str | None = Field(
        None,
        pattern=r"^(phonics|word_card|recommended)$",
    )
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
    """Resource detail with signed PDF URL."""
    pdf_url: str | None = None  # raw storage path (admin)
    signed_pdf_url: str | None = None  # short-lived signed URL (parent/teacher)


class PaginatedResources(BaseModel):
    """Paginated list response per TECH-SPEC 5.9."""
    items: list[ResourceOut]
    total: int
    page: int
    page_size: int


# ---------------------------------------------------------------------------
# Generic PDF upload — admin
# ---------------------------------------------------------------------------

class UploadPdfOut(BaseModel):
    """Response for POST /upload/pdf — generic PDF upload."""
    storage_path: str = Field(..., description="Supabase Storage path")
    url: str = Field(..., description="Public or storage path for binding")
