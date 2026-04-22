import time
import asyncio
from typing import Optional, Dict, Any
from contextlib import asynccontextmanager
from ..core.logging import get_logger

logger = get_logger(__name__)


class DBPoolManager:
    def __init__(
        self,
        min_size: int = 5,
        max_size: int = 20,
        max_idle_time: int = 300,
        checkout_timeout: int = 10
    ):
        self.min_size = min_size
        self.max_size = max_size
        self.max_idle_time = max_idle_time
        self.checkout_timeout = checkout_timeout

        self._pool: Dict[str, Any] = {}
        self._available: asyncio.Queue = asyncio.Queue()
        self._created_at: Dict[str, float] = {}
        self._in_use: Dict[str, bool] = {}
        self._lock = asyncio.Lock()

    @asynccontextmanager
    async def acquire(self):
        conn = None
        conn_id = None

        try:
            conn_id = await asyncio.wait_for(
                self._available.get(),
                timeout=self.checkout_timeout
            )
            conn = self._pool.get(conn_id)
        except asyncio.TimeoutError:
            if len(self._pool) < self.max_size:
                async with self._lock:
                    conn_id = f"conn_{int(time.time() * 1000)}"
                    conn = await self._create_connection(conn_id)
                    self._pool[conn_id] = conn
                    self._created_at[conn_id] = time.time()
                    logger.info("db_connection_created", conn_id=conn_id, pool_size=len(self._pool))
            else:
                raise Exception("Connection pool exhausted")

        self._in_use[conn_id] = True
        logger.debug("db_connection_acquired", conn_id=conn_id)

        try:
            yield conn
        finally:
            self._in_use[conn_id] = False
            idle_time = time.time() - self._created_at.get(conn_id, 0)

            if idle_time > self.max_idle_time or len(self._pool) > self.max_size:
                await self._close_connection(conn_id)
            else:
                await self._available.put(conn_id)

            logger.debug("db_connection_released", conn_id=conn_id, pool_size=len(self._pool))

    async def _create_connection(self, conn_id: str) -> Any:
        return {"conn_id": conn_id, "created": time.time()}

    async def _close_connection(self, conn_id: str):
        if conn_id in self._pool:
            del self._pool[conn_id]
        if conn_id in self._created_at:
            del self._created_at[conn_id]
        if conn_id in self._in_use:
            del self._in_use[conn_id]
        logger.info("db_connection_closed", conn_id=conn_id, pool_size=len(self._pool))

    async def close_all(self):
        async with self._lock:
            for conn_id in list(self._pool.keys()):
                await self._close_connection(conn_id)
            logger.info("db_pool_closed")

    def get_stats(self) -> Dict[str, Any]:
        return {
            "total_connections": len(self._pool),
            "available": self._available.qsize(),
            "in_use": sum(1 for v in self._in_use.values() if v),
            "min_size": self.min_size,
            "max_size": self.max_size
        }


db_pool = DBPoolManager()
