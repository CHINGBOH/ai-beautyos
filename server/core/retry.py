import asyncio
import inspect
from collections.abc import Awaitable, Callable
from typing import Any

from ..core.logging import get_logger

logger = get_logger(__name__)


class RetryStrategy:
    def __init__(
        self,
        max_attempts: int = 3,
        base_delay: float = 1.0,
        max_delay: float = 10.0,
        exponential_base: float = 2.0
    ):
        self.max_attempts = max_attempts
        self.base_delay = base_delay
        self.max_delay = max_delay
        self.exponential_base = exponential_base

    def get_delay(self, attempt: int) -> float:
        delay = self.base_delay * (self.exponential_base ** (attempt - 1))
        return min(delay, self.max_delay)


async def with_retry(
    coro: Callable[[], Awaitable[Any] | Any] | Awaitable[Any],
    strategy: RetryStrategy | None = None,
    exceptions: tuple[type[BaseException], ...] = (Exception,),
    on_retry: Callable[[int, BaseException], Awaitable[Any] | Any] | None = None,
):
    if strategy is None:
        strategy = RetryStrategy()

    last_exception = None

    for attempt in range(1, strategy.max_attempts + 1):
        try:
            result = coro() if callable(coro) else coro
            return await result if inspect.isawaitable(result) else result
        except exceptions as e:
            last_exception = e

            if attempt == strategy.max_attempts:
                logger.error("retry_exhausted", attempts=attempt, error=str(e))
                raise

            delay = strategy.get_delay(attempt)
            logger.warning(
                "retry_attempt",
                attempt=attempt,
                max_attempts=strategy.max_attempts,
                delay=delay,
                error=str(e)
            )

            if on_retry:
                retry_result = on_retry(attempt, e)
                if inspect.isawaitable(retry_result):
                    await retry_result

            await asyncio.sleep(delay)

    if last_exception is not None:
        raise last_exception
    raise RuntimeError("retry exhausted without an exception")


class CircuitBreakerOpenException(Exception):
    pass


class CircuitBreaker:
    def __init__(
        self,
        failure_limit: int = 5,
        recovery_timeout: int = 30,
        expected_exception: type[BaseException] = Exception
    ):
        self.failure_limit = failure_limit
        self.recovery_timeout = recovery_timeout
        self.expected_exception = expected_exception
        self._failure_count = 0
        self._last_failure_time: float | None = None
        self._state = "closed"
        self._lock = asyncio.Lock()

    @property
    def state(self) -> str:
        return self._state

    def is_open(self) -> bool:
        if self._state == "open":
            import time
            if (
                self._last_failure_time is not None
                and time.time() - self._last_failure_time >= self.recovery_timeout
            ):
                self._state = "half_open"
                logger.info("circuit_breaker_half_open")
                return False
            return True
        return False

    async def call(self, func, *args, **kwargs):
        if self.is_open():
            raise CircuitBreakerOpenException("Circuit breaker is open")

        try:
            result = await func(*args, **kwargs)
            async with self._lock:
                self._failure_count = 0
                self._state = "closed"
            return result
        except self.expected_exception:
            async with self._lock:
                self._failure_count += 1
                self._last_failure_time = __import__("time").time()
                if self._failure_count >= self.failure_limit:
                    self._state = "open"
                    logger.warning("circuit_breaker_opened", failures=self._failure_count)
            raise


retry_strategy = RetryStrategy()
