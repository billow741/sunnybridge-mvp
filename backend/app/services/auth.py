"""Auth service — SMS verification code send/verify business logic (API-02)
+ username+password login for teacher/admin/parent (API-02b/03).

Per TECH-SPEC 5.1 / 9.1 + CHANGELOG_teacher_password_login.md:
- Generate 6-digit code, store in sms_codes DB table
- 60s send rate limit (Redis)
- 5 verify attempts, then lock 30 min
- 5 min code expiry
- Auto-create user (role=parent) for new phone numbers
- **家长端专用** — 不查询 teachers 表，教师登录走 API-02b
- Dev mode: return fixed code 888888
- 2026-06-09: teacher/admin login 改用 username；新增 parent 密码登录
"""

import random
import structlog
from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import HTTPException

from app.core.config import get_settings
from app.core.database import get_supabase
from app.core.redis import get_redis
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.schemas.auth import (
    AdminLoginErrorResponse,
    AdminLoginResponse,
    ParentLoginErrorResponse,
    ParentLoginResponse,
    SMSSendResponse,
    SMSVerifyErrorResponse,
    SMSVerifyResponse,
    TeacherLoginErrorResponse,
)

logger = structlog.get_logger()
settings = get_settings()

# Rate limit keys
_SMS_RATE_PREFIX = "sms:rate:"    # sms:rate:{phone} → TTL for 60s cooldown
_SMS_LOCK_PREFIX = "sms:lock:"    # sms:lock:{phone} → locked_until timestamp
_ADMIN_LOCK_PREFIX = "admin:lock:"   # admin:lock:{username} → locked_until timestamp
_ADMIN_FAIL_PREFIX = "admin:fail:"   # admin:fail:{username} → failed attempt count
_PARENT_LOCK_PREFIX = "parent:lock:" # parent:lock:{phone} → locked_until timestamp
_PARENT_FAIL_PREFIX = "parent:fail:" # parent:fail:{phone} → failed attempt count
_BL = "blocklist:"  # bl:{jti}

# Constants
CODE_EXPIRY_MINUTES = 5
MAX_VERIFY_ATTEMPTS = 5
LOCK_DURATION_MINUTES = 30
ADMIN_LOCK_DURATION_MINUTES = 15
PARENT_LOCK_DURATION_MINUTES = 15
MAX_ADMIN_LOGIN_ATTEMPTS = 5
MAX_PARENT_LOGIN_ATTEMPTS = 5
SEND_COOLDOWN_SECONDS = 60


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _mask_phone(phone: str) -> str:
    """Mask phone for logging: 138****1234"""
    if len(phone) >= 7:
        return phone[:3] + "****" + phone[-4:]
    return "***"


def _generate_code() -> str:
    """Generate a 6-digit verification code."""
    return f"{random.randint(0, 999999):06d}"


async def _teacher_login_fail(
    username: str, now: datetime, lock_key: str, redis,
) -> None:
    """Increment fail counter and raise appropriate HTTPException.

    Used by: non-existent username, inactive teacher, wrong password.
    Raises same TEACHER_INVALID_CREDENTIALS / TEACHER_LOCKED to prevent
    username enumeration (PRD 9.8, TECH-SPEC 9.1).
    """
    from app.schemas.auth import TeacherLoginErrorResponse

    fail_key = f"{_TEACHER_FAIL_PREFIX}{username}"
    fail_count = await redis.incr(fail_key)
    if fail_count == 1:
        await redis.expire(fail_key, TEACHER_LOCK_DURATION_MINUTES * 60)

    attempts_remaining = MAX_TEACHER_LOGIN_ATTEMPTS - fail_count

    if attempts_remaining <= 0:
        locked_until = now + timedelta(minutes=TEACHER_LOCK_DURATION_MINUTES)
        await redis.set(lock_key, locked_until.isoformat(), ex=TEACHER_LOCK_DURATION_MINUTES * 60)
        await redis.delete(fail_key)
        raise HTTPException(
            status_code=429,
            detail=TeacherLoginErrorResponse(
                code="TEACHER_LOCKED",
                message="登录失败次数过多，账号已锁定15分钟",
                attempts_remaining=0,
                locked_until=locked_until.isoformat(),
            ).model_dump(),
        )

    raise HTTPException(
        status_code=401,
        detail=TeacherLoginErrorResponse(
            code="TEACHER_INVALID_CREDENTIALS",
            message="用户名或密码错误",
            attempts_remaining=attempts_remaining,
        ).model_dump(),
    )


