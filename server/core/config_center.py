import asyncio
import json
from collections.abc import Callable
from datetime import datetime
from functools import wraps
from typing import Any

from ..core.logging import get_logger

logger = get_logger(__name__)


class ApolloConfigClient:
    def __init__(
        self,
        apollo_url: str = "",
        app_id: str = "",
        cluster: str = "default",
        namespace: str = "application",
        pull_interval: int = 60
    ):
        self.apollo_url = apollo_url.rstrip("/")
        self.app_id = app_id
        self.cluster = cluster
        self.namespace = namespace
        self.pull_interval = pull_interval

        self._config: dict[str, Any] = {}
        self._local_cache: dict[str, Any] = {}
        self._callbacks: dict[str, list[Callable]] = {}
        self._last_pull: datetime | None = None
        self._running = False
        self._lock = asyncio.Lock()

    async def connect(self) -> bool:
        if not self.apollo_url or not self.app_id:
            logger.warning("apollo_client_not_configured")
            return False

        try:
            await self._pull_config()
            self._running = True
            self._pull_task = asyncio.create_task(self._periodic_pull())
            logger.info("apollo_client_connected", app_id=self.app_id)
            return True
        except Exception as e:
            logger.error("apollo_client_connection_failed", error=str(e))
            return False

    async def disconnect(self):
        self._running = False

    async def _pull_config(self):
        if not self.apollo_url:
            return

        try:
            import httpx
            async with httpx.AsyncClient() as client:
                url = f"{self.apollo_url}/configs/{self.app_id}/{self.cluster}/{self.namespace}"
                response = await client.get(url, timeout=10)

                if response.status_code == 200:
                    data = response.json()
                    new_config = data.get("configurations", {})

                    async with self._lock:
                        old_config = self._config.copy()
                        self._config = new_config

                        for key, value in new_config.items():
                            if key not in old_config or old_config[key] != value:
                                await self._notify_change(key, value)

                    self._last_pull = datetime.now()
                    logger.info("apollo_config_pulled", keys_count=len(new_config))
        except Exception as e:
            logger.error("apollo_pull_failed", error=str(e))

    async def _periodic_pull(self):
        while self._running:
            await asyncio.sleep(self.pull_interval)
            try:
                await self._pull_config()
            except Exception as e:
                logger.error("apollo_periodic_pull_failed", error=str(e))

    async def _notify_change(self, key: str, value: Any):
        if key in self._callbacks:
            for callback in self._callbacks[key]:
                try:
                    if asyncio.iscoroutinefunction(callback):
                        await callback(key, value)
                    else:
                        callback(key, value)
                except Exception as e:
                    logger.error("apollo_callback_failed", key=key, error=str(e))

    def get(self, key: str, default: Any = None) -> Any:
        if key in self._config:
            value = self._config[key]
            try:
                return json.loads(value)
            except (json.JSONDecodeError, TypeError):
                return value
        return self._local_cache.get(key, default)

    def get_string(self, key: str, default: str = "") -> str:
        value = self.get(key, default)
        return str(value) if value is not None else default

    def get_int(self, key: str, default: int = 0) -> int:
        value = self.get(key, default)
        try:
            return int(value)
        except (ValueError, TypeError):
            return default

    def get_float(self, key: str, default: float = 0.0) -> float:
        value = self.get(key, default)
        try:
            return float(value)
        except (ValueError, TypeError):
            return default

    def get_bool(self, key: str, default: bool = False) -> bool:
        value = self.get(key, default)
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            return value.lower() in ("true", "1", "yes")
        return default

    def on_change(self, key: str, callback: Callable):
        if key not in self._callbacks:
            self._callbacks[key] = []
        self._callbacks[key].append(callback)

    def set_local_cache(self, key: str, value: Any):
        self._local_cache[key] = value

    def get_all_config(self) -> dict[str, Any]:
        return self._config.copy()

    def is_connected(self) -> bool:
        return self._running and self._last_pull is not None


apollo_client = ApolloConfigClient()


async def get_config(key: str, default: Any = None) -> Any:
    return apollo_client.get(key, default)


def config_validator(required_keys: list[str]):
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            missing_keys = [key for key in required_keys if apollo_client.get(key) is None]
            if missing_keys:
                logger.warning("missing_config_keys", keys=missing_keys)
            return await func(*args, **kwargs)
        return wrapper
    return decorator
