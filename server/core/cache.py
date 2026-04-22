import json
import hashlib
from typing import Optional, Any, Callable
from datetime import datetime, timedelta
import asyncio
from functools import wraps
from ..core.config import get_settings

settings = get_settings()


class RedisCache:
    def __init__(self):
        self._client = None
        self._connected = False
        self._lock = asyncio.Lock()

    async def connect(self):
        if self._connected:
            return

        async with self._lock:
            if self._connected:
                return

            try:
                import redis.asyncio as redis
                self._client = redis.from_url(
                    settings.REDIS_URL,
                    encoding="utf-8",
                    decode_responses=True,
                    max_connections=settings.REDIS_MAX_CONNECTIONS
                )
                await self._client.ping()
                self._connected = True
            except Exception as e:
                self._client = None
                self._connected = False

    async def disconnect(self):
        if self._client:
            await self._client.close()
            self._connected = False

    async def get(self, key: str) -> Optional[str]:
        if not self._connected:
            return None
        try:
            return await self._client.get(key)
        except Exception:
            return None

    async def set(
        self,
        key: str,
        value: str,
        ex: Optional[int] = None,
        px: Optional[int] = None
    ) -> bool:
        if not self._connected:
            return False
        try:
            await self._client.set(key, value, ex=ex, px=px)
            return True
        except Exception:
            return False

    async def delete(self, key: str) -> bool:
        if not self._connected:
            return False
        try:
            await self._client.delete(key)
            return True
        except Exception:
            return False

    async def exists(self, key: str) -> bool:
        if not self._connected:
            return False
        try:
            return await self._client.exists(key) > 0
        except Exception:
            return False

    async def incr(self, key: str) -> int:
        if not self._connected:
            return 0
        try:
            return await self._client.incr(key)
        except Exception:
            return 0

    async def expire(self, key: str, seconds: int) -> bool:
        if not self._connected:
            return False
        try:
            return await self._client.expire(key, seconds)
        except Exception:
            return False

    async def ttl(self, key: str) -> int:
        if not self._connected:
            return -1
        try:
            return await self._client.ttl(key)
        except Exception:
            return -1


redis_cache = RedisCache()


def cache_key(*args, **kwargs) -> str:
    key_data = {
        "args": args,
        "kwargs": sorted(kwargs.items())
    }
    key_str = json.dumps(key_data, sort_keys=True, default=str)
    return f"cache:{hashlib.md5(key_str.encode()).hexdigest()}"


def cached(ttl: int = 300, key_prefix: str = ""):
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            cache_key_str = f"{key_prefix}:{cache_key(*args, **kwargs)}"

            cached_value = await redis_cache.get(cache_key_str)
            if cached_value:
                try:
                    return json.loads(cached_value)
                except json.JSONDecodeError:
                    pass

            result = await func(*args, **kwargs)

            if result is not None:
                try:
                    await redis_cache.set(
                        cache_key_str,
                        json.dumps(result, default=str),
                        ex=ttl
                    )
                except Exception:
                    pass

            return result
        return wrapper
    return decorator


class DistributedLock:
    def __init__(self, name: str, timeout: int = 10):
        self.name = name
        self.timeout = timeout
        self._token = None

    async def __aenter__(self):
        lock_key = f"lock:{self.name}"
        self._token = hashlib.md5(f"{self.name}:{id(self)}".encode()).hexdigest()

        for _ in range(self.timeout):
            acquired = await redis_cache.set(lock_key, self._token, ex=self.timeout)
            if acquired:
                return self
            await asyncio.sleep(0.1)

        raise TimeoutError(f"Could not acquire lock: {self.name}")

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        lock_key = f"lock:{self.name}"
        current_value = await redis_cache.get(lock_key)

        if current_value == self._token:
            await redis_cache.delete(lock_key)


async def invalidate_cache(pattern: str):
    pass
