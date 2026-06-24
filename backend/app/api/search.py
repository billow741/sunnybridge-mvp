"""全局搜索 API — 跨表搜索学员/教师/课程/内容资源。

GET /api/v1/search?q=keyword
"""

import structlog
from typing import Optional
from fastapi import APIRouter, Depends, Query

from app.core.database import get_supabase
from app.core.deps import require_role, require_permission
from app.schemas.auth import CurrentUser
from pydantic import BaseModel

logger = structlog.get_logger()
router = APIRouter(prefix="/api/v1/search", tags=["search"])

MAX_PER_TYPE = 5
MAX_MORE = 20


class SearchItem(BaseModel):
    id: str
    name: str
    sub: str = ""        # 副标题
    type: str            # student | teacher | course | resource | payment | content
    path: str            # 前端路由路径


class SearchResult(BaseModel):
    students: list[SearchItem] = []
    teachers: list[SearchItem] = []
    courses: list[SearchItem] = []
    resources: list[SearchItem] = []
    payments: list[SearchItem] = []
    # 每类是否有更多结果
    has_more: dict[str, bool] = {}


class SearchMoreResult(BaseModel):
    items: list[SearchItem] = []
    total: int = 0


@router.get("", response_model=SearchResult)
async def global_search(
    q: str = Query(..., min_length=1, description="搜索关键词"),
    user: CurrentUser = Depends(require_permission("search:read")),
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
            .ilike("title", ilike).limit(MAX_PER_TYPE + 1).execute()
        result.resources = [
            SearchItem(
                id=r["id"], name=r.get("title") or r.get("id", ""),
                sub=r.get("category") or "",
                type="resource", path="/content",
            ) for r in (resources.data or [])[:MAX_PER_TYPE]
        ]
        result.has_more["resource"] = len(resources.data or []) > MAX_PER_TYPE
    except Exception as e:
        logger.warning("search-resources-fail", error=str(e))

    # ── 收款记录 ──
    try:
        # 搜学员名 → 对应 payment
        matched_child = sb.table("children").select("id").or_(f"name.ilike.*{keyword}*,english_name.ilike.*{keyword}*").limit(3).execute()
        child_ids_p = [c["id"] for c in (matched_child.data or [])]
        p_list = []
        if child_ids_p:
            for cid in child_ids_p:
                ps = sb.table("payments").select("id, child_id, amount, hours_purchased, created_at")\
                    .eq("child_id", cid).limit(MAX_PER_TYPE).execute()
                p_list.extend(ps.data or [])
        # 也搜 receipt_number
        try:
            by_receipt = sb.table("payments").select("id, child_id, amount, hours_purchased, created_at, receipt_number")\
                .ilike("receipt_number", ilike).limit(MAX_PER_TYPE).execute()
            p_list.extend(by_receipt.data or [])
        except Exception:
            pass
        # 去重
        seen_p = set()
        deduped_p = []
        for p in p_list:
            if p["id"] not in seen_p:
                seen_p.add(p["id"])
                deduped_p.append(p)
        result.payments = [
            SearchItem(
                id=p["id"], name=f"₱{p.get('amount', 0)} — {p.get('hours_purchased', 0)}h",
                sub=p.get("created_at", "")[:10] or "",
                type="payment", path="/finance/payments",
            ) for p in deduped_p[:MAX_PER_TYPE]
        ]
        result.has_more["payment"] = len(deduped_p) > MAX_PER_TYPE
    except Exception as e:
        logger.warning("search-payments-fail", error=str(e))

    # 计算 has_more（前面每个类型用了 limit(MAX_PER_TYPE+1) 来判断是否有更多）
    for t in ["student", "teacher", "course"]:
        if t not in result.has_more:
            result.has_more[t] = False

    return result


@router.get("/more", response_model=SearchMoreResult)
async def search_more(
    q: str = Query(..., min_length=1),
    type: str = Query(..., description="student|teacher|course|resource|payment"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    user: CurrentUser = Depends(require_permission("search:read")),
) -> SearchMoreResult:
    """查看更多 — 单类型分页加载。"""
    sb = get_supabase()
    keyword = q.strip()
    ilike = f"%{keyword}%"
    offset = (page - 1) * page_size
    items: list[SearchItem] = []

    try:
        if type == "student":
            res = sb.table("children").select("id, name, english_name, totalhours, usedhours", count="exact")\
                .or_(f"name.ilike.*{keyword}*,english_name.ilike.*{keyword}*")\
                .range(offset, offset + page_size - 1).execute()
            items = [SearchItem(id=r["id"], name=r["name"],
                sub=f"剩余 {((r.get('totalhours') or 0) - (r.get('usedhours') or 0)):.1f}h",
                type="student", path=f"/students/{r['id']}") for r in (res.data or [])]
            return SearchMoreResult(items=items, total=res.count or 0)

        elif type == "teacher":
            res = sb.table("teachers").select("id, name, is_active", count="exact")\
                .ilike("name", ilike).range(offset, offset + page_size - 1).execute()
            items = [SearchItem(id=r["id"], name=r["name"],
                sub="在职" if r.get("is_active") else "离职",
                type="teacher", path="/teachers") for r in (res.data or [])]
            return SearchMoreResult(items=items, total=res.count or 0)

        elif type == "course":
            matched_t = sb.table("teachers").select("id").ilike("name", ilike).limit(10).execute()
            tids = [t["id"] for t in (matched_t.data or [])]
            crs = []
            if tids:
                for tid in tids:
                    c = sb.table("courses").select("id, date, status, start_time").eq("teacher_id", tid).limit(MAX_MORE).execute()
                    crs.extend(c.data or [])
            seen = set()
            deduped = []
            for c in crs:
                if c["id"] not in seen:
                    seen.add(c["id"])
                    deduped.append(c)
            total = len(deduped)
            items = [SearchItem(id=r["id"], name=f"{r.get('date', '')} {r.get('start_time', '')[:5] or ''}",
                sub=f"状态：{r.get('status', '')}", type="course", path="/courses") for r in deduped[offset:offset+page_size]]
            return SearchMoreResult(items=items, total=total)

        elif type == "resource":
            res = sb.table("resources").select("id, title, category", count="exact")\
                .ilike("title", ilike).range(offset, offset + page_size - 1).execute()
            items = [SearchItem(id=r["id"], name=r.get("title") or "",
                sub=r.get("category") or "", type="resource", path="/content") for r in (res.data or [])]
            return SearchMoreResult(items=items, total=res.count or 0)

        elif type == "payment":
            matched_c = sb.table("children").select("id").or_(f"name.ilike.*{keyword}*,english_name.ilike.*{keyword}*").limit(10).execute()
            cids = [c["id"] for c in (matched_c.data or [])]
            p_list = []
            if cids:
                for cid in cids:
                    ps = sb.table("payments").select("id, child_id, amount, hours_purchased, created_at").eq("child_id", cid).execute()
                    p_list.extend(ps.data or [])
            seen = set()
            deduped_p = []
            for p in p_list:
                if p["id"] not in seen:
                    seen.add(p["id"])
                    deduped_p.append(p)
            total = len(deduped_p)
            items = [SearchItem(id=p["id"], name=f"₱{p.get('amount', 0)} — {p.get('hours_purchased', 0)}h",
                sub=p.get("created_at", "")[:10] or "", type="payment", path="/finance/payments") for p in deduped_p[offset:offset+page_size]]
            return SearchMoreResult(items=items, total=total)

    except Exception as e:
        logger.warning("search-more-fail", type=type, error=str(e))

    return SearchMoreResult(items=items, total=0)
