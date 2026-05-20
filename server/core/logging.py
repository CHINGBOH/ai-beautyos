import logging
import re
import sys
from typing import Any

import structlog
from structlog.typing import EventDict, WrappedLogger

from .security import SecurityValidator


class _SafeSecretsProcessor:
    def __call__(self, logger: WrappedLogger, method: str, event: EventDict) -> EventDict:
        secrets_fields = ["api_key", "password", "token", "secret", "authorization"]
        sensitive_patterns = [
            (r"sk-[a-zA-Z0-9]{20,}", "sk-***"),
            (r"Bearer\s+[a-zA-Z0-9\-_.]+", "Bearer ***"),
            (r"password\s*=\s*[^\s&]+", "password=***"),
        ]
        for key in list(event.keys()):
            if any(secrets in key.lower() for secrets in secrets_fields):
                event[key] = "***REDACTED***"
            elif isinstance(event[key], str):
                for pattern, replacement in sensitive_patterns:
                    event[key] = re.sub(pattern, replacement, event[key])
        return event


# Configure structlog after class definition
structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        _SafeSecretsProcessor(),
        structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(file=sys.stdout),
    cache_logger_on_first_use=True,
)


def get_logger(name: str | None = None):
    return structlog.get_logger(name)


# Global logger instance
logger = get_logger(__name__)


class LogManager:
    @staticmethod
    def log_api_request(endpoint: str, method: str, user_id: str | None = None, **kwargs):
        logger.info(
            "api_request",
            endpoint=endpoint,
            method=method,
            masked_user_id=SecurityValidator.mask_phone(user_id) if user_id else None,
            **kwargs
        )

    @staticmethod
    def log_api_response(endpoint: str, status_code: int, duration_ms: float, **kwargs):
        logger.info(
            "api_response",
            endpoint=endpoint,
            status_code=status_code,
            duration_ms=round(duration_ms, 2),
            **kwargs
        )

    @staticmethod
    def log_llm_call(provider: str, model: str, duration_ms: float, tokens_used: int = 0, **kwargs):
        logger.info(
            "llm_call",
            provider=provider,
            model=model,
            duration_ms=round(duration_ms, 2),
            tokens_used=tokens_used,
            **kwargs
        )

    @staticmethod
    def log_error(error: Exception, context: dict[str, Any] | None = None):
        logger.error(
            "error_occurred",
            error_type=type(error).__name__,
            error_message=str(error),
            context=context or {}
        )

    @staticmethod
    def log_security_event(event_type: str, details: dict):
        logger.warning(
            "security_event",
            event_type=event_type,
            details=SecurityValidator.mask_sensitive_data(details)
        )


log_manager = LogManager()
