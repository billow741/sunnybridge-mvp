"""Teacher management service (API-04).

Business logic for teacher CRUD + password reset.
All operations require admin role — enforced at router level.
"""

from datetime import datetime, timezone
from uuid import UUID

from app.core.database import get_supabase
from app.core.security import generate_initial_password, hash_password
from app.schemas.teacher import (
    TeacherCreateResponse,
    TeacherDeleteResponse,
    TeacherListResponse,
    TeacherOut,
    TeacherResetPasswordResponse,
    TeacherRestoreResponse,
)

# Columns to select from teachers table — NEVER include password_hash
_TEACHER_COLUMNS = "id,username,phone,name,avatar_url,hourly_rate,is_active,must_change_password,created_at,updated_at"


# ---------------------------------------------------------------------------
# List teachers (paginated)
# ---------------------------------------------------------------------------

def list_teachers(page: int = 1, page_size: int = 20, include_inactive: bool = True) -> TeacherListResponse:
    """Return paginated teacher list, ordered by created_at desc.

    By default includes both active and inactive teachers so admin can
    see soft-deleted records and restore them.
    """
    sb = get_supabase()
    offset = (page - 1) * page_size

    query = (
        sb.table("teachers")
        .select(_TEACHER_COLUMNS, count="exact")
        .order("created_at", desc=True)
    )
    if not include_inactive:
        query = query.eq("is_active", True)

    result = query.range(offset, offset + page_size - 1).execute()

    items = [TeacherOut(**row) for row in result.data]
    total = result.count if result.count is not None else len(items)

    return TeacherListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


# ---------------------------------------------------------------------------
# Create teacher
# ---------------------------------------------------------------------------

