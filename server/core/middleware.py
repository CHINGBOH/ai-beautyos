from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Callable
import uuid
import time
import structlog

logger = structlog.get_logger()


class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable):
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        request.state.request_id = request_id

        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(request_id=request_id)

        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response


class CSPMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable):
        response = await call_next(request)
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self'; "
            "connect-src 'self' https://api.deepseek.com https://api.moonshot.cn; "
            "frame-ancestors 'none'"
        )
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        return response


class CSRFMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, exempt_paths: list = None):
        super().__init__(app)
        self.exempt_paths = exempt_paths or ["/health", "/health/live", "/health/ready", "/api/chat/message"]

    async def dispatch(self, request: Request, call_next: Callable):
        if request.method in ["POST", "PUT", "DELETE", "PATCH"]:
            if any(request.url.path.startswith(path) for path in self.exempt_paths):
                pass
            else:
                csrf_token = request.headers.get("X-CSRF-Token")
                if not csrf_token:
                    csrf_token = request.cookies.get("csrftoken")

        response = await call_next(request)
        return response


trace_middleware = RequestIDMiddleware
csp_middleware = CSPMiddleware
csrf_middleware = CSRFMiddleware
