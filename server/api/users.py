import time
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from ..core.auth import AuthenticatedUser, require_auth
from ..core.exceptions import NotFoundException
from ..core.logging import get_logger
from ..core.security import SecurityValidator, security

logger = get_logger(__name__)
router_user = APIRouter(prefix="/api/users", tags=["users"])


class UserProfile(BaseModel):
    user_id: str
    name: str
    phone: str
    email: str | None = None
    created_at: str | None = None
    role: str = "user"


class UserCreate(BaseModel):
    name: str
    phone: str
    email: str | None = None
    password: str


class UserResponse(BaseModel):
    user_id: str
    name: str
    masked_phone: str
    email: str | None = None
    role: str
    created_at: str


class DataExport(BaseModel):
    user_id: str
    profile: dict
    conversations: list
    appointments: list
    export_time: str


class DataDeleteRequest(BaseModel):
    confirm: bool
    reason: str | None = None


users_db: dict[str, dict[str, Any]] = {}
user_data_storage: dict[str, dict[str, Any]] = {}


@router_user.post("/", response_model=UserResponse)
async def create_user(user: UserCreate):
    from ..core.password import hash_password, validate_password_strength

    valid, error_msg = validate_password_strength(user.password)
    if not valid:
        raise HTTPException(status_code=400, detail=error_msg)

    if any(u.get("phone") == user.phone for u in users_db.values()):
        raise HTTPException(status_code=400, detail="手机号已注册")

    user_id = f"user_{int(time.time() * 1000)}"
    hashed = hash_password(user.password)

    users_db[user_id] = {
        "user_id": user_id,
        "name": user.name,
        "phone": user.phone,
        "email": user.email,
        "password_hash": hashed,
        "role": "user",
        "created_at": datetime.now().isoformat()
    }

    logger.info("user_created", user_id=user_id, masked_phone=security.mask_phone(user.phone))

    return UserResponse(
        user_id=user_id,
        name=user.name,
        masked_phone=security.mask_phone(user.phone),
        email=user.email,
        role="user",
        created_at=users_db[user_id]["created_at"]
    )


@router_user.get("/me", response_model=UserResponse)
async def get_my_profile(current_user: AuthenticatedUser = Depends(require_auth)):
    user = users_db.get(current_user.user_id)
    if not user:
        raise NotFoundException("用户")
    return UserResponse(
        user_id=user["user_id"],
        name=user["name"],
        masked_phone=security.mask_phone(user["phone"]),
        email=user.get("email"),
        role=user["role"],
        created_at=user["created_at"]
    )


@router_user.get("/data/export", response_model=DataExport)
async def export_user_data(request: Request, current_user: AuthenticatedUser = Depends(require_auth)):
    user = users_db.get(current_user.user_id)
    if not user:
        raise NotFoundException("用户")

    user_conversations = user_data_storage.get(current_user.user_id, {}).get("conversations", [])
    user_appointments = user_data_storage.get(current_user.user_id, {}).get("appointments", [])

    export_data = {
        "user_id": current_user.user_id,
        "profile": {
            "name": security.mask_name(user["name"]),
            "phone": security.mask_phone(user["phone"]),
            "email": user.get("email"),
            "role": user["role"],
            "created_at": user["created_at"]
        },
        "conversations": user_conversations,
        "appointments": [SecurityValidator.mask_sensitive_data(apt) for apt in user_appointments],
        "export_time": datetime.now().isoformat()
    }

    logger.info("user_data_exported", user_id=current_user.user_id)

    return export_data


@router_user.delete("/data", response_model=dict)
async def delete_user_data(
    delete_request: DataDeleteRequest,
    request: Request,
    current_user: AuthenticatedUser = Depends(require_auth)
):
    if not delete_request.confirm:
        raise HTTPException(status_code=400, detail="需要确认删除")

    if current_user.user_id in users_db:
        del users_db[current_user.user_id]

    if current_user.user_id in user_data_storage:
        del user_data_storage[current_user.user_id]

    logger.info("user_data_deleted", user_id=current_user.user_id, reason=delete_request.reason)

    return {"success": True, "message": "用户数据已删除"}


@router_user.post("/data/anonymize", response_model=dict)
async def anonymize_user_data(request: Request, current_user: AuthenticatedUser = Depends(require_auth)):
    if current_user.user_id in users_db:
        users_db[current_user.user_id].update({
            "name": "已匿名用户",
            "phone": "00000000000",
            "email": None
        })

    if current_user.user_id in user_data_storage:
        user_data_storage[current_user.user_id] = {}

    logger.info("user_data_anonymized", user_id=current_user.user_id)

    return {"success": True, "message": "用户数据已匿名化"}


@router_user.post("/appointments", response_model=dict)
async def save_appointment(appointment_data: dict, current_user: AuthenticatedUser = Depends(require_auth)):
    if current_user.user_id not in user_data_storage:
        user_data_storage[current_user.user_id] = {"conversations": [], "appointments": []}

    masked_data = SecurityValidator.mask_sensitive_data(appointment_data)
    user_data_storage[current_user.user_id]["appointments"].append({
        **masked_data,
        "saved_at": datetime.now().isoformat()
    })

    return {"success": True, "message": "预约已保存"}


@router_user.get("/appointments", response_model=list)
async def get_user_appointments(current_user: AuthenticatedUser = Depends(require_auth)):
    appointments = user_data_storage.get(current_user.user_id, {}).get("appointments", [])
    return [SecurityValidator.mask_sensitive_data(apt) for apt in appointments]

# Export router with standard name for main.py import
router = router_user
