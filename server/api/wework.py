from typing import Optional
from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel
from ..integrations.wework import wework_service
from ..core.logging import get_logger
from ..core.auth import require_auth, AuthenticatedUser

logger = get_logger(__name__)
router_wework = APIRouter(prefix="/api/wework", tags=["wework"])


class WeWorkMessageRequest(BaseModel):
    to_user: str
    content: str
    msg_type: str = "text"


class EscalationRequest(BaseModel):
    user_id: str
    conversation_id: str
    reason: str
    priority: str = "normal"


@router_wework.post("/message/send")
async def send_message(
    request: WeWorkMessageRequest,
    current_user: AuthenticatedUser = Depends(require_auth)
):
    if request.msg_type == "text":
        success = await wework_service.send_text_message(request.to_user, request.content)
    elif request.msg_type == "markdown":
        success = await wework_service.send_markdown_message(request.to_user, request.content)
    else:
        raise HTTPException(status_code=400, detail="不支持的消息类型")

    if success:
        return {"success": True, "message": "发送成功"}
    raise HTTPException(status_code=500, detail="发送失败")


@router_wework.post("/escalate")
async def escalate_to_human(
    request: EscalationRequest,
    current_user: AuthenticatedUser = Depends(require_auth)
):
    escalation_message = f"""【人工转接请求】
用户: {request.user_id}
会话: {request.conversation_id}
原因: {request.reason}
优先级: {request.priority}
时间: {__import__('datetime').datetime.now().isoformat()}"""

    success = await wework_service.send_markdown_message(
        to_user=getattr(__import__('settings'), 'ADMIN_USER', 'admin'),
        content=escalation_message
    )

    if success:
        logger.info("escalation_sent", user_id=request.user_id, conversation_id=request.conversation_id)
        return {"success": True, "message": "已通知客服"}
    raise HTTPException(status_code=500, detail="转接失败")


@router_wework.get("/health")
async def wework_health():
    token = await wework_service.get_access_token()
    return {"connected": token is not None}

# Export router with standard name for main.py import
router = router_wework
