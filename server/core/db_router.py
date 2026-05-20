import asyncio
from collections.abc import Callable
from contextlib import asynccontextmanager
from enum import Enum
from functools import wraps
from typing import Any

from ..core.logging import get_logger

logger = get_logger(__name__)


class DBOperationType(Enum):
    READ = "read"
    WRITE = "write"


class ReadWriteRouter:
    def __init__(
        self,
        primary_url: str,
        replica_urls: list[str],
        max_connections: int = 20,
        connection_timeout: int = 10
    ):
        self.primary_url = primary_url
        self.replica_urls = replica_urls or [primary_url]
        self.max_connections = max_connections
        self.connection_timeout = connection_timeout

        self._primary_pool: Any | None = None
        self._replica_pools: list[Any] = []
        self._current_replica_index = 0
        self._lock = asyncio.Lock()

    async def connect(self):
        try:
            import asyncpg
            self._primary_pool = await asyncpg.create_pool(
                self.primary_url,
                min_size=2,
                max_size=self.max_connections,
                command_timeout=self.connection_timeout
            )

            for replica_url in self.replica_urls:
                replica_pool = await asyncpg.create_pool(
                    replica_url,
                    min_size=2,
                    max_size=self.max_connections,
                    command_timeout=self.connection_timeout
                )
                self._replica_pools.append(replica_pool)

            logger.info("database_router_connected", primary=self.primary_url, replicas=len(self._replica_pools))
        except Exception as e:
            logger.error("database_router_connection_failed", error=str(e))
            raise

    async def disconnect(self):
        if self._primary_pool:
            await self._primary_pool.close()

        for pool in self._replica_pools:
            await pool.close()

        logger.info("database_router_disconnected")

    @asynccontextmanager
    async def acquire(self, operation: DBOperationType = DBOperationType.READ):
        if operation == DBOperationType.WRITE:
            pool = self._primary_pool
        else:
            async with self._lock:
                if self._replica_pools:
                    pool = self._replica_pools[self._current_replica_index]
                    self._current_replica_index = (self._current_replica_index + 1) % len(self._replica_pools)
                else:
                    pool = self._primary_pool

        if not pool:
            pool = self._primary_pool
        if pool is None:
            raise RuntimeError("Database router not connected")

        async with pool.acquire() as connection:
            yield connection

    async def execute(
        self,
        query: str,
        params: tuple[Any, ...] | None = None,
        operation: DBOperationType = DBOperationType.WRITE
    ) -> Any:
        async with self.acquire(operation) as conn:
            try:
                return await conn.fetch(query, *params) if params else await conn.fetch(query)
            except Exception as e:
                if operation == DBOperationType.READ:
                    logger.warning("replica_query_failed_trying_primary", error=str(e))
                    async with self.acquire(DBOperationType.WRITE) as primary_conn:
                        return await primary_conn.fetch(query, *params) if params else await primary_conn.fetch(query)
                raise

    async def execute_one(
        self,
        query: str,
        params: tuple[Any, ...] | None = None,
        operation: DBOperationType = DBOperationType.WRITE
    ) -> Any | None:
        result = await self.execute(query, params, operation)
        return result[0] if result else None

    async def execute_scalar(
        self,
        query: str,
        params: tuple[Any, ...] | None = None,
        operation: DBOperationType = DBOperationType.WRITE
    ) -> Any:
        row = await self.execute_one(query, params, operation)
        return row[0] if row else None


class DatabaseSession:
    def __init__(self, router: ReadWriteRouter, operation: DBOperationType = DBOperationType.READ):
        self.router = router
        self.operation = operation
        self._conn: Any | None = None

    async def __aenter__(self):
        self._conn = self.router.acquire(self.operation)
        return await self._conn.__aenter__()

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self._conn:
            await self._conn.__aexit__(exc_type, exc_val, exc_tb)


db_router: ReadWriteRouter | None = None


async def init_db_router(
    primary_url: str,
    replica_urls: list[str] | None = None,
    max_connections: int = 20
):
    global db_router
    db_router = ReadWriteRouter(
        primary_url=primary_url,
        replica_urls=replica_urls or [primary_url],
        max_connections=max_connections
    )
    await db_router.connect()
    return db_router


async def close_db_router():
    global db_router
    if db_router:
        await db_router.disconnect()
        db_router = None


async def read_query(query: str, params: tuple[Any, ...] | None = None) -> Any:
    if not db_router:
        raise RuntimeError("Database router not initialized")
    return await db_router.execute(query, params, DBOperationType.READ)


async def write_query(query: str, params: tuple[Any, ...] | None = None) -> Any:
    if not db_router:
        raise RuntimeError("Database router not initialized")
    return await db_router.execute(query, params, DBOperationType.WRITE)


async def read_query_one(query: str, params: tuple[Any, ...] | None = None) -> Any | None:
    if not db_router:
        raise RuntimeError("Database router not initialized")
    return await db_router.execute_one(query, params, DBOperationType.READ)


async def write_query_one(query: str, params: tuple[Any, ...] | None = None) -> Any | None:
    if not db_router:
        raise RuntimeError("Database router not initialized")
    return await db_router.execute_one(query, params, DBOperationType.WRITE)


def with_retry(max_attempts: int = 3, delay: float = 0.5):
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            last_error = None
            for attempt in range(max_attempts):
                try:
                    return await func(*args, **kwargs)
                except Exception as e:
                    last_error = e
                    if attempt < max_attempts - 1:
                        await asyncio.sleep(delay * (attempt + 1))
            if last_error is not None:
                raise last_error
            raise RuntimeError("Retry wrapper exhausted without running the function")
        return wrapper
    return decorator
