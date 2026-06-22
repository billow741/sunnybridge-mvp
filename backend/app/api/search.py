"""全局搜索 API — 跨表搜索学员/教师/课程/内容资源。

GET /api/v1/search?q=keyword
"""

import structlog
from typing import Optional
from fastapi import APIRouter, Depends, Query

from app.core.database import get_supabase
from app.core.deps import require_role
from app.schemas.auth import CurrentUser
from pydantic import BaseModel

logger = structlog.get_logger()
router = APIRouter(prefix="/api/v1/search", tags=["search"])

MAX_PER_TYPE = 5


class SearchItem(BaseModel):
    id: str
    name: str
    sub: str = ""        # 副标题（如剩余课时、教师学科等）
    type: str            # student | teacher | course | resource
    path: str            # 前端路由路径


class SearchResult(BaseModel):
    students: list[SearchItem] = []
    teachers: list[SearchItem] = []
    courses: list[SearchItem] = []
    resources: list[SearchItem] = []


@router.get("", response_model=SearchResult)
async def global_search(
    q: str = Query(..., min_length=1, description="搜索关键词"),
    user: CurrentUser = Depends(require_role("admin")),
) -> SearchResult:
    sb = get_supabase()
    keyword = q.strip()
    if not keyword:
        return SearchResult()

    result = SearchResult()
    ilike = f"%{keyword}%"

    # ── 学员 ──
    try:
        children = sb.table("children").select("id, name, remaining_hours")\
            .ilike("name", ilike).limit(MAX_PER_TYPE).execute()
        result.students = [
            SearchItem(
                id=r["id"], name=r["name"],
                sub=f"剩余 {r.get('remaining_hours', 0):.1f}h",
                type="student", path=f"/students/{r['id']}",
            ) for r in children.data
        ]
    except Exception:
        pass

    # ── 教师 ──
    try:
        teachers = sb.table("teachers").select("id, name, subject")\
            .ilike("name", ilike).limit(MAX_PER_TYPE).execute()
        result.teachers = [
            SearchItem(
                id=r["id"], name=r["name"],
                sub=r.get("subject") or "",
                type="teacher", path=f"/teachers",
            ) for r in teachers.data
        ]
    except Exception:
        pass

    # ── 课程 ──
    try:
        # 搜索教师名或学员名匹配的课程（通过 join）
        courses = sb.table("courses").select("id, date, status, teachers(name), children(name)")\
            .or_(f"teachers.name.ilike.*{keyword}*,children.name.ilike.*{keyword}*")\
            .limit(MAX_PER_TYPE).execute()
        result.courses = [
            SearchItem(
                id=r["id"],
                name=f"{r.get('date', '')} {r.get('teachers', {}).get('name', '') if isinstance(r.get('teachers'), dict) else ''}",
                sub=f"状态：{r.get('status', '')}",
                type="course", path="/courses",
            ) for r in courses.data
        ]
    except Exception:
        # fallback: 只按日期搜
        try:
            courses2 = sb.table("courses").select("id, date, status")\
                .ilike("date", ilike).limit(MAX_PER_TYPE).execute()
            result.courses = [
                SearchItem(
                    id=r["id"], name=r["date"],
                    sub=f"状态：{r.get('status', '')}",
                    type="course", path="/courses",
                ) for r in courses2.data
            ]
        except Exception:
            pass

    # ── 内容资源 ──
    try:
        resources = sb.table("resources").select("id, title, type")\
            .ilike("title", ilike).limit(MAX_PER_TYPE).execute()
        result.resources = [
            SearchItem(
                id=r["id"], name=r.get("title") or r.get("id", ""),
                sub=r.get("type") or "",
                type="resource", path="/content",
            ) for r in resources.data
        ]
    except Exception:
        pass

    return result
