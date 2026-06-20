"""Child (student) related Pydantic schemas.

Per TECH-SPEC 5.5 / DB-02 children table:
- ChildCreate: name + parent_phone (required), english_name/birth_date/level (optional)
- ChildUpdate: all fields optional
- ChildOut: full child record (includes parent info)
- PaginatedChildren: TECH-SPEC 5.9 list response format
"""

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, Field


class ChildCreate(BaseModel):
    """Request body for POST /children.

    parent_phone is used to find or auto-create the parent user.
    """
    name: str = Field(..., min_length=1, max_length=50, description="Child name")
    parent_phone: str = Field(..., min_length=5, max_length=20, description="Parent phone number")
    english_name: str | None = Field(None, max_length=50, description="English name")
    birth_date: date | None = Field(None, description="Birth date")
    level: str | None = Field(None, pattern=r"^L[1-6]$", description="Level L1-L6")
    totalhours: int = Field(0, ge=0, description="总课时 (children.totalhours)")
    usedhours: int = Field(0, ge=0, description="已用课时 (children.usedhours)")


class ChildUpdate(BaseModel):
    """Request body for PUT /children/{id}. All fields optional."""
    name: str | None = Field(None, min_length=1, max_length=50)
    english_name: str | None = Field(None, max_length=50)
    birth_date: date | None = None
    level: str | None = Field(None, pattern=r"^L[1-6]$")
    parent_phone: str | None = Field(None, min_length=5, max_length=20,
                                       description="New parent phone (re-assigns parent)")
    totalhours: int | None = Field(None, ge=0, description="总课时")
    usedhours: int | None = Field(None, ge=0, description="已用课时")


class ParentBrief(BaseModel):
    """Brief parent info embedded in child response."""
    id: UUID
    phone: str
    nickname: str | None = None


class ChildOut(BaseModel):
    """Child record returned in API responses."""
    id: UUID
    name: str
    english_name: str | None = None
    birth_date: date | None = None
    level: str | None = None
    parent_id: UUID
    parent: ParentBrief | None = None
    totalhours: int = 0
    usedhours: int = 0
    remaining_hours: int = 0
    created_at: datetime
    updated_at: datetime


class PaginatedChildren(BaseModel):
    """Paginated list response per TECH-SPEC 5.9."""
    items: list[ChildOut]
    total: int
    page: int
    page_size: int
