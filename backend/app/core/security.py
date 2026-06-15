"""Security utilities: JWT sign/verify + bcrypt password hashing + initial password generation.

Implements TECH-SPEC 4.3 / 9.1:
- RS256 JWT with access_token (2h) and refresh_token (30d)
- JWT payload: {sub, role, exp, iat}
- bcrypt password verification for admin + teacher login
"""

import secrets
import string
from datetime import datetime, timedelta, timezone
from uuid import UUID

import jwt
from bcrypt import checkpw, hashpw, gensalt

from app.core.config import get_settings

settings = get_settings()


# ---------------------------------------------------------------------------
# JWT sign
# ---------------------------------------------------------------------------


def create_access_token(
    subject: str | UUID,
    role: str,
    extra_claims: dict | None = None,
) -> str:
    """Sign an access token (RS256, 2h lifetime)."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(subject),
        "role": role,
        "iat": now,
        "exp": now + timedelta(minutes=settings.jwt_access_expire_minutes),
        "type": "access",
    }
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, settings.get_jwt_private_key(), algorithm="RS256")


def create_refresh_token(
    subject: str | UUID,
    role: str,
    extra_claims: dict | None = None,
) -> str:
    """Sign a refresh token (RS256, 30d lifetime)."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(subject),
        "role": role,
        "iat": now,
        "exp": now + timedelta(days=settings.jwt_refresh_expire_days),
        "type": "refresh",
    }
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, settings.get_jwt_private_key(), algorithm="RS256")


# ---------------------------------------------------------------------------
# JWT verify
# ---------------------------------------------------------------------------


def decode_token(token: str) -> dict:
    """Decode and verify a JWT. Raises on invalid/expired."""
    return jwt.decode(
        token,
        settings.get_jwt_public_key(),
        algorithms=[settings.jwt_algorithm],
    )


# ---------------------------------------------------------------------------
# Password verification
# ---------------------------------------------------------------------------


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plaintext password against a bcrypt hash."""
    return checkpw(plain.encode(), hashed.encode())


def hash_password(plain: str) -> str:
    """Hash a plaintext password with bcrypt. Returns UTF-8 string."""
    return hashpw(plain.encode(), gensalt()).decode()


# ---------------------------------------------------------------------------
# Initial password generation (API-04)
# ---------------------------------------------------------------------------

# Character set: uppercase + lowercase + digits + special chars
_PW_UPPER = string.ascii_uppercase
_PW_LOWER = string.ascii_lowercase
_PW_DIGITS = string.digits
_PW_SPECIAL = "!@#$%^&*"
_PW_ALL = _PW_UPPER + _PW_LOWER + _PW_DIGITS + _PW_SPECIAL


def generate_initial_password(length: int = 8) -> str:
    """Generate a cryptographically random initial password.

    Guarantees at least one character from each category
    (upper, lower, digit, special) to meet complexity requirements.
    """
    # Ensure at least one from each category
    parts = [
        secrets.choice(_PW_UPPER),
        secrets.choice(_PW_LOWER),
        secrets.choice(_PW_DIGITS),
        secrets.choice(_PW_SPECIAL),
    ]
    # Fill remaining length with random choices from all categories
    remaining = max(0, length - len(parts))
    parts.extend(secrets.choice(_PW_ALL) for _ in range(remaining))
    # Shuffle to avoid predictable positions
    result = list(parts)
    secrets.SystemRandom().shuffle(result)
    return "".join(result)
