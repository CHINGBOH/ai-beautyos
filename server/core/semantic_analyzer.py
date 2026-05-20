"""语义分析增强 - 姓名/称呼智能识别"""
import re
from typing import ClassVar


class SemanticAnalyzer:
    """语义分析器 - 智能识别姓名、称呼"""

    # 称呼关键词
    TITLES: ClassVar[list[str]] = [
        "女士", "先生", "太太", "夫人",
        "医生", "护士", "主任", "院长",
        "经理", "总监", "总裁", "总经理",
        "总", "副总", "老板",
        "老师", "教授", "博士", "院士",
        "阿姨", "叔叔", "大爷", "大哥", "大姐",
        "小", "老"
    ]

    # 常见姓氏
    COMMON_SURNAMES: ClassVar[list[str]] = [
        "张", "李", "王", "刘", "陈", "杨", "赵", "黄", "周", "吴",
        "徐", "孙", "胡", "朱", "高", "林", "何", "郭", "马", "罗",
        "梁", "宋", "郑", "谢", "韩", "唐", "冯", "于", "董", "萧",
        "程", "曹", "袁", "邓", "许", "傅", "沈", "曾", "彭", "吕"
    ]

    # 纯称呼词
    PURE_TITLES: ClassVar[list[str]] = ["女士", "先生", "太太", "夫人", "医生", "护士", "老师"]

    @staticmethod
    def is_pure_title(text: str) -> bool:
        """判断是否为纯称呼"""
        return text in SemanticAnalyzer.PURE_TITLES

    @staticmethod
    def extract_name_and_title(raw_name: str) -> tuple[str | None, str | None]:
        """
        智能分离姓名和称呼
        返回: (clean_name, title)
        """
        if not raw_name:
            return None, None

        name = raw_name.strip()

        # 检查是否为空
        if not name or len(name.replace(" ", "")) == 0:
            return None, None

        name_no_space = name.replace(" ", "")

        # 检查是否像手机号（11位数字）
        if name_no_space.isdigit() and len(name_no_space) >= 7:
            return None, None

        # 检查是否纯称呼
        if SemanticAnalyzer.is_pure_title(name):
            return None, name

        # 再次检查（移除空格后）
        for title in SemanticAnalyzer.PURE_TITLES:
            if name_no_space == title:
                return None, title

        # 智能分离：查找称呼在末尾的情况
        for title in SemanticAnalyzer.TITLES:
            if name.endswith(title):
                # 分离
                clean_name = name[:-len(title)].strip()
                if clean_name:
                    # 检查分离后的名字是否像手机号
                    if clean_name.isdigit() and len(clean_name) >= 7:
                        return None, None
                    return clean_name, title
                return None, title

        # 没有称呼，返回原始
        return name, None

    @staticmethod
    def is_valid_name(name: str) -> tuple[bool, str]:
        """
        验证姓名是否有效
        返回: (is_valid, error_message)
        """
        if not name:
            return False, "姓名不能为空"

        name = name.strip()

        # 空检查
        if not name:
            return False, "姓名不能为空"

        # 长度检查 - 允许单字（因为可能是姓+称呼的情况）
        if len(name) < 1:
            return False, "姓名至少1个字符"

        if len(name) > 50:
            return False, "姓名不能超过50个字符"

        # 检查是否像手机号（数字>=7位）
        digits = sum(c.isdigit() for c in name)
        if digits >= 7:
            return False, "姓名不能是手机号"

        # 检查是否像纯数字
        if name.isdigit():
            return False, "姓名不能是纯数字"

        # 检查是否纯数字+字母组合像手机号
        clean_name = name.replace(" ", "")
        if clean_name.isdigit() and len(clean_name) >= 7:
            return False, "姓名不能是手机号"

        # 检查特殊字符（保留中文、英文、常用符号）
        if re.search(r'[^\u4e00-\u9fa5a-zA-Z\s·.]', name):
            return False, "姓名包含特殊字符"

        # 检查是否纯称呼
        if SemanticAnalyzer.is_pure_title(name):
            return False, "请输入有效姓名"

        return True, ""

    @staticmethod
    def is_valid_phone(phone: str) -> tuple[bool, str]:
        """
        验证手机号
        返回: (is_valid, error_message)
        """
        if not phone:
            return False, "手机号不能为空"

        # 移除常见分隔符
        phone_clean = re.sub(r'[\s\-\(\)\+]', '', phone)

        # 检查是否全为数字
        if not phone_clean.replace(' ', '').isdigit():
            return False, "手机号只能是数字"

        # 中国手机号：11位，1开头，第2位3456789
        if len(phone_clean) == 11:
            if phone_clean[0] == '1' and phone_clean[1] in '3456789':
                return True, ""
            if phone_clean[0] in '0123456789':
                return True, ""  # 宽松：只要1开头或0开头都接受

        # 其他常见格式（7-15位）
        if len(phone_clean) >= 7 and len(phone_clean) <= 15:
            return True, ""

        return False, "手机号格式不正确"

    @staticmethod
    def analyze(raw_name: str, phone: str = "") -> dict:
        """
        完整分析
        返回分析结果字典
        """
        result = {
            "valid": True,
            "errors": [],
            "raw_name": raw_name,
            "clean_name": None,
            "title": None,
            "phone_valid": True,
            "phone_error": "",
            "suggestions": []
        }

        # 分析姓名
        if raw_name:
            clean_name, title = SemanticAnalyzer.extract_name_and_title(raw_name)
            result["clean_name"] = clean_name
            result["title"] = title

            if clean_name is None and title:
                # 纯称呼
                result["valid"] = False
                result["errors"].append("请输入有效姓名，不能只是称呼")
            elif clean_name is not None:
                # 验证姓名
                is_valid, error = SemanticAnalyzer.is_valid_name(clean_name)
                if not is_valid:
                    result["valid"] = False
                    result["errors"].append(error)
            else:
                result["valid"] = False
                result["errors"].append("姓名不能为空")
        else:
            result["valid"] = False
            result["errors"].append("姓名不能为空")

        # 分析手机号
        if phone:
            is_valid, error = SemanticAnalyzer.is_valid_phone(phone)
            result["phone_valid"] = is_valid
            result["phone_error"] = error
            if not is_valid:
                result["valid"] = False

        # 生成建议
        if result["title"]:
            result["suggestions"].append(f"识别到称呼: {result['title']}")

        return result


