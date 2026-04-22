from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from datetime import datetime
import asyncio


@dataclass
class HealthCheckResult:
    name: str
    status: str
    message: Optional[str] = None
    latency_ms: Optional[float] = None
    details: Optional[Dict[str, Any]] = None


class HealthChecker:
    def __init__(self):
        self._checks: Dict[str, callable] = {}

    def register_check(self, name: str, check_func: callable):
        self._checks[name] = check_func

    async def check_all(self) -> Dict[str, Any]:
        results = {}
        overall_status = "healthy"

        for name, check_func in self._checks.items():
            start = datetime.now()
            try:
                if asyncio.iscoroutinefunction(check_func):
                    result = await check_func()
                else:
                    result = check_func()

                if isinstance(result, HealthCheckResult):
                    results[name] = {
                        "status": result.status,
                        "message": result.message,
                        "latency_ms": result.latency_ms,
                        "details": result.details
                    }
                else:
                    results[name] = {"status": "healthy"}
            except Exception as e:
                results[name] = {
                    "status": "unhealthy",
                    "message": str(e),
                    "latency_ms": (datetime.now() - start).total_seconds() * 1000
                }
                overall_status = "unhealthy"

        return {
            "status": overall_status,
            "timestamp": datetime.utcnow().isoformat(),
            "checks": results
        }


health_checker = HealthChecker()


async def check_database() -> HealthCheckResult:
    from ..core.db_pool import db_pool

    start = datetime.now()
    try:
        stats = db_pool.get_stats()
        latency = (datetime.now() - start).total_seconds() * 1000

        return HealthCheckResult(
            name="database",
            status="healthy" if stats["total_connections"] >= 0 else "unhealthy",
            message="Database connection pool operational",
            latency_ms=latency,
            details=stats
        )
    except Exception as e:
        return HealthCheckResult(
            name="database",
            status="unhealthy",
            message=str(e),
            latency_ms=(datetime.now() - start).total_seconds() * 1000
        )


async def check_redis() -> HealthCheckResult:
    from ..core.cache import redis_cache

    start = datetime.now()
    try:
        await redis_cache.connect()
        latency = (datetime.now() - start).total_seconds() * 1000

        return HealthCheckResult(
            name="redis",
            status="healthy",
            message="Redis connection operational",
            latency_ms=latency
        )
    except Exception as e:
        return HealthCheckResult(
            name="redis",
            status="unhealthy",
            message=str(e),
            latency_ms=(datetime.now() - start).total_seconds() * 1000
        )


async def check_qdrant() -> HealthCheckResult:
    from ..services.rag_service import rag_service

    start = datetime.now()
    try:
        stats = rag_service.get_stats()
        latency = (datetime.now() - start).total_seconds() * 1000

        return HealthCheckResult(
            name="qdrant",
            status="healthy" if "error" not in stats else "degraded",
            message="Qdrant operational",
            latency_ms=latency,
            details=stats
        )
    except Exception as e:
        return HealthCheckResult(
            name="qdrant",
            status="unhealthy",
            message=str(e),
            latency_ms=(datetime.now() - start).total_seconds() * 1000
        )


async def check_llm_services() -> HealthCheckResult:
    from ..ai.llm_coordinator import coordinator

    start = datetime.now()
    try:
        result = await coordinator.process(
            user_input="health check",
            history=[],
            context={}
        )
        latency = (datetime.now() - start).total_seconds() * 1000

        return HealthCheckResult(
            name="llm_services",
            status="healthy" if result.get("success") else "degraded",
            message="LLM services operational",
            latency_ms=latency
        )
    except Exception as e:
        return HealthCheckResult(
            name="llm_services",
            status="degraded",
            message=str(e),
            latency_ms=(datetime.now() - start).total_seconds() * 1000
        )


health_checker.register_check("database", check_database)
health_checker.register_check("redis", check_redis)
health_checker.register_check("qdrant", check_qdrant)
health_checker.register_check("llm_services", check_llm_services)
