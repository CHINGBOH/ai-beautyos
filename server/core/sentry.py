import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.asyncio import AsyncioIntegration
from sentry_sdk.integrations.redis import RedisIntegration
from typing import Optional
from ..core.config import get_settings

settings = get_settings()


def init_sentry(dsn: Optional[str] = None):
    if not dsn:
        dsn = getattr(settings, 'SENTRY_DSN', None)

    if not dsn:
        return

    sentry_sdk.init(
        dsn=dsn,
        integrations=[
            FastApiIntegration(),
            AsyncioIntegration(),
            RedisIntegration(),
        ],
        traces_sample_rate=0.1,
        profiles_sample_rate=0.1,
        environment=getattr(settings, 'ENVIRONMENT', 'production'),
        release=getattr(settings, 'APP_VERSION', '1.0.0'),
        send_default_pii=False,
        ignore_errors=[
            KeyboardInterrupt,
            SystemExit,
        ],
        before_send_transaction=lambda event, hint: event,
    )
