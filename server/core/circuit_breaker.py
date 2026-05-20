import asyncio
import time
from collections.abc import Callable
from enum import StrEnum
from functools import wraps
from typing import Any

from ..core.config import get_settings
from ..core.exceptions import CircuitBreakerOpenException
from ..core.logging import get_logger

settings = get_settings()
logger = get_logger(__name__)


class CircuitState(StrEnum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"


class CircuitBreaker:
    def __init__(
        self,
        name: str = "default",
        failure_limit: int = 5,
        recovery_timeout: int = 30,
        expected_exception: type[BaseException] = Exception
    ):
        self.name = name
        self.failure_limit = failure_limit
        self.recovery_timeout = recovery_timeout
        self.expected_exception = expected_exception

        self._failure_count = 0
        self._last_failure_time: float | None = None
        self._state = CircuitState.CLOSED
        self._lock = asyncio.Lock()

    @property
    def state(self) -> CircuitState:
        return self._state

    @property
    def failure_count(self) -> int:
        return self._failure_count

    def is_open(self) -> bool:
        if self._state == CircuitState.OPEN:
            if (
                self._last_failure_time is not None
                and time.time() - self._last_failure_time >= self.recovery_timeout
            ):
                self._state = CircuitState.HALF_OPEN
                logger.info("circuit_breaker_half_open", service=self.name)
                return False
            return True
        return False

    async def call(self, func: Callable, *args, **kwargs) -> Any:
        if self.is_open():
            logger.warning("circuit_breaker_rejected", service=self.name)
            raise CircuitBreakerOpenException(self.name)

        try:
            if asyncio.iscoroutinefunction(func):
                result = await func(*args, **kwargs)
            else:
                result = func(*args, **kwargs)

            await self._on_success()
            return result

        except self.expected_exception:
            await self._on_failure()
            raise

    async def _on_success(self):
        async with self._lock:
            if self._state == CircuitState.HALF_OPEN:
                logger.info("circuit_breaker_recovered", service=self.name)
            self._failure_count = 0
            self._state = CircuitState.CLOSED

    async def _on_failure(self):
        async with self._lock:
            self._failure_count += 1
            self._last_failure_time = time.time()

            if self._failure_count >= self.failure_limit:
                self._state = CircuitState.OPEN
                logger.warning(
                    "circuit_breaker_opened",
                    service=self.name,
                    failure_count=self._failure_count
                )

    def reset(self):
        self._failure_count = 0
        self._last_failure_time = None
        self._state = CircuitState.CLOSED
        logger.info("circuit_breaker_reset", service=self.name)

    def get_stats(self) -> dict:
        return {
            "name": self.name,
            "state": self._state.value,
            "failure_count": self._failure_count,
            "failure_limit": self.failure_limit,
            "recovery_timeout": self.recovery_timeout,
            "last_failure_time": self._last_failure_time
        }


circuit_breakers: dict[str, CircuitBreaker] = {}


def get_circuit_breaker(name: str) -> CircuitBreaker:
    if name not in circuit_breakers:
        circuit_breakers[name] = CircuitBreaker(
            name=name,
            failure_limit=settings.CIRCUIT_BREAKER_FAILURE_LIMIT,
            recovery_timeout=settings.CIRCUIT_BREAKER_RECOVERY_TIMEOUT
        )
    return circuit_breakers[name]


def circuit_breaker_protected(name: str):
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            cb = get_circuit_breaker(name)
            return await cb.call(func, *args, **kwargs)
        return wrapper
    return decorator


class TimeoutException(Exception):
    pass




async def with_timeout(coro, timeout_seconds: float):
    try:
        return await asyncio.wait_for(coro, timeout=timeout_seconds)
    except TimeoutError as exc:
        raise TimeoutException(f"操作超时 ({timeout_seconds}秒)") from exc
