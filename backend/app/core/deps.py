"""FastAPI dependency injection: authentication and role-based access control.

Per TECH-SPEC 4.3:
- get_current_user: decode JWT → CurrentUser + blacklist check
- require_role(*roles): role guard decorator (legacy, retained for teacher/parent)
- require_permission(code): fine-grained permission check (3-C RBAC)
"""

import logging
import time

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from app.core.security import decode_token
from app.schemas.auth import CurrentUser
from app.services.auth import is_token_blacklisted

logger = logging.getLogger("permission_check")

# ═══ 3-C FAIL-OPEN 开关 ═══
# True  = 迁移期(Step 3-4): admin 角色缺权限映射时 fallback 放行 + 日志
# False = 正式期(Step 4 后): 所有角色缺权限一律 403
# 切换方法: 改此值 + 部署 + 重启
FAIL_OPEN_ENABLED = False  # 3-C: FAIL-CLOSED 验证通过，迁移窗口关闭

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/admin/login")

# ──── 3-C 权限缓存 ────
# role_name → set[permission_code]
_permission_cache: dict[str, set[str]] = {}
_cache_loaded_at: float = 0
_CACHE_TTL = 300  # 5min


async def _load_permissions_for_role(role_name: str) -> set[str]:
    """从 DB 查 role_permissions → permissions，返回权限码集合。

    内存缓存 5min TTL，过期自动重载。
    """
    global _permission_cache, _cache_loaded_at

    now = time.time()
    if now - _cache_loaded_at > _CACHE_TTL:
        _permission_cache.clear()
        _cache_loaded_at = now

    if role_name in _permission_cache:
        return _permission_cache[role_name]

    # DB 查询
    from app.core.database import get_supabase
    sb = get_supabase()

    # 查 role id
    role_result = sb.table("roles").select("id").eq("name", role_name).limit(1).execute()
    if not role_result.data:
        _permission_cache[role_name] = set()
        return set()

    role_id = role_result.data[0]["id"]

    # 查 permission ids
    rp_result = sb.table("role_permissions").select("permission_id").eq("role_id", role_id).execute()
    if not rp_result.data:
        _permission_cache[role_name] = set()
        return set()

    perm_ids = [r["permission_id"] for r in rp_result.data]

    # 查 permission codes
    perm_result = sb.table("permissions").select("code").in_("id", perm_ids).execute()
    codes = {p["code"] for p in perm_result.data}

    _permission_cache[role_name] = codes
    return codes


def invalidate_permission_cache():
    """强制清除缓存（给 roles API 写入后调用）。"""
    global _permission_cache, _cache_loaded_at
    _permission_cache.clear()
    _cache_loaded_at = 0


async def get_user_permissions(user: CurrentUser) -> set[str]:
    """获取用户权限码集合。用 role_name 优先，fallback 到 role。"""
    role_name = getattr(user, "role_name", None) or user.role
    return await _load_permissions_for_role(role_name)


async def get_current_user(token: str = Depends(oauth2_scheme)) -> CurrentUser:
    """Decode JWT → return CurrentUser.

    Checks:
    1. Token is valid and not expired
    2. Token is access-type (not refresh)
    3. Token is not in Redis blacklist
    4. Required claims are present

    Raises 401 on any failure.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail={"code": "INVALID_TOKEN", "message": "Could not validate credentials"},
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_token(token)
    except Exception:
        raise credentials_exception

    # Validate required claims
    sub = payload.get("sub")
    role = payload.get("role")
    token_type = payload.get("type")

    if not sub or not role or token_type != "access":
        raise credentials_exception

    # Validate role value
    if role not in ("parent", "teacher", "admin"):
        raise credentials_exception

    # Check Redis blacklist (logout)
    if await is_token_blacklisted(payload):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "TOKEN_REVOKED", "message": "令牌已失效，请重新登录"},
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Extract teacher_id claim if present
    teacher_id = payload.get("teacher_id")

    # 3-C: 查 role_name (仅 admin 角色需要细分)
    role_name = None
    if role == "admin":
        try:
            from app.core.database import get_supabase
            sb = get_supabase()
            u = sb.table("users").select("role_name").eq("id", sub).limit(1).execute()
            if u.data and u.data[0].get("role_name"):
                role_name = u.data[0]["role_name"]
        except Exception:
            pass  # DB 查失败时回退到 role 即可

    return CurrentUser(
        id=sub,
        role=role,
        role_name=role_name,
        teacher_id=teacher_id,
    )


def require_role(*roles: str):
    """Role guard dependency — only allows specified roles.

    Usage:
        @router.get("/admin-only")
        async def admin_endpoint(user=Depends(require_role("admin"))):
            ...
    """

    async def _guard(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"code": "FORBIDDEN", "message": "Insufficient permissions"},
            )
        return user

    return _guard


def require_permission(code: str):
    """细粒度权限检查 — 查 role_permissions 表。

    迁移期(Step 3-4) FAIL-OPEN: admin 角色查不到权限映射时 fallback 放行 + 记日志。
    Step 4 完成后改 FAIL-CLOSED: 所有角色一律拒绝。
    """

    async def _guard(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        perms = await get_user_permissions(user)
        if code in perms:
            return user

        # ═══ FAIL-OPEN: 仅迁移窗口 + 仅 admin ═══
        if FAIL_OPEN_ENABLED and user.role == "admin":
            logger.warning(
                "PERMISSION_FALLBACK | user=%s role=%s role_name=%s "
                "missing_perm=%s allowed_by=fail-open-migration-window",
                user.id, user.role, getattr(user, "role_name", None), code,
            )
            return user

        # ═══ FAIL-CLOSED: 非 admin ═══
        logger.warning(
            "PERMISSION_DENIED | user=%s role=%s required_perm=%s has_perms=%s",
            user.id, user.role, code, perms,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": f"需要权限: {code}"},
        )

    return _guard
