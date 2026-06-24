"""Saved Filters API — 保存和管理自定义筛选条件。

Endpoints:
- GET /api/v1/saved-filters — 列表, 可按 page/category 过滤
- POST /api/v1/saved-filters — 创建
- PUT /api/v1/saved-filters/{id} — 更新
- DELETE /api/v1/saved-filters/{id} — 删除
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from datetime import datetime

from app.core.database import get_supabase
from app.core.deps import require_role, require_permission
from app.schemas.auth import CurrentUser

router = APIRouter(prefix="/api/v1/saved-filters", tags=["saved-filters"])


# ── Schemas ──

class SavedFilterCreate(BaseModel):
    name: str = Field(..., max_length=100)
    page: str = Field(..., max_length=50, description="所属页面, 如 teachers/payments/courses")
    filters: dict = Field(..., description="筛选条件 JSON")
    is_default: bool = False

class SavedFilterUpdate(BaseModel):
    name: str | None = None
    filters: dict | None = None
    is_default: bool | None = None

class SavedFilterOut(BaseModel):
    id: int
    name: str
    page: str
    filters: dict
    is_default: bool = False
    created_by: str | None = None
    created_at: datetime | None = None

    class Config:
        from_attributes = True


# ── Endpoints ──

@router.get("", response_model=list[SavedFilterOut])
async def list_saved_filters(
    page: str | None = Query(None, description="按页面过滤"),
    user: CurrentUser = Depends(require_permission("settings:read")),
):
    sb = get_supabase()
    q = sb.table("saved_filters").select("*")
    if page:
        q = q.eq("page", page)
    q = q.order("is_default", desc=True).order("name", desc=False)
    result = q.execute()
    return result.data or []


@router.post("", response_model=SavedFilterOut, status_code=201)
async def create_saved_filter(
    body: SavedFilterCreate,
    user: CurrentUser = Depends(require_permission("settings:write")),
):
    sb = get_supabase()
    data = {
        "name": body.name,
        "page": body.page,
        "filters": body.filters,
        "is_default": body.is_default,
        "created_by": str(user.id),
    }
    result = sb.table("saved_filters").insert(data).execute()
    if not result.data:
        raise HTTPException(500, "创建失败")
    return result.data[0]


@router.put("/{filter_id}", response_model=SavedFilterOut)
async def update_saved_filter(
    filter_id: int,
    body: SavedFilterUpdate,
    user: CurrentUser = Depends(require_permission("settings:write")),
):
    sb = get_supabase()
    updates = {}
    if body.name is not None:
        updates["name"] = body.name
    if body.filters is not None:
        updates["filters"] = body.filters
    if body.is_default is not None:
        updates["is_default"] = body.is_default
    if not updates:
        raise HTTPException(400, "无更新内容")
    result = sb.table("saved_filters").update(updates).eq("id", filter_id).execute()
    if not result.data:
        raise HTTPException(404, "筛选模板不存在")
    return result.data[0]


@router.delete("/{filter_id}")
async def delete_saved_filter(
    filter_id: int,
    user: CurrentUser = Depends(require_permission("settings:delete")),
):
    sb = get_supabase()
    result = sb.table("saved_filters").delete().eq("id", filter_id).execute()
    if not result.data:
        raise HTTPException(404, "筛选模板不存在")
    return {"message": "删除成功"}
