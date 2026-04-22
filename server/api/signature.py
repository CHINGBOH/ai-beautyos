from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
import time
import hashlib
import hmac
from ..core.config import get_settings
from ..core.logging import get_logger

settings = get_settings()
logger = get_logger(__name__)

router_signature = APIRouter(prefix="/api/signature", tags=["signature"])


class SignedRequest(BaseModel):
    timestamp: str
    nonce: str
    signature: str
    body_hash: str


def compute_signature(timestamp: str, nonce: str, body: str) -> str:
    message = f"{timestamp}:{nonce}:{body}"
    return hmac.new(
        settings.JWT_SECRET.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()


def verify_signature(
    timestamp: str,
    nonce: str,
    body: str,
    signature: str,
    max_age: int = 300
) -> bool:
    try:
        ts = int(timestamp)
        if abs(time.time() - ts) > max_age:
            logger.warning("signature_expired", timestamp=timestamp)
            return False
    except ValueError:
        logger.warning("signature_invalid_timestamp", timestamp=timestamp)
        return False

    expected = compute_signature(timestamp, nonce, body)
    is_valid = hmac.compare_digest(expected, signature)

    if not is_valid:
        logger.warning("signature_mismatch", timestamp=timestamp)

    return is_valid


async def require_signature(
    timestamp: str = Header(...),
    nonce: str = Header(...),
    signature: str = Header(...),
    body: str = Header("")
) -> bool:
    if not verify_signature(timestamp, nonce, body, signature):
        raise HTTPException(status_code=401, detail="无效的签名")
    return True


class AppointmentWithSignature(BaseModel):
    name: str
    phone: str
    service_type: Optional[str] = None
    timestamp: str
    nonce: str
    signature: str


@router_signature.post("/appointments")
async def create_appointment_signed(appointment: AppointmentWithSignature):
    body = f"{appointment.name}:{appointment.phone}:{appointment.service_type or ''}"
    if not verify_signature(appointment.timestamp, appointment.nonce, body, appointment.signature):
        raise HTTPException(status_code=401, detail="签名验证失败")

    return {
        "success": True,
        "appointment_id": f"APT-{int(time.time() * 1000)}",
        "message": "预约成功"
    }

# Export router with standard name for main.py import
router = router_signature
