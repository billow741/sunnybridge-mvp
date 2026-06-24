"""Child CRUD service — business logic for student management.

Per TECH-SPEC 5.5 / DB-02:
- List children with pagination (admin)
- Create child: find/create parent by phone → associate → 409 if parent already has child
- Get child by id (admin)
- Update child (admin)
- Delete child (admin)
- Get my child (parent)
"""

import structlog
from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, status

from app.core.database import get_supabase
from app.schemas.child import (
    ChildOut,
    ChildCreate,
    ChildUpdate,
    PaginatedChildren,
    ParentBrief,
)

logger = structlog.get_logger()

DEFAULT_PAGE = 1
DEFAULT_PAGE_SIZE = 20


async def _find_or_create_parent(phone: str) -> str:
    """Find existing parent user by phone, or create a new parent user.

    Returns: user_id (UUID string)
    
    Raises 409 if phone belongs to a non-parent user (e.g. admin).
    """
    sb = get_supabase()

    # Check if user exists
    result = sb.table("users").select("id, role").eq("phone", phone).limit(1).execute()
    if result.data:
        user = result.data[0]
        if user["role"] != "parent":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "INVALID_PARENT_ROLE",
                    "message": f"该手机号已注册为{user['role']}角色，无法作为家长关联",
                },
            )
        return user["id"]

    # Auto-create parent user
    new_user = sb.table("users").insert({
        "phone": phone,
        "role": "parent",
        "nickname": f"用户{phone[-4:]}",
    }).execute()
    logger.info("parent_auto_created", phone=phone[:3] + "****")
    return new_user.data[0]["id"]


async def _enrich_child(row: dict) -> ChildOut:
    """Enrich a child record with parent brief info."""
    sb = get_supabase()
    parent_id = row.get("parent_id")
    parent_brief = None

    if parent_id:
        p = sb.table("users").select("id, phone, nickname").eq("id", parent_id).limit(1).execute()
        if p.data:
            parent_brief = ParentBrief(**p.data[0])

    row["parent"] = parent_brief
    # 计算课时余额
    row["totalhours"] = row.get("totalhours") or 0
    row["usedhours"] = row.get("usedhours") or 0
    row["remaining_hours"] = row["totalhours"] - row["usedhours"]
    return ChildOut(**row)


async def list_children(page: int = DEFAULT_PAGE, page_size: int = DEFAULT_PAGE_SIZE,
                       search: str | None = None, level: str | None = None) -> PaginatedChildren:
    """List all children with pagination + search. Admin only."""
    sb = get_supabase()

    count_q = sb.table("children").select("id", count="exact")
    if search:
        count_q = count_q.ilike("name", f"%{search}%")
    if level:
        count_q = count_q.eq("level", level)
    count_result = count_q.execute()
    total = count_result.count if count_result.count is not None else 0

    offset = (page - 1) * page_size
    result_q = (
        sb.table("children")
        .select("*")
        .order("created_at", desc=True)
        .range(offset, offset + page_size - 1)
    )
    if search:
        result_q = result_q.ilike("name", f"%{search}%")
    if level:
        result_q = result_q.eq("level", level)
    result = result_q.execute()

    items = [await _enrich_child(row) for row in result.data]
    return PaginatedChildren(items=items, total=total, page=page, page_size=page_size)


async def create_child(body: ChildCreate) -> ChildOut:
    """Create a child. Find or create parent by phone.

    If parent already has a child → 409 (UNIQUE constraint).
    """
    sb = get_supabase()

    # Find or create parent
    parent_id = await _find_or_create_parent(body.parent_phone)

    # Check if parent already has a child
    existing = sb.table("children").select("id").eq("parent_id", parent_id).limit(1).execute()
    if existing.data:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "CHILD_PARENT_DUPLICATE",
                "message": f"该家长已有孩子记录，一个家长只能关联一个孩子",
            },
        )

    # Insert child
    insert_data = {
        "name": body.name,
        "parent_id": parent_id,
        "totalhours": body.totalhours,
        "usedhours": body.usedhours,
    }
    if body.english_name is not None:
        insert_data["english_name"] = body.english_name
    if body.birth_date is not None:
        insert_data["birth_date"] = body.birth_date.isoformat()
    if body.level is not None:
        insert_data["level"] = body.level

    result = sb.table("children").insert(insert_data).execute()
    child = await _enrich_child(result.data[0])
    logger.info("child_created", child_id=str(child.id), parent_id=parent_id)
    return child


async def get_child(child_id: UUID) -> ChildOut:
    """Get a child by ID. Not found → 404."""
    sb = get_supabase()

    result = sb.table("children").select("*").eq("id", str(child_id)).limit(1).execute()
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "CHILD_NOT_FOUND", "message": "学生不存在"},
        )

    return await _enrich_child(result.data[0])


async def update_child(child_id: UUID, body: ChildUpdate) -> ChildOut:
    """Update a child. Only provided fields are updated.

    If parent_phone is changed, find/create new parent and re-assign.
    Not found → 404.
    """
    sb = get_supabase()

    # Verify child exists
    existing = sb.table("children").select("*").eq("id", str(child_id)).limit(1).execute()
    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "CHILD_NOT_FOUND", "message": "学生不存在"},
        )

    update_data = {}
    if body.name is not None:
        update_data["name"] = body.name
    if body.english_name is not None:
        update_data["english_name"] = body.english_name
    if body.birth_date is not None:
        update_data["birth_date"] = body.birth_date.isoformat()
    if body.level is not None:
        update_data["level"] = body.level
    if body.totalhours is not None:
        update_data["totalhours"] = body.totalhours
    if body.usedhours is not None:
        update_data["usedhours"] = body.usedhours
    if body.parent_phone is not None:
        # Re-assign to new parent
        new_parent_id = await _find_or_create_parent(body.parent_phone)
        # Check if new parent already has a different child
        dup = sb.table("children").select("id").eq("parent_id", new_parent_id).neq("id", str(child_id)).limit(1).execute()
        if dup.data:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={"code": "CHILD_PARENT_DUPLICATE", "message": "该家长已有其他孩子记录"},
            )
        update_data["parent_id"] = new_parent_id

    if not update_data:
        return await _enrich_child(existing.data[0])

    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = sb.table("children").update(update_data).eq("id", str(child_id)).execute()
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "CHILD_NOT_FOUND", "message": "学生不存在"},
        )

    child = await _enrich_child(result.data[0])
    logger.info("child_updated", child_id=str(child_id))
    return child


async def delete_child(child_id: UUID) -> dict:
    """Hard-delete a child. Not found → 404.

    Note: TECH-SPEC uses ON DELETE CASCADE on parent_id FK,
    so deleting a parent would cascade-delete children.
    Here we delete the child directly (admin operation).
    """
    sb = get_supabase()

    # Verify exists
    existing = sb.table("children").select("id").eq("id", str(child_id)).limit(1).execute()
    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "CHILD_NOT_FOUND", "message": "学生不存在"},
        )

    sb.table("children").delete().eq("id", str(child_id)).execute()
    logger.info("child_deleted", child_id=str(child_id))
    return {"message": "学生已删除", "child_id": str(child_id)}


async def get_my_child(user_id: UUID) -> ChildOut:
    """Get the child of the current parent user.

    If parent has no child → 404.
    If user is not a parent → should be blocked by router (403).
    """
    sb = get_supabase()

    result = sb.table("children").select("*").eq("parent_id", str(user_id)).limit(1).execute()
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "CHILD_NOT_FOUND", "message": "您还没有关联的孩子信息"},
        )

    return await _enrich_child(result.data[0])
