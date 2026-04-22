from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from fastapi import Request, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from .config import get_settings
from .logging import get_logger
import jwt

settings = get_settings()
logger = get_logger(__name__)

security = HTTPBearer(auto_error=False)


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "type": "access", "iat": datetime.utcnow()})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(data: Dict[str, Any]) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh", "iat": datetime.utcnow()})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> Dict[str, Any]:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM], options={"exp": True})
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token已过期", headers={"WWW-Authenticate": "Bearer"})
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="无效的Token", headers={"WWW-Authenticate": "Bearer"})


def verify_token_type(token_data: Dict[str, Any], expected_type: str) -> bool:
    return token_data.get("type") == expected_type


async def get_current_user_id(credentials: Optional[HTTPAuthorizationCredentials] = None, request: Request = None) -> Optional[str]:
    if not credentials:
        auth_header = request.headers.get("Authorization") if request else None
        if not auth_header or not auth_header.startswith("Bearer "):
            return None
        token = auth_header.split(" ")[1]
    else:
        token = credentials.credentials

    if not token:
        return None

    try:
        payload = decode_token(token)
        return payload.get("sub")
    except HTTPException:
        return None


async def refresh_access_token(refresh_token: str) -> Dict[str, Any]:
    payload = decode_token(refresh_token)

    if not verify_token_type(payload, "refresh"):
        raise HTTPException(status_code=401, detail="无效的Refresh Token")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="无效的用户信息")

    new_access_token = create_access_token({"sub": user_id})
    new_refresh_token = create_refresh_token({"sub": user_id})

    logger.info("token_refreshed", user_id=user_id)

    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer"
    }


class AuthenticatedUser:
    def __init__(self, user_id: str, role: str = "user", **extra):
        self.user_id = user_id
        self.role = role
        self.extra = extra

    @property
    def is_authenticated(self) -> bool:
        return bool(self.user_id)

    @property
    def is_admin(self) -> bool:
        return self.role == "admin"


async def require_auth(request: Request) -> AuthenticatedUser:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="需要认证", headers={"WWW-Authenticate": "Bearer"})

    token = auth_header.split(" ")[1]
    payload = decode_token(token)

    if not verify_token_type(payload, "access"):
        raise HTTPException(status_code=401, detail="需要Access Token")

    user_id = payload.get("sub")
    role = payload.get("role", "user")

    if not user_id:
        raise HTTPException(status_code=401, detail="无效的用户信息")

    return AuthenticatedUser(user_id=user_id, role=role)


async def require_admin(request: Request) -> AuthenticatedUser:
    user = await require_auth(request)
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="需要管理员权限")
    return user
