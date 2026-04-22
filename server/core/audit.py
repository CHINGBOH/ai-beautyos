from datetime import datetime
from typing import Optional, Dict, Any
from fastapi import Request
from ..core.logging import get_logger
import time

logger = get_logger(__name__)


class AuditLogger:
    def __init__(self):
        self.log_path = "audit.log"

    def log(
        self,
        action: str,
        user_id: Optional[str],
        resource: str,
        resource_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        request: Optional[Request] = None
    ):
        client_ip = None
        request_id = None

        if request:
            client_ip = request.client.host if request.client else None
            request_id = getattr(request.state, "request_id", None)

        audit_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "action": action,
            "user_id": user_id,
            "resource": resource,
            "resource_id": resource_id,
            "client_ip": client_ip,
            "request_id": request_id,
            "details": details or {}
        }

        logger.info("audit_log", **audit_entry)

    def log_auth(self, user_id: str, action: str, success: bool, request: Request = None):
        self.log(
            action=f"auth:{action}",
            user_id=user_id if success else None,
            resource="authentication",
            details={"success": success},
            request=request
        )

    def log_data_access(self, user_id: str, resource: str, resource_id: str, action: str, request: Request = None):
        self.log(
            action=f"data:{action}",
            user_id=user_id,
            resource=resource,
            resource_id=resource_id,
            request=request
        )

    def log_consent(self, user_id: str, consent_type: str, granted: bool, request: Request = None):
        self.log(
            action="consent",
            user_id=user_id,
            resource="gdpr_consent",
            details={"consent_type": consent_type, "granted": granted},
            request=request
        )

    def log_data_export(self, user_id: str, request: Request = None):
        self.log(
            action="data_export",
            user_id=user_id,
            resource="user_data",
            request=request
        )

    def log_data_deletion(self, user_id: str, reason: Optional[str] = None, request: Request = None):
        self.log(
            action="data_deletion",
            user_id=user_id,
            resource="user_data",
            details={"reason": reason},
            request=request
        )


audit_logger = AuditLogger()