def create_teacher(username: str, name: str, phone: str | None = None, hourly_rate: float | None = None) -> TeacherCreateResponse:
    """Create a teacher with auto-generated initial password.

    Returns the teacher record + initial_password (plaintext).
    Raises ValueError on duplicate username (among active teachers).
    Phone is optional (Philippine teachers may not provide it).

    If a soft-deleted teacher with the same phone exists, reactivates it
    (updates username, name, resets password) instead of inserting a new row —
    this avoids potential DB conflicts.
    """
    sb = get_supabase()

    # Check for duplicate username among active teachers
    username_existing = sb.table("teachers").select("id").eq("username", username).eq("is_active", True).execute()
    if username_existing.data:
        raise ValueError(f"用户名 {username} 已存在")

    # Check for duplicate phone among active teachers (only if phone provided)
    if phone:
        active_existing = sb.table("teachers").select("id").eq("phone", phone).eq("is_active", True).execute()
        if active_existing.data:
            raise ValueError(f"手机号 {phone} 已存在")

    # Generate initial password
    initial_password = generate_initial_password()
    password_hash = hash_password(initial_password)

    # Check if a soft-deleted teacher with this phone exists (for reactivation)
    deleted_existing = sb.table("teachers").select("id").eq("is_active", False)
    deleted_existing = deleted_existing.eq("phone", phone).execute() if phone else deleted_existing.execute()
    if phone and deleted_existing.data:
        # Reactivate the soft-deleted teacher instead of inserting new
        now = datetime.now(timezone.utc).isoformat()
        row = (
            sb.table("teachers")
            .update({
                "username": username,
                "name": name,
                "password_hash": password_hash,
                "must_change_password": True,
                "is_active": True,
                "updated_at": now,
            })
            .eq("id", deleted_existing.data[0]["id"])
            .execute()
            .data[0]
        )
    else:
        # Insert new teacher
        insert_payload = {
            "username": username,
            "name": name,
            "password_hash": password_hash,
            "must_change_password": True,
            "is_active": True,
        }
        if phone:
            insert_payload["phone"] = phone
        if hourly_rate is not None:
            insert_payload["hourly_rate"] = hourly_rate
        row = (
            sb.table("teachers")
            .insert(insert_payload)
            .execute()
            .data[0]
        )

    return TeacherCreateResponse(
        id=row["id"],
        username=row["username"],
        phone=row["phone"],
        name=row["name"],
        avatar_url=row.get("avatar_url"),
        is_active=row["is_active"],
        must_change_password=row["must_change_password"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
        initial_password=initial_password,
    )


# ---------------------------------------------------------------------------
# Get teacher by ID
# ---------------------------------------------------------------------------

def get_teacher(teacher_id: UUID) -> TeacherOut | None:
    """Return a single active teacher by ID, or None if not found.

    Only returns teachers where is_active=True.
    Soft-deleted teachers are treated as non-existent.
    """
    sb = get_supabase()
    result = (
        sb.table("teachers")
        .select(_TEACHER_COLUMNS)
        .eq("id", str(teacher_id))
        .eq("is_active", True)
        .execute()
    )
    if not result.data:
        return None
    return TeacherOut(**result.data[0])


# ---------------------------------------------------------------------------
# Update teacher
# ---------------------------------------------------------------------------

def update_teacher(teacher_id: UUID, **fields) -> TeacherOut | None:
    """Update teacher fields. Returns updated teacher or None if not found.

    Raises ValueError if new username or phone conflicts with existing teacher.
    """
    sb = get_supabase()

    # Verify teacher exists
    existing = get_teacher(teacher_id)
    if existing is None:
        return None

    # Build update payload (only non-None fields)
    update_data = {}

    if "username" in fields and fields["username"] is not None:
        new_username = fields["username"]
        # Check username conflict among active teachers (exclude current teacher)
        conflict = (
            sb.table("teachers")
            .select("id")
            .eq("username", new_username)
            .eq("is_active", True)
            .neq("id", str(teacher_id))
            .execute()
        )
        if conflict.data:
            raise ValueError(f"用户名 {new_username} 已被其他教师使用")
        update_data["username"] = new_username

    if "phone" in fields and fields["phone"] is not None:
        new_phone = fields["phone"]
        # Check phone conflict among active teachers (exclude current teacher + soft-deleted)
        conflict = (
            sb.table("teachers")
            .select("id")
            .eq("phone", new_phone)
            .eq("is_active", True)
            .neq("id", str(teacher_id))
            .execute()
        )
        if conflict.data:
            raise ValueError(f"手机号 {new_phone} 已被其他教师使用")
        update_data["phone"] = new_phone

    if "name" in fields and fields["name"] is not None:
        update_data["name"] = fields["name"]

    if "avatar_url" in fields:
        update_data["avatar_url"] = fields["avatar_url"]

    if "hourly_rate" in fields:
        update_data["hourly_rate"] = fields["hourly_rate"]

    if not update_data:
        return existing

    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    row = (
        sb.table("teachers")
        .update(update_data)
        .eq("id", str(teacher_id))
        .execute()
        .data[0]
    )

    return TeacherOut(**row)


# ---------------------------------------------------------------------------
# Soft delete teacher (set is_active=false)
# ---------------------------------------------------------------------------

def delete_teacher(teacher_id: UUID) -> TeacherDeleteResponse | None:
    """Soft-delete a teacher by setting is_active=false.

    Returns the teacher ID + is_active=false, or None if not found.
    """
    sb = get_supabase()

    existing = get_teacher(teacher_id)
    if existing is None:
        return None

    row = (
        sb.table("teachers")
        .update({
            "is_active": False,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })
        .eq("id", str(teacher_id))
        .execute()
        .data[0]
    )

    return TeacherDeleteResponse(
        id=row["id"],
        is_active=row["is_active"],
    )


# ---------------------------------------------------------------------------
# Reset teacher password
# ---------------------------------------------------------------------------

def reset_teacher_password(teacher_id: UUID) -> TeacherResetPasswordResponse | None:
    """Reset a teacher's password to a new auto-generated initial password.

    Side effects:
    - password_hash updated to new bcrypt hash
    - must_change_password set to true
    - password_updated_at set to now()

    Returns the teacher ID + new_initial_password, or None if not found.
    """
    sb = get_supabase()

    existing = get_teacher(teacher_id)
    if existing is None:
        return None

    new_initial_password = generate_initial_password()
    password_hash = hash_password(new_initial_password)
    now = datetime.now(timezone.utc).isoformat()

    row = (
        sb.table("teachers")
        .update({
            "password_hash": password_hash,
            "must_change_password": True,
            "password_updated_at": now,
            "updated_at": now,
        })
        .eq("id", str(teacher_id))
        .execute()
        .data[0]
    )

    return TeacherResetPasswordResponse(
        id=row["id"],
        new_initial_password=new_initial_password,
        must_change_password=True,
    )


# ---------------------------------------------------------------------------
# Restore teacher (set is_active=true)
# ---------------------------------------------------------------------------

def restore_teacher(teacher_id: UUID) -> TeacherRestoreResponse | None:
    """Restore a soft-deleted teacher by setting is_active=true.

    Returns the teacher ID + is_active=true, or None if not found or already active.
    Also resets password to a new auto-generated initial password and sets
    must_change_password=true, since the old password may be stale.
    """
    sb = get_supabase()

    # Find the teacher (including soft-deleted)
    result = (
        sb.table("teachers")
        .select("id, is_active")
        .eq("id", str(teacher_id))
        .execute()
    )
    if not result.data:
        return None

    teacher = result.data[0]

    # Already active — idempotent, no password reset needed
    if teacher["is_active"]:
        return TeacherRestoreResponse(
            id=teacher["id"],
            is_active=True,
            new_initial_password="",
            must_change_password=False,
        )

    # Reactivate + reset password (since old password may be stale)
    new_initial_password = generate_initial_password()
    password_hash = hash_password(new_initial_password)
    now = datetime.now(timezone.utc).isoformat()

    row = (
        sb.table("teachers")
        .update({
            "is_active": True,
            "password_hash": password_hash,
            "must_change_password": True,
            "updated_at": now,
        })
        .eq("id", str(teacher_id))
        .execute()
        .data[0]
    )

    return TeacherRestoreResponse(
        id=row["id"],
        is_active=row["is_active"],
        new_initial_password=new_initial_password,
        must_change_password=True,
    )
