"""Content ↔ 课程关联 API（1-C）。

端点:
- GET  /api/v1/reading/materials/{id}/courses — 查看内容关联的课程
- POST /api/v1/reading/materials/{id}/courses — 关联课程
- DELETE /api/v1/reading/materials/{id}/courses/{course_id} — 取消关联
- GET  /api/v1/courses/{id}/materials — 查看课程关联的内容
"""

import structlog
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Body
from pydantic import BaseModel

from app.core.database import get_supabase
from app.core.deps import require_role, require_permission
from app.schemas.auth import CurrentUser

logger = structlog.get_logger()

router = APIRouter(prefix="/api/v1", tags=["reading-courses"])

# DDL — 关联表（首次调用时自动创建）
_ENSURE_COURSE_READING_SQL = """
CREATE TABLE IF NOT EXISTS course_reading_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES reading_materials(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(course_id, material_id)
);
"""

async def _ensure_table(sb):
    """确保 course_reading_materials 表存在。"""
    try:
        sb.rpc("exec_sql", {"query": _ENSURE_COURSE_READING_SQL}).execute()
    except Exception:
        pass  # 表已存在或其他环境问题



class CourseLink(BaseModel):
    course_id: str


class MaterialLinkOut(BaseModel):
    id: str
    title: str = ""
    category: str = ""
    course_id: str = ""
    course_date: str = ""
    course_status: str = ""


# ── 从内容侧查关联课程 ──

@router.get("/reading/materials/{material_id}/courses")
async def get_material_courses(
    material_id: UUID,
    user: CurrentUser = Depends(require_permission("courses:read")),
):
    """查看内容关联的课程列表。"""
    sb = get_supabase()
    await _ensure_table(sb)
    try:
        # 关联表
        links = sb.table("course_reading_materials")\
            .select("course_id, courses(id, date, status, start_time)")\
            .eq("material_id", str(material_id)).execute()
        items = []
        for r in (links.data or []):
            c = r.get("courses") or {}
            items.append({
                "link_id": r.get("id", ""),
                "course_id": r.get("course_id", ""),
                "course_date": c.get("date", ""),
                "course_status": c.get("status", ""),
                "start_time": c.get("start_time", ""),
            })
        return items
    except Exception as e:
        logger.warning("get-material-courses-fail", error=str(e))
        raise HTTPException(500, "查询关联课程失败")


@router.post("/reading/materials/{material_id}/courses")
async def link_material_to_course(
    material_id: UUID,
    body: CourseLink,
    user: CurrentUser = Depends(require_permission("courses:write")),
):
    """关联内容到课程。"""
    sb = get_supabase()
    try:
        # 检查是否已关联
        existing = sb.table("course_reading_materials")\
            .select("id").eq("material_id", str(material_id))\
            .eq("course_id", body.course_id).execute()
        if existing.data:
            return {"ok": True, "message": "已关联"}
        sb.table("course_reading_materials").insert({
            "material_id": str(material_id),
            "course_id": body.course_id,
        }).execute()
        return {"ok": True}
    except Exception as e:
        logger.warning("link-material-course-fail", error=str(e))
        raise HTTPException(500, "关联失败")


@router.delete("/reading/materials/{material_id}/courses/{course_id}")
async def unlink_material_from_course(
    material_id: UUID,
    course_id: UUID,
    user: CurrentUser = Depends(require_permission("courses:write")),
):
    """取消内容与课程的关联。"""
    sb = get_supabase()
    try:
        sb.table("course_reading_materials")\
            .eq("material_id", str(material_id))\
            .eq("course_id", str(course_id)).delete().execute()
        return {"ok": True}
    except Exception as e:
        logger.warning("unlink-material-course-fail", error=str(e))
        raise HTTPException(500, "取消关联失败")


# ── 从课程侧查关联内容 ──

@router.get("/courses/{course_id}/materials")
async def get_course_materials(
    course_id: UUID,
    user: CurrentUser = Depends(require_permission("courses:read")),
):
    """查看课程关联的阅读内容。"""
    sb = get_supabase()
    try:
        links = sb.table("course_reading_materials")\
            .select("material_id, reading_materials(id, title, category)")\
            .eq("course_id", str(course_id)).execute()
        items = []
        for r in (links.data or []):
            m = r.get("reading_materials") or {}
            items.append({
                "link_id": r.get("id", ""),
                "material_id": r.get("material_id", ""),
                "title": m.get("title", ""),
                "category": m.get("category", ""),
            })
        return items
    except Exception as e:
        logger.warning("get-course-materials-fail", error=str(e))
        raise HTTPException(500, "查询关联内容失败")
