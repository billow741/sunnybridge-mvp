"""审批流 service — 3-D MVP settlement only.

核心逻辑:
- submit: 提交审批 (应用层防重复 pending)
- list: 待审批/已审批列表
- approve / reject: 审批操作 (自批校验)
"""

import structlog
from datetime import datetime, timezone
from uuid import UUID

from app.core.database import get_supabase
from app.schemas.approval import ApprovalOut

logger = structlog.get_logger()


async def submit_approval(target_type: str, target_id: UUID, requested_by: UUID) -> ApprovalOut:
    """提交审批。

    1. 校验 target 存在 + approval_status ∈ { not_required, rejected }
    2. 查是否已有 status=pending 的同 target 审批单 → 有则 409
    3. INSERT approvals + UPDATE target approval_status
    4. 返回 approval 记录
    """
    sb = get_supabase()

    # 1. 校验 target
    table = "settlements" if target_type == "settlement" else None
    if not table:
        raise ValueError(f"不支持的 target_type: {target_type}")

    target = sb.table(table).select("id, approval_status, teacher_name, amount, period_start, period_end").eq("id", str(target_id)).limit(1).execute()
    if not target.data:
        raise ValueError(f"{target_type} 不存在: {target_id}")

    target_row = target.data[0]
    current_status = target_row.get("approval_status", "not_required")
    if current_status == "pending":
        # 检查是否有对应的审批记录，无则允许重新提交（孤立修复）
        existing = sb.table("approvals").select("id").eq("target_type", target_type).eq("target_id", str(target_id)).eq("status", "pending").limit(1).execute()
        if existing.data:
            raise ValueError(f"该{target_type}已在审批中，不能重复提交")
        # 孤立 pending：无审批记录，允许修复
    if current_status == "approved":
        raise ValueError(f"该{target_type}已审批通过，无需再次提交")

    # 2. 查已有 pending 审批单
    existing = sb.table("approvals").select("id").eq("target_type", target_type).eq("target_id", str(target_id)).eq("status", "pending").limit(1).execute()
    if existing.data:
        raise ValueError(f"该{target_type}已有待审批记录 (id={existing.data[0]['id']})")

    # 3. INSERT approval
    row = {
        "target_type": target_type,
        "target_id": str(target_id),
        "status": "pending",
        "requested_by": str(requested_by),
    }
    result = sb.table("approvals").insert(row).execute()
    if not result.data:
        raise ValueError("创建审批记录失败")

    created = result.data[0]

    # 4. UPDATE target approval_status
    sb.table(table).update({"approval_status": "pending"}).eq("id", str(target_id)).execute()

    # 查提交人姓名
    requester = sb.table("users").select("username").eq("id", str(requested_by)).limit(1).execute()
    requester_name = requester.data[0]["username"] if requester.data else "未知"

    return ApprovalOut(
        id=created["id"],
        target_type=created["target_type"],
        target_id=created["target_id"],
        status=created["status"],
        requested_by=created["requested_by"],
        requested_by_name=requester_name,
        created_at=created.get("created_at"),
        target_summary={
            "teacher_name": target_row.get("teacher_name", ""),
            "amount": target_row.get("amount", 0),
            "period_start": target_row.get("period_start", ""),
            "period_end": target_row.get("period_end", ""),
        },
    )


