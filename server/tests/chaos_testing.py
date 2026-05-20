import asyncio
import logging
import random
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class ChaosExperiment:
    name: str
    description: str
    target_component: str
    action: Callable[[], Awaitable[Any]]
    rollback: Callable[[], Awaitable[Any]] | None = None
    probability: float = 1.0


class ChaosEngine:
    def __init__(self):
        self.experiments: list[ChaosExperiment] = []
        self._enabled = False

    def register_experiment(self, experiment: ChaosExperiment):
        self.experiments.append(experiment)
        logger.info(f"Registered chaos experiment: {experiment.name}")

    def enable(self):
        self._enabled = True
        logger.info("Chaos engine enabled")

    def disable(self):
        self._enabled = False
        logger.info("Chaos engine disabled")

    async def run_experiment(self, experiment: ChaosExperiment) -> bool:
        if not self._enabled:
            logger.debug("Chaos engine is disabled, skipping experiment")
            return False

        if random.random() > experiment.probability:
            logger.debug(f"Skipping experiment {experiment.name} due to probability")
            return False

        logger.warning(f"Running chaos experiment: {experiment.name}")
        try:
            await experiment.action()
            logger.info(f"Chaos experiment {experiment.name} completed successfully")
            return True
        except Exception as e:
            logger.error(f"Chaos experiment {experiment.name} failed: {e}")
            if experiment.rollback:
                try:
                    await experiment.rollback()
                    logger.info(f"Rollback completed for {experiment.name}")
                except Exception as rollback_error:
                    logger.error(f"Rollback failed for {experiment.name}: {rollback_error}")
            return False

    async def run_all_experiments(self):
        for experiment in self.experiments:
            await self.run_experiment(experiment)


async def latency_injection(duration_seconds: float = 5, latency_ms: int = 1000):
    logger.warning(f"Injecting latency: {latency_ms}ms for {duration_seconds}s")
    await asyncio.sleep(duration_seconds)
    logger.info("Latency injection completed")


async def failure_injection():
    logger.warning("Injecting failure")
    raise Exception("Chaos: Injected failure for testing")


async def timeout_injection():
    logger.warning("Injecting timeout")
    await asyncio.sleep(30)


async def memory_pressure():
    logger.warning("Injecting memory pressure")
    data = []
    for _ in range(1000000):
        data.append("x" * 1000)
    return data


async def network_partition():
    logger.warning("Simulating network partition")
    await asyncio.sleep(5)
    logger.info("Network partition simulation completed")


async def database_connection_kill():
    logger.warning("Simulating database connection kill")
    await asyncio.sleep(2)
    logger.info("Database connection kill simulation completed")


chaos_engine = ChaosEngine()

chaos_engine.register_experiment(ChaosExperiment(
    name="latency_injection",
    description="Inject network latency into LLM calls",
    target_component="llm_service",
    action=lambda: latency_injection(duration_seconds=5, latency_ms=2000),
    probability=0.1
))

chaos_engine.register_experiment(ChaosExperiment(
    name="llm_failure",
    description="Simulate LLM service failure",
    target_component="llm_service",
    action=failure_injection,
    probability=0.05
))

chaos_engine.register_experiment(ChaosExperiment(
    name="timeout_injection",
    description="Simulate request timeout",
    target_component="api",
    action=timeout_injection,
    probability=0.05
))

chaos_engine.register_experiment(ChaosExperiment(
    name="database_connection_kill",
    description="Simulate database connection failure",
    target_component="database",
    action=database_connection_kill,
    probability=0.02
))
