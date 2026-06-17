"""File storage abstraction layer.

Supports pluggable backends:
- LocalStorage: files on VPS disk (/data/sb-files/) — MVP primary
- SupabaseStorage: legacy Supabase Storage — compat/migration
- COSStorage: Tencent Cloud COS — future

Selected via STORAGE_BACKEND env var (default: "local").
"""

import shutil
import structlog
from pathlib import Path
from typing import Protocol, runtime_checkable

from fastapi import HTTPException, status

from app.core.config import get_settings

logger = structlog.get_logger()
settings = get_settings()

# ---------------------------------------------------------------------------
# Default path templates
# ---------------------------------------------------------------------------

STORAGE_ROOT = Path(settings.storage_root)  # e.g. /data/sb-files

# Logical path templates (relative to storage root)
# Reading: reading/{level}/{material_id}.pdf
# Resources: resources/{category}/{resource_id}.pdf
# Covers: covers/{entity_id}.{ext}
# Uploads (temp): uploads/{uuid}.pdf


def reading_pdf_path(level: str, material_id: str) -> str:
    """Generate logical path for a reading material PDF."""
    return f"reading/{level}/{material_id}.pdf"


def resource_pdf_path(category: str, resource_id: str) -> str:
    """Generate logical path for a resource PDF."""
    return f"resources/{category}/{resource_id}.pdf"


def cover_path(entity_id: str, ext: str = "webp") -> str:
    """Generate logical path for a cover image."""
    return f"covers/{entity_id}.{ext}"


# ---------------------------------------------------------------------------
# Size limits by resource type (bytes)
# ---------------------------------------------------------------------------

SIZE_LIMITS = {
    "reading_pdf": 30 * 1024 * 1024,    # 30 MB
    "resource_pdf": 30 * 1024 * 1024,   # 30 MB
    "teacher_material": 100 * 1024 * 1024,  # 100 MB
    "cover_image": 2 * 1024 * 1024,     # 2 MB
    "generic_pdf": 50 * 1024 * 1024,    # 50 MB (default)
}

# Nginx X-Accel-Redirect internal prefix
X_ACCEL_PREFIX = "/internal-files"


# ---------------------------------------------------------------------------
# Protocol definition
# ---------------------------------------------------------------------------

@runtime_checkable
class FileStorage(Protocol):
    """Protocol for file storage backends."""

    async def save(self, key: str, data: bytes, content_type: str = "application/pdf") -> str:
        """Save file, return logical key."""
        ...

    async def read(self, key: str) -> bytes:
        """Read file bytes by logical key."""
        ...

    async def delete(self, key: str) -> bool:
        """Delete file, return True if existed."""
        ...

    async def get_download_url(self, key: str) -> str:
        """Get a URL that the client can use to download the file.

        For LocalStorage: returns X-Accel-Redirect path (Nginx serves file).
        For SupabaseStorage: returns signed URL.
        For COSStorage: returns presigned URL.
        """
        ...

    async def exists(self, key: str) -> bool:
        """Check if file exists."""
        ...


# ---------------------------------------------------------------------------
# LocalStorage — VPS disk (MVP primary)
# ---------------------------------------------------------------------------

class LocalStorage:
    """File storage on local VPS disk.

    Root directory: STORAGE_ROOT (e.g. /data/sb-files/)
    Files are stored at: {STORAGE_ROOT}/{key}
    Download via Nginx X-Accel-Redirect: {X_ACCEL_PREFIX}/{key}
    """

    def __init__(self, root: Path | str | None = None):
        self.root = Path(root or STORAGE_ROOT)
        self.root.mkdir(parents=True, exist_ok=True)

    def _disk_path(self, key: str) -> Path:
        """Convert logical key to absolute disk path."""
        return self.root / key

    async def save(self, key: str, data: bytes, content_type: str = "application/pdf") -> str:
        """Write file to disk. Creates parent dirs."""
        disk_path = self._disk_path(key)
        disk_path.parent.mkdir(parents=True, exist_ok=True)

        # Write to temp file first, then rename (atomic)
        tmp_path = disk_path.with_suffix(disk_path.suffix + ".tmp")
        try:
            tmp_path.write_bytes(data)
            tmp_path.rename(disk_path)
        except Exception as e:
            # Clean up temp file if rename failed
            if tmp_path.exists():
                tmp_path.unlink()
            logger.error("local_storage_save_failed", key=key, error=str(e))
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={"code": "UPLOAD_FAILED", "message": "文件保存失败"},
            )

        logger.info("local_storage_saved", key=key, size=len(data))
        return key

    async def save_stream(self, key: str, file_obj, content_type: str = "application/pdf") -> str:
        """Save file from a stream (UploadFile) without loading all into RAM.

        Uses shutil.copyfileobj for chunked writing.
        """
        disk_path = self._disk_path(key)
        disk_path.parent.mkdir(parents=True, exist_ok=True)

        tmp_path = disk_path.with_suffix(disk_path.suffix + ".tmp")
        try:
            with open(tmp_path, "wb") as f:
                shutil.copyfileobj(file_obj.file, f)
            tmp_path.rename(disk_path)
        except Exception as e:
            if tmp_path.exists():
                tmp_path.unlink()
            logger.error("local_storage_stream_failed", key=key, error=str(e))
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={"code": "UPLOAD_FAILED", "message": "文件保存失败"},
            )

        file_size = disk_path.stat().st_size
        logger.info("local_storage_stream_saved", key=key, size=file_size)
        return key

    async def read(self, key: str) -> bytes:
        """Read file bytes."""
        disk_path = self._disk_path(key)
        if not disk_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "FILE_NOT_FOUND", "message": "文件不存在"},
            )
        return disk_path.read_bytes()

    async def delete(self, key: str) -> bool:
        """Delete file from disk."""
        disk_path = self._disk_path(key)
        if disk_path.exists():
            disk_path.unlink()
            logger.info("local_storage_deleted", key=key)
            return True
        return False

    async def get_download_url(self, key: str) -> str:
        """Return Nginx X-Accel-Redirect internal path."""
        # Client gets: /files/{key}  (served by Nginx)
        # X-Accel-Redirect: /internal-files/{key}  (Nginx maps to disk)
        return f"{X_ACCEL_PREFIX}/{key}"

    async def exists(self, key: str) -> bool:
        """Check if file exists on disk."""
        return self._disk_path(key).exists()

    async def file_size(self, key: str) -> int | None:
        """Get file size in bytes, or None if not exists."""
        disk_path = self._disk_path(key)
        if disk_path.exists():
            return disk_path.stat().st_size
        return None


