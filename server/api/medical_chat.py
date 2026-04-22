from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime

from ..ai.llm_coordinator import coordinator
from ..ai.semantic_cache import semantic_cache
from ..ai.smart_router import router, RouteTarget
from ..core.logging import get_logger
from ..core.security import security
from ..core.exceptions import ValidationException, CircuitBreakerOpenException
from ..core.circuit_breaker import get_circuit_breaker, with_timeout, TimeoutException
from ..core.config import get_settings

# NOTE: DB persistence imports removed — TypeScript Drizzle modules are not available in Python.
# Conversation endpoints below return 501 until a Python-native DB layer is implemented.

settings = get_settings()
logger = get_logger(__name__)
router_api = APIRouter(prefix="/api", tags=["medical_chat"])


class MedicalChatRequest(BaseModel):
    message: str
    history: List[Dict[str, str]] = []
    session_id: Optional[str] = None
    user_id: Optional[str] = None


class MedicalChatResponse(BaseModel):
    reply: str
    session_id: Optional[str] = None
    conversation_id: Optional[int] = None
    route_target: Optional[str] = None
    cached: bool = False


@router_api.post("/medical_chat", response_model=MedicalChatResponse)
async def medical_chat(
    request: MedicalChatRequest
):
    if not request.message or not request.message.strip():
        raise ValidationException("消息内容不能为空", field="message")

    # 生成或使用会话ID
    session_id = request.session_id or f"session_{datetime.now().timestamp()}_{hash(request.message) % 1000000}"

    # 清理输入
    sanitized_message = security.sanitize_input(request.message)

    # 检测注入
    if security.detect_prompt_injection(sanitized_message):
        logger.warning("prompt_injection_blocked", message_length=len(sanitized_message))
        raise ValidationException("输入包含无效内容")

    # 检查缓存
    cached_response = semantic_cache.get(sanitized_message, {"session_id": session_id})
    if cached_response:
        return MedicalChatResponse(
            reply=cached_response["response"],
            session_id=session_id,
            route_target=cached_response.get("route_target"),
            cached=True
        )

    # 智能路由
    route_target = router.route(request.message, request.history, {"session_id": session_id})
    logger.info("route_decision", target=route_target.value, message_length=len(request.message))

    # 直接回复
    if route_target == RouteTarget.DIRECT:
        reply = "您好！有什么可以帮助您的吗？😊"
    else:
        # LLM处理
        llm_circuit_breaker = get_circuit_breaker("llm_service")

        try:
            result = await with_timeout(
                llm_circuit_breaker.call(
                    coordinator.process,
                    user_input=request.message,
                    history=request.history,
                    context={"session_id": session_id}
                ),
                timeout_seconds=30.0
            )

            if result["success"]:
                reply = result["response"]
            else:
                reply = "抱歉，我暂时无法回答您的问题，请稍后重试。"
        except CircuitBreakerOpenException:
            reply = "AI服务暂时不可用，请稍后重试"
        except TimeoutException:
            reply = "AI服务响应超时，请稍后重试"
        except Exception as e:
            logger.error("llm_processing_error", error=str(e))
            reply = "抱歉，处理您的请求时出现错误"

    # 缓存响应
    semantic_cache.set(sanitized_message, {
        "response": reply,
        "route_target": route_target.value
    }, {"session_id": session_id})

    return MedicalChatResponse(
        reply=reply,
        session_id=session_id,
        route_target=route_target.value,
        cached=False
    )


@router_api.get("/conversations")
async def get_conversations(
    limit: int = 50,
    offset: int = 0
):
    """获取对话列表 — 暂不可用，需要 Python 原生 DB 层"""
    raise HTTPException(
        status_code=501,
        detail="对话列表功能暂不可用：需要实现 Python 原生数据库访问层"
    )


@router_api.get("/conversations/{conversation_id}")
async def get_conversation_detail(
    conversation_id: int
):
    """获取对话详情 — 暂不可用，需要 Python 原生 DB 层"""
    raise HTTPException(
        status_code=501,
        detail="对话详情功能暂不可用：需要实现 Python 原生数据库访问层"
    )


@router_api.post("/conversations/{conversation_id}/close")
async def close_conversation(
    conversation_id: int
):
    """关闭对话 — 暂不可用，需要 Python 原生 DB 层"""
    raise HTTPException(
        status_code=501,
        detail="关闭对话功能暂不可用：需要实现 Python 原生数据库访问层"
    )