# ---------------------------------------------------------------------------
# SMS Send
# ---------------------------------------------------------------------------


async def send_sms_code(phone: str) -> SMSSendResponse:
    """Send a verification code to the given phone number.

    Steps:
    1. Check 60s rate limit (Redis)
    2. Check if phone is locked (too many verify failures)
    3. Generate code (dev: fixed 888888)
    4. Store in sms_codes DB table
    5. Call Tencent SMS API (dev: skip)
    6. Set rate limit key in Redis
    """
    # 1. Check 60s rate limit
    redis = await get_redis()
    rate_key = f"{_SMS_RATE_PREFIX}{phone}"
    ttl = await redis.ttl(rate_key)
    if ttl and ttl > 0:
        raise HTTPException(
            status_code=429,
            detail={
                "code": "SMS_RATE_LIMITED",
                "message": f"请{ttl}秒后再试",
            },
        )

    # 2. Check if locked (too many verify failures)
    lock_key = f"{_SMS_LOCK_PREFIX}{phone}"
    locked_until_str = await redis.get(lock_key)
    if locked_until_str:
        locked_until = datetime.fromisoformat(locked_until_str)
        if datetime.now(timezone.utc) < locked_until:
            remaining = int((locked_until - datetime.now(timezone.utc)).total_seconds() / 60)
            raise HTTPException(
                status_code=429,
                detail={
                    "code": "SMS_LOCKED",
                    "message": f"验证失败次数过多，请{remaining}分钟后再试",
                    "locked_until": locked_until.isoformat(),
                },
            )

    # 3. Generate code
    if settings.app_env == "development":
        code = settings.sms_dev_code
    else:
        code = _generate_code()

    # 4. Store in sms_codes DB table
    sb = get_supabase()
    now = datetime.now(timezone.utc)
    sb.table("sms_codes").insert({
        "phone": phone,
        "code": code,
        "used": False,
        "attempt_count": 0,
        "expires_at": (now + timedelta(minutes=CODE_EXPIRY_MINUTES)).isoformat(),
    }).execute()

    logger.info("sms_code_sent", phone=_mask_phone(phone))

    # 5. Call Tencent SMS API (production only)
    if settings.app_env != "development" and settings.tencent_sms_sdk_id:
        await _send_tencent_sms(phone, code)

    # 6. Set rate limit key
    await redis.set(rate_key, "1", ex=SEND_COOLDOWN_SECONDS)

    return SMSSendResponse(
        message="Verification code sent",
        dev_code=code if settings.app_env == "development" else None,
    )


async def _send_tencent_sms(phone: str, code: str) -> None:
    """Send SMS via Tencent Cloud SMS API.

    TODO: Implement when Tencent SMS credentials are configured.
    For now, this is a placeholder that logs and returns.
    """
    logger.info("tencent_sms_send", phone=_mask_phone(phone))


# ---------------------------------------------------------------------------
# SMS Verify
# ---------------------------------------------------------------------------


