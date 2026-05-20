# Python FastAPI 服务 — 独立运行，与 Node.js 主服务并列。
#
# 架构决策（#38）：本服务保持独立，不合并进 Node.js。
# 原因：Node.js 侧已覆盖 tRPC analytics / wework / triggers 核心能力；
#       Python 侧独有能力（RAG、SMS、A/B Testing、医美问诊流）如需对外
#       暴露，可在 Node.js 侧添加 http-proxy-middleware 代理至本服务的端口。
#
# 当前状态：
#   - 随 docker-compose 可选启动（service: python-api）
#   - 前端不直接调用本服务；如需对接，在 Node.js express 中添加：
#       app.use("/py-api", createProxyMiddleware({ target: "http://python-api:8000" }))
#   - 农历节日计算 (holidays.py) 可被 Node.js 侧 birthday-holiday.ts 通过 HTTP 调用

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import time
from .core.config import get_settings
from .core.exceptions import AppException, app_exception_handler, generic_exception_handler
from .core.logging import get_logger, log_manager
from .api import (
    chat_router, appointment_router, users_router, rag_router, wework_router,
    sms_router, stream_router, signature_router, feedback_router,
    holiday_router, analytics_router, ab_router, medical_chat_router
)
from .core.rate_limit import rate_limit_middleware
from .core.middleware import RequestIDMiddleware, CSPMiddleware

settings = get_settings()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("application_startup", app_name=settings.APP_NAME, version=settings.APP_VERSION)
    yield
    logger.info("application_shutdown", app_name=settings.APP_NAME)


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan
)

_cors_origins = (
    ["*"] if settings.ALLOWED_ORIGINS == "*"
    else [o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()]
)
# 浏览器禁止 * + credentials 同时生效，wildcard 时关闭 credentials
_cors_credentials = settings.ALLOWED_ORIGINS != "*"

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=_cors_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(RequestIDMiddleware)
app.add_middleware(CSPMiddleware)


@app.middleware("http")
async def add_request_logging(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration_ms = (time.time() - start_time) * 1000

    log_manager.log_api_response(
        endpoint=request.url.path,
        method=request.method,
        status_code=response.status_code,
        duration_ms=duration_ms
    )
    return response


@app.middleware("http")
async def rate_limit_middleware_app(request: Request, call_next):
    return await rate_limit_middleware(request, call_next)

app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

app.include_router(chat_router)
app.include_router(appointment_router)
app.include_router(users_router)
app.include_router(rag_router)
app.include_router(wework_router)
app.include_router(sms_router)
app.include_router(stream_router)
app.include_router(signature_router)
app.include_router(feedback_router)
app.include_router(holiday_router)
app.include_router(analytics_router)
app.include_router(ab_router)
# app.include_router(medical_chat_router)  # 已禁用：使用 TypeScript tRPC Agent (server/routers/chat.ts)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "app": settings.APP_NAME, "version": settings.APP_VERSION}


@app.get("/health/live")
async def liveness():
    return {"status": "alive"}


@app.get("/health/ready")
async def readiness():
    return {"status": "ready"}
