"""FastAPI dependency injection: authentication and role-based access control.

Per TECH-SPEC 4.3:
- get_current_user: decode JWT → CurrentUser + blacklist check
- require_role(*roles): role guard decorator
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from app.core.security import decode_token
from app.schemas.auth import CurrentUser
from app.services.auth import is_token_blacklisted

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/admin/login")


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

    return CurrentUser(
        id=sub,
        role=role,
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
