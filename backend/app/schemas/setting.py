"""Settings schemas."""

from datetime import datetime

from pydantic import BaseModel, Field


class SettingOut(BaseModel):
    """Schema for a setting returned from the API."""
    key: str = Field(..., max_length=100)
    value: str
    category: str = Field(default="general", max_length=50)
    description: str | None = None
    updated_at: datetime | None = None

    class Config:
        from_attributes = True


class SettingUpdate(BaseModel):
    """Schema for updating a setting."""
    value: str
    description: str | None = None
    category: str | None = None

    class Config:
        from_attributes = True


class SettingCreate(BaseModel):
    """Schema for creating a setting."""
    key: str = Field(..., max_length=100)
    value: str
    category: str = Field(default="general", max_length=50)
    description: str | None = None

    class Config:
        from_attributes = True
