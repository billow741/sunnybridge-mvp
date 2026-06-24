"""课时变化日志 API（1-A）。

记录所有课时变动：购课充值、课程扣减、手动调整。
端点:
- GET /api/v1/children/{child_id}/hours-log — 查看课时变动历史
"""

import structlog
from datetime import datetime
from uuid import UUID
from fastapi import APIRouter, Depends, Query

from app.core.database import get_supabase
from app.core.deps import require_role, require_permission
from app.schemas.auth import CurrentUser
from pydantic import BaseModel

logger = structlog.get_logger()
router = APIRouter(prefix="/api/v1/children", tags=["hours-log"])


# ── Schemas ──

class HoursLogEntry(BaseModel):
    id: str
    child_id: str
    change_type: str       # purchase | deduction | adjustment
    delta: float           # 正=加, 负=减
    balance_after: float
    ref_id: str | None = None   # 关联的 payment_id / course_id
    note: str | None = None
    created_by: str | None = None
    created_at: datetime


class PaginatedHoursLog(BaseModel):
    items: list[HoursLogEntry]
    total: int
    page: int
    page_size: int


# ── 确保表存在 ──

_ENSURE_SQL = """
CREATE TABLE IF NOT EXISTS hours_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    change_type TEXT NOT NULL CHECK (change_type IN ('purchase','deduction','adjustment')),
    delta NUMERIC NOT NULL,
    balance_after NUMERIC NOT NULL,
    ref_id UUID,
    note TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hours_log_child ON hours_log(child_id);
CREATE INDEX IF NOT EXISTS idx_hours_log_created ON hours_log(created_at DESC);
"""

_sb_init_done = False

def _ensure_table():
    global _sb_init_done
    if _sb_init_done:
        return
    sb = get_supabase()
    try:
        sb.rpc("exec_sql", {"query": _ENSURE_SQL}).execute()
        _sb_init_done = True
        logger.info("hours_log_table_ensured")
    except Exception as e:
        logger.warning("hours_log_ensure_fail", error=str(e))
        # 不阻塞，表可能已存在


# ── 写入辅助（供其他 service 调用）──

def record_hours_change(
    child_id: str,
    change_type: str,
    delta: float,
    balance_after: float,
    ref_id: str | None = None,
    note: str | None = None,
    created_by: str | None = None,
) -> None:
    """插入一条课时变动记录。不抛异常（日志保障不应阻塞主流程）。"""
    _ensure_table()
    sb = get_supabase()
    try:
        sb.table("hours_log").insert({
            "child_id": str(child_id),
            "change_type": change_type,
            "delta": delta,
            "balance_after": balance_after,
            "ref_id": str(ref_id) if ref_id else None,
            "note": note,
            "created_by": str(created_by) if created_by else None,
        }).execute()
    except Exception as e:
        logger.error("hours_log_write_fail", child_id=child_id, error=str(e))


# ── 查询端点 ──

@router.get("/{child_id}/hours-log", response_model=PaginatedHoursLog)
async def get_hours_log(
    child_id: UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: CurrentUser = Depends(require_permission("hours:read")),
) -> PaginatedHoursLog:
    """查看学员课时变动历史。按时间倒序。"""
    _ensure_table()
    sb = get_supabase()

    # 总数
    try:
        count_res = sb.rpc("exec_sql", {"query": (
            f"SELECT count(*) AS cnt FROM hours_log WHERE child_id = '{child_id}'"
        )}).execute()
        total = int((count_res.data or [{}])[0].get("cnt", 0))
    except Exception:
        total = 0

    # 分页数据
    offset = (page - 1) * page_size
    try:
        data_res = sb.rpc("exec_sql", {"query": (
            f"SELECT id::text, child_id::text, change_type, delta::float, balance_after::float, "
            f"ref_id::text, note, created_by::text, created_at "
            f"FROM hours_log "
            f"WHERE child_id = '{child_id}' "
            f"ORDER BY created_at DESC "
            f"LIMIT {page_size} OFFSET {offset}"
        )}).execute()
        items = [HoursLogEntry(**r) for r in (data_res.data or [])]
    except Exception as e:
        logger.warning("hours_log_query_fail", child_id=str(child_id), error=str(e))
        items = []

    return PaginatedHoursLog(items=items, total=total, page=page, page_size=page_size)
