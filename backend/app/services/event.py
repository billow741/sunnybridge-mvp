"""Event tracking service — structlog JSON output (TECH-SPEC 8.1-8.3).

MVP strategy: log events as structured JSON lines.
No DB table — avoids introducing a table not defined in DB migrations.
Logs can be batch-imported later.
"""

from datetime import datetime, timezone

import structlog

from app.schemas.auth import CurrentUser
from app.schemas.event import EventCreate

logger = structlog.get_logger()


async def record_event(user: CurrentUser, payload: EventCreate) -> None:
    """Write one event as a structured log line.

    Fields logged:
    - user_id, role: from JWT
    - event: whitelisted event name
    - properties: optional dict
    - timestamp: client-provided or server now()
    """
    ts = payload.timestamp or datetime.now(timezone.utc)

    logger.info(
        "event",
        user_id=user.id,
        role=user.role,
        event=payload.event,
        properties=payload.properties or {},
        timestamp=ts.isoformat(),
    )
