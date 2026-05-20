import hashlib
import json
import time
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from ..core.logging import get_logger

logger = get_logger(__name__)
router_analytics = APIRouter(prefix="/api/analytics", tags=["analytics"])


class EventTrack(BaseModel):
    event: str
    properties: Optional[Dict[str, Any]] = None
    user_id: Optional[str] = None
    timestamp: Optional[str] = None


class FunnelStep(BaseModel):
    step_name: str
    event: str


class FunnelRequest(BaseModel):
    steps: List[FunnelStep]
    start_date: str
    end_date: str


events_db: List[Dict[str, Any]] = []
MAX_EVENTS = 100000


@router_analytics.post("/track")
async def track_event(event: EventTrack, request: Request):
    event_id = f"EVT_{int(time.time() * 1000)}"
    masked_ip = hashlib.md5(request.client.host.encode()).hexdigest()[:8] if request.client else "unknown"

    event_record = {
        "id": event_id,
        "event": event.event,
        "properties": event.properties or {},
        "user_id": event.user_id,
        "timestamp": event.timestamp or datetime.utcnow().isoformat(),
        "ip_hash": masked_ip
    }

    events_db.append(event_record)

    if len(events_db) > MAX_EVENTS:
        events_db.clear()

    logger.info("event_tracked", event_name=event.event, properties=event.properties)

    return {"success": True, "event_id": event_id}


@router_analytics.get("/events")
async def list_events(
    event_name: Optional[str] = None,
    user_id: Optional[str] = None,
    limit: int = 100,
    offset: int = 0
):
    filtered = events_db

    if event_name:
        filtered = [e for e in filtered if e["event"] == event_name]

    if user_id:
        filtered = [e for e in filtered if e.get("user_id") == user_id]

    filtered.sort(key=lambda x: x["timestamp"], reverse=True)

    return filtered[offset:offset+limit]


@router_analytics.get("/funnel")
async def analyze_funnel(
    steps: str,
    start_date: str,
    end_date: str
):
    try:
        step_list = json.loads(steps)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="步骤格式错误")

    funnel = []
    total_users = set()

    for step in step_list:
        step_name = step.get("step_name")
        step_event = step.get("event")

        matching_events = [
            e for e in events_db
            if e["event"] == step_event
            and start_date <= e["timestamp"] <= end_date
        ]

        unique_users = set(e.get("user_id") for e in matching_events if e.get("user_id"))

        funnel.append({
            "step": step_name,
            "event": step_event,
            "total_count": len(matching_events),
            "unique_users": len(unique_users)
        })

        total_users.update(unique_users)

    conversion_rates = []
    for i, step in enumerate(funnel):
        if i == 0:
            conversion_rates.append(100.0)
        else:
            prev_users = funnel[i-1]["unique_users"]
            curr_users = step["unique_users"]
            rate = (curr_users / prev_users * 100) if prev_users > 0 else 0
            conversion_rates.append(round(rate, 2))

    return {
        "funnel": [
            {**f, "conversion_rate": conversion_rates[i]}
            for i, f in enumerate(funnel)
        ],
        "total_unique_users": len(total_users)
    }


@router_analytics.get("/metrics")
async def get_metrics():
    if not events_db:
        return {
            "total_events": 0,
            "event_types": {},
            "events_per_day": {}
        }

    event_types = {}
    events_per_day = {}

    for event in events_db:
        event_name = event["event"]
        event_types[event_name] = event_types.get(event_name, 0) + 1

        day = event["timestamp"][:10]
        events_per_day[day] = events_per_day.get(day, 0) + 1

    return {
        "total_events": len(events_db),
        "event_types": event_types,
        "events_per_day": events_per_day
    }

# Export router with standard name for main.py import
router = router_analytics
