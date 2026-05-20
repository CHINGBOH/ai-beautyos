import time
from collections.abc import Callable

from fastapi import FastAPI, Request
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Gauge, Histogram, generate_latest
from starlette.responses import Response

app = FastAPI()

request_duration = Histogram(
    "http_request_duration_seconds",
    "HTTP request duration in seconds",
    ["method", "endpoint", "status_code"]
)

request_total = Counter(
    "http_requests_total",
    "Total HTTP requests",
    ["method", "endpoint", "status_code"]
)

in_flight_requests = Gauge(
    "http_requests_in_flight",
    "Number of HTTP requests currently being processed"
)

llm_calls_total = Counter(
    "llm_calls_total",
    "Total LLM API calls",
    ["provider", "model", "status"]
)

llm_call_duration = Histogram(
    "llm_call_duration_seconds",
    "LLM call duration in seconds",
    ["provider", "model"]
)

llm_call_errors = Counter(
    "llm_call_errors_total",
    "Total LLM call errors",
    ["provider", "model", "error_type"]
)

cache_hits = Counter(
    "semantic_cache_hits_total",
    "Total semantic cache hits"
)

cache_misses = Counter(
    "semantic_cache_misses_total",
    "Total semantic cache misses"
)

circuit_breaker_state = Gauge(
    "circuit_breaker_state",
    "Circuit breaker state (0=closed, 1=open, 2=half_open)",
    ["service"]
)

active_connections = Gauge(
    "db_pool_active_connections",
    "Number of active database connections"
)

available_connections = Gauge(
    "db_pool_available_connections",
    "Number of available database connections"
)

appointment_total = Counter(
    "appointments_total",
    "Total appointments created",
    ["status"]
)

user_registrations = Counter(
    "user_registrations_total",
    "Total user registrations"
)


@app.middleware("http")
async def prometheus_middleware(request: Request, call_next: Callable):
    in_flight_requests.inc()
    start_time = time.time()

    try:
        response = await call_next(request)
        duration = time.time() - start_time

        status_code = str(response.status_code)
        endpoint = request.url.path
        method = request.method

        request_duration.labels(
            method=method,
            endpoint=endpoint,
            status_code=status_code
        ).observe(duration)

        request_total.labels(
            method=method,
            endpoint=endpoint,
            status_code=status_code
        ).inc()

        return response
    finally:
        in_flight_requests.dec()


@app.get("/metrics")
async def metrics():
    return Response(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST
    )


def record_llm_call(provider: str, model: str, duration: float, success: bool):
    llm_call_duration.labels(provider=provider, model=model).observe(duration)
    llm_calls_total.labels(
        provider=provider,
        model=model,
        status="success" if success else "failure"
    ).inc()
    if not success:
        llm_call_errors.labels(
            provider=provider,
            model=model,
            error_type="timeout"
        ).inc()


def record_cache_hit():
    cache_hits.inc()


def record_cache_miss():
    cache_misses.inc()


def update_circuit_breaker_state(service: str, state: int):
    circuit_breaker_state.labels(service=service).set(state)


def update_db_pool_stats(active: int, available: int):
    active_connections.set(active)
    available_connections.set(available)


def record_appointment(status: str):
    appointment_total.labels(status=status).inc()


def record_user_registration():
    user_registrations.inc()
