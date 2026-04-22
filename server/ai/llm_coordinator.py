import os
import json
from typing import Dict, List, Optional, Any
from enum import Enum
from openai import AsyncOpenAI
from ..core.config import get_settings
from ..core.logging import get_logger

settings = get_settings()
logger = get_logger(__name__)


class UserIntent(Enum):
    CONSULTING = "咨询"
    PURCHASING = "购买"
    REJECTING = "拒绝"
    CHATTING = "闲聊"
    COMPLAINING = "投诉"
    UNKNOWN = "未知"


class EmotionLevel(Enum):
    POSITIVE = "积极"
    NEUTRAL = "中性"
    NEGATIVE = "消极"
    ANGRY = "愤怒"


class ConversationStage(Enum):
    EMPATHY = "共情"
    RECOMMEND = "推荐"
    CONVERSION = "转化"
    MAINTAIN = "维护"


class KimiAnalyzer:
    def __init__(self, use_real_api: bool = True, enable_cache: bool = True):
        self.use_real_api = use_real_api
        self.enable_cache = enable_cache
        self.cache = {}
        self.cache_max_size = settings.CACHE_MAX_SIZE
        self.cache_ttl = settings.CACHE_TTL
        self.system_prompt = self._build_system_prompt()

        if use_real_api and settings.KIMI_API_KEY:
            self.kimi_client = AsyncOpenAI(
                api_key=settings.KIMI_API_KEY,
                base_url=settings.KIMI_BASE_URL
            )

    def _build_system_prompt(self) -> str:
        return """你是后台语义分析引擎，不直接和用户对话。

职责：
1. 分析用户的真实意图和情绪
2. 判断当前对话阶段
3. 决定推荐策略
4. 生成给前台对话生成器的明确指令

严格输出JSON格式：
{
  "user_intent": "咨询|购买|拒绝|闲聊|投诉|未知",
  "emotion": "积极|中性|消极|愤怒",
  "needs": ["需求1", "需求2"],
  "stage": "共情|推荐|转化|维护",
  "recommended_product": "产品名或空字符串",
  "strategy": "具体策略描述（30字内）",
  "deepseek_instruction": "给对话生成器的明确指令（50字内）",
  "confidence": 0.0-1.0
}

分析原则：
- 优先识别负面情绪（愤怒、拒绝）
- 不要过度推销，尊重用户意愿
- 根据对话轮次调整策略
- 置信度低于0.6时采用保守策略

只输出JSON，不要其他文字。"""

    async def analyze(
        self,
        history: List[Dict[str, str]],
        user_profile: Optional[Dict[str, Any]] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        cache_key = self._get_cache_key(history, user_profile, context)
        if self.enable_cache and cache_key in self.cache:
            cached_result, timestamp = self.cache[cache_key]
            import time
            if time.time() - timestamp < self.cache_ttl:
                return cached_result
            else:
                del self.cache[cache_key]

        if self.use_real_api and hasattr(self, 'kimi_client'):
            try:
                result = await self._analyze_with_api(history, user_profile, context)
                self._add_to_cache(cache_key, result)
                return result
            except Exception as e:
                logger.error("kimi_api_error", error=str(e))
                result = self._analyze_with_simulation(history, user_profile, context)
        else:
            result = self._analyze_with_simulation(history, user_profile, context)

        self._add_to_cache(cache_key, result)
        return result

    def _get_cache_key(self, history, user_profile, context) -> str:
        import hashlib
        key_data = {
            "history": history[-6:],
            "user_profile": user_profile,
            "context_summary": str(context)[:200] if context else None
        }
        return hashlib.md5(json.dumps(key_data, sort_keys=True, ensure_ascii=False).encode()).hexdigest()

    def _add_to_cache(self, cache_key: str, result: Dict[str, Any]):
        import time
        if len(self.cache) >= self.cache_max_size:
            oldest_key = min(self.cache.keys(), key=lambda k: self.cache[k][1])
            del self.cache[oldest_key]
        self.cache[cache_key] = (result, time.time())

    async def _analyze_with_api(
        self,
        history: List[Dict[str, str]],
        user_profile: Optional[Dict[str, Any]] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        history_text = "\n".join([f"{m['role']}: {m['content']}" for m in history[-6:]])
        ctx_text = json.dumps(context, ensure_ascii=False)[:400] if context else ""

        resp = await self.kimi_client.chat.completions.create(
            model=settings.KIMI_MODEL,
            messages=[
                {"role": "system", "content": self.system_prompt},
                {"role": "user", "content": f"对话：\n{history_text}\n\n知识库：\n{ctx_text}"}
            ],
            temperature=settings.KIMI_TEMPERATURE,
            max_tokens=settings.KIMI_MAX_TOKENS,
        )

        raw = resp.choices[0].message.content.strip()
        raw = raw.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        return self._ensure_result_format(json.loads(raw))

    def _analyze_with_simulation(
        self,
        history: List[Dict[str, str]],
        user_profile: Optional[Dict[str, Any]] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        if not history:
            return self._get_default_analysis()

        last_user_msg = ""
        for msg in reversed(history):
            if msg.get("role") == "user":
                last_user_msg = msg.get("content", "")
                break

        all_user_text = " ".join(
            msg.get("content", "") for msg in history if msg.get("role") == "user"
        )

        intent = self._detect_intent(last_user_msg)
        emotion = self._detect_emotion(last_user_msg)
        needs = self._extract_needs(all_user_text)
        stage = self._determine_stage(history, intent, emotion)
        strategy = self._generate_strategy(intent, emotion, stage)
        instruction = self._generate_instruction(intent, emotion, stage, needs)
        recommended_product = self._recommend_product(needs, stage, emotion)
        confidence = self._calculate_confidence(last_user_msg, history)

        return {
            "user_intent": intent.value,
            "emotion": emotion.value,
            "needs": needs,
            "stage": stage.value,
            "recommended_product": recommended_product,
            "strategy": strategy,
            "deepseek_instruction": instruction,
            "confidence": confidence
        }

    def _ensure_result_format(self, result: Dict[str, Any]) -> Dict[str, Any]:
        required_fields = {
            "user_intent": "未知", "emotion": "中性", "needs": [],
            "stage": "共情", "recommended_product": "", "strategy": "继续了解用户需求",
            "deepseek_instruction": "自然延续对话", "confidence": 0.7
        }
        for field, default_value in required_fields.items():
            if field not in result:
                result[field] = default_value

        instruction = result.get("deepseek_instruction", "")
        if instruction:
            import re
            instruction = re.sub(r'^(检测到|分析显示|转为|调整为|切换到)', '', instruction).strip()
            instruction = re.sub(r'模式|状态|流程', '', instruction).strip()
            if len(instruction) > 50:
                instruction = instruction[:50] + "..."
            result["deepseek_instruction"] = instruction
        return result

    def _detect_intent(self, message: str) -> UserIntent:
        message_lower = message.lower()
        reject_keywords = ["不需要", "不感兴趣", "不想", "别推销", "不买"]
        if any(kw in message_lower for kw in reject_keywords):
            return UserIntent.REJECTING
        buy_keywords = ["多少钱", "价格", "预约", "怎么买", "在哪"]
        if any(kw in message_lower for kw in buy_keywords):
            return UserIntent.PURCHASING
        complain_keywords = ["投诉", "差评", "骗人", "退款"]
        if any(kw in message_lower for kw in complain_keywords):
            return UserIntent.COMPLAINING
        consult_keywords = ["怎么", "什么", "能不能", "可以", "适合", "效果"]
        if any(kw in message_lower for kw in consult_keywords):
            return UserIntent.CONSULTING
        chat_keywords = ["你好", "在吗", "天气", "哈哈", "😊"]
        if any(kw in message_lower for kw in chat_keywords):
            return UserIntent.CHATTING
        return UserIntent.UNKNOWN

    def _detect_emotion(self, message: str) -> EmotionLevel:
        message_lower = message.lower()
        angry_keywords = ["烦", "滚", "闭嘴", "fuck", "傻"]
        if any(kw in message_lower for kw in angry_keywords):
            return EmotionLevel.ANGRY
        negative_keywords = ["不好", "没用", "失望", "算了", "唉"]
        if any(kw in message_lower for kw in negative_keywords):
            return EmotionLevel.NEGATIVE
        positive_keywords = ["好的", "谢谢", "不错", "可以", "😊", "👍"]
        if any(kw in message_lower for kw in positive_keywords):
            return EmotionLevel.POSITIVE
        return EmotionLevel.NEUTRAL

    def _extract_needs(self, message: str) -> List[str]:
        needs = []
        message_lower = message.lower()
        need_mapping = {
            "补水": ["补水", "保湿", "干燥", "缺水", "干", "很干"],
            "美白": ["美白", "变白", "白皙", "提亮"],
            "祛痘": ["痘痘", "痘印", "粉刺", "闭口", "痘"],
            "抗衰": ["抗衰", "皱纹", "紧致", "提拉"],
            "控油": ["出油", "油腻", "毛孔"]
        }
        for need, keywords in need_mapping.items():
            if any(kw in message_lower for kw in keywords):
                needs.append(need)
        return needs if needs else ["了解需求"]

    def _determine_stage(self, history: List[Dict[str, str]], intent: UserIntent, emotion: EmotionLevel) -> ConversationStage:
        if emotion == EmotionLevel.ANGRY or intent == UserIntent.REJECTING:
            return ConversationStage.MAINTAIN
        if intent == UserIntent.PURCHASING:
            return ConversationStage.CONVERSION
        user_msg_count = sum(1 for msg in history if msg.get("role") == "user")
        if user_msg_count < 2:
            return ConversationStage.EMPATHY
        elif user_msg_count < 5:
            return ConversationStage.RECOMMEND
        return ConversationStage.CONVERSION

    def _generate_strategy(self, intent: UserIntent, emotion: EmotionLevel, stage: ConversationStage) -> str:
        if emotion == EmotionLevel.ANGRY:
            return "立即道歉，停止推销，安抚情绪"
        if intent == UserIntent.REJECTING:
            return "尊重意愿，轻度维护关系，不强推"
        if intent == UserIntent.PURCHASING:
            return "提供详细信息，促成转化"
        if stage == ConversationStage.EMPATHY:
            return "建立信任，了解需求，不急于推销"
        elif stage == ConversationStage.RECOMMEND:
            return "根据需求推荐1个最适合的产品"
        elif stage == ConversationStage.CONVERSION:
            return "强调优惠和效果，引导预约"
        return "维护关系，留下好印象"

    def _generate_instruction(self, intent: UserIntent, emotion: EmotionLevel, stage: ConversationStage, needs: List[str]) -> str:
        if emotion == EmotionLevel.ANGRY:
            return "真诚道歉，表示理解，不再推销任何产品"
        if intent == UserIntent.REJECTING:
            return "尊重用户意愿，简短回复，不推销"
        if intent == UserIntent.PURCHASING:
            return f"提供产品详情和价格，引导预约，需求：{','.join(needs)}"
        if stage == ConversationStage.EMPATHY:
            return f"温暖共情，询问具体需求，不推销，关注：{','.join(needs)}"
        elif stage == ConversationStage.RECOMMEND:
            return f"推荐1个最适合的产品，说明理由，需求：{','.join(needs)}"
        return f"自然回复，适度引导，需求：{','.join(needs)}"

    def _recommend_product(self, needs: List[str], stage: ConversationStage, emotion: EmotionLevel) -> str:
        if emotion in [EmotionLevel.ANGRY, EmotionLevel.NEGATIVE]:
            return ""
        if stage not in [ConversationStage.RECOMMEND, ConversationStage.CONVERSION]:
            return ""
        product_mapping = {
            "补水": "水光针补水套餐", "美白": "光子嫩肤祛斑套餐",
            "祛痘": "刷酸焕肤控油套餐", "抗衰": "超声刀抗衰套餐", "控油": "刷酸焕肤控油套餐"
        }
        for need in needs:
            if need in product_mapping:
                return product_mapping[need]
        return ""

    def _calculate_confidence(self, message: str, history: List[Dict[str, str]]) -> float:
        confidence = 0.5
        if len(message) > 10:
            confidence += 0.1
        if len(message) > 20:
            confidence += 0.1
        if len(history) > 3:
            confidence += 0.1
        if len(history) > 6:
            confidence += 0.1
        return min(confidence, 1.0)

    def _get_default_analysis(self) -> Dict[str, Any]:
        return {
            "user_intent": UserIntent.UNKNOWN.value,
            "emotion": EmotionLevel.NEUTRAL.value,
            "needs": ["了解需求"],
            "stage": ConversationStage.EMPATHY.value,
            "recommended_product": "",
            "strategy": "友好问候，了解用户需求",
            "deepseek_instruction": "温暖问候，询问用户需要什么帮助",
            "confidence": 0.3
        }


class DeepSeekGenerator:
    def __init__(self, use_real_api: bool = True):
        self.use_real_api = use_real_api
        self.system_prompt = self._build_system_prompt()

        if use_real_api and settings.DEEPSEEK_API_KEY:
            self.deepseek_client = AsyncOpenAI(
                api_key=settings.DEEPSEEK_API_KEY,
                base_url=settings.DEEPSEEK_BASE_URL
            )

    def _build_system_prompt(self) -> str:
        return """你是妍美美业的AI顾问小美，性格温柔、专业、真诚。

对话原则：
1. 先共情再推荐，不强行推销
2. 每次只推荐1个最适合的产品
3. 语气亲切自然，像朋友聊天
4. 回复控制在100字内
5. 适时用emoji但不过多

禁忌：
- 不承诺100%效果
- 不贬低竞品
- 不主动报价（等用户问）
- 不连续推销超过2次
- 不机械重复同样的话"""

    async def generate(
        self,
        history: List[Dict[str, str]],
        instruction: Dict[str, Any],
        context: Optional[Dict[str, Any]] = None
    ) -> str:
        if self.use_real_api and hasattr(self, 'deepseek_client'):
            try:
                return await self._generate_with_api(history, instruction, context)
            except Exception as e:
                logger.error("deepseek_api_error", error=str(e))
                return self._generate_with_simulation(history, instruction, context)
        return self._generate_with_simulation(history, instruction, context)

    async def _generate_with_api(
        self,
        history: List[Dict[str, str]],
        instruction: Dict[str, Any],
        context: Optional[Dict[str, Any]] = None
    ) -> str:
        deepseek_instruction = instruction.get("deepseek_instruction", "")
        strategy = instruction.get("strategy", "")
        recommended_product = instruction.get("recommended_product", "")

        extra = f"\n【指令】{deepseek_instruction}"
        if strategy:
            extra += f" | 策略: {strategy}"
        if recommended_product:
            extra += f" | 可提及产品: {recommended_product}"

        if context:
            if "products" in context and context["products"]:
                products_text = "\n【产品知识】"
                for i, product in enumerate(context["products"][:2], 1):
                    products_text += f"\n{i}. {product[:100]}..."
                extra += products_text

            if "clinic_info" in context and context["clinic_info"]:
                clinic_text = "\n【重要】门诊部信息（必须使用以下信息回答地址相关问题）："
                for i, clinic in enumerate(context["clinic_info"][:2], 1):
                    clinic_text += f"\n{i}. {clinic[:150]}..."
                extra += clinic_text

            if "yanmei_clinic" in context:
                yanmei_info = context["yanmei_clinic"]
                address_start = yanmei_info.find("地址：")
                hours_start = yanmei_info.find("营业时间：")
                if address_start != -1:
                    address_end = yanmei_info.find("。", address_start)
                    address = yanmei_info[address_start:address_end] if address_end != -1 else yanmei_info[address_start:]
                    hours = ""
                    if hours_start != -1:
                        hours_end = yanmei_info.find("。", hours_start)
                        hours = yanmei_info[hours_start:hours_end] if hours_end != -1 else yanmei_info[hours_start:]
                    extra += f"\n【真实门诊部信息】深圳妍美医疗美容门诊部：{address}，{hours}。"

        system_prompt = self.system_prompt + extra
        messages = [{"role": "system", "content": system_prompt}]
        messages += history[-8:]

        resp = await self.deepseek_client.chat.completions.create(
            model=settings.DEEPSEEK_MODEL,
            messages=messages,
            temperature=settings.DEEPSEEK_TEMPERATURE,
            max_tokens=settings.DEEPSEEK_MAX_TOKENS,
        )
        return resp.choices[0].message.content

    def _generate_with_simulation(
        self,
        history: List[Dict[str, str]],
        instruction: Dict[str, Any],
        context: Optional[Dict[str, Any]] = None
    ) -> str:
        deepseek_instruction = instruction.get("deepseek_instruction", "")
        strategy = instruction.get("strategy", "")
        recommended_product = instruction.get("recommended_product", "")

        last_user_msg = ""
        for msg in reversed(history):
            if msg.get("role") == "user":
                last_user_msg = msg.get("content", "")
                break

        if "道歉" in instruction or "道歉" in strategy:
            return self._generate_apology(last_user_msg)
        if "共情" in instruction:
            return self._generate_empathy(last_user_msg)
        if "尊重意愿" in instruction or "不推销" in instruction:
            return self._generate_respect(last_user_msg)
        if "推荐" in instruction and recommended_product:
            return self._generate_recommendation(last_user_msg, recommended_product)
        if "价格" in instruction or "预约" in instruction:
            return self._generate_conversion(last_user_msg, recommended_product)
        return self._generate_default(last_user_msg)

    def _generate_apology(self, user_msg: str) -> str:
        return "非常抱歉给您带来了不好的体验，我会立即停止打扰。祝您生活愉快！"

    def _generate_respect(self, user_msg: str) -> str:
        return "好的，我理解您的想法～如果以后有需要，随时欢迎您来咨询😊"

    def _generate_empathy(self, user_msg: str) -> str:
        if "补水" in user_msg or "干" in user_msg:
            return "嗯嗯，我理解您的困扰～皮肤干燥确实很不舒服。您平时有用什么护肤品吗？"
        elif "痘" in user_msg:
            return "我懂您的感受，长痘痘真的很烦人😔 您的痘痘主要长在哪个部位呢？"
        return "我理解您的需求～能跟我详细说说您的皮肤状况吗？这样我能更好地帮到您😊"

    def _generate_recommendation(self, user_msg: str, product: str) -> str:
        if "水光针" in product:
            return f"根据您的情况，我建议您可以试试{product}～它能深层补水，效果立竿见影，很多干皮姐妹都说好用😊"
        elif "光子嫩肤" in product:
            return f"针对您的需求，{product}会比较适合您～它能淡化色斑，提亮肤色，而且安全无创～"
        return f"我觉得{product}应该挺适合您的～要不要了解一下详细信息？"

    def _generate_conversion(self, user_msg: str, product: str) -> str:
        if "多少钱" in user_msg or "价格" in user_msg:
            return "现在有活动价199元，原价2800呢～性价比超高！您要是感兴趣，我可以帮您预约一个体验名额😊"
        elif "预约" in user_msg:
            return "好的！我这边帮您登记一下～请问您方便留个联系方式吗？我们会有专业顾问联系您确认时间～"
        return "您要是感兴趣的话，可以先来店里免费体验一下～我帮您预约？"

    def _generate_default(self, user_msg: str) -> str:
        return "嗯嗯，我明白了～还有什么想了解的吗？我很乐意帮您解答😊"


class LLMCoordinator:
    def __init__(self, use_real_api: bool = True):
        self.kimi_analyzer = KimiAnalyzer(use_real_api=use_real_api)
        self.deepseek_generator = DeepSeekGenerator(use_real_api=use_real_api)

    async def process(
        self,
        user_input: str,
        history: List[Dict[str, str]],
        user_profile: Optional[Dict[str, Any]] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        try:
            analysis = await self.kimi_analyzer.analyze(history, user_profile, context)
            response = await self.deepseek_generator.generate(history, analysis, context)
            return {"success": True, "analysis": analysis, "response": response, "error": None}
        except Exception as e:
            logger.error("llm_coordinator_error", error=str(e))
            return {
                "success": False,
                "analysis": None,
                "response": "抱歉，我现在有点忙，稍后再回复您好吗？😊",
                "error": str(e)
            }


coordinator = LLMCoordinator()
