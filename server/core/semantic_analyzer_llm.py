"""LLM增强的预约语义分析 - 规则+LLM混合决策"""
import os
import json
import re
from typing import Optional, Tuple, Dict, Any

# 尝试导入OpenAI
try:
    from openai import AsyncOpenAI
    HAS_OPENAI = True
except:
    HAS_OPENAI = False

class SemanticAnalyzer:
    """混合语义分析器：规则优先 + LLM增强"""

    # 称呼关键词
    TITLES = [
        "女士", "先生", "太太", "夫人",
        "医生", "护士", "主任", "院长",
        "经理", "总监", "总裁", "总经理",
        "总", "副总", "老板",
        "老师", "教授", "博士", "院士",
        "阿姨", "叔叔", "大爷", "大哥", "大姐",
        "小", "老"
    ]

    PURE_TITLES = ["女士", "先生", "太太", "夫人", "医生", "护士", "老师"]

    def __init__(self, llm_api_key: str = None, llm_base_url: str = None):
        self.llm_enabled = False

        if HAS_OPENAI and llm_api_key:
            self.llm_client = AsyncOpenAI(
                api_key=llm_api_key,
                base_url=llm_base_url or "https://api.deepseek.com/v1"
            )
            self.llm_enabled = True

    def extract_name_and_title(self, raw_name: str) -> Tuple[Optional[str], Optional[str]]:
        """智能分离姓名和称呼"""
        if not raw_name:
            return None, None

        name = raw_name.strip()
        if not name:
            return None, None

        name_no_space = name.replace(" ", "")

        # 检查手机号
        if name_no_space.isdigit() and len(name_no_space) >= 7:
            return None, None

        # 检查纯称呼
        if name in self.PURE_TITLES:
            return None, name

        for title in self.PURE_TITLES:
            if name_no_space == title:
                return None, title

        # 分离称呼
        for title in self.TITLES:
            if name.endswith(title):
                clean_name = name[:-len(title)].strip()
                if clean_name:
                    if clean_name.isdigit() and len(clean_name) >= 7:
                        return None, None
                    return clean_name, title

        return name, None

    def is_valid_name(self, name: str) -> Tuple[bool, str]:
        """验证姓名"""
        if not name:
            return False, "姓名不能为空"

        name = name.strip()
        if not name:
            return False, "姓名不能为空"

        if len(name) < 1:
            return False, "姓名至少1个字符"

        if len(name) > 50:
            return False, "姓名不能超过50个字符"

        digits = sum(c.isdigit() for c in name)
        if digits >= 7:
            return False, "姓名不能是手机号"

        if name.isdigit():
            return False, "姓名不能是纯数字"

        if re.search(r'[^\u4e00-\u9fa5a-zA-Z\s·.]', name):
            return False, "姓名包含特殊字符"

        if name in self.PURE_TITLES:
            return False, "请输入有效姓名"

        return True, ""

    def is_valid_phone(self, phone: str) -> Tuple[bool, str]:
        """验证手机号"""
        if not phone:
            return False, "手机号不能为空"

        phone_clean = re.sub(r'[\s\-\(\)\+]', '', phone)

        if not phone_clean.replace(' ', '').isdigit():
            return False, "手机号只能是数字"

        if len(phone_clean) == 11:
            if phone_clean[0] == '1' and phone_clean[1] in '3456789':
                return True, ""
            if phone_clean[0] in '0123456789':
                return True, ""

        if len(phone_clean) >= 7 and len(phone_clean) <= 15:
            return True, ""

        return False, "手机号格式不正确"

    def analyze_basic(self, raw_name: str, phone: str) -> Dict:
        """基础规则分析"""
        result = {
            "valid": True,
            "errors": [],
            "raw_name": raw_name,
            "clean_name": None,
            "title": None,
            "phone_valid": True,
            "phone_error": "",
            "needs_llm": False,
            "llm_reason": ""
        }

        # 姓名分析
        if raw_name:
            clean_name, title = self.extract_name_and_title(raw_name)
            result["clean_name"] = clean_name
            result["title"] = title

            if clean_name is None and title:
                result["valid"] = False
                result["errors"].append("请输入有效姓名，不能只是称呼")
            else:
                is_valid, error = self.is_valid_name(clean_name)
                if not is_valid:
                    result["valid"] = False
                    result["errors"].append(error)
        else:
            result["valid"] = False
            result["errors"].append("姓名不能为空")

        # 手机分析
        if phone:
            is_valid, error = self.is_valid_phone(phone)
            result["phone_valid"] = is_valid
            result["phone_error"] = error
            if not is_valid:
                result["valid"] = False

        # 判断是否需要LLM增强
        # 规则无法确定的情况
        if result["valid"]:
            if result["clean_name"] and len(result["clean_name"]) == 1:
                result["needs_llm"] = True
                result["llm_reason"] = "单字姓名，可能需要LLM确认"

        return result

    async def analyze_with_llm(self, raw_name: str, phone: str) -> Dict:
        """LLM增强分析"""
        # 先做基础分析
        result = self.analyze_basic(raw_name, phone)

        # 如果不需要LLM，直接返回
        if not result["needs_llm"] or not self.llm_enabled:
            return result

        # 调用LLM
        try:
            llm_prompt = f"""分析以下预约信息，判断姓名是否有效：

姓名: {raw_name}
手机: {phone}
称呼: {result.get('title', '无')}

请分析：
1. 这个姓名是否像是真实姓名（不是随意输入）？
2. 是否有可能是机器人或无效输入？
3. 应该如何处理？

请返回JSON格式：
{{
  "valid": true/false,
  "reason": "分析理由",
  "suggestion": "建议"
}}

只返回JSON。"""

            response = await self.llm_client.chat.completions.create(
                model="deepseek-chat",
                messages=[{"role": "user", "content": llm_prompt}],
                temperature=0.3,
                max_tokens=200
            )

            llm_result = json.loads(response.choices[0].message.content)

            # 合并结果
            if "valid" in llm_result:
                result["valid"] = llm_result["valid"]
                if not llm_result["valid"]:
                    result["errors"].append(f"LLM判定: {llm_result.get('reason', '无效')}")
                result["llm_analysis"] = llm_result

        except Exception as e:
            result["llm_error"] = str(e)

        return result

    def analyze(self, raw_name: str, phone: str) -> Dict:
        """同步接口 - 仅使用规则"""
        return self.analyze_basic(raw_name, phone)


# 测试
async def test():
    print("=" * 60)
    print("LLM增强语义分析测试")
    print("=" * 60)

    # 不需要LLM key也能测试基础功能
    analyzer = SemanticAnalyzer()

    test_cases = [
        ("张三", "13812345678"),
        ("张女士", "13812345678"),
        ("李先生", "13912345678"),
        ("女士", "13812345678"),
        ("13812345678", "13812345678"),
        ("", ""),
    ]

    for name, phone in test_cases:
        result = analyzer.analyze(name, phone)
        print(f"\n输入: name={name!r}, phone={phone!r}")
        print(f"  结果: valid={result['valid']}")
        print(f"  姓名: {result['clean_name']!r}, 称呼: {result['title']!r}")
        if result['errors']:
            print(f"  错误: {result['errors']}")
        if result['needs_llm']:
            print(f"  ⚠️  需要LLM增强")


if __name__ == "__main__":
    import asyncio
    asyncio.run(test())
