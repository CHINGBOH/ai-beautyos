from collections.abc import Callable
from functools import wraps
from typing import Any

from fastapi import HTTPException, Request


class APIVersion:
    V1 = "v1"
    V2 = "v2"


class DeprecationStatus:
    ACTIVE = "active"
    DEPRECATED = "deprecated"
    SUNSET = "sunset"


API_VERSIONS: dict[str, dict[str, Any]] = {
    "v1": {
        "released": "2026-01-01",
        "deprecated": None,
        "sunset": "2027-01-01",
        "status": DeprecationStatus.ACTIVE
    },
    "v2": {
        "released": "2026-04-01",
        "deprecated": None,
        "sunset": None,
        "status": DeprecationStatus.ACTIVE
    }
}


def get_api_version(request: Request) -> str:
    accept_header = request.headers.get("Accept", "")

    if "version=v2" in accept_header:
        return APIVersion.V2
    if "version=v1" in accept_header:
        return APIVersion.V1

    path_version = request.path_params.get("version")
    if path_version in API_VERSIONS:
        return path_version

    return APIVersion.V2


def check_api_deprecation(version: str) -> dict[str, Any] | None:
    version_info = API_VERSIONS.get(version)
    if not version_info:
        return None

    status = version_info["status"]
    sunset_date = version_info.get("sunset")

    if status == DeprecationStatus.SUNSET:
        return {
            "deprecated": True,
            "sunset_date": sunset_date,
            "message": f"API版本 {version} 已废弃，请升级到最新版本"
        }

    if status == DeprecationStatus.DEPRECATED:
        return {
            "deprecated": True,
            "sunset_date": sunset_date,
            "message": f"API版本 {version} 将在 {sunset_date} 停止服务"
        }

    return None


def require_api_version(min_version: str):
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(request: Request, *args, **kwargs):
            current_version = get_api_version(request)

            version_order = list(API_VERSIONS.keys())
            if version_order.index(current_version) < version_order.index(min_version):
                raise HTTPException(
                    status_code=400,
                    detail=f"需要最低API版本 {min_version}，当前版本 {current_version}"
                )

            deprecation_info = check_api_deprecation(current_version)
            if deprecation_info:
                response = await func(request, *args, **kwargs)
                if hasattr(response, 'headers'):
                    response.headers["Deprecation"] = "true"
                    if deprecation_info.get("sunset_date"):
                        response.headers["Sunset"] = deprecation_info["sunset_date"]
                return response

            return await func(request, *args, **kwargs)
        return wrapper
    return decorator


class RateLimitHeaders:
    @staticmethod
    def add_headers(response, limit: int, remaining: int, reset_time: int):
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(reset_time)


class CacheControl:
    @staticmethod
    def no_cache(response):
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"

    @staticmethod
    def public(max_age: int, response):
        response.headers["Cache-Control"] = f"public, max-age={max_age}"

    @staticmethod
    def private(max_age: int, response):
        response.headers["Cache-Control"] = f"private, max-age={max_age}"


class ETagGenerator:
    @staticmethod
    def generate(data: Any) -> str:
        import hashlib
        import json
        content = json.dumps(data, sort_keys=True, default=str)
        return f'"{hashlib.md5(content.encode()).hexdigest()}"'

    @staticmethod
    def check_etag(request: Request, data: Any) -> bool:
        request_etag = request.headers.get("If-None-Match")
        if not request_etag:
            return False

        current_etag = ETagGenerator.generate(data)
        return request_etag == current_etag