async def verify_sms_code(phone: str, code: str) -> SMSVerifyResponse:
    """Verify a SMS code and return JWT tokens (API-02, parents only).

    Steps:
    1. Check if phone is locked
    2. Find latest unused, unexpired code for phone
    3. Compare codes
    4. On mismatch: increment attempt_count, lock if 5 failures
    5. On match: mark code as used, find/create user (role=parent), sign JWT

    **绝不查询 teachers 表。** 教师登录走 API-02b。
    """
    redis = await get_redis()

    # 1. Check if locked
    lock_key = f"{_SMS_LOCK_PREFIX}{phone}"
    locked_until_str = await redis.get(lock_key)
    if locked_until_str:
        locked_until = datetime.fromisoformat(locked_until_str)
        if datetime.now(timezone.utc) < locked_until:
            remaining_min = int((locked_until - datetime.now(timezone.utc)).total_seconds() / 60) + 1
            raise HTTPException(
                status_code=429,
                detail={
                    "code": "SMS_LOCKED",
                    "message": f"验证失败次数过多，请{remaining_min}分钟后再试",
                    "locked_until": locked_until.isoformat(),
                },
            )
    # Lock expired, clean up
    await redis.delete(lock_key)

    # 2. Find latest unused code (filter unexpired at DB level for efficiency)
    sb = get_supabase()
    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()

    result = sb.table("sms_codes").select("*").eq("phone", phone).eq("used", False).gte("expires_at", now_iso).order("created_at", desc=True).limit(1).execute()

    if not result.data:
        expired_result = sb.table("sms_codes").select("id").eq("phone", phone).eq("used", False).lt("expires_at", now_iso).limit(1).execute()
        if expired_result.data:
            raise HTTPException(
                status_code=401,
                detail=SMSVerifyErrorResponse(
                    code="SMS_CODE_EXPIRED",
                    message="验证码已过期，请重新发送",
                    attempts_remaining=MAX_VERIFY_ATTEMPTS,
                ).model_dump(),
            )
        raise HTTPException(
            status_code=401,
            detail=SMSVerifyErrorResponse(
                code="SMS_CODE_NOT_FOUND",
                message="验证码不存在，请重新发送",
                attempts_remaining=MAX_VERIFY_ATTEMPTS,
            ).model_dump(),
        )

    sms_record = result.data[0]
    sms_id = sms_record["id"]
    stored_code = sms_record["code"]
    attempt_count = sms_record.get("attempt_count", 0)

    # 3. Compare codes
    if code != stored_code:
        new_attempt = attempt_count + 1
        attempts_remaining = MAX_VERIFY_ATTEMPTS - new_attempt

        if attempts_remaining <= 0:
            locked_until = now + timedelta(minutes=LOCK_DURATION_MINUTES)
            sb.table("sms_codes").update({
                "attempt_count": new_attempt,
                "locked_until": locked_until.isoformat(),
            }).eq("id", sms_id).execute()
            await redis.set(lock_key, locked_until.isoformat(), ex=LOCK_DURATION_MINUTES * 60)

            raise HTTPException(
                status_code=429,
                detail=SMSVerifyErrorResponse(
                    code="SMS_LOCKED",
                    message="验证失败次数过多，请30分钟后再试",
                    attempts_remaining=0,
                    locked_until=locked_until.isoformat(),
                ).model_dump(),
            )

        sb.table("sms_codes").update({
            "attempt_count": new_attempt,
        }).eq("id", sms_id).execute()

        raise HTTPException(
            status_code=401,
            detail=SMSVerifyErrorResponse(
                code="SMS_CODE_INVALID",
                message="验证码错误",
                attempts_remaining=attempts_remaining,
            ).model_dump(),
        )

    # 5. Match — mark code as used
    sb.table("sms_codes").update({"used": True}).eq("id", sms_id).execute()

    # Find or create user (parents only — no teachers table lookup)
    user_id, role, is_new_user = await _resolve_user(phone)

    # Sign JWT (no teacher_id — teachers use API-02b)
    access_token = create_access_token(user_id, role)
    refresh_token = create_refresh_token(user_id, role)

    logger.info("sms_login_success", phone=_mask_phone(phone), role=role, new_user=is_new_user)

    return SMSVerifyResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="Bearer",
        expires_in=settings.jwt_access_expire_minutes * 60,
        role=role,
        is_new_user=is_new_user,
    )


async def _resolve_user(phone: str) -> tuple[str, str, bool]:
    """Resolve user identity from phone number (API-02, parents only).

    Logic per TECH-SPEC + CHANGELOG:
    1. Check users table — if match with role=parent, return existing user
    2. If match but role != parent → reject (non-parent roles must use their own login endpoint)
    3. Not found → auto-create user (role=parent)

    Returns: (user_id, role, is_new_user)
    """
    sb = get_supabase()

    user_result = sb.table("users").select("id, role").eq("phone", phone).limit(1).execute()
    if user_result.data:
        user = user_result.data[0]
        if user["role"] != "parent":
            raise HTTPException(
                status_code=403,
                detail={
                    "code": "SMS_LOGIN_ROLE_MISMATCH",
                    "message": f"该手机号为{user['role']}账号，请使用对应的登录方式",
                },
            )
        return (user["id"], user["role"], False)

    # Auto-create new parent user
    new_user = sb.table("users").insert({
        "phone": phone,
        "role": "parent",
    }).execute()
    return (new_user.data[0]["id"], "parent", True)


