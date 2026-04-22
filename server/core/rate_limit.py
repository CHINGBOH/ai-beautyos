from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from typing import Optional
import time
import hashlib
from ..core.config import get_settings

settings = get_settings()


class RateLimiter:
    def __init__(self, requests_per_minute: int = 60):
        self.requests_per_minute = requests_per_minute
        self.window_size = 60
        self.requests: dict[str, list[float]] = {}

    def _get_client_id(self, request: Request) -> str:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"

    _MAX_CLIENTS = 10000

    def _cleanup_old_requests(self, client_id: str, current_time: float):
        if client_id not in self.requests:
            self.requests[client_id] = []

        self.requests[client_id] = [
            ts for ts in self.requests[client_id]
            if current_time - ts < self.window_size
        ]

        # 删除空条目防止内存泄漏
        if not self.requests[client_id]:
            del self.requests[client_id]

        # 安全阀：超过上限时清空最老的一半客户端
        if len(self.requests) > self._MAX_CLIENTS:
            sorted_clients = sorted(self.requests.keys())
            for key in sorted_clients[: len(sorted_clients) // 2]:
                del self.requests[key]

    def is_allowed(self, request: Request) -> tuple[bool, Optional[str]]:
        client_id = self._get_client_id(request)
        current_time = time.time()

        self._cleanup_old_requests(client_id, current_time)

        if client_id not in self.requests:
            self.requests[client_id] = []

        if len(self.requests[client_id]) >= self.requests_per_minute:
            retry_after = int(self.window_size - (current_time - self.requests[client_id][0])) + 1
            return False, str(retry_after)

        self.requests[client_id].append(current_time)
        return True, None


rate_limiter = RateLimiter(requests_per_minute=60)


async def rate_limit_middleware(request: Request, call_next):
    if request.url.path in ["/health", "/health/live", "/health/ready"]:
        return await call_next(request)

    allowed, retry_after = rate_limiter.is_allowed(request)

    if not allowed:
        return JSONResponse(
            status_code=429,
            content={
                "success": False,
                "error": {
                    "code": "RATE_LIMIT",
                    "message": "请求过于频繁，请稍后重试"
                }
            },
            headers={"Retry-After": retry_after} if retry_after else {}
        )

    response = await call_next(request)
    response.headers["X-RateLimit-Limit"] = str(rate_limiter.requests_per_minute)
    response.headers["X-RateLimit-Remaining"] = str(
        rate_limiter.requests_per_minute - len(rate_limiter.requests.get(rate_limiter._get_client_id(request), []))
    )
    return response
