"""审批流 router — 3-D MVP settlement only.

Endpoints:
- POST /api/v1/approvals                     — 提交审批 (settlements:write)
- GET  /api/v1/approvals                     — 审批列表 (settlements:approve)
- PUT  /api/v1/approvals/{id}/approve         — 通过 (settlements:approve)
- PUT  /api/v1/approvals/{id}/reject          — 驳回 (settlements:approve)
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.deps import CurrentUser, require_permission
from app.schemas.approval import (
    ApprovalListResponse,
    ApprovalOut,
    ApprovalReviewRequest,
    ApprovalSubmitRequest,
)
from app.services.approval import (
    approve_approval,
    list_approvals,
    reject_approval,
    submit_approval,
)

router = APIRouter(prefix="/api/v1/approvals", tags=["approvals"])


@router.post("", response_model=ApprovalOut, status_code=status.HTTP_201_CREATED)
async def submit_approval_endpoint(
    body: ApprovalSubmitRequest,
    user: CurrentUser = Depends(require_permission("settlements:write")),
) -> ApprovalOut:
    """提交审批。仅 settlement 类型。"""
    try:
        return await submit_approval(
            target_type=body.target_type,
            target_id=body.target_id,
            requested_by=user.id,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "APPROVAL_SUBMIT_ERROR", "message": str(e)},
        )


@router.get("", response_model=ApprovalListResponse)
async def list_approvals_endpoint(
    status_filter: str | None = Query(None, alias="status", description="pending/approved/rejected"),
    target_type: str | None = Query(None, description="settlement"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    _user: CurrentUser = Depends(require_permission("settlements:approve")),
) -> ApprovalListResponse:
    """审批列表（含已审批）。仅审批人可见。"""
    items, total = await list_approvals(
        status=status_filter,
        target_type=target_type,
        page=page,
        page_size=page_size,
    )
    return ApprovalListResponse(items=items, total=total)


@router.put("/{approval_id}/approve", response_model=ApprovalOut)
async def approve_approval_endpoint(
    approval_id: UUID,
    body: ApprovalReviewRequest = ApprovalReviewRequest(),
    user: CurrentUser = Depends(require_permission("settlements:approve")),
) -> ApprovalOut:
    """审批通过。不能自批。"""
    try:
        return await approve_approval(
            approval_id=approval_id,
            reviewed_by=user.id,
            comment=body.comment,
        )
    except ValueError as e:
        if "自己提交" in str(e):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"code": "SELF_APPROVE_DENIED", "message": str(e)},
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "APPROVAL_APPROVE_ERROR", "message": str(e)},
        )


@router.put("/{approval_id}/reject", response_model=ApprovalOut)
async def reject_approval_endpoint(
    approval_id: UUID,
    body: ApprovalReviewRequest,
    user: CurrentUser = Depends(require_permission("settlements:approve")),
) -> ApprovalOut:
    """审批驳回。需填理由。"""
    try:
        return await reject_approval(
            approval_id=approval_id,
            reviewed_by=user.id,
            comment=body.comment,
        )
    except ValueError as e:
        if "自己提交" in str(e):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"code": "SELF_APPROVE_DENIED", "message": str(e)},
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "APPROVAL_REJECT_ERROR", "message": str(e)},
        )