# ---------------------------------------------------------------------------
# Admin Login (username + password)
# ---------------------------------------------------------------------------


async def admin_login(username: str, password: str) -> AdminLoginResponse:
    """Admin login with username + password.

    Steps:
    1. Check if account is locked (Redis, by username)
    2. Find admin user in DB by username + role=admin
    3. Verify password (bcrypt)
    4. On mismatch: increment fail count, lock if 5 failures
    5. On match: clear fail count, sign JWT
    """
    redis = await get_redis()
    now = datetime.now(timezone.utc)

    # 1. Check if locked
    lock_key = f"{_ADMIN_LOCK_PREFIX}{username}"
    locked_until_str = await redis.get(lock_key)
    if locked_until_str:
        locked_until = datetime.fromisoformat(locked_until_str)
        if now < locked_until:
            remaining_min = int((locked_until - now).total_seconds() / 60) + 1
            raise HTTPException(
                status_code=429,
                detail=AdminLoginErrorResponse(
                    code="ADMIN_LOCKED",
                    message=f"账号已锁定，请{remaining_min}分钟后再试",
                    attempts_remaining=0,
                    locked_until=locked_until.isoformat(),
                ).model_dump(),
            )
        # Lock expired, clean up
        await redis.delete(lock_key)
        fail_key = f"{_ADMIN_FAIL_PREFIX}{username}"
        await redis.delete(fail_key)

    # 2. Find admin user by username
    sb = get_supabase()
    result = sb.table("users").select("id, username, password_hash, role").eq("username", username).eq("role", "admin").limit(1).execute()

    if not result.data:
        raise HTTPException(
            status_code=401,
            detail=AdminLoginErrorResponse(
                code="ADMIN_NOT_FOUND",
                message="用户名或密码错误",
                attempts_remaining=MAX_ADMIN_LOGIN_ATTEMPTS,
            ).model_dump(),
        )

    user = result.data[0]
    stored_hash = user.get("password_hash", "")

    # 3. Verify password
    if not stored_hash or not verify_password(password, stored_hash):
        # 4. Mismatch — increment fail count
        fail_key = f"{_ADMIN_FAIL_PREFIX}{username}"
        fail_count = await redis.incr(fail_key)
        if fail_count == 1:
            await redis.expire(fail_key, ADMIN_LOCK_DURATION_MINUTES * 60)

        attempts_remaining = MAX_ADMIN_LOGIN_ATTEMPTS - fail_count

        if attempts_remaining <= 0:
            locked_until = now + timedelta(minutes=ADMIN_LOCK_DURATION_MINUTES)
            await redis.set(lock_key, locked_until.isoformat(), ex=ADMIN_LOCK_DURATION_MINUTES * 60)
            await redis.delete(fail_key)

            raise HTTPException(
                status_code=429,
                detail=AdminLoginErrorResponse(
                    code="ADMIN_LOCKED",
                    message="登录失败次数过多，账号已锁定15分钟",
                    attempts_remaining=0,
                    locked_until=locked_until.isoformat(),
                ).model_dump(),
            )

        raise HTTPException(
            status_code=401,
            detail=AdminLoginErrorResponse(
                code="ADMIN_PASSWORD_WRONG",
                message="用户名或密码错误",
                attempts_remaining=attempts_remaining,
            ).model_dump(),
        )

    # 5. Match — clear fail count, sign JWT
    fail_key = f"{_ADMIN_FAIL_PREFIX}{username}"
    await redis.delete(fail_key)

    access_token = create_access_token(user["id"], "admin")
    refresh_token = create_refresh_token(user["id"], "admin")

    logger.info("admin_login_success", username=username)

    return AdminLoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="Bearer",
        expires_in=settings.jwt_access_expire_minutes * 60,
        role="admin",
    )


# ---------------------------------------------------------------------------
# Teacher Login (username + password, API-02b)
# ---------------------------------------------------------------------------

_TEACHER_LOCK_PREFIX = "teacher:lock:"   # teacher:lock:{username} → locked_until timestamp
_TEACHER_FAIL_PREFIX = "teacher:fail:"   # teacher:fail:{username} → failed attempt count
TEACHER_LOCK_DURATION_MINUTES = 15
MAX_TEACHER_LOGIN_ATTEMPTS = 5


