"""数据导出 router — CSV StreamingResponse。

支持模块:
- payments  — 收款记录
- settlements — 教师结算
- children — 学员列表
- courses  — 课程记录

参数与各模块 list 端点对齐，导出当前筛选条件的全部数据（不分页）。
"""

import csv
import io
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse

from app.core.deps import CurrentUser, require_role
from app.core.database import get_supabase

router = APIRouter(prefix="/api/v1/export", tags=["export"])

# ── 模块 → (表名, 默认字段, 联表, 筛选构建器) ──

MODULES = {
    "payments": {
        "table": "payments",
        "select": "*, children(name)",
        "columns": [
            ("收款日期", lambda r: r.get("payment_date") or (r.get("created_at", "")[:10] if r.get("created_at") else "")),
            ("学员", lambda r: (r.get("children") or {}).get("name", "") if isinstance(r.get("children"), dict) else ""),
            ("支付方式", lambda r: r.get("payment_method", "")),
            ("课时数", lambda r: r.get("hours_purchased", 0)),
            ("金额", lambda r: r.get("amount", 0)),
            ("收据号", lambda r: r.get("receipt_number", "")),
            ("说明", lambda r: r.get("description", "")),
            ("备注", lambda r: r.get("notes", "")),
            ("状态", lambda r: r.get("status", "")),
            ("创建时间", lambda r: r.get("created_at", "")),
        ],
    },
    "settlements": {
        "table": "settlements",
        "select": "*",
        "columns": [
            ("教师", lambda r: r.get("teacher_name", "")),
            ("结算开始", lambda r: r.get("period_start", "")),
            ("结算结束", lambda r: r.get("period_end", "")),
            ("课时数", lambda r: r.get("hours", 0)),
            ("时薪", lambda r: r.get("hourly_rate", 0)),
            ("金额", lambda r: r.get("amount", 0)),
            ("状态", lambda r: r.get("status", "")),
            ("付款方式", lambda r: r.get("payment_method", "")),
            ("付款时间", lambda r: r.get("paid_at", "")),
            ("备注", lambda r: r.get("note", "")),
            ("创建时间", lambda r: r.get("created_at", "")),
        ],
    },
    "children": {
        "table": "children",
        "select": "*",
        "columns": [
            ("姓名", lambda r: r.get("name", "")),
            ("英文名", lambda r: r.get("english_name", "")),
            ("级别", lambda r: r.get("level", "")),
            ("总课时", lambda r: r.get("totalhours", 0)),
            ("已用课时", lambda r: r.get("usedhours", 0)),
            ("剩余课时", lambda r: int(r.get("totalhours", 0) or 0) - int(r.get("usedhours", 0) or 0)),
            ("家长电话", lambda r: r.get("parent_phone", "")),
            ("状态", lambda r: r.get("status", "")),
            ("创建时间", lambda r: r.get("created_at", "")),
        ],
    },
    "courses": {
        "table": "courses",
        "select": "*, teachers(name), children(name)",
        "columns": [
            ("日期", lambda r: r.get("date", "")),
            ("时间", lambda r: f"{r.get('start_time', '')}-{r.get('end_time', '')}"),
            ("教师", lambda r: (r.get("teachers") or {}).get("name", "") if isinstance(r.get("teachers"), dict) else ""),
            ("学员数", lambda r: len(r.get("children") or []) if isinstance(r.get("children"), list) else (1 if r.get("children") else 0)),
            ("课时", lambda r: r.get("hours", 1)),
            ("状态", lambda r: r.get("status", "")),
            ("备注", lambda r: r.get("notes", "")),
        ],
    },
}


def _apply_filters(query, module: str, month: str | None, date_from: str | None,
                   date_to: str | None, search: str | None, status: str | None,
                   teacher_id: str | None, child_id: str | None,
                   payment_method: str | None):
    """根据筛选参数构建查询条件。"""
    if month:
        try:
            year, m = month.split("-")
            m_int = int(m)
            y_int = int(year)
            if m_int == 12:
                end = f"{y_int + 1}-01-01"
            else:
                end = f"{y_int}-{m_int + 1:02d}-01"

            if module == "settlements":
                query = query.gte("period_start", f"{year}-{m}-01").lt("period_start", end)
            else:
                start = f"{year}-{m}-01"
                query = query.gte("created_at", start).lt("created_at", end)
        except (ValueError, AttributeError):
            pass

    if date_from:
        col = "period_start" if module == "settlements" else "created_at"
        query = query.gte(col, date_from)
    if date_to:
        col = "period_start" if module == "settlements" else "created_at"
        query = query.lte(col, date_to + "T23:59:59")
    if search and module == "children":
        query = query.or_(f"name.ilike.%{search}%,english_name.ilike.%{search}%")
    if status:
        query = query.eq("status", status)
    if teacher_id:
        query = query.eq("teacher_id", teacher_id)
    if child_id:
        query = query.eq("child_id", child_id)
    if payment_method:
        query = query.eq("payment_method", payment_method)

    return query


@router.get("/{module}")
async def export_csv(
    module: str,
    month: str | None = Query(None, description="月份 YYYY-MM"),
    date_from: str | None = Query(None, description="日期范围起 YYYY-MM-DD"),
    date_to: str | None = Query(None, description="日期范围止 YYYY-MM-DD"),
    search: str | None = Query(None, description="姓名搜索"),
    status: str | None = Query(None, description="状态筛选"),
    teacher_id: str | None = Query(None, description="教师ID"),
    child_id: str | None = Query(None, description="学员ID"),
    payment_method: str | None = Query(None, description="支付方式"),
    _admin: CurrentUser = Depends(require_role("admin")),
) -> StreamingResponse:
    """导出指定模块为 CSV（UTF-8 BOM 兼容 Excel）。Admin only。"""
    if module not in MODULES:
        raise HTTPException(404, detail={"code": "UNKNOWN_MODULE", "message": f"不支持的导出模块: {module}"})

    cfg = MODULES[module]
    sb = get_supabase()

    query = sb.table(cfg["table"]).select(cfg["select"]).order("created_at", desc=True)
    query = _apply_filters(query, module, month, date_from, date_to, search,
                           status, teacher_id, child_id, payment_method)

    # Supabase REST 默认 limit=1000，导出需扩大
    result = query.limit(10000).execute()
    rows = result.data or []

    # ── 写 CSV ──
    buf = io.StringIO()
    # UTF-8 BOM 让 Excel 正确识别编码
    buf.write("\ufeff")
    writer = csv.writer(buf)
    # 表头
    writer.writerow([col[0] for col in cfg["columns"]])
    # 数据行
    for row in rows:
        writer.writerow([col[1](row) for col in cfg["columns"]])

    buf.seek(0)
    filename = f"{module}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        buf,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
