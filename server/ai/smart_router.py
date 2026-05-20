import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from ..core.logging import get_logger

logger = get_logger(__name__)


class RouteTarget(Enum):
    KIMI_ANALYZE = "kimi_analyze"
    DEEPSEEK_REPLY = "deepseek_reply"
    VISION_ANALYZE = "vision_analyze"
    DIRECT_REPLY = "direct_reply"
    DB_QUERY = "db_query"
    FALLBACK = "fallback"


@dataclass
class RouteMetrics:
    total_requests: int = 0
    route_counts: dict[str, int] = field(default_factory=lambda: {
        "kimi_analyze": 0, "deepseek_reply": 0, "vision_analyze": 0,
        "direct_reply": 0, "db_query": 0, "fallback": 0
    })
    response_times: list[float] = field(default_factory=list)
    cost_savings: float = 0.0

    def record_route(self, target: RouteTarget, response_time: float):
        self.total_requests += 1
        self.route_counts[target.value] += 1
        self.response_times.append(response_time)
        if target == RouteTarget.DIRECT_REPLY:
            self.cost_savings += 0.002
        elif target == RouteTarget.DEEPSEEK_REPLY:
            self.cost_savings += 0.001

    def get_summary(self) -> dict[str, Any]:
        if self.total_requests == 0:
            return {"error": "无数据"}
        avg_time = sum(self.response_times) / len(self.response_times) if self.response_times else 0
        return {
            "total_requests": self.total_requests,
            "route_distribution": self.route_counts.copy(),
            "avg_response_time_sec": round(avg_time, 3),
            "cost_savings_yuan": round(self.cost_savings, 4),
            "direct_reply_pct": round(self.route_counts["direct_reply"] / self.total_requests * 100, 1),
            "kimi_analyze_pct": round(self.route_counts["kimi_analyze"] / self.total_requests * 100, 1)
        }


class SmartRouter:
    def __init__(self):
        self.rules = [
            (self._is_image_upload, RouteTarget.VISION_ANALYZE),
            (self._is_db_query_request, RouteTarget.DB_QUERY),
            (self._is_simple_greeting, RouteTarget.DIRECT_REPLY),
            (self._is_address_query, RouteTarget.DIRECT_REPLY),
            (self._is_feedback_or_complaint, RouteTarget.KIMI_ANALYZE),
            (self._is_complex_question, RouteTarget.KIMI_ANALYZE),
            (self._needs_recommendation, RouteTarget.KIMI_ANALYZE),
            (self._default, RouteTarget.DEEPSEEK_REPLY)
        ]
        self.metrics = RouteMetrics()
        self.enable_monitoring = True

    def route(self, message: str, history: list[dict[str, str]], context: dict[str, Any]) -> RouteTarget:
        start_time = time.time()
        for condition, target in self.rules:
            if condition(message, history, context):
                if self.enable_monitoring:
                    self.metrics.record_route(target, time.time() - start_time)
                return target
        return RouteTarget.DEEPSEEK_REPLY

    def _is_image_upload(self, msg: str, history: list, context: dict) -> bool:
        if context.get("has_image", False):
            return True
        image_keywords = ["上传", "图片", "照片", "素颜", "皮肤照片"]
        return any(kw in msg for kw in image_keywords)

    def _is_db_query_request(self, msg: str, history: list, context: dict) -> bool:
        db_keywords = ["查询数据库", "搜索产品", "查找知识", "db查询", "数据库"]
        return any(kw in msg for kw in db_keywords)

    def _is_simple_greeting(self, msg: str, history: list, context: dict) -> bool:
        greetings = ["你好", "在吗", "hello", "hi", "早上好", "晚上好", "您好"]
        is_greeting = any(g in msg.lower() for g in greetings)
        return is_greeting and len(history) < 2

    def _is_address_query(self, msg: str, history: list, context: dict) -> bool:
        address_keywords = ["地址", "在哪里", "位置", "门诊部", "诊所", "医院", "怎么去", "路线"]
        has_address_keyword = any(kw in msg for kw in address_keywords)
        has_clinic_info = bool(context.get("clinic_info")) or bool(context.get("yanmei_clinic"))
        return has_address_keyword and has_clinic_info

    def _is_feedback_or_complaint(self, msg: str, history: list, context: dict) -> bool:
        feedback_keywords = ["投诉", "差评", "退款", "不满意", "差劲", "垃圾", "骗人", "虚假"]
        negative_emojis = ["😠", "😡", "👎", "💢"]
        has_feedback = any(kw in msg for kw in feedback_keywords)
        has_negative_emoji = any(emoji in msg for emoji in negative_emojis)
        return has_feedback or has_negative_emoji

    def _is_complex_question(self, msg: str, history: list, context: dict) -> bool:
        is_long_history = len(history) >= 4
        complex_keywords = ["为什么", "如何", "怎么样", "怎么做的", "原理", "机制"]
        has_complex_keyword = any(kw in msg for kw in complex_keywords)
        is_long_message = len(msg) > 20
        return is_long_history or has_complex_keyword or is_long_message

    def _needs_recommendation(self, msg: str, history: list, context: dict) -> bool:
        recommendation_keywords = ["推荐", "适合", "建议", "哪个好", "效果好", "性价比"]
        price_keywords = ["多少钱", "价格", "费用", "预算"]
        has_rec_keyword = any(kw in msg for kw in recommendation_keywords)
        has_price_keyword = any(kw in msg for kw in price_keywords)
        has_product_info = bool(context.get("products"))
        return (has_rec_keyword or has_price_keyword) and has_product_info

    def _default(self, msg: str, history: list, context: dict) -> bool:
        return True

    def explain_route(self, message: str, history: list[dict[str, str]], context: dict[str, Any]) -> dict[str, Any]:
        start_time = time.time()
        target = self.route(message, history, context)
        decision_time = time.time() - start_time
        decision_info = {
            "target": target.value,
            "message_length": len(message),
            "history_length": len(history),
            "has_clinic_info": bool(context.get("clinic_info")),
            "has_products": bool(context.get("products")),
            "has_skin_knowledge": bool(context.get("skin_knowledge")),
            "has_image": context.get("has_image", False),
            "decision_time_ms": round(decision_time * 1000, 2)
        }
        for condition, _target_rule in self.rules:
            if condition(message, history, context):
                decision_info["matched_rule"] = condition.__name__
                break
        return decision_info

    def get_metrics(self) -> dict[str, Any]:
        return self.metrics.get_summary()

    def reset_metrics(self):
        self.metrics = RouteMetrics()


router = SmartRouter()