async def teacher_login(username: str, password: str) -> "TeacherLoginResponse":
    """Teacher login with username + password (API-02b).

    Steps:
    1. Check if account is locked (Redis) — 5 failures → 15 min lockout
    2. Find teacher in DB by username + is_active=true
    3. Verify password (bcrypt)
    4. On mismatch: increment fail count, lock if 5 failures
    — Non-existent username returns same "invalid credentials" to prevent enumeration
    5. On match: clear fail count, sign JWT (role=teacher)
    6. Return must_change_password flag
    """
    from app.schemas.auth import TeacherLoginErrorResponse, TeacherLoginResponse

    redis = await get_redis()
    now = datetime.now(timezone.utc)

    # 1. Check if locked
    lock_key = f"{_TEACHER_LOCK_PREFIX}{username}"
    locked_until_str = await redis.get(lock_key)
    if locked_until_str:
        locked_until = datetime.fromisoformat(locked_until_str)
        if now < locked_until:
            remaining_min = int((locked_until - now).total_seconds() / 60) + 1
            raise HTTPException(
                status_code=429,
                detail=TeacherLoginErrorResponse(
                    code="TEACHER_LOCKED",
                    message=f"登录失败次数过多，请{remaining_min}分钟后再试",
                    attempts_remaining=0,
                    locked_until=locked_until.isoformat(),
                ).model_dump(),
            )
        # Lock expired, clean up
        await redis.delete(lock_key)
        fail_key = f"{_TEACHER_FAIL_PREFIX}{username}"
        await redis.delete(fail_key)

    # 2. Find teacher in DB by username
    sb = get_supabase()
    result = sb.table("teachers").select(
        "id, username, password_hash, is_active, must_change_password"
    ).eq("username", username).limit(1).execute()

    # 3. Verify — non-existent username gets same error as wrong password (anti-enumeration)
    if not result.data:
        await _teacher_login_fail(username, now, lock_key, redis)

    teacher = result.data[0]
    stored_hash = teacher.get("password_hash", "")

    # 4. Check is_active — return same 401 as wrong password to prevent enumeration
    if not teacher.get("is_active", True):
        logger.warning("teacher_login_inactive", username=username)
        await _teacher_login_fail(username, now, lock_key, redis)

    # 5. Verify password
    if not stored_hash or not verify_password(password, stored_hash):
        await _teacher_login_fail(username, now, lock_key, redis)

    # 6. Success — clear fail count, sign JWT
    fail_key = f"{_TEACHER_FAIL_PREFIX}{username}"
    await redis.delete(fail_key)

    # Include teacher_id as explicit claim per TECH-SPEC 4.3
    extra = {"teacher_id": teacher["id"]}
    access_token = create_access_token(teacher["id"], "teacher", extra_claims=extra)
    refresh_token = create_refresh_token(teacher["id"], "teacher", extra_claims=extra)

    must_change = teacher.get("must_change_password", True)

    logger.info("teacher_login_success", username=username, must_change_password=must_change)

    return TeacherLoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="Bearer",
        expires_in=settings.jwt_access_expire_minutes * 60,
        role="teacher",
        must_change_password=must_change,
    )


# ---------------------------------------------------------------------------
# Parent Login (phone + password, API-03)
# ---------------------------------------------------------------------------


