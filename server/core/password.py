from passlib.context import CryptContext
from typing import Optional
import re

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def validate_password_strength(password: str) -> tuple[bool, Optional[str]]:
    if len(password) < 8:
        return False, "密码长度至少8位"
    if not re.search(r"[A-Za-z]", password):
        return False, "密码必须包含字母"
    if not re.search(r"[0-9]", password):
        return False, "密码必须包含数字"
    return True, None
