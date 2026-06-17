"""Application configuration via environment variables.

Uses pydantic-settings to load and validate all config from .env / env vars.
"""

from functools import lru_cache
from pathlib import Path

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=[".env", "../.env"],  # backend/.env or project-root/.env
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- App ---
    app_env: str = "development"  # development | staging | production
    app_name: str = "SunnyBridge MVP"
    debug: bool = True

    # --- Supabase (REST API — primary) ---
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""

    # --- PostgreSQL direct connect (optional, paid plan only) ---
    supabase_db_url: str = ""  # empty = use REST API only

    # --- JWT ---
    jwt_private_key_path: str = "./keys/private.pem"
    jwt_public_key_path: str = "./keys/public.pem"
    jwt_access_expire_minutes: int = 120
    jwt_refresh_expire_days: int = 30
    jwt_algorithm: str = "RS256"

    # --- File Storage ---
    storage_backend: str = "local"  # local | supabase | cos
    storage_root: str = "/data/sb-files"  # LocalStorage root directory

    # --- Redis ---
    redis_url: str = "redis://localhost:6379"

    # --- SMS (Tencent Cloud) ---
    tencent_sms_sdk_id: str = ""
    tencent_sms_sdk_key: str = ""
    tencent_sms_sign_name: str = ""
    tencent_sms_template_id: str = ""
    sms_dev_code: str = "888888"  # fixed code returned in development mode

    # --- CORS ---
    cors_origins: str = "http://localhost:3000,http://localhost:5173"  # comma-separated

    @model_validator(mode="after")
    def _validate_required_config(self) -> "Settings":
        """Fail fast if critical config is missing."""
        if not self.supabase_url:
            raise ValueError(
                "SUPABASE_URL is required. "
                "Set it in .env or as an environment variable."
            )
        if not self.supabase_service_role_key:
            raise ValueError(
                "SUPABASE_SERVICE_ROLE_KEY is required. "
                "Set it in .env or as an environment variable."
            )
        if not self.supabase_anon_key:
            raise ValueError(
                "SUPABASE_ANON_KEY is required. "
                "Set it in .env or as an environment variable."
            )
        return self

    @property
    def cors_origin_list(self) -> list[str]:
        """Parse comma-separated CORS origins into a list."""
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    def get_jwt_private_key(self) -> str:
        """Read JWT private key from file, auto-generate for dev if missing."""
        path = Path(self.jwt_private_key_path)
        if path.exists():
            return path.read_text()
        if self.app_env == "development":
            self._generate_dev_rsa_keys()
            return path.read_text()
        raise FileNotFoundError(
            f"JWT private key not found at {path}. "
            f"Run: openssl genrsa -out {path} 2048"
        )

    def get_jwt_public_key(self) -> str:
        """Read JWT public key from file."""
        path = Path(self.jwt_public_key_path)
        if path.exists():
            return path.read_text()
        if self.app_env == "development":
            self._generate_dev_rsa_keys()
            return path.read_text()
        raise FileNotFoundError(
            f"JWT public key not found at {path}. "
            f"Run: openssl rsa -in private.pem -pubout -out {path}"
        )

    @staticmethod
    def _generate_dev_rsa_keys():
        """Auto-generate RSA key pair for development."""
        from cryptography.hazmat.primitives import serialization
        from cryptography.hazmat.primitives.asymmetric import rsa

        private_path = Path("./keys/private.pem")
        public_path = Path("./keys/public.pem")
        private_path.parent.mkdir(parents=True, exist_ok=True)

        key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        private_path.write_bytes(
            key.private_bytes(
                serialization.Encoding.PEM,
                serialization.PrivateFormat.TraditionalOpenSSL,
                serialization.NoEncryption(),
            )
        )
        public_key = key.public_key()
        public_path.write_bytes(
            public_key.public_bytes(
                serialization.Encoding.PEM,
                serialization.PublicFormat.SubjectPublicKeyInfo,
            )
        )


@lru_cache
def get_settings() -> Settings:
    """Cached settings singleton."""
    return Settings()