async def parent_login(phone: str, password: str) -> ParentLoginResponse:
    """Parent login with phone + password (API-03).

    Only works if the parent has set a password (password_hash IS NOT NULL).
    Parents without a password should use SMS verification instead.

    Steps:
    1. Check if account is locked (Redis, by phone)
    2. Find parent user in DB by phone + role=parent
    3. Check if password_hash exists (if not, suggest SMS login)
    4. Verify password (bcrypt)
    5. On mismatch: increment fail count, lock if 5 failures
    6. On match: clear fail count, sign JWT
    """
    redis = await get_redis()
    now = datetime.now(timezone.utc)

    # 1. Check if locked
    lock_key = f"{_PARENT_LOCK_PREFIX}{phone}"
    locked_until_str = await redis.get(lock_key)
    if locked_until_str:
        locked_until = datetime.fromisoformat(locked_until_str)
        if now < locked_until:
            remaining_min = int((locked_until - now).total_seconds() / 60) + 1
            raise HTTPException(
                status_code=429,
                detail=ParentLoginErrorResponse(
                    code="PARENT_LOCKED",
                    message=f"账号已锁定，请{remaining_min}分钟后再试",
                    attempts_remaining=0,
                    locked_until=locked_until.isoformat(),
                ).model_dump(),
            )
        # Lock expired, clean up
        await redis.delete(lock_key)
        fail_key = f"{_PARENT_FAIL_PREFIX}{phone}"
        await redis.delete(fail_key)

    # 2. Find parent user by phone
    sb = get_supabase()
    result = sb.table("users").select("id, phone, password_hash, role").eq("phone", phone).eq("role", "parent").limit(1).execute()

    if not result.data:
        raise HTTPException(
            status_code=401,
            detail=ParentLoginErrorResponse(
                code="PARENT_NOT_FOUND",
                message="手机号或密码错误",
                attempts_remaining=MAX_PARENT_LOGIN_ATTEMPTS,
            ).model_dump(),
        )

    user = result.data[0]
    stored_hash = user.get("password_hash")

    # 3. Check if parent has set a password
    if not stored_hash:
        raise HTTPException(
            status_code=401,
            detail=ParentLoginErrorResponse(
                code="PARENT_NO_PASSWORD",
                message="该账号未设置密码，请使用验证码登录",
                attempts_remaining=MAX_PARENT_LOGIN_ATTEMPTS,
            ).model_dump(),
        )

    # 4. Verify password
    if not verify_password(password, stored_hash):
        fail_key = f"{_PARENT_FAIL_PREFIX}{phone}"
        fail_count = await redis.incr(fail_key)
        if fail_count == 1:
            await redis.expire(fail_key, PARENT_LOCK_DURATION_MINUTES * 60)

        attempts_remaining = MAX_PARENT_LOGIN_ATTEMPTS - fail_count

        if attempts_remaining <= 0:
            locked_until = now + timedelta(minutes=PARENT_LOCK_DURATION_MINUTES)
            await redis.set(lock_key, locked_until.isoformat(), ex=PARENT_LOCK_DURATION_MINUTES * 60)
            await redis.delete(fail_key)

            raise HTTPException(
                status_code=429,
                detail=ParentLoginErrorResponse(
                    code="PARENT_LOCKED",
                    message="登录失败次数过多，账号已锁定15分钟",
                    attempts_remaining=0,
                    locked_until=locked_until.isoformat(),
                ).model_dump(),
            )

        raise HTTPException(
            status_code=401,
            detail=ParentLoginErrorResponse(
                code="PARENT_PASSWORD_WRONG",
                message="手机号或密码错误",
                attempts_remaining=attempts_remaining,
            ).model_dump(),
        )

    # 6. Match — clear fail count, sign JWT
    fail_key = f"{_PARENT_FAIL_PREFIX}{phone}"
    await redis.delete(fail_key)

    access_token = create_access_token(user["id"], "parent")
    refresh_token = create_refresh_token(user["id"], "parent")

    logger.info("parent_login_success", phone=_mask_phone(phone))

    return ParentLoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="Bearer",
        expires_in=settings.jwt_access_expire_minutes * 60,
        role="parent",
    )


# ---------------------------------------------------------------------------
# Teacher change password (API-02b)
# ---------------------------------------------------------------------------


