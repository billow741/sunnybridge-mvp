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
    sub: str = ""        # 副标题
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

    # ── 学员 ──  真实列: name, english_name, totalhours, usedhours
    try:
        children = sb.table("children").select("id, name, english_name, totalhours, usedhours")\
            .or_(f"name.ilike.*{keyword}*,english_name.ilike.*{keyword}*")\
            .limit(MAX_PER_TYPE).execute()
        result.students = [
            SearchItem(
                id=r["id"], name=r["name"],
                sub=f"剩余 {((r.get('totalhours') or 0) - (r.get('usedhours') or 0)):.1f}h",
                type="student", path=f"/students/{r['id']}",
            ) for r in children.data
        ]
    except Exception as e:
        logger.warning("search-children-fail", error=str(e))

    # ── 教师 ──  真实列: name, phone  (无subject列)
    try:
        teachers = sb.table("teachers").select("id, name, is_active")\
            .ilike("name", ilike).limit(MAX_PER_TYPE).execute()
        result.teachers = [
            SearchItem(
                id=r["id"], name=r["name"],
                sub="在职" if r.get("is_active") else "离职",
                type="teacher", path="/teachers",
            ) for r in teachers.data
        ]
    except Exception as e:
        logger.warning("search-teachers-fail", error=str(e))

    # ── 课程 ──  date是date类型不能ilike，用 teacher_id 关联搜
    try:
        # 先搜教师名获取teacher_id
        matched_teachers = sb.table("teachers").select("id").ilike("name", ilike).limit(3).execute()
        teacher_ids = [t["id"] for t in matched_teachers.data] if matched_teachers.data else []

        course_list = []
        if teacher_ids:
            for tid in teacher_ids:
                crs = sb.table("courses").select("id, date, status, start_time")\
                    .eq("teacher_id", tid).limit(MAX_PER_TYPE).execute()
                course_list.extend(crs.data)

        # 也搜学员名对应课程（通过 course_students join）
        try:
            matched_children = sb.table("children").select("id").or_(f"name.ilike.*{keyword}*,english_name.ilike.*{keyword}*").limit(3).execute()
            child_ids = [c["id"] for c in matched_children.data] if matched_children.data else []
            for cid in child_ids:
                cs = sb.table("course_students").select("course_id").eq("child_id", cid).limit(10).execute()
                cids = list(set(r["course_id"] for r in cs.data)) if cs.data else []
                for ci in cids[:MAX_PER_TYPE]:
                    co = sb.table("courses").select("id, date, status, start_time").eq("id", ci).execute()
                    course_list.extend(co.data)
        except Exception:
            pass

        # 去重
        seen = set()
        deduped = []
        for c in course_list:
            if c["id"] not in seen:
                seen.add(c["id"])
                deduped.append(c)

        result.courses = [
            SearchItem(
                id=r["id"], name=f"{r.get('date', '')} {r.get('start_time', '')[:5] or ''}",
                sub=f"状态：{r.get('status', '')}",
                type="course", path="/courses",
            ) for r in deduped[:MAX_PER_TYPE]
        ]
    except Exception as e:
        logger.warning("search-courses-fail", error=str(e))

    # ── 内容资源 ──  真实列: title, category (无type列)
    try:
        resources = sb.table("resources").select("id, title, category")\
            .ilike("title", ilike).limit(MAX_PER_TYPE).execute()
        result.resources = [
            SearchItem(
                id=r["id"], name=r.get("title") or r.get("id", ""),
                sub=r.get("category") or "",
                type="resource", path="/content",
            ) for r in resources.data
        ]
    except Exception as e:
        logger.warning("search-resources-fail", error=str(e))

    return result
