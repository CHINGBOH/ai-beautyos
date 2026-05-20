import hashlib
import time
from datetime import datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = __import__('logging').getLogger(__name__)
router_ab = APIRouter(prefix="/api/ab", tags=["ab_testing"])


class FeatureFlag(BaseModel):
    key: str
    enabled: bool
    rollout_percentage: int = 100
    description: str | None = None


class ABTest(BaseModel):
    test_id: str
    name: str
    variants: dict[str, float]
    start_date: str
    end_date: str
    status: str = "running"


class UserAssignment(BaseModel):
    user_id: str
    test_id: str
    variant: str
    assigned_at: str


feature_flags_db: dict[str, FeatureFlag] = {}
ab_tests_db: dict[str, ABTest] = {}
user_assignments_db: dict[str, UserAssignment] = {}


def hash_user(user_id: str, test_id: str) -> float:
    combined = f"{user_id}:{test_id}"
    hash_val = int(hashlib.md5(combined.encode()).hexdigest(), 16)
    return (hash_val % 10000) / 10000.0


@router_ab.post("/flags")
async def create_feature_flag(flag: FeatureFlag):
    if flag.key in feature_flags_db:
        raise HTTPException(status_code=400, detail="Flag已存在")

    feature_flags_db[flag.key] = flag
    logger.info("feature_flag_created", key=flag.key, rollout=flag.rollout_percentage)

    return {"success": True, "key": flag.key}


@router_ab.get("/flags/{key}")
async def get_feature_flag(key: str):
    if key not in feature_flags_db:
        raise HTTPException(status_code=404, detail="Flag不存在")

    return feature_flags_db[key]


@router_ab.put("/flags/{key}")
async def update_feature_flag(key: str, flag: FeatureFlag):
    if key not in feature_flags_db:
        raise HTTPException(status_code=404, detail="Flag不存在")

    feature_flags_db[key] = flag
    return {"success": True, "key": key}


@router_ab.get("/flags/{key}/enabled")
async def is_flag_enabled(key: str, user_id: str | None = None):
    if key not in feature_flags_db:
        return {"enabled": False, "reason": "flag_not_found"}

    flag = feature_flags_db[key]

    if not flag.enabled:
        return {"enabled": False, "reason": "flag_disabled"}

    if flag.rollout_percentage >= 100:
        return {"enabled": True}

    if not user_id:
        return {"enabled": False, "reason": "no_user_id"}

    user_hash = hash_user(user_id, key)
    is_enabled = (user_hash * 100) < flag.rollout_percentage

    return {"enabled": is_enabled, "rollout_percentage": flag.rollout_percentage}


@router_ab.post("/tests")
async def create_ab_test(test: ABTest):
    test_id = f"TEST_{int(time.time() * 1000)}"
    test.test_id = test_id
    ab_tests_db[test_id] = test

    logger.info("ab_test_created", test_id=test_id, name=test.name)

    return {"success": True, "test_id": test_id}


@router_ab.get("/tests/{test_id}/assign")
async def assign_variant(test_id: str, user_id: str):
    if test_id not in ab_tests_db:
        raise HTTPException(status_code=404, detail="测试不存在")

    assignment_key = f"{test_id}:{user_id}"
    if assignment_key in user_assignments_db:
        return user_assignments_db[assignment_key]

    test = ab_tests_db[test_id]

    user_hash = hash_user(user_id, test_id)

    cumulative = 0.0
    assigned_variant = "control"

    for variant, percentage in test.variants.items():
        cumulative += percentage / 100.0
        if user_hash < cumulative:
            assigned_variant = variant
            break

    assignment = UserAssignment(
        user_id=user_id,
        test_id=test_id,
        variant=assigned_variant,
        assigned_at=datetime.utcnow().isoformat()
    )

    user_assignments_db[assignment_key] = assignment

    logger.info("user_assigned_to_variant", test_id=test_id, user_id=user_id, variant=assigned_variant)

    return assignment


@router_ab.get("/tests")
async def list_ab_tests():
    return list(ab_tests_db.values())


@router_ab.get("/tests/{test_id}/results")
async def get_test_results(test_id: str):
    if test_id not in ab_tests_db:
        raise HTTPException(status_code=404, detail="测试不存在")

    test = ab_tests_db[test_id]

    variant_stats = {}
    for variant in test.variants:
        variant_assignments = [
            a for a in user_assignments_db.values()
            if a.test_id == test_id and a.variant == variant
        ]
        variant_stats[variant] = {
            "assignments": len(variant_assignments)
        }

    return {
        "test_id": test_id,
        "name": test.name,
        "status": test.status,
        "variants": variant_stats
    }

# Export router with standard name for main.py import
router = router_ab