# 测试函数
def test_semantic():
    """测试语义分析"""
    print("=" * 60)
    print("🔍 语义分析测试")
    print("=" * 60)

    test_cases = [
        ("张三", "张三", None),
        ("张女士", "张", "女士"),
        ("李先生", "李", "先生"),
        ("王医生", "王", "医生"),
        ("陈总", "陈", "总"),
        ("女士", None, "女士"),
        ("先生", None, "先生"),
        ("13812345678", None, None),
        ("", None, None),
        ("赵", None, None),  # 太短
        ("John", "John", None),
        ("Mary Smith", "Mary Smith", None),
    ]

    for name, expected_name, expected_title in test_cases:
        clean_name, title = SemanticAnalyzer.extract_name_and_title(name)

        status = "✅"
        if clean_name != expected_name or title != expected_title:
            status = "❌"

        print(f"{status} {name!r} -> ({clean_name!r}, {title!r}) 期望: ({expected_name!r}, {expected_title!r})")

    print("\n📋 完整分析测试:")
    test_full = [
        ("张女士", "13812345678"),
        ("女士", "13812345678"),
        ("13812345678", "13812345678"),
        ("", ""),
        ("赵医生", "1234567"),
    ]

    for name, phone in test_full:
        result = SemanticAnalyzer.analyze(name, phone)
        print(f"\n输入: name={name!r}, phone={phone!r}")
        print(f"  结果: valid={result['valid']}")
        print(f"  姓名: clean={result['clean_name']!r}, title={result['title']!r}")
        if result['errors']:
            print(f"  错误: {result['errors']}")


if __name__ == "__main__":
    test_semantic()
