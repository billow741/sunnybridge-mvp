"""教师结算 router。

Endpoints:
- POST /api/v1/settlements/calc-hours — 按教师+时间段自动计算课时
- GET  /api/v1/settlements           — 结算列表
- GET  /api/v1/settlements/summary    — 结算汇总
- POST /api/v1/settlements           — 新建结算
- PUT  /api/v1/settlements/{id}/pay   — 标记已付款
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.deps import CurrentUser, require_role
from app.schemas.settlement import (
    HoursCalcRequest,
    HoursCalcResponse,
    SettlementCreateRequest,
    SettlementListResponse,
    SettlementOut,
    SettlementPayRequest,
    SettlementSummaryOut,
)
from app.services.settlement import (
    calc_hours,
    create_settlement,
    get_summary,
    list_settlements,
    pay_settlement,
)

router = APIRouter(prefix="/api/v1/settlements", tags=["settlements"])


@router.post("/calc-hours", response_model=HoursCalcResponse)
async def calculate_hours(
    body: HoursCalcRequest,
    _admin: CurrentUser = Depends(require_role("admin")),
) -> HoursCalcResponse:
    """按教师 + 时间段自动统计课时数。Admin only。

    查询 courses 表中该教师在指定时间段内的所有课程，汇总课时。
    """
    try:
        return await calc_hours(
            teacher_id=body.teacher_id,
            period_start=body.period_start,
            period_end=body.period_end,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "CALC_HOURS_ERROR", "message": str(e)},
        )


@router.get("/summary", response_model=SettlementSummaryOut)
async def settlement_summary(
    _admin: CurrentUser = Depends(require_role("admin")),
) -> SettlementSummaryOut:
    """结算汇总（待付款/已付款/总额/教师数）。Admin only。"""
    return await get_summary()


@router.get("", response_model=SettlementListResponse)
async def settlement_list(
    status: str | None = Query(None, description="状态: pending/paid"),
    teacher_id: str | None = Query(None, description="教师ID"),
    month: str | None = Query(None, description="月份 YYYY-MM"),
    _admin: CurrentUser = Depends(require_role("admin")),
) -> SettlementListResponse:
    """获取结算记录（支持筛选）。Admin only。"""
    return await list_settlements(status=status, teacher_id=teacher_id, month=month)


@router.post("", response_model=SettlementOut, status_code=status.HTTP_201_CREATED)
async def settlement_create(
    body: SettlementCreateRequest,
    _admin: CurrentUser = Depends(require_role("admin")),
) -> SettlementOut:
    """新建结算记录。Admin only。"""
    try:
        return await create_settlement(body)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "SETTLEMENT_CREATE_ERROR", "message": str(e)},
        )


@router.put("/{settlement_id}/pay", response_model=SettlementOut)
async def settlement_pay(
    settlement_id: UUID,
    body: SettlementPayRequest = SettlementPayRequest(),
    _admin: CurrentUser = Depends(require_role("admin")),
) -> SettlementOut:
    """标记结算为已付款。Admin only。"""
    try:
        return await pay_settlement(settlement_id, body.payment_method)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "SETTLEMENT_NOT_FOUND", "message": str(e)},
        )
