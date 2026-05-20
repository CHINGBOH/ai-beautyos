import hashlib
import hmac
import time

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from ..core.config import get_settings
from ..core.logging import get_logger

settings = get_settings()
logger = get_logger(__name__)

router_sms = APIRouter(prefix="/api/sms", tags=["sms"])


class SMSCodeRequest(BaseModel):
    phone: str


class SMSVerifyRequest(BaseModel):
    phone: str
    code: str


sms_codes: dict = {}
sms_attempts: dict = {}


def generate_code() -> str:
    import random
    return str(random.randint(100000, 999999))


def hash_signature(timestamp: str, nonce: str, body: str) -> str:
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
            return False
    except ValueError:
        return False

    expected = hash_signature(timestamp, nonce, body)
    return hmac.compare_digest(expected, signature)


@router_sms.post("/send")
async def send_sms_code(request: SMSCodeRequest, req: Request):
    client_ip = req.client.host if req.client else "unknown"
    phone = request.phone

    rate_key = f"{phone}:{client_ip}"
    current_time = time.time()

    if rate_key in sms_attempts:
        last_attempt = sms_attempts[rate_key]
        if current_time - last_attempt < 60:
            raise HTTPException(status_code=429, detail="发送过于频繁，请60秒后重试")

    code = generate_code()
    sms_codes[phone] = {
        "code": code,
        "created_at": current_time,
        "attempts": 0
    }
    sms_attempts[rate_key] = current_time

    logger.info("sms_code_sent", phone=hashlib.md5(phone.encode()).hexdigest()[:8])

    return {"success": True, "message": "验证码已发送", "expire_seconds": 300}


@router_sms.post("/verify")
async def verify_sms_code(request: SMSVerifyRequest):
    phone = request.phone
    code = request.code

    if phone not in sms_codes:
        raise HTTPException(status_code=400, detail="请先获取验证码")

    record = sms_codes[phone]

    if time.time() - record["created_at"] > 300:
        del sms_codes[phone]
        raise HTTPException(status_code=400, detail="验证码已过期")

    record["attempts"] += 1
    if record["attempts"] > 5:
        del sms_codes[phone]
        raise HTTPException(status_code=400, detail="验证次数过多，请重新获取")

    if record["code"] != code:
        raise HTTPException(status_code=400, detail="验证码错误")

    del sms_codes[phone]

    logger.info("sms_code_verified", phone=hashlib.md5(phone.encode()).hexdigest()[:8])

    return {"success": True, "message": "验证成功"}

# Export router with standard name for main.py import
router = router_sms
