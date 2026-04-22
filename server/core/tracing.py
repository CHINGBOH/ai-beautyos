from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.trace.propagation.tracecontext import TraceContextTextMapPropagator
from opentelemetry.propagate import set_global_textmap
from opentelemetry.sdk.trace.export import SpanExporter
from typing import Optional, Dict, Any
import time
from ..core.config import get_settings

settings = get_settings()

_resource = Resource.create({
    "service.name": settings.APP_NAME,
    "service.version": settings.APP_VERSION,
    "deployment.environment": getattr(settings, 'ENVIRONMENT', 'development')
})

_provider = TracerProvider(resource=_resource)

_tracer: Optional[trace.Tracer] = None


def init_tracing(
    service_name: str = "medical-crm-api",
    otlp_endpoint: Optional[str] = None,
    console_export: bool = False
):
    global _tracer, _provider

    _provider = TracerProvider(resource=Resource.create({
        "service.name": service_name,
        "service.version": settings.APP_VERSION,
        "deployment.environment": getattr(settings, 'ENVIRONMENT', 'production')
    }))

    if console_export or settings.DEBUG:
        console_processor = BatchSpanProcessor(ConsoleSpanExporter())
        _provider.add_span_processor(console_processor)

    if otlp_endpoint:
        try:
            from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
            otlp_exporter = OTLPSpanExporter(endpoint=otlp_endpoint, insecure=True)
            otlp_processor = BatchSpanProcessor(otlp_exporter)
            _provider.add_span_processor(otlp_processor)
        except ImportError:
            pass

    trace.set_tracer_provider(_provider)
    _tracer = trace.get_tracer(__name__)

    propagator = TraceContextTextMapPropagator()
    set_global_textmap(propagator)

    return _tracer


def get_tracer() -> trace.Tracer:
    global _tracer
    if _tracer is None:
        _tracer = trace.get_tracer(__name__)
    return _tracer


class SpanBuilder:
    def __init__(self, name: str):
        self.name = name
        self._tracer = get_tracer()
        self._span = None
        self._attributes: Dict[str, Any] = {}

    def set_attribute(self, key: str, value: Any) -> "SpanBuilder":
        self._attributes[key] = value
        return self

    def set_attributes(self, **kwargs) -> "SpanBuilder":
        self._attributes.update(kwargs)
        return self

    def start(self) -> trace.Span:
        self._span = self._tracer.start_span(self.name)
        for key, value in self._attributes.items():
            self._span.set_attribute(key, value)
        return self._span

    def end(self):
        if self._span:
            self._span.end()

    def __enter__(self):
        return self.start()

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type:
            self._span.set_attribute("error", True)
            self._span.set_attribute("error.type", exc_type.__name__)
            self._span.set_attribute("error.message", str(exc_val))
        self.end()


def trace_llm_call(
    provider: str,
    model: str,
    input_tokens: int = 0,
    output_tokens: int = 0
):
    def decorator(func):
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            span = SpanBuilder(f"llm.{provider}.{model}")
            span.set_attributes(
                **{"llm.provider": provider, "llm.model": model}
            )

            try:
                with span:
                    result = await func(*args, **kwargs)

                    duration = time.time() - start_time
                    span._span.set_attribute("llm.duration_ms", duration * 1000)
                    span._span.set_attribute("llm.input_tokens", input_tokens)
                    span._span.set_attribute("llm.output_tokens", output_tokens)
                    span._span.set_attribute("llm.total_tokens", input_tokens + output_tokens)

                    return result
            except Exception as e:
                span._span.set_attribute("error", True)
                span._span.set_attribute("error.type", type(e).__name__)
                raise

        return wrapper
    return decorator


class LLMSpanContext:
    def __init__(self, provider: str, model: str, operation: str):
        self.provider = provider
        self.model = model
        self.operation = operation
        self.start_time = time.time()
        self.span: Optional[trace.Span] = None

    def __enter__(self):
        tracer = get_tracer()
        self.span = tracer.start_span(f"llm.{self.provider}.{self.operation}")
        self.span.set_attribute("llm.provider", self.provider)
        self.span.set_attribute("llm.model", self.model)
        self.span.set_attribute("llm.operation", self.operation)
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.span:
            duration = time.time() - self.start_time
            self.span.set_attribute("llm.duration_ms", duration * 1000)

            if exc_type:
                self.span.set_attribute("error", True)
                self.span.set_attribute("error.type", exc_type.__name__)
                self.span.set_attribute("error.message", str(exc_val))
            else:
                self.span.set_attribute("success", True)

            self.span.end()

    def set_attribute(self, key: str, value: Any):
        if self.span:
            self.span.set_attribute(key, value)

    def add_event(self, name: str, attributes: Optional[Dict[str, Any]] = None):
        if self.span:
            self.span.add_event(name, attributes or {})


def instrument_fastapi(app):
    FastAPIInstrumentor.instrument_app(app)
