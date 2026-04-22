import re
import html
from typing import Optional
import structlog

logger = structlog.get_logger()


class SecurityValidator:
    @staticmethod
    def sanitize_input(text: str) -> str:
        if not text:
            return ""
        text = html.escape(text)
        text = re.sub(r'[<>"\';]', '', text)
        return text.strip()

    @staticmethod
    def mask_phone(phone: str) -> str:
        if not phone or len(phone) < 7:
            return phone
        return phone[:3] + "****" + phone[-4:]

    @staticmethod
    def mask_name(name: str) -> str:
        if not name:
            return ""
        if len(name) == 1:
            return "*"
        if len(name) == 2:
            return name[0] + "*"
        return name[0] + "*" * (len(name) - 2) + name[-1]

    @staticmethod
    def mask_sensitive_data(data: dict) -> dict:
        sensitive_fields = ["phone", "mobile", "tel", "name", "real_name", "id_card", "idNumber"]
        result = data.copy()
        for field in sensitive_fields:
            if field in result:
                value = str(result[field])
                if field in ["phone", "mobile", "tel"]:
                    result[field] = SecurityValidator.mask_phone(value)
                else:
                    result[field] = SecurityValidator.mask_name(value)
        return result

    @staticmethod
    def detect_prompt_injection(text: str) -> bool:
        if not text:
            return False
        injection_patterns = [
            r"ignore\s+(previous|all)\s+(instructions|prompts)",
            r"disregard\s+(previous|all)\s+(instructions|prompts)",
            r"forget\s+(previous|all)\s+(instructions|prompts|your)",
            r"you\s+are\s+now\s+(a|an)\s+",
            r"pretend\s+you\s+are\s+",
            r"roleplay\s+as\s+",
            r"//silence",
            r"#\s*system",
            r"\[\s*SYSTEM\s*\]",
            r"<script",
            r"javascript:",
            r"忽略.*(指令|指示)",
            r"无视.*(指令|指示)",
            r"忘记.*(指令|指示)",
            r"不要管.*指令",
            r"不要听.*指令",
        ]
        text_lower = text.lower()
        for pattern in injection_patterns:
            if re.search(pattern, text_lower, re.IGNORECASE):
                logger.warning("prompt_injection_detected", pattern=pattern, text_length=len(text))
                return True
        return False

    @staticmethod
    def validate_api_key(api_key: str) -> bool:
        if not api_key:
            return False
        if len(api_key) < 10:
            return False
        if api_key.startswith("sk-") or api_key.startswith("sk-0"):
            return True
        return False


security = SecurityValidator()
