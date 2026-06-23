"""SunnyBridge MVP Backend — FastAPI entry point.

Per TECH-SPEC:
- CORS with strict whitelist
- Unified error response format: {"detail": {"code": "...", "message": "..."}}
- Startup validation: JWT keys must exist
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.auth import router as auth_router
from app.api.child import router as child_router
from app.api.course import router as course_router
from app.api.dashboard import router as dashboard_router
from app.api.event import router as event_router
from app.api.feedback import router as feedback_router
from app.api.finance import router as finance_router
from app.api.payment import router as payment_router
from app.api.reading import router as reading_router
from app.api.resource import router as resource_router
from app.api.search import router as search_router
from app.api.settlement import router as settlement_router
from app.api.teacher import router as teacher_router
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    debug=settings.debug,
)

# ---------------------------------------------------------------------------
# CORS middleware — TECH-SPEC 9.2: strict whitelist
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Global exception handlers — unified error format per TECH-SPEC 5.9
# ---------------------------------------------------------------------------
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch-all: return TECH-SPEC compliant error JSON."""
    import structlog

    logger = structlog.get_logger()
    logger.error("unhandled_exception", error=str(exc), path=request.url.path)

    resp = JSONResponse(
        status_code=500,
        content={
            "detail": {
                "code": "INTERNAL_ERROR",
                "message": "An unexpected error occurred. Please try again later."
                if not settings.debug
                else str(exc),
            }
        },
    )
    # CORS headers for cross-origin error responses
    origin = request.headers.get("origin")
    if origin and origin in settings.cors_origin_list:
        resp.headers["access-control-allow-origin"] = origin
        resp.headers["access-control-allow-credentials"] = "true"
    return resp


@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    """Handle validation / business logic errors."""
    resp = JSONResponse(
        status_code=422,
        content={"detail": {"code": "VALIDATION_ERROR", "message": str(exc)}},
    )
    origin = request.headers.get("origin")
    if origin and origin in settings.cors_origin_list:
        resp.headers["access-control-allow-origin"] = origin
        resp.headers["access-control-allow-credentials"] = "true"
    return resp


# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(auth_router)
app.include_router(settlement_router)
app.include_router(finance_router)
app.include_router(teacher_router)
app.include_router(child_router)
app.include_router(course_router)
app.include_router(payment_router)
app.include_router(feedback_router)
app.include_router(reading_router)
app.include_router(resource_router)
app.include_router(event_router)
app.include_router(dashboard_router)
app.include_router(search_router)

# ---------------------------------------------------------------------------
# Startup event: validate JWT keys exist
# ---------------------------------------------------------------------------
@app.on_event("startup")
async def startup_validate():
    """Pre-flight checks on startup."""
    try:
        settings.get_jwt_private_key()
        settings.get_jwt_public_key()
    except FileNotFoundError as e:
        import sys

        print(f"FATAL: {e}", file=sys.stderr)
        sys.exit(1)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get("/health")
async def health_check():
    """Health check endpoint for load balancers and monitoring."""
    return {"status": "ok", "env": settings.app_env}
