from .chat import router as chat_router
from .appointments import router as appointment_router
from .users import router as users_router
from .rag import router as rag_router
from .wework import router as wework_router
from .sms import router as sms_router
from .stream import router as stream_router
from .signature import router as signature_router
from .feedback import router as feedback_router
from .holidays import router as holiday_router
from .analytics import router as analytics_router
from .ab_testing import router as ab_router
from .medical_chat import router as medical_chat_router  # 已禁用，避免与TypeScript Agent冲突

__all__ = [
    "chat_router", "appointment_router", "users_router", "rag_router",
    "wework_router", "sms_router", "stream_router", "signature_router",
    "feedback_router", "holiday_router", "analytics_router", "ab_router",
    "medical_chat_router"
]
