"""Admin Users API — 后台账号管理 (users.role=admin).

Endpoints:
- GET    /api/v1/admin-users          — 列出所有 admin 账号
- POST   /api/v1/admin-users          — 创建 admin 账号
- PUT    /api/v1/admin-users/{id}      — 修改账号 (昵称/角色/密码)
- DELETE /api/v1/admin-users/{id}      — 软禁用 (is_active=false)

保护逻辑:
- 不能禁用自己 (is_current_user)
- 至少保留一个 active super_admin
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional
import bcrypt

from app.core.deps import require_permission
from app.core.database import get_supabase
from app.schemas.auth import CurrentUser

router = APIRouter(prefix="/api/v1/admin-users", tags=["admin-users"])

# ──── Schemas ────

ADMIN_ROLE_NAMES = ["super_admin", "admin", "operations", "finance_readonly"]
ROLE_NAME_LABELS = {
    "super_admin": "超级管理员",
    "admin": "管理员",
    "operations": "运营",
    "finance_readonly": "财务只读",
}

class AdminUserOut(BaseModel):
    id: str
    username: str
    nickname: Optional[str] = None
    phone: str
    role_name: str
    is_active: bool
    has_password: bool = True
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True

class CreateAdminUser(BaseModel):
    username: str = Field(..., min_length=2, max_length=50, pattern=r"^[a-zA-Z0-9_]+$")
    password: str = Field(..., min_length=6, max_length=50)
    nickname: Optional[str] = Field(None, max_length=50)
    phone: str = Field(..., pattern=r"^\d{6,20}$")
    role_name: str = Field(..., pattern=r"^(super_admin|admin|operations|finance_readonly)$")

class UpdateAdminUser(BaseModel):
    nickname: Optional[str] = Field(None, max_length=50)
    role_name: Optional[str] = Field(None, pattern=r"^(super_admin|admin|operations|finance_readonly)$")
    password: Optional[str] = Field(None, min_length=6, max_length=50, description="留空不改密码")

class AdminUserListOut(BaseModel):
    id: str
    username: str
    nickname: Optional[str] = None
    phone: str
    role_name: str
    role_label: str = ""
    is_active: bool
    is_current_user: bool = False
    created_at: Optional[str] = None

# ──── Helpers ────

def _hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()

def _to_out(row: dict, current_user_id: str = "") -> AdminUserListOut:
    rn = row.get("role_name", "admin")
    return AdminUserListOut(
        id=row["id"],
        username=row.get("username", ""),
        nickname=row.get("nickname"),
        phone=row.get("phone", ""),
        role_name=rn,
        role_label=ROLE_NAME_LABELS.get(rn, rn),
        is_active=row.get("is_active", True),
        is_current_user=(row["id"] == current_user_id),
        created_at=row.get("created_at"),
    )

# ──── Endpoints ────

@router.get("", response_model=list[AdminUserListOut])
async def list_admin_users(user: CurrentUser = Depends(require_permission("roles:read"))):
    """列出所有 admin 账号。"""
    sb = get_supabase()
    res = sb.table("users").select(
        "id, username, nickname, phone, role_name, is_active, created_at"
    ).eq("role", "admin").order("created_at", desc=False).execute()

    return [_to_out(r, user.id) for r in res.data]


@router.post("", response_model=AdminUserOut, status_code=status.HTTP_201_CREATED)
async def create_admin_user(
    body: CreateAdminUser,
    user: CurrentUser = Depends(require_permission("roles:write")),
):
    """创建 admin 账号。"""
    sb = get_supabase()

    # 检查 username 唯一
    existing = sb.table("users").select("id").eq("username", body.username).eq("role", "admin").execute()
    if existing.data:
        raise HTTPException(400, detail=f"用户名 '{body.username}' 已存在")

    # 检查 phone 唯一
    phone_existing = sb.table("users").select("id").eq("phone", body.phone).execute()
    if phone_existing.data:
        raise HTTPException(400, detail=f"手机号 '{body.phone}' 已被使用")

    password_hash = _hash_password(body.password)

    row = {
        "username": body.username,
        "phone": body.phone,
        "nickname": body.nickname or body.username,
        "role": "admin",
        "role_name": body.role_name,
        "password_hash": password_hash,
        "is_active": True,
    }

    res = sb.table("users").insert(row).execute()
    if not res.data:
        raise HTTPException(500, detail="创建失败")

    r = res.data[0]
    return AdminUserOut(
        id=r["id"],
        username=r.get("username", ""),
        nickname=r.get("nickname"),
        phone=r.get("phone", ""),
        role_name=r.get("role_name", "admin"),
        is_active=r.get("is_active", True),
        has_password=True,
        created_at=r.get("created_at"),
        updated_at=r.get("updated_at"),
    )


@router.put("/{user_id}", response_model=AdminUserOut)
async def update_admin_user(
    user_id: str,
    body: UpdateAdminUser,
    current_user: CurrentUser = Depends(require_permission("roles:write")),
):
    """修改 admin 账号。"""
    sb = get_supabase()

    # 确认目标用户存在且是 admin
    target = sb.table("users").select("id, username, nickname, phone, role_name, is_active, password_hash, created_at, updated_at").eq("id", user_id).eq("role", "admin").limit(1).execute()
    if not target.data:
        raise HTTPException(404, detail="账号不存在")

    updates: dict = {}

    if body.nickname is not None:
        updates["nickname"] = body.nickname

    if body.role_name is not None:
        # 降级保护：如果是最后一个 active super_admin，不允许降级
        if target.data[0].get("role_name") == "super_admin" and body.role_name != "super_admin":
            active_super = sb.table("users").select("id").eq("role", "admin").eq("role_name", "super_admin").eq("is_active", True).execute()
            if len(active_super.data) <= 1:
                raise HTTPException(400, detail="至少保留一个活跃的超级管理员")
        updates["role_name"] = body.role_name

    if body.password:
        updates["password_hash"] = _hash_password(body.password)

    if not updates:
        # 没改东西，直接返回
        r = target.data[0]
        return AdminUserOut(
            id=r["id"], username=r.get("username", ""),
            nickname=r.get("nickname"), phone=r.get("phone", ""),
            role_name=r.get("role_name", "admin"),
            is_active=r.get("is_active", True),
            has_password=bool(r.get("password_hash")),
            created_at=r.get("created_at"), updated_at=r.get("updated_at"),
        )

    res = sb.table("users").update(updates).eq("id", user_id).execute()
    if not res.data:
        raise HTTPException(500, detail="更新失败")

    r = res.data[0]
    return AdminUserOut(
        id=r["id"], username=r.get("username", ""),
        nickname=r.get("nickname"), phone=r.get("phone", ""),
        role_name=r.get("role_name", "admin"),
        is_active=r.get("is_active", True),
        has_password=bool(r.get("password_hash")),
        created_at=r.get("created_at"), updated_at=r.get("updated_at"),
    )


@router.delete("/{user_id}")
async def disable_admin_user(
    user_id: str,
    current_user: CurrentUser = Depends(require_permission("roles:write")),
):
    """软禁用 admin 账号 (is_active=false)。"""
    sb = get_supabase()

    # 不能禁用自己
    if user_id == current_user.id:
        raise HTTPException(400, detail="不能禁用自己的账号")

    # 确认目标存在且是 admin
    target = sb.table("users").select("id, role_name, is_active").eq("id", user_id).eq("role", "admin").limit(1).execute()
    if not target.data:
        raise HTTPException(404, detail="账号不存在")

    if not target.data[0].get("is_active", True):
        raise HTTPException(400, detail="该账号已被禁用")

    # 如果是 super_admin，检查是否最后一个
    if target.data[0].get("role_name") == "super_admin":
        active_super = sb.table("users").select("id").eq("role", "admin").eq("role_name", "super_admin").eq("is_active", True).execute()
        if len(active_super.data) <= 1:
            raise HTTPException(400, detail="至少保留一个活跃的超级管理员")

    res = sb.table("users").update({"is_active": False}).eq("id", user_id).execute()
    if not res.data:
        raise HTTPException(500, detail="操作失败")

    return {"id": user_id, "is_active": False, "message": "已禁用"}
