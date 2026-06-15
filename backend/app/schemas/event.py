"""Schemas for event tracking (TECH-SPEC 8.2-8.3).

POST /api/v1/events — lightweight analytics endpoint.
MVP: structlog JSON output, no DB table.
"""

from datetime import datetime
from typing import Dict, Literal, Optional

from pydantic import BaseModel, Field

# TECH-SPEC 8.2 — 本期事件名白名单
EventName = Literal[
    "login_success",
    "login_fail",
    "course_view",
    "meeting_join",
    "feedback_submit",
    "feedback_view",
    "reading_open",
    "reading_complete",
    "resource_view",
]


class EventCreate(BaseModel):
    """Client-submitted event payload (TECH-SPEC 8.3)."""

    event: EventName
    properties: Optional[Dict[str, object]] = Field(default=None, description="事件附加参数")
    timestamp: Optional[datetime] = Field(
        default=None,
        description="客户端时间，允许离线补报；缺省由服务端补 now()",
    )
