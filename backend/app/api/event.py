"""Event tracking API — POST /api/v1/events (TECH-SPEC 8.3).

Single endpoint: accept event, log it, return 202 Accepted.
"""

from fastapi import APIRouter, Depends, status

from app.core.deps import get_current_user
from app.schemas.auth import CurrentUser
from app.schemas.event import EventCreate
from app.services.event import record_event

router = APIRouter(prefix="/api/v1", tags=["events"])


@router.post(
    "/events",
    status_code=status.HTTP_202_ACCEPTED,
    summary="上报埋点事件",
)
async def create_event(
    payload: EventCreate,
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    """Accept an analytics event and return 202 Accepted.

    - **event**: one of the 9 whitelisted event names (TECH-SPEC 8.2)
    - **properties**: optional key-value metadata
    - **timestamp**: client time, allows offline backfill; defaults to server now()
    """
    await record_event(user, payload)
    return {"status": "accepted"}
