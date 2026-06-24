"""Roles & Permissions API — 3-C RBAC 管理。

Endpoints:
- GET  /api/v1/roles          — 列出角色 + 权限
- GET  /api/v1/permissions    — 列出所有权限码
- PUT  /api/v1/roles/{name}/permissions — 修改角色权限
"""

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.deps import require_permission, invalidate_permission_cache
from app.core.database import get_supabase
from app.schemas.auth import CurrentUser
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/roles", tags=["roles"])


# ──── Schemas ────

class PermissionOut(BaseModel):
    code: str
    label: str
    module: str


class RoleOut(BaseModel):
    name: str
    label: str
    is_builtin: bool
    permissions: list[str] = []


class UpdatePermissionsRequest(BaseModel):
    permission_codes: list[str]


# ──── Endpoints ────

@router.get("", response_model=list[RoleOut])
async def list_roles(user: CurrentUser = Depends(require_permission("roles:read"))):
    """列出所有角色及其权限码。"""
    sb = get_supabase()
    roles_res = sb.table("roles").select("id, name, label, is_builtin").order("id").execute()
    perm_res = sb.table("permissions").select("id, code").execute()
    perm_map = {p["id"]: p["code"] for p in perm_res.data}

    rp_res = sb.table("role_permissions").select("role_id, permission_id").execute()
    role_perms: dict[int, list[str]] = {}
    for rp in rp_res.data:
        rid = rp["role_id"]
        pid = rp["permission_id"]
        role_perms.setdefault(rid, []).append(perm_map.get(pid, "?"))

    result = []
    for r in roles_res.data:
        result.append(RoleOut(
            name=r["name"],
            label=r["label"],
            is_builtin=r["is_builtin"],
            permissions=sorted(role_perms.get(r["id"], [])),
        ))
    return result


@router.get("/permissions", response_model=list[PermissionOut])
async def list_permissions(user: CurrentUser = Depends(require_permission("roles:read"))):
    """列出所有权限码。"""
    sb = get_supabase()
    res = sb.table("permissions").select("code, label, module").order("id").execute()
    return [PermissionOut(**p) for p in res.data]


@router.put("/{role_name}/permissions")
async def update_role_permissions(
    role_name: str,
    body: UpdatePermissionsRequest,
    user: CurrentUser = Depends(require_permission("roles:write")),
):
    """修改角色权限（仅 roles:write 可用）。内置角色也可修改。"""
    sb = get_supabase()

    # 查 role
    role_res = sb.table("roles").select("id").eq("name", role_name).limit(1).execute()
    if not role_res.data:
        raise HTTPException(status_code=404, detail=f"角色 '{role_name}' 不存在")
    role_id = role_res.data[0]["id"]

    # 查 perm ids
    perm_res = sb.table("permissions").select("id, code").in_("code", body.permission_codes).execute()
    perm_ids = {p["id"] for p in perm_res.data}

    invalid = set(body.permission_codes) - {p["code"] for p in perm_res.data}
    if invalid:
        raise HTTPException(status_code=400, detail=f"无效权限码: {sorted(invalid)}")

    # 删除旧映射，插入新映射
    sb.table("role_permissions").delete().eq("role_id", role_id).execute()
    inserts = [{"role_id": role_id, "permission_id": pid} for pid in perm_ids]
    if inserts:
        sb.table("role_permissions").insert(inserts).execute()

    # 清缓存
    invalidate_permission_cache()

    return {"role": role_name, "permissions": sorted(body.permission_codes)}
