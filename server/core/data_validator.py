from typing import List, Dict, Any, Optional
from pydantic import BaseModel, validator
from datetime import datetime
import re


class DataValidator:
    @staticmethod
    def validate_phone(phone: str) -> tuple[bool, Optional[str]]:
        pattern = r"^1[3-9]\d{9}$"
        if not re.match(pattern, phone):
            return False, "手机号格式不正确"
        return True, None

    @staticmethod
    def validate_email(email: str) -> tuple[bool, Optional[str]]:
        pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
        if not re.match(pattern, email):
            return False, "邮箱格式不正确"
        return True, None

    @staticmethod
    def validate_id_card(id_card: str) -> tuple[bool, Optional[str]]:
        if len(id_card) not in [15, 18]:
            return False, "身份证号长度不正确"

        if len(id_card) == 18:
            if not re.match(r"^\d{17}[\dXx]$", id_card):
                return False, "身份证号格式不正确"

        return True, None

    @staticmethod
    def validate_appointment_time(time_str: str) -> tuple[bool, Optional[str]]:
        try:
            hour, minute = map(int, time_str.split(":"))
            if hour < 9 or hour >= 18:
                return False, "营业时间为9:00-18:00"
            if minute not in [0, 30]:
                return False, "预约时间应为整点或半点"
            return True, None
        except (ValueError, AttributeError):
            return False, "时间格式不正确"

    @staticmethod
    def validate_password(password: str) -> tuple[bool, Optional[str]]:
        if len(password) < 8:
            return False, "密码长度至少8位"
        if not re.search(r"[A-Za-z]", password):
            return False, "密码必须包含字母"
        if not re.search(r"[0-9]", password):
            return False, "密码必须包含数字"
        return True, None

    @staticmethod
    def sanitize_string(text: str, max_length: int = 1000) -> str:
        text = text.strip()
        if len(text) > max_length:
            text = text[:max_length]
        text = re.sub(r'[<>\"\'%;]', '', text)
        return text


class DataSchema(BaseModel):
    class Config:
        extra = "forbid"


class AppointmentSchema(DataSchema):
    name: str
    phone: str
    service_type: Optional[str] = None
    appointment_time: Optional[str] = None
    notes: Optional[str] = None

    @validator("name")
    def validate_name(cls, v):
        if not v or len(v) < 2:
            raise ValueError("姓名至少2个字符")
        return DataValidator.sanitize_string(v, 50)

    @validator("phone")
    def validate_phone_field(cls, v):
        valid, error = DataValidator.validate_phone(v)
        if not valid:
            raise ValueError(error)
        return v


class UserCreateSchema(DataSchema):
    name: str
    phone: str
    email: Optional[str] = None
    password: str

    @validator("name")
    def validate_name(cls, v):
        if not v or len(v) < 2:
            raise ValueError("姓名至少2个字符")
        return DataValidator.sanitize_string(v, 50)

    @validator("phone")
    def validate_phone_field(cls, v):
        valid, error = DataValidator.validate_phone(v)
        if not valid:
            raise ValueError(error)
        return v

    @validator("email")
    def validate_email_field(cls, v):
        if v:
            valid, error = DataValidator.validate_email(v)
            if not valid:
                raise ValueError(error)
        return v

    @validator("password")
    def validate_password_field(cls, v):
        valid, error = DataValidator.validate_password(v)
        if not valid:
            raise ValueError(error)
        return v


class FeedbackSchema(DataSchema):
    type: str
    rating: int
    content: Optional[str] = None
    conversation_id: Optional[str] = None

    @validator("rating")
    def validate_rating(cls, v):
        if v < 1 or v > 5:
            raise ValueError("评分必须在1-5之间")
        return v

    @validator("type")
    def validate_type(cls, v):
        allowed_types = ["complaint", "suggestion", "praise", "other"]
        if v not in allowed_types:
            raise ValueError(f"类型必须是{allowed_types}之一")
        return v


class ChatMessageSchema(DataSchema):
    message: str
    history: List[Dict[str, str]] = []
    user_id: Optional[str] = None
    context: Optional[Dict[str, Any]] = None

    @validator("message")
    def validate_message(cls, v):
        if not v or not v.strip():
            raise ValueError("消息不能为空")
        return DataValidator.sanitize_string(v, 5000)


class DataIntegrityChecker:
    @staticmethod
    def check_appointment_data(data: Dict[str, Any]) -> List[str]:
        errors = []

        if not data.get("name"):
            errors.append("姓名为必填项")
        elif len(data["name"]) < 2:
            errors.append("姓名至少2个字符")

        if not data.get("phone"):
            errors.append("手机号为必填项")
        else:
            valid, error = DataValidator.validate_phone(data["phone"])
            if not valid:
                errors.append(error)

        if data.get("appointment_time"):
            valid, error = DataValidator.validate_appointment_time(data["appointment_time"])
            if not valid:
                errors.append(error)

        return errors

    @staticmethod
    def check_user_data(data: Dict[str, Any]) -> List[str]:
        errors = []

        if not data.get("name"):
            errors.append("姓名为必填项")

        if not data.get("phone"):
            errors.append("手机号为必填项")
        else:
            valid, error = DataValidator.validate_phone(data["phone"])
            if not valid:
                errors.append(error)

        if data.get("email"):
            valid, error = DataValidator.validate_email(data["email"])
            if not valid:
                errors.append(error)

        if data.get("password"):
            valid, error = DataValidator.validate_password(data["password"])
            if not valid:
                errors.append(error)

        return errors
