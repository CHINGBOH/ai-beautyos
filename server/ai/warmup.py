import asyncio
import time
from typing import Dict, Any, Optional
from ..core.logging import get_logger
from ..core.config import get_settings
from .llm_coordinator import coordinator

settings = get_settings()
logger = get_logger(__name__)


class LLMWarmupper:
    def __init__(self):
        self.warmed_up = False
        self.last_warmup: Optional[float] = None
        self.warmup_interval = 300

    async def warmup(self):
        if self.warmed_up and self.last_warmup:
            if time.time() - self.last_warmup < self.warmup_interval:
                logger.info("llm_warmup_skipped", reason="recently_warmed")
                return

        logger.info("llm_warmup_started")

        try:
            test_history = [
                {"role": "user", "content": "你好"}
            ]
            result = await coordinator.process(
                user_input="你好",
                history=test_history,
                context={}
            )
            logger.info("llm_warmup_success", response_length=len(result.get("response", "")))
            self.warmed_up = True
            self.last_warmup = time.time()
        except Exception as e:
            logger.error("llm_warmup_failed", error=str(e))

    def is_ready(self) -> bool:
        return self.warmed_up


llm_warmer = LLMWarmupper()


async def periodic_warmup(interval: int = 300):
    while True:
        await llm_warmer.warmup()
        await asyncio.sleep(interval)
