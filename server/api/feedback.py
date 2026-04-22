from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel
from datetime import datetime, date
import time
import hashlib
from ..core.logging import get_logger
from ..core.security import security
from ..core.exceptions import ValidationException

logger = get_logger(__name__)
router_feedback = APIRouter(prefix="/api/feedback", tags=["feedback"])


class FeedbackCreate(BaseModel):
    type: str
    rating: int
    content: Optional[str] = None
    conversation_id: Optional[str] = None


class FeedbackResponse(BaseModel):
    id: str
    type: str
    rating: int
    content: Optional[str]
    created_at: str


feedbacks_db: Dict[str, Dict[str, Any]] = {}


@router_feedback.post("/", response_model=FeedbackResponse)
async def create_feedback(feedback: FeedbackCreate, request: Request):
    if feedback.rating < 1 or feedback.rating > 5:
        raise ValidationException("评分必须在1-5之间", field="rating")

    feedback_id = f"FB_{int(time.time() * 1000)}"
    masked_ip = hashlib.md5(request.client.host.encode()).hexdigest()[:8] if request.client else "unknown"

    feedbacks_db[feedback_id] = {
        "id": feedback_id,
        "type": feedback.type,
        "rating": feedback.rating,
        "content": feedback.content,
        "conversation_id": feedback.conversation_id,
        "created_at": datetime.utcnow().isoformat(),
        "ip_hash": masked_ip
    }

    logger.info("feedback_created", feedback_id=feedback_id, type=feedback.type, rating=feedback.rating)

    return FeedbackResponse(
        id=feedback_id,
        type=feedback.type,
        rating=feedback.rating,
        content=feedback.content,
        created_at=feedbacks_db[feedback_id]["created_at"]
    )


@router_feedback.get("/", response_model=List[FeedbackResponse])
async def list_feedbacks(limit: int = 50, offset: int = 0):
    feedbacks = list(feedbacks_db.values())
    feedbacks.sort(key=lambda x: x["created_at"], reverse=True)
    return [
        FeedbackResponse(
            id=f["id"],
            type=f["type"],
            rating=f["rating"],
            content=f.get("content"),
            created_at=f["created_at"]
        )
        for f in feedbacks[offset:offset+limit]
    ]


@router_feedback.get("/stats")
async def get_feedback_stats():
    if not feedbacks_db:
        return {"total": 0, "avg_rating": 0, "distribution": {}}

    ratings = [f["rating"] for f in feedbacks_db.values()]
    distribution = {i: ratings.count(i) for i in range(1, 6)}

    return {
        "total": len(ratings),
        "avg_rating": round(sum(ratings) / len(ratings), 2),
        "distribution": distribution
    }

# Export router with standard name for main.py import
router = router_feedback