async def list_approvals(
    status: str | None = None,
    target_type: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> list[ApprovalOut]:
    """审批列表。支持按 status/target_type 筛选。"""
    sb = get_supabase()

    query = sb.table("approvals").select("*", count="exact")

    if status:
        query = query.eq("status", status)
    if target_type:
        query = query.eq("target_type", target_type)

    offset = (page - 1) * page_size
    result = query.order("created_at", desc=True).range(offset, offset + page_size - 1).execute()

    items = []
    for row in (result.data or []):
        # 查名字
        req_user = sb.table("users").select("username").eq("id", row["requested_by"]).limit(1).execute()
        requester_name = req_user.data[0]["username"] if req_user.data else "未知"

        rev_name = None
        if row.get("reviewed_by"):
            rev_user = sb.table("users").select("username").eq("id", row["reviewed_by"]).limit(1).execute()
            rev_name = rev_user.data[0]["username"] if rev_user.data else "未知"

        # 查 target 摘要
        target_summary = None
        if row["target_type"] == "settlement":
            t = sb.table("settlements").select("teacher_name, amount, period_start, period_end").eq("id", row["target_id"]).limit(1).execute()
            if t.data:
                target_summary = {
                    "teacher_name": t.data[0].get("teacher_name", ""),
                    "amount": t.data[0].get("amount", 0),
                    "period_start": t.data[0].get("period_start", ""),
                    "period_end": t.data[0].get("period_end", ""),
                }

        items.append(ApprovalOut(
            id=row["id"],
            target_type=row["target_type"],
            target_id=row["target_id"],
            status=row["status"],
            requested_by=row["requested_by"],
            requested_by_name=requester_name,
            reviewed_by=row.get("reviewed_by"),
            reviewed_by_name=rev_name,
            comment=row.get("comment"),
            created_at=row.get("created_at"),
            reviewed_at=row.get("reviewed_at"),
            target_summary=target_summary,
        ))

    return items, result.count if result.count is not None else len(items)


async def approve_approval(approval_id: UUID, reviewed_by: UUID, comment: str | None = None) -> ApprovalOut:
    """审批通过。

    1. 校验 status == pending
    2. 校验 reviewed_by != requested_by (不能自批)
    3. UPDATE approval + target
    """
    sb = get_supabase()

    # 1. 查 approval
    ap = sb.table("approvals").select("*").eq("id", str(approval_id)).limit(1).execute()
    if not ap.data:
        raise ValueError("审批记录不存在")

    row = ap.data[0]
    if row["status"] != "pending":
        raise ValueError(f"审批单状态为 {row['status']}，无法通过")

    # 2. 自批校验
    if str(row["requested_by"]) == str(reviewed_by):
        raise ValueError("不能审批自己提交的申请")

    now = datetime.now(timezone.utc).isoformat()

    # 3. UPDATE approval
    update_data = {
        "status": "approved",
        "reviewed_by": str(reviewed_by),
        "reviewed_at": now,
    }
    if comment:
        update_data["comment"] = comment

    sb.table("approvals").update(update_data).eq("id", str(approval_id)).execute()

    # 4. UPDATE target
    if row["target_type"] == "settlement":
        sb.table("settlements").update({"approval_status": "approved"}).eq("id", row["target_id"]).execute()

    # 返回
    approver = sb.table("users").select("username").eq("id", str(reviewed_by)).limit(1).execute()
    approver_name = approver.data[0]["username"] if approver.data else "未知"

    requester = sb.table("users").select("username").eq("id", row["requested_by"]).limit(1).execute()
    requester_name = requester.data[0]["username"] if requester.data else "未知"

    target_summary = None
    if row["target_type"] == "settlement":
        t = sb.table("settlements").select("teacher_name, amount, period_start, period_end").eq("id", row["target_id"]).limit(1).execute()
        if t.data:
            target_summary = {
                "teacher_name": t.data[0].get("teacher_name", ""),
                "amount": t.data[0].get("amount", 0),
                "period_start": t.data[0].get("period_start", ""),
                "period_end": t.data[0].get("period_end", ""),
            }

    return ApprovalOut(
        id=row["id"],
        target_type=row["target_type"],
        target_id=row["target_id"],
        status="approved",
        requested_by=row["requested_by"],
        requested_by_name=requester_name,
        reviewed_by=reviewed_by,
        reviewed_by_name=approver_name,
        comment=comment,
        created_at=row.get("created_at"),
        reviewed_at=now,
        target_summary=target_summary,
    )


async def reject_approval(approval_id: UUID, reviewed_by: UUID, comment: str | None = None) -> ApprovalOut:
    """审批驳回。

    1. 校验 status == pending
    2. 校验 reviewed_by != requested_by
    3. UPDATE approval + target
    """
    sb = get_supabase()

    ap = sb.table("approvals").select("*").eq("id", str(approval_id)).limit(1).execute()
    if not ap.data:
        raise ValueError("审批记录不存在")

    row = ap.data[0]
    if row["status"] != "pending":
        raise ValueError(f"审批单状态为 {row['status']}，无法驳回")

    if str(row["requested_by"]) == str(reviewed_by):
        raise ValueError("不能审批自己提交的申请")

    now = datetime.now(timezone.utc).isoformat()

    update_data = {
        "status": "rejected",
        "reviewed_by": str(reviewed_by),
        "reviewed_at": now,
        "comment": comment or "",
    }

    sb.table("approvals").update(update_data).eq("id", str(approval_id)).execute()

    if row["target_type"] == "settlement":
        sb.table("settlements").update({"approval_status": "rejected"}).eq("id", row["target_id"]).execute()

    approver = sb.table("users").select("username").eq("id", str(reviewed_by)).limit(1).execute()
    approver_name = approver.data[0]["username"] if approver.data else "未知"

    requester = sb.table("users").select("username").eq("id", row["requested_by"]).limit(1).execute()
    requester_name = requester.data[0]["username"] if requester.data else "未知"

    target_summary = None
    if row["target_type"] == "settlement":
        t = sb.table("settlements").select("teacher_name, amount, period_start, period_end").eq("id", row["target_id"]).limit(1).execute()
        if t.data:
            target_summary = {
                "teacher_name": t.data[0].get("teacher_name", ""),
                "amount": t.data[0].get("amount", 0),
                "period_start": t.data[0].get("period_start", ""),
                "period_end": t.data[0].get("period_end", ""),
            }

    return ApprovalOut(
        id=row["id"],
        target_type=row["target_type"],
        target_id=row["target_id"],
        status="rejected",
        requested_by=row["requested_by"],
        requested_by_name=requester_name,
        reviewed_by=reviewed_by,
        reviewed_by_name=approver_name,
        comment=comment,
        created_at=row.get("created_at"),
        reviewed_at=now,
        target_summary=target_summary,
    )
