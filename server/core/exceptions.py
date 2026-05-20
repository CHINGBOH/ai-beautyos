
import structlog
from fastapi import Request
from fastapi.responses import JSONResponse

logger = structlog.get_logger()


class AppException(Exception):
    def __init__(self, message: str, status_code: int = 500, error_code: str | None = None):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code or f"ERR_{status_code}"
        super().__init__(self.message)


class ValidationException(AppException):
    def __init__(self, message: str, field: str | None = None):
        super().__init__(message=message, status_code=400, error_code="VALIDATION_ERROR")
        self.field = field


class AuthenticationException(AppException):
    def __init__(self, message: str = "认证失败"):
        super().__init__(message=message, status_code=401, error_code="AUTH_ERROR")


class AuthorizationException(AppException):
    def __init__(self, message: str = "权限不足"):
        super().__init__(message=message, status_code=403, error_code="FORBIDDEN")


class NotFoundException(AppException):
    def __init__(self, resource: str = "资源"):
        super().__init__(message=f"{resource}不存在", status_code=404, error_code="NOT_FOUND")


class RateLimitException(AppException):
    def __init__(self, message: str = "请求过于频繁"):
        super().__init__(message=message, status_code=429, error_code="RATE_LIMIT")


class ExternalServiceException(AppException):
    def __init__(self, service: str, message: str = "外部服务错误"):
        super().__init__(message=f"{service}: {message}", status_code=502, error_code="EXTERNAL_SERVICE_ERROR")
        self.service = service


class LLMException(AppException):
    def __init__(self, provider: str, message: str):
        super().__init__(message=f"{provider}: {message}", status_code=503, error_code="LLM_ERROR")
        self.provider = provider


class CircuitBreakerOpenException(AppException):
    def __init__(self, service: str):
        super().__init__(
            message=f"{service}服务暂时不可用，请稍后重试",
            status_code=503,
            error_code="CIRCUIT_BREAKER_OPEN"
        )
        self.service = service


async def app_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    if not isinstance(exc, AppException):
        return await generic_exception_handler(request, exc)

    logger.warning(
        "app_exception",
        error_code=exc.error_code,
        message=exc.message,
        path=request.url.path,
        method=request.method
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": exc.error_code,
                "message": exc.message
            }
        }
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error(
        "unhandled_exception",
        error_type=type(exc).__name__,
        message=str(exc),
        path=request.url.path
    )
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "服务器内部错误"
            }
        }
    )
