import json
import hashlib
from typing import Optional, Any, Callable, List
from datetime import datetime, timedelta
import asyncio
from functools import wraps
from ..core.config import get_settings

settings = get_settings()


class RedisSentinelClient:
    def __init__(
        self,
        sentinels: List[str] = None,
        service_name: str = "mymaster",
        sentinel_password: Optional[str] = None,
        password: Optional[str] = None,
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

        self._client = None
        self._sentinel_client = None
        self._connected = False
        self._master_address: Optional[tuple] = None
        self._slave_addresses: List[tuple] = []
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
            self._client = redis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
                max_connections=self.max_connections
            )
            await self._client.ping()
            self._connected = True
            return True
        except Exception:
            self._connected = False
            return False

    async def _connect_sentinel(self):
        import redis.asyncio as redis

        self._sentinel_client = redis.Sentinel(
            sentinels=self.sentinels,
            sentinel_kwargs={"password": self.sentinel_password} if self.sentinel_password else {},
            socket_timeout=self.sentinel_timeout
        )

        master = self._sentinel_client.master_for(
            self.service_name,
            password=self.password,
            db=self.db,
            socket_timeout=self.socket_timeout
        )

        self._master_address = await master.address
        self._client = master
        await self._client.ping()

        slave = self._sentinel_client.slave_for(
            self.service_name,
            password=self.password,
            db=self.db,
            socket_timeout=self.socket_timeout
        )
        self._slave_addresses = await slave.address

    async def disconnect(self):
        if self._client:
            await self._client.close()
        if self._sentinel_client:
            self._sentinel_client = None
        self._connected = False

    async def get(self, key: str) -> Optional[str]:
        if not self._connected:
            await self.connect()
        try:
            return await self._client.get(key)
        except Exception:
            return None

    async def set(
        self,
        key: str,
        value: str,
        ex: Optional[int] = None,
        px: Optional[int] = None,
        nx: bool = False,
        xx: bool = False
    ) -> bool:
        if not self._connected:
            await self.connect()
        try:
            return await self._client.set(key, value, ex=ex, px=px, nx=nx, xx=xx)
        except Exception:
            return False

    async def delete(self, key: str) -> bool:
        if not self._connected:
            await self.connect()
        try:
            return await self._client.delete(key) > 0
        except Exception:
            return False

    async def exists(self, key: str) -> bool:
        if not self._connected:
            await self.connect()
        try:
            return await self._client.exists(key) > 0
        except Exception:
            return False

    async def incr(self, key: str) -> int:
        if not self._connected:
            await self.connect()
        try:
            return await self._client.incr(key)
        except Exception:
            return 0

    async def expire(self, key: str, seconds: int) -> bool:
        if not self._connected:
            await self.connect()
        try:
            return await self._client.expire(key, seconds)
        except Exception:
            return False

    async def ttl(self, key: str) -> int:
        if not self._connected:
            await self.connect()
        try:
            return await self._client.ttl(key)
        except Exception:
            return -1

    async def get_master_client(self):
        if not self.sentinels:
            return self._client

        import redis.asyncio as redis
        return self._sentinel_client.master_for(
            self.service_name,
            password=self.password,
            db=self.db
        )

    async def get_slave_client(self):
        if not self.sentinels or not self._slave_addresses:
            return self._client

        import redis.asyncio as redis
        return self._sentinel_client.slave_for(
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
        self._redis: Optional[RedisSentinelClient] = None

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
