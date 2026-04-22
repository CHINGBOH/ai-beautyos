import pytest
from ai.smart_router import SmartRouter, RouteTarget
from ai.semantic_cache import SemanticCache
from ai.llm_coordinator import LLMCoordinator


class TestSmartRouter:
    def setup_method(self):
        self.router = SmartRouter()

    def test_route_simple_greeting(self):
        target = self.router.route("你好", [], {})
        assert target == RouteTarget.DIRECT_REPLY

    def test_route_address_query_with_context(self):
        target = self.router.route("诊所在哪", [], {"clinic_info": "深圳妍美"})
        assert target == RouteTarget.DIRECT_REPLY

    def test_route_complex_question(self):
        target = self.router.route("为什么皮肤会干燥？有什么原理？", [], {})
        assert target == RouteTarget.KIMI_ANALYZE

    def test_route_recommendation_with_products(self):
        target = self.router.route("推荐一个补水的产品", [], {"products": ["水光针"]})
        assert target == RouteTarget.KIMI_ANALYZE

    def test_route_feedback_complaint(self):
        target = self.router.route("太差了，投诉", [], {})
        assert target == RouteTarget.KIMI_ANALYZE

    def test_explain_route(self):
        explanation = self.router.explain_route("你好", [], {})
        assert "target" in explanation
        assert "matched_rule" in explanation
        assert explanation["message_length"] == 2


class TestSemanticCache:
    def setup_method(self):
        self.cache = SemanticCache(threshold=0.85)

    def test_cache_set_and_get(self):
        self.cache.set("测试查询", {"response": "测试回复"})
        result = self.cache.get("测试查询")
        assert result is not None
        assert result["response"] == "测试回复"

    def test_cache_miss(self):
        result = self.cache.get("不存在的查询")
        assert result is None

    def test_cache_stats(self):
        self.cache.set("查询1", {"response": "回复1"})
        self.cache.get("查询1")
        self.cache.get("查询2")

        stats = self.cache.get_stats()
        assert stats["cache_size"] == 1
        assert stats["hits"] == 1
        assert stats["misses"] == 1

    def test_cache_clear(self):
        self.cache.set("key1", {"data": "value1"})
        self.cache.clear()

        stats = self.cache.get_stats()
        assert stats["cache_size"] == 0
        assert stats["hits"] == 0
        assert stats["misses"] == 0


class TestLLMCoordinator:
    def setup_method(self):
        self.coordinator = LLMCoordinator(use_real_api=False)

    @pytest.mark.asyncio
    async def test_coordinator_process(self):
        result = await self.coordinator.process(
            user_input="你好",
            history=[],
            context={}
        )

        assert "success" in result
        assert "response" in result
        assert "analysis" in result

    @pytest.mark.asyncio
    async def test_coordinator_returns_fallback_on_error(self):
        coordinator = LLMCoordinator(use_real_api=False)
        result = await coordinator.process(
            user_input="测试",
            history=[],
            context={}
        )

        assert "response" in result
        assert len(result["response"]) > 0
