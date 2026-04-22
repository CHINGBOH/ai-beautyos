import asyncio
import signal
import sys
from typing import Optional, Callable
from datetime import datetime
import logging


class GracefulShutdown:
    def __init__(self):
        self._shutdown_requested = False
        self._cleanup_tasks: list = []
        self._logger = logging.getLogger(__name__)

    def request_shutdown(self, sig=None):
        self._shutdown_requested = True
        self._logger.info(f"Shutdown requested by signal {sig if sig else 'code'}")
        asyncio.create_task(self._execute_cleanup())

    async def _execute_cleanup(self):
        self._logger.info("Starting graceful shutdown...")

        for task in self._cleanup_tasks:
            try:
                if asyncio.iscoroutinefunction(task):
                    await task()
                else:
                    task()
            except Exception as e:
                self._logger.error(f"Cleanup task failed: {e}")

        self._logger.info("Graceful shutdown completed")
        await asyncio.sleep(0.5)

    def register_cleanup(self, task: Callable):
        self._cleanup_tasks.append(task)

    @property
    def shutdown_requested(self) -> bool:
        return self._shutdown_requested


shutdown_handler = GracefulShutdown()


def setup_signal_handlers():
    if sys.platform != "win32":
        loop = asyncio.get_event_loop()

        for sig in (signal.SIGTERM, signal.SIGINT):
            loop.add_signal_handler(
                sig,
                lambda s=sig: shutdown_handler.request_shutdown(s)
            )


class LifecycleManager:
    def __init__(self):
        self._startup_handlers: list = []
        self._shutdown_handlers: list = []
        self._started = False
        self._logger = logging.getLogger(__name__)

    def on_startup(self, handler: Callable):
        self._startup_handlers.append(handler)

    def on_shutdown(self, handler: Callable):
        self._shutdown_handlers.append(handler)

    async def startup(self):
        if self._started:
            return

        self._logger.info("Running startup handlers...")
        for handler in self._startup_handlers:
            try:
                if asyncio.iscoroutinefunction(handler):
                    await handler()
                else:
                    handler()
            except Exception as e:
                self._logger.error(f"Startup handler failed: {e}")
                raise

        self._started = True
        self._logger.info("Startup completed")

    async def shutdown(self):
        if not self._started:
            return

        self._logger.info("Running shutdown handlers...")
        for handler in reversed(self._shutdown_handlers):
            try:
                if asyncio.iscoroutinefunction(handler):
                    await handler()
                else:
                    handler()
            except Exception as e:
                self._logger.error(f"Shutdown handler failed: {e}")

        self._started = False
        self._logger.info("Shutdown completed")


lifecycle_manager = LifecycleManager()
