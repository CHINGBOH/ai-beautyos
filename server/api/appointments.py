from typing import Optional, List
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException
from ..core.logging import get_logger
from ..core.security import security
from ..core.exceptions import ValidationException, NotFoundException

logger = get_logger(__name__)
router_appointment = APIRouter(prefix="/api/appointments", tags=["appointments"])


class AppointmentRequest(BaseModel):
    name: str
    phone: str
    service_type: Optional[str] = None
    appointment_time: Optional[str] = None
    notes: Optional[str] = None


class AppointmentResponse(BaseModel):
    success: bool
    appointment_id: Optional[str] = None
    message: str


appointments_db = {}


@router_appointment.post("/", response_model=AppointmentResponse)
async def create_appointment(request: AppointmentRequest):
    if not request.name or not request.name.strip():
        raise ValidationException("姓名不能为空", field="name")

    if not request.phone or not request.phone.strip():
        raise ValidationException("手机号不能为空", field="phone")

    phone = security.sanitize_input(request.phone)
    if len(phone) < 7:
        raise ValidationException("手机号格式不正确", field="phone")

    masked_phone = security.mask_phone(phone)
    masked_name = security.mask_name(request.name)

    appointment_id = f"APT-{int(time.time() * 1000)}"
    appointments_db[appointment_id] = {
        "id": appointment_id,
        "name": masked_name,
        "phone": masked_phone,
        "service_type": request.service_type,
        "appointment_time": request.appointment_time,
        "notes": request.notes,
        "status": "pending"
    }

    logger.info(
        "appointment_created",
        appointment_id=appointment_id,
        masked_name=masked_name,
        masked_phone=masked_phone,
        service_type=request.service_type
    )

    return AppointmentResponse(
        success=True,
        appointment_id=appointment_id,
        message="预约成功！我们会尽快联系您确认。"
    )


@router_appointment.get("/{appointment_id}", response_model=dict)
async def get_appointment(appointment_id: str):
    appointment = appointments_db.get(appointment_id)
    if not appointment:
        raise NotFoundException("预约")
    return appointment


@router_appointment.get("/", response_model=list)
async def list_appointments():
    return list(appointments_db.values())


# Export router with standard name for main.py import
router = router_appointment

import time
