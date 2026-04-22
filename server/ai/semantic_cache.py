import time
import hashlib
from typing import Optional, Dict, Any, List, Tuple
from ..core.config import get_settings
from ..core.logging import get_logger

settings = get_settings()
logger = get_logger(__name__)


class SemanticCache:
    def __init__(self, threshold: float = 0.85):
        self.threshold = threshold
        self.cache: Dict[str, Tuple[Any, float]] = {}
        self.max_size = settings.CACHE_MAX_SIZE
        self.ttl = settings.CACHE_TTL
        self.hits = 0
        self.misses = 0

    def _get_embedding(self, text: str) -> List[float]:
        import hashlib
        hash_bytes = hashlib.md5(text.encode()).digest()
        return [float(b) / 255.0 for b in hash_bytes[:16]]

    def _cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        dot_product = sum(a * b for a, b in zip(vec1, vec2))
        magnitude1 = sum(a * a for a in vec1) ** 0.5
        magnitude2 = sum(b * b for b in vec2) ** 0.5
        if magnitude1 == 0 or magnitude2 == 0:
            return 0.0
        return dot_product / (magnitude1 * magnitude2)

    def _generate_key(self, text: str, context_hash: str = "") -> str:
        combined = f"{text}:{context_hash}"
        return hashlib.sha256(combined.encode()).hexdigest()

    def get(self, query: str, context: Optional[Dict[str, Any]] = None) -> Optional[Any]:
        if not settings.ENABLE_SEMANTIC_CACHE:
            return None

        context_hash = str(hashlib.md5(str(sorted(context.items())).encode()).hexdigest()) if context else ""
        query_key = self._generate_key(query, context_hash)

        if query_key in self.cache:
            cached_result, timestamp = self.cache[query_key]
            if time.time() - timestamp < self.ttl:
                self.hits += 1
                logger.info("semantic_cache_hit", query_length=len(query))
                return cached_result
            else:
                del self.cache[query_key]

        query_embedding = self._get_embedding(query)

        for cache_key, (cached_result, timestamp) in list(self.cache.items()):
            if time.time() - timestamp >= self.ttl:
                del self.cache[cache_key]
                continue

            cached_query = cache_key[:32]
            cached_embedding = self._get_embedding(cached_query)
            similarity = self._cosine_similarity(query_embedding, cached_embedding)

            if similarity >= self.threshold:
                self.cache[query_key] = (cached_result, timestamp)
                self.hits += 1
                logger.info("semantic_cache_hit_similar", similarity=round(similarity, 3))
                return cached_result

        self.misses += 1
        return None

    def set(self, query: str, result: Any, context: Optional[Dict[str, Any]] = None):
        if not settings.ENABLE_SEMANTIC_CACHE:
            return

        context_hash = str(hashlib.md5(str(sorted(context.items())).encode()).hexdigest()) if context else ""
        query_key = self._generate_key(query, context_hash)

        if len(self.cache) >= self.max_size:
            oldest_key = min(self.cache.keys(), key=lambda k: self.cache[k][1])
            del self.cache[oldest_key]

        self.cache[query_key] = (result, time.time())
        logger.info("semantic_cache_set", query_length=len(query), cache_size=len(self.cache))

    def clear(self):
        self.cache.clear()
        self.hits = 0
        self.misses = 0
        logger.info("semantic_cache_cleared")

    def get_stats(self) -> Dict[str, Any]:
        total = self.hits + self.misses
        hit_rate = (self.hits / total * 100) if total > 0 else 0
        return {
            "enabled": settings.ENABLE_SEMANTIC_CACHE,
            "threshold": self.threshold,
            "cache_size": len(self.cache),
            "max_size": self.max_size,
            "ttl_seconds": self.ttl,
            "hits": self.hits,
            "misses": self.misses,
            "hit_rate_percent": round(hit_rate, 2)
        }


semantic_cache = SemanticCache(threshold=settings.SEMANTIC_CACHE_THRESHOLD)
