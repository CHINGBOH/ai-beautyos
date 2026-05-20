
import contextlib

import pytest

from server.core.circuit_breaker import CircuitBreaker
from server.core.retry import RetryStrategy, with_retry


class TestCircuitBreaker:
    def setup_method(self):
        self.cb = CircuitBreaker(failure_limit=3, recovery_timeout=1)

    @pytest.mark.asyncio
    async def test_circuit_breaker_initial_state(self):
        assert self.cb.state == "closed"
        assert self.cb.is_open() is False

    @pytest.mark.asyncio
    async def test_circuit_breaker_opens_after_failures(self):
        async def failing_func():
            raise Exception("test error")

        for _ in range(3):
            with contextlib.suppress(Exception):
                await self.cb.call(failing_func)

        assert self.cb.state == "open"
        assert self.cb.is_open() is True

    @pytest.mark.asyncio
    async def test_circuit_breaker_allows_call_when_closed(self):
        async def success_func():
            return "success"

        result = await self.cb.call(success_func)
        assert result == "success"
        assert self.cb.state == "closed"


class TestRetryStrategy:
    def test_retry_strategy_initialization(self):
        strategy = RetryStrategy(max_attempts=5, base_delay=2.0)
        assert strategy.max_attempts == 5
        assert strategy.base_delay == 2.0

    def test_retry_strategy_exponential_backoff(self):
        strategy = RetryStrategy(base_delay=1.0, exponential_base=2.0)
        assert strategy.get_delay(1) == 1.0
        assert strategy.get_delay(2) == 2.0
        assert strategy.get_delay(3) == 4.0

    def test_retry_strategy_max_delay(self):
        strategy = RetryStrategy(base_delay=1.0, max_delay=5.0)
        assert strategy.get_delay(10) == 5.0

    @pytest.mark.asyncio
    async def test_with_retry_success_first_attempt(self):
        attempt_count = 0

        async def succeed_func():
            nonlocal attempt_count
            attempt_count += 1
            return "success"

        result = await with_retry(succeed_func, RetryStrategy(max_attempts=3))
        assert result == "success"
        assert attempt_count == 1

    @pytest.mark.asyncio
    async def test_with_retry_retries_on_failure(self):
        attempt_count = 0

        async def flaky_func():
            nonlocal attempt_count
            attempt_count += 1
            if attempt_count < 3:
                raise Exception("temporary error")
            return "success"

        result = await with_retry(
            flaky_func,
            RetryStrategy(max_attempts=3, base_delay=0.01)
        )
        assert result == "success"
        assert attempt_count == 3

    @pytest.mark.asyncio
    async def test_with_retry_raises_after_max_attempts(self):
        async def always_fail():
            raise Exception("permanent error")

        with pytest.raises(Exception, match="permanent error"):
            await with_retry(
                always_fail,
                RetryStrategy(max_attempts=3, base_delay=0.01)
            )
