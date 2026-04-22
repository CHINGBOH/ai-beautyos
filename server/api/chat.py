from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ..ai.llm_coordinator import coordinator
from ..ai.semantic_cache import semantic_cache
from ..ai.smart_router import router, RouteTarget
from ..core.logging import get_logger
from ..core.security import security
from ..core.exceptions import ValidationException, CircuitBreakerOpenException
from ..core.circuit_breaker import get_circuit_breaker, with_timeout, TimeoutException
from ..core.config import get_settings

settings = get_settings()
logger = get_logger(__name__)
router_api = APIRouter(prefix="/api/chat", tags=["chat"])


class ChatRequest(BaseModel):
    message: str
    history: list = []
    user_id: Optional[str] = None
    context: Optional[Dict[str, Any]] = None


class ChatResponse(BaseModel):
    success: bool
    response: str
    analysis: Optional[Dict[str, Any]] = None
    route_target: Optional[str] = None
    cached: bool = False
    error: Optional[str] = None


@router_api.post("/message", response_model=ChatResponse)
async def chat_message(request: ChatRequest):
    if not request.message or not request.message.strip():
        raise ValidationException("消息内容不能为空", field="message")

    sanitized_message = security.sanitize_input(request.message)

    if security.detect_prompt_injection(sanitized_message):
        logger.warning("prompt_injection_blocked", message_length=len(sanitized_message))
        raise ValidationException("输入包含无效内容")

    cached_response = semantic_cache.get(request.message, request.context)
    if cached_response:
        return ChatResponse(
            success=True,
            response=cached_response["response"],
            analysis=cached_response.get("analysis"),
            route_target=cached_response.get("route_target"),
            cached=True
        )

    route_target = router.route(request.message, request.history, request.context or {})
    logger.info("route_decision", target=route_target.value, message_length=len(request.message))

    if route_target == RouteTarget.DIRECT_REPLY:
        return ChatResponse(
            success=True,
            response="您好！有什么可以帮助您的吗？😊",
            route_target=route_target.value,
            cached=False
        )

    llm_circuit_breaker = get_circuit_breaker("llm_service")

    try:
        result = await with_timeout(
            llm_circuit_breaker.call(
                coordinator.process,
                user_input=request.message,
                history=request.history,
                context=request.context
            ),
            timeout_seconds=30.0
        )
    except CircuitBreakerOpenException:
        raise HTTPException(status_code=503, detail="AI服务暂时不可用，请稍后重试")
    except TimeoutException:
        raise HTTPException(status_code=504, detail="AI服务响应超时，请稍后重试")

    if result["success"]:
        semantic_cache.set(request.message, {
            "response": result["response"],
            "analysis": result.get("analysis"),
            "route_target": route_target.value
        }, request.context)

    return ChatResponse(
        success=result["success"],
        response=result["response"],
        analysis=result.get("analysis"),
        route_target=route_target.value,
        cached=False,
        error=result.get("error")
    )


@router_api.get("/route/explain")
async def explain_route(message: str, history: list = [], context: Dict[str, Any] = None):
    return router.explain_route(message, history, context or {})


@router_api.get("/cache/stats")
async def cache_stats():
    return semantic_cache.get_stats()


@router_api.post("/cache/clear")
async def clear_cache():
    semantic_cache.clear()
    return {"success": True, "message": "缓存已清空"}


@router_api.get("/metrics")
async def get_metrics():
    return {
        "router": router.get_metrics(),
        "cache": semantic_cache.get_stats()
    }

# Export router with standard name for main.py import
router = router_api