# ---------------------------------------------------------------------------
# SupabaseStorage — legacy compat (for migration period)
# ---------------------------------------------------------------------------

class SupabaseStorage:
    """Legacy Supabase Storage backend — kept for migration compat."""

    async def save(self, key: str, data: bytes, content_type: str = "application/pdf") -> str:
        from app.core.database import get_supabase
        sb = get_supabase()
        try:
            sb.storage.from_("pdfs").upload(key, data, {"content-type": content_type})
        except Exception:
            # May already exist — try update
            try:
                sb.storage.from_("pdfs").update(key, data, {"content-type": content_type})
            except Exception as e2:
                logger.error("supabase_upload_failed", key=key, error=str(e2))
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail={"code": "UPLOAD_FAILED", "message": "文件上传失败"},
                )
        return key

    async def read(self, key: str) -> bytes:
        from app.core.database import get_supabase
        sb = get_supabase()
        try:
            resp = sb.storage.from_("pdfs").download(key)
            return resp
        except Exception as e:
            logger.error("supabase_read_failed", key=key, error=str(e))
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "FILE_NOT_FOUND", "message": "文件不存在"},
            )

    async def delete(self, key: str) -> bool:
        from app.core.database import get_supabase
        sb = get_supabase()
        try:
            sb.storage.from_("pdfs").remove([key])
            return True
        except Exception as e:
            logger.warning("supabase_delete_failed", key=key, error=str(e))
            return False

    async def get_download_url(self, key: str) -> str:
        """Generate Supabase signed URL (1h expiry)."""
        from app.core.database import get_supabase
        sb = get_supabase()
        try:
            result = sb.storage.from_("pdfs").create_signed_url(key, 3600)
            signed_url = (
                result.get("signedURL")
                or result.get("signedUrl")
                or result.get("signed_url")
            )
            if not signed_url:
                if isinstance(result, str):
                    return result
                raise ValueError(f"Unexpected signed URL format: {result}")
            return signed_url
        except Exception as e:
            logger.error("supabase_signed_url_failed", key=key, error=str(e))
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={"code": "SIGNED_URL_FAILED", "message": "生成签名URL失败"},
            )

    async def exists(self, key: str) -> bool:
        try:
            from app.core.database import get_supabase
            sb = get_supabase()
            sb.storage.from_("pdfs").list(path=key.rsplit("/", 1)[0] if "/" in key else "")
            return True
        except Exception:
            return False


# ---------------------------------------------------------------------------
# Storage factory
# ---------------------------------------------------------------------------

_storage_instance: FileStorage | None = None


def get_storage() -> FileStorage:
    """Get the configured storage backend (singleton)."""
    global _storage_instance
    if _storage_instance is not None:
        return _storage_instance

    backend = settings.storage_backend

    if backend == "local":
        _storage_instance = LocalStorage()
    elif backend == "supabase":
        _storage_instance = SupabaseStorage()
    elif backend == "cos":
        # Future: we can implement COSStorage here
        raise NotImplementedError("COS storage backend not yet implemented")
    else:
        raise ValueError(f"Unknown STORAGE_BACKEND: {backend!r}")

    return _storage_instance


def validate_file_size(file_bytes: bytes, limit_key: str = "generic_pdf") -> None:
    """Validate file size against configured limits.

    Args:
        file_bytes: The file content bytes
        limit_key: Key from SIZE_LIMITS dict

    Raises:
        HTTPException 422 if file exceeds limit.
    """
    max_size = SIZE_LIMITS.get(limit_key, SIZE_LIMITS["generic_pdf"])
    if len(file_bytes) > max_size:
        max_mb = max_size // (1024 * 1024)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "FILE_TOO_LARGE",
                "message": f"文件大小不能超过 {max_mb}MB",
            },
        )


def validate_content_type(content_type: str, allowed: tuple[str, ...] = ("application/pdf",)) -> None:
    """Validate file content type.

    Raises HTTPException 422 if not in allowed list.
    """
    if content_type not in allowed:
        types_str = "/".join(allowed)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "INVALID_FILE_TYPE",
                "message": f"仅支持 {types_str} 文件",
            },
        )
