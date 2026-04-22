from datetime import datetime, date
from typing import Optional, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import json
from pathlib import Path

logger = __import__('logging').getLogger(__name__)
router_holiday = APIRouter(prefix="/api/holidays", tags=["holidays"])

HOLIDAY_DATA_FILE = Path(__file__).parent.parent.parent / "data" / "holidays.json"

DEFAULT_HOLIDAYS = {
    "2026": [
        {"date": "2026-01-01", "name": "元旦", "type": "holiday"},
        {"date": "2026-01-28", "name": "春节", "type": "holiday"},
        {"date": "2026-01-29", "name": "春节", "type": "holiday"},
        {"date": "2026-01-30", "name": "春节", "type": "holiday"},
        {"date": "2026-04-04", "name": "清明节", "type": "holiday"},
        {"date": "2026-05-01", "name": "劳动节", "type": "holiday"},
        {"date": "2026-06-20", "name": "端午节", "type": "holiday"},
        {"date": "2026-10-01", "name": "国庆节", "type": "holiday"},
        {"date": "2026-10-02", "name": "国庆节", "type": "holiday"},
        {"date": "2026-10-03", "name": "国庆节", "type": "holiday"},
    ]
}


def load_holidays() -> dict:
    try:
        if HOLIDAY_DATA_FILE.exists():
            with open(HOLIDAY_DATA_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
    except Exception:
        pass
    return DEFAULT_HOLIDAYS


def save_holidays(holidays: dict):
    try:
        HOLIDAY_DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(HOLIDAY_DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(holidays, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.error("failed_to_save_holidays", error=str(e))


def is_holiday(check_date: date) -> Optional[dict]:
    holidays = load_holidays()
    date_str = check_date.isoformat()
    year_str = str(check_date.year)

    if year_str not in holidays:
        return None

    for holiday in holidays[year_str]:
        if holiday["date"] == date_str:
            return holiday

    return None


def is_business_day(check_date: date) -> bool:
    if check_date.weekday() >= 5:
        return False
    if is_holiday(check_date):
        return False
    return True


class HolidayResponse(BaseModel):
    date: str
    name: str
    type: str


@router_holiday.get("/check/{date_str}")
async def check_date(date_str: str):
    try:
        check_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="日期格式错误，请使用 YYYY-MM-DD")

    holiday = is_holiday(check_date)
    is_holiday_flag = holiday is not None
    is_weekend = check_date.weekday() >= 5
    is_business = is_business_day(check_date)

    return {
        "date": date_str,
        "is_holiday": is_holiday_flag,
        "is_weekend": is_weekend,
        "is_business_day": is_business,
        "holiday": holiday
    }


@router_holiday.get("/list/{year}")
async def list_holidays(year: int):
    holidays = load_holidays()
    year_str = str(year)
    year_holidays = holidays.get(year_str, [])
    return [HolidayResponse(**h) for h in year_holidays]


@router_holiday.post("/validate-appointment")
async def validate_appointment_time(
    date_str: str,
    time_str: str
):
    try:
        appointment_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        appointment_time = datetime.strptime(time_str, "%H:%M").time()
    except ValueError:
        raise HTTPException(status_code=400, detail="日期或时间格式错误")

    errors = []

    if not is_business_day(appointment_date):
        errors.append(f"{date_str} 是节假日或周末，无法预约")

    hour = appointment_time.hour
    if hour < 9 or hour >= 18:
        errors.append("营业时间为 9:00-18:00")

    if errors:
        return {
            "valid": False,
            "errors": errors
        }

    return {
        "valid": True,
        "message": "可以预约"
    }

# Export router with standard name for main.py import
router = router_holiday
