"""Reading module Pydantic schemas.

Per TECH-SPEC 5.6 / 6.1 / DB-04:
- MaterialCreate / MaterialUpdate: admin CRUD
- MaterialOut / MaterialDetail: list + detail responses
- ProgressOut / ProgressUpdate: parent reading progress
- PaginatedMaterials: TECH-SPEC 5.9 list response format
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Reading Materials — admin CRUD
# ---------------------------------------------------------------------------

class MaterialCreate(BaseModel):
    """Request body for POST /reading/materials."""
    title: str = Field(..., min_length=1, max_length=200)
    level: str = Field(..., pattern=r"^L[1-6]$", description="L1-L6")
    category: str = Field(
        ...,
        pattern=r"^(picture_book|short_text|story|read_aloud)$",
        description="绘本/短文/故事/跟读",
    )
    cover_url: str | None = None
    pdf_url: str = Field(..., min_length=1, description="PDF file URL in Supabase Storage")
    page_count: int = Field(0, ge=0)
    sort_order: int = Field(0, ge=0)
    is_active: bool = True


class MaterialUpdate(BaseModel):
    """Request body for PUT /reading/materials/{id}. All optional."""
    title: str | None = Field(None, min_length=1, max_length=200)
    level: str | None = Field(None, pattern=r"^L[1-6]$")
    category: str | None = Field(
        None,
        pattern=r"^(picture_book|short_text|story|read_aloud)$",
    )
    cover_url: str | None = None
    sort_order: int | None = Field(None, ge=0)
    is_active: bool | None = None


class MaterialOut(BaseModel):
    """Reading material returned in list views."""
    id: UUID
    title: str
    level: str
    category: str
    cover_url: str | None = None
    pdf_url: str | None = None
    page_count: int = 0
    sort_order: int = 0
    is_active: bool = True
    created_at: datetime
    updated_at: datetime


class MaterialDetail(MaterialOut):
    """Reading material detail with signed PDF URL."""
    pdf_url: str | None = None  # signed URL for parent/teacher, raw path for admin
    signed_pdf_url: str | None = None  # short-lived signed URL


class PaginatedMaterials(BaseModel):
    """Paginated list response per TECH-SPEC 5.9."""
    items: list[MaterialOut]
    total: int
    page: int
    page_size: int


# ---------------------------------------------------------------------------
# Reading Progress — parent
# ---------------------------------------------------------------------------

class ProgressOut(BaseModel):
    """Reading progress record for a child + material."""
    id: UUID
    material_id: UUID
    child_id: UUID
    current_page: int = 1
    completed: bool = False
    last_read_at: datetime

    # Enriched material info for display
    title: str | None = None
    level: str | None = None
    category: str | None = None
    cover_url: str | None = None
    page_count: int | None = None


class ProgressUpdate(BaseModel):
    """Request body for PUT /reading/progress/{material_id}."""
    current_page: int = Field(..., ge=1, description="Current page number")
