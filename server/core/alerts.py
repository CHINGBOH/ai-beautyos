from typing import Optional, Dict, Any
from dataclasses import dataclass
from enum import Enum
import os


class LogLevel(Enum):
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"


@dataclass
class AlertRule:
    name: str
    metric: str
    condition: str
    threshold: float
    window_seconds: int
    severity: str
    message: str
    enabled: bool = True


ALERT_RULES = [
    AlertRule(
        name="high_error_rate",
        metric="http_requests_total",
        condition="error_rate > 0.01",
        threshold=0.01,
        window_seconds=300,
        severity="critical",
        message="HTTP错误率超过1%，需要立即处理"
    ),
    AlertRule(
        name="high_latency",
        metric="http_request_duration_seconds",
        condition="p99 > 3.0",
        threshold=3.0,
        window_seconds=300,
        severity="warning",
        message="P99延迟超过3秒"
    ),
    AlertRule(
        name="circuit_breaker_open",
        metric="circuit_breaker_state",
        condition="state == 1",
        threshold=1.0,
        window_seconds=60,
        severity="critical",
        message="熔断器打开，LLM服务不可用"
    ),
    AlertRule(
        name="llm_high_error_rate",
        metric="llm_call_errors_total",
        condition="error_rate > 0.05",
        threshold=0.05,
        window_seconds=600,
        severity="critical",
        message="LLM调用错误率超过5%"
    ),
    AlertRule(
        name="cache_low_hit_rate",
        metric="semantic_cache_hits_total",
        condition="hit_rate < 0.3",
        threshold=0.3,
        window_seconds=3600,
        severity="warning",
        message="缓存命中率低于30%"
    ),
    AlertRule(
        name="db_pool_exhausted",
        metric="db_pool_active_connections",
        condition="active == max",
        threshold=1.0,
        window_seconds=60,
        severity="critical",
        message="数据库连接池耗尽"
    ),
    AlertRule(
        name="high_appointment_failure",
        metric="appointments_total",
        condition="failure_rate > 0.1",
        threshold=0.1,
        window_seconds=1800,
        severity="warning",
        message="预约失败率超过10%"
    ),
]


def get_alert_rules() -> list[AlertRule]:
    enabled_rules = os.environ.get("ENABLED_ALERT_RULES", "")
    if not enabled_rules:
        return ALERT_RULES

    enabled_set = set(enabled_rules.split(","))
    return [rule for rule in ALERT_RULES if rule.name in enabled_set]


def format_alert_message(rule: AlertRule, current_value: float) -> str:
    return f"[{rule.severity.upper()}] {rule.name}: {rule.message} (当前值: {current_value:.2f})"
