"""Settings API — key-value configuration management.

表结构: settings(id UUID, key VARCHAR, value TEXT, category VARCHAR, description TEXT, updated_at TIMESTAMPTZ)

Endpoints:
- GET /api/v1/settings — list all, optional ?category= filter
- PUT /api/v1/settings/{key} — upsert by key
- DELETE /api/v1/settings/{key} — delete by key
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from datetime import datetime

from app.core.database import get_supabase
from app.core.deps import require_role
from app.schemas.auth import CurrentUser

router = APIRouter(prefix="/api/v1/settings", tags=["settings"])


# ── Schemas ──

class SettingOut(BaseModel):
    id: str | None = None
    key: str = Field(..., max_length=100)
    value: str
    category: str = Field(default="general", max_length=50)
    description: str | None = None
    updated_at: datetime | None = None

    class Config:
        from_attributes = True


class SettingUpdate(BaseModel):
    value: str
    description: str | None = None
    category: str | None = None

    class Config:
        from_attributes = True


# ── Endpoints ──

@router.get("", response_model=list[SettingOut])
async def list_settings(
    category: str | None = Query(None, description="Filter by category"),
    user: CurrentUser = Depends(require_role("admin")),
):
    sb = get_supabase()
    q = sb.table("settings").select("*")
    if category:
        q = q.eq("category", category)
    result = q.order("key", desc=False).execute()
    return result.data or []


@router.put("/{key}", response_model=SettingOut)
async def upsert_setting(
    key: str,
    body: SettingUpdate,
    user: CurrentUser = Depends(require_role("admin")),
):
    sb = get_supabase()
    existing = sb.table("settings").select("*").eq("key", key).execute()
    if existing.data:
        update_data = {"value": body.value}
        if body.description is not None:
            update_data["description"] = body.description
        if body.category is not None:
            update_data["category"] = body.category
        result = sb.table("settings").update(update_data).eq("key", key).execute()
    else:
        create_data = {
            "key": key,
            "value": body.value,
            "category": body.category or "general",
            "description": body.description or "",
        }
        result = sb.table("settings").insert(create_data).execute()
    if not result.data:
        raise HTTPException(500, "保存失败")
    return result.data[0]


@router.delete("/{key}")
async def delete_setting(
    key: str,
    user: CurrentUser = Depends(require_role("admin")),
):
    sb = get_supabase()
    result = sb.table("settings").delete().eq("key", key).execute()
    if not result.data:
        raise HTTPException(404, f"Setting '{key}' not found")
    return {"message": "删除成功", "key": key}