async def teacher_change_password(
    teacher_id: str, old_password: str, new_password: str,
) -> "TeacherChangePasswordResponse":
    """Change teacher password (API-02b, requires teacher JWT).

    Steps:
    1. Find teacher by id in DB
    2. Verify old_password matches stored hash
    3. Validate new_password complexity (≥8 chars, letters+digits)
    4. Hash new password, update DB
    5. Set must_change_password=false, password_updated_at=now
    """
    from app.schemas.auth import (
        TeacherChangePasswordErrorResponse,
        TeacherChangePasswordResponse,
    )

    sb = get_supabase()

    # 1. Find teacher
    result = sb.table("teachers").select(
        "id, password_hash, must_change_password"
    ).eq("id", teacher_id).limit(1).execute()

    if not result.data:
        raise HTTPException(
            status_code=404,
            detail=TeacherChangePasswordErrorResponse(
                code="TEACHER_NOT_FOUND",
                message="教师账号不存在",
            ).model_dump(),
        )

    teacher = result.data[0]
    stored_hash = teacher.get("password_hash", "")

    # 2. Verify old password
    if not stored_hash or not verify_password(old_password, stored_hash):
        raise HTTPException(
            status_code=401,
            detail=TeacherChangePasswordErrorResponse(
                code="TEACHER_OLD_PASSWORD_WRONG",
                message="当前密码错误",
            ).model_dump(),
        )

    # 3. Validate new password complexity (PRD 7.2: ≥8 chars, letters+digits)
    if len(new_password) < 8:
        raise HTTPException(
            status_code=422,
            detail=TeacherChangePasswordErrorResponse(
                code="TEACHER_NEW_PASSWORD_TOO_SHORT",
                message="新密码至少8位",
            ).model_dump(),
        )
    has_letter = any(c.isalpha() for c in new_password)
    has_digit = any(c.isdigit() for c in new_password)
    if not (has_letter and has_digit):
        raise HTTPException(
            status_code=422,
            detail=TeacherChangePasswordErrorResponse(
                code="TEACHER_NEW_PASSWORD_WEAK",
                message="新密码需同时包含字母和数字",
            ).model_dump(),
        )

    # 4-5. Update password in DB
    new_hash = hash_password(new_password)
    now = datetime.now(timezone.utc)
    sb.table("teachers").update({
        "password_hash": new_hash,
        "must_change_password": False,
        "password_updated_at": now.isoformat(),
    }).eq("id", teacher_id).execute()

    logger.info("teacher_password_changed", teacher_id=str(teacher_id))

    return TeacherChangePasswordResponse(
        message="Password changed successfully",
        must_change_password=False,
    )


# ---------------------------------------------------------------------------
# Token Refresh
# ---------------------------------------------------------------------------


async def refresh_access_token(refresh_token_str: str) -> dict:
    """Exchange a refresh token for a new access token."""
    try:
        payload = decode_token(refresh_token_str)
    except Exception:
        raise HTTPException(
            status_code=401,
            detail={"code": "INVALID_REFRESH_TOKEN", "message": "无效的刷新令牌"},
        )

    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=401,
            detail={"code": "NOT_REFRESH_TOKEN", "message": "该令牌不是刷新令牌"},
        )

    sub = payload.get("sub")
    role = payload.get("role")
    if not sub or not role:
        raise HTTPException(
            status_code=401,
            detail={"code": "INVALID_REFRESH_TOKEN", "message": "刷新令牌缺少必要字段"},
        )

    # Build extra_claims (preserve teacher_id if present)
    extra_claims = {}
    if payload.get("teacher_id"):
        extra_claims["teacher_id"] = payload["teacher_id"]

    new_access = create_access_token(sub, role, extra_claims)

    return {
        "access_token": new_access,
        "token_type": "Bearer",
        "expires_in": settings.jwt_access_expire_minutes * 60,
    }


# ---------------------------------------------------------------------------
# Logout (Token Blacklist)
# ---------------------------------------------------------------------------


async def logout_user(access_token_str: str) -> dict:
    """Add an access token to the Redis blacklist."""
    try:
        payload = decode_token(access_token_str)
    except Exception:
        return {"message": "已登出"}

    if payload.get("type") != "access":
        return {"message": "已登出"}

    exp = payload.get("exp", 0)
    now = datetime.now(timezone.utc).timestamp()
    remaining = int(exp - now)
    if remaining <= 0:
        return {"message": "已登出"}

    sub = payload.get("sub", "unknown")
    iat = payload.get("iat", 0)
    bl_key = f"{_BL}{sub}:{iat}"

    redis = await get_redis()
    await redis.set(bl_key, "1", ex=remaining)

    logger.info("user_logout", user_id=sub)
    return {"message": "已登出"}


async def is_token_blacklisted(payload: dict) -> bool:
    """Check if a token (by sub + iat) is in the Redis blacklist."""
    sub = payload.get("sub", "unknown")
    iat = payload.get("iat", 0)
    bl_key = f"{_BL}{sub}:{iat}"

    redis = await get_redis()
    result = await redis.exists(bl_key)
    return result > 0
