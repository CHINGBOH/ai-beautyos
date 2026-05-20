import asyncio
import hashlib
from collections.abc import Callable
from typing import Any

from ..core.config import get_settings

settings = get_settings()


class RedisSentinelClient:
    def __init__(
        self,
        sentinels: list[str] | None = None,
        service_name: str = "mymaster",
        sentinel_password: str | None = None,
        password: str | None = None,
        db: int = 0,
        max_connections: int = 50,
        socket_timeout: float = 5.0,
        sentinel_timeout: float = 3.0
    ):
        self.sentinels = sentinels or []
        self.service_name = service_name
        self.sentinel_password = sentinel_password
        self.password = password
        self.db = db
        self.max_connections = max_connections
        self.socket_timeout = socket_timeout
        self.sentinel_timeout = sentinel_timeout

        self._client: Any | None = None
        self._sentinel_client: Any | None = None
        self._connected = False
        self._master_address: tuple[str, int] | None = None
        self._slave_addresses: list[tuple[str, int]] = []
        self._in_pool = False
        self._lock = asyncio.Lock()

    async def connect(self) -> bool:
        if self._connected:
            return True

        if not self.sentinels:
            return await self._connect_standalone()

        try:
            await self._connect_sentinel()
            self._connected = True
            return True
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Failed to connect to sentinel: {e}")
            return await self._connect_standalone()

    async def _connect_standalone(self) -> bool:
        try:
            import redis.asyncio as redis
            client: Any = redis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
                max_connections=self.max_connections
            )
            await client.ping()
            self._client = client
            self._connected = True
            return True
        except Exception:
            self._connected = False
            return False

    async def _connect_sentinel(self):
        import redis.asyncio as redis

        sentinel_client: Any = redis.Sentinel(
            sentinels=self.sentinels,
            sentinel_kwargs={"password": self.sentinel_password} if self.sentinel_password else {},
            socket_timeout=self.sentinel_timeout
        )
        self._sentinel_client = sentinel_client

        master: Any = sentinel_client.master_for(
            self.service_name,
            password=self.password,
            db=self.db,
            socket_timeout=self.socket_timeout
        )

        self._master_address = sentinel_client.discover_master(self.service_name)
        self._client = master
        await master.ping()

        sentinel_client.slave_for(
            self.service_name,
            password=self.password,
            db=self.db,
            socket_timeout=self.socket_timeout
        )
        self._slave_addresses = list(sentinel_client.discover_slaves(self.service_name))

    async def disconnect(self):
        if self._client:
            await self._client.close()
            self._client = None
        if self._sentinel_client:
            self._sentinel_client = None
        self._connected = False

    async def get(self, key: str) -> str | None:
        if not self._connected:
            await self.connect()
        client = self._client
        if client is None:
            return None
        try:
            return await client.get(key)
        except Exception:
            return None

    async def set(
        self,
        key: str,
        value: str,
        ex: int | None = None,
        px: int | None = None,
        nx: bool = False,
        xx: bool = False
    ) -> bool:
        if not self._connected:
            await self.connect()
        client = self._client
        if client is None:
            return False
        try:
            return await client.set(key, value, ex=ex, px=px, nx=nx, xx=xx)
        except Exception:
            return False

    async def delete(self, key: str) -> bool:
        if not self._connected:
            await self.connect()
        client = self._client
        if client is None:
            return False
        try:
            return await client.delete(key) > 0
        except Exception:
            return False

    async def exists(self, key: str) -> bool:
        if not self._connected:
            await self.connect()
        client = self._client
        if client is None:
            return False
        try:
            return await client.exists(key) > 0
        except Exception:
            return False

    async def incr(self, key: str) -> int:
        if not self._connected:
            await self.connect()
        client = self._client
        if client is None:
            return 0
        try:
            return await client.incr(key)
        except Exception:
            return 0

    async def expire(self, key: str, seconds: int) -> bool:
        if not self._connected:
            await self.connect()
        client = self._client
        if client is None:
            return False
        try:
            return await client.expire(key, seconds)
        except Exception:
            return False

    async def ttl(self, key: str) -> int:
        if not self._connected:
            await self.connect()
        client = self._client
        if client is None:
            return -1
        try:
            return await client.ttl(key)
        except Exception:
            return -1

    async def get_master_client(self):
        if not self.sentinels:
            return self._client

        sentinel_client = self._sentinel_client
        if sentinel_client is None:
            return self._client
        return sentinel_client.master_for(
            self.service_name,
            password=self.password,
            db=self.db
        )

    async def get_slave_client(self):
        if not self.sentinels or not self._slave_addresses:
            return self._client

        sentinel_client = self._sentinel_client
        if sentinel_client is None:
            return self._client
        return sentinel_client.slave_for(
            self.service_name,
            password=self.password,
            db=self.db
        )

    async def execute_on_master(self, func: Callable, *args, **kwargs) -> Any:
        client = await self.get_master_client()
        return await func(client, *args, **kwargs)

    async def execute_on_slave(self, func: Callable, *args, **kwargs) -> Any:
        client = await self.get_slave_client()
        return await func(client, *args, **kwargs)

    def is_connected(self) -> bool:
        return self._connected


redis_sentinel = RedisSentinelClient()


class DistributedLock:
    def __init__(self, name: str, timeout: int = 10):
        self.name = name
        self.timeout = timeout
        self._token = None
        self._redis: RedisSentinelClient | None = None

    async def __aenter__(self):
        self._redis = redis_sentinel if redis_sentinel.is_connected() else None

        if not self._redis:
            try:
                await redis_sentinel.connect()
                self._redis = redis_sentinel
            except Exception:
                pass

        if not self._redis:
            raise RuntimeError("Redis not available")

        lock_key = f"lock:{self.name}"
        self._token = hashlib.md5(f"{self.name}:{id(self)}".encode()).hexdigest()

        for _ in range(self.timeout * 10):
            acquired = await self._redis.set(lock_key, self._token, ex=self.timeout, nx=True)
            if acquired:
                return self
            await asyncio.sleep(0.1)

        raise TimeoutError(f"Could not acquire lock: {self.name}")

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self._redis:
            lock_key = f"lock:{self.name}"
            current_value = await self._redis.get(lock_key)

            if current_value == self._token:
                await self._redis.delete(lock_key)
