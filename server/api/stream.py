import json
from typing import Any

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse

from ..ai.llm_coordinator import coordinator
from ..ai.semantic_cache import semantic_cache
from ..core.config import get_settings
from ..core.logging import get_logger

settings = get_settings()
logger = get_logger(__name__)
router_stream = APIRouter(prefix="/api/stream", tags=["stream"])


async def generate_stream_response(
    message: str,
    history: list,
    context: dict[str, Any] | None = None
):
    cached = semantic_cache.get(message, context)
    if cached:
        yield f"data: {json.dumps({'type': 'cached', 'content': cached['response']})}\n\n"
        yield f"data: {json.dumps({'type': 'done'})}\n\n"
        return

    result = await coordinator.process(message, history, context)

    if result.get("success"):
        response = result["response"]
        for i in range(0, len(response), 10):
            chunk = response[i:i+10]
            yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"
            await __import__("asyncio").sleep(0.05)

        semantic_cache.set(message, {
            "response": response,
            "analysis": result.get("analysis")
        }, context)

    yield f"data: {json.dumps({'type': 'done'})}\n\n"


@router_stream.post("/chat")
async def stream_chat(request: Request):
    body = await request.json()
    message = body.get("message", "")
    history = body.get("history", [])
    context = body.get("context")

    if not message:
        raise HTTPException(status_code=400, detail="消息不能为空")

    return StreamingResponse(
        generate_stream_response(message, history, context),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

# Export router with standard name for main.py import
router = router_stream
