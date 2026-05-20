import sys
from datetime import datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from core.config import get_settings
from core.logging import get_logger

settings = get_settings()
logger = get_logger(__name__)


class DataRetentionPolicy:
    LOG_RETENTION_DAYS = 30
    CONVERSATION_RETENTION_DAYS = 90
    AUDIT_RETENTION_DAYS = 365
    BACKUP_RETENTION_DAYS = 90

    @staticmethod
    def should_delete_log(file_path: str) -> bool:
        try:
            mtime = datetime.fromtimestamp(Path(file_path).stat().st_mtime)
            return datetime.now() - mtime > timedelta(days=DataRetentionPolicy.LOG_RETENTION_DAYS)
        except OSError:
            return False

    @staticmethod
    def should_delete_conversation(created_at: datetime) -> bool:
        return datetime.now() - created_at > timedelta(days=DataRetentionPolicy.CONVERSATION_RETENTION_DAYS)

    @staticmethod
    def should_delete_audit(created_at: datetime) -> bool:
        return datetime.now() - created_at > timedelta(days=DataRetentionPolicy.AUDIT_RETENTION_DAYS)

    @staticmethod
    def cleanup_old_logs(log_dir: str = "logs"):
        deleted_count = 0
        try:
            log_path = Path(log_dir)
            if not log_path.exists():
                return 0

            for log_file in log_path.glob("*.log*"):
                if DataRetentionPolicy.should_delete_log(str(log_file)):
                    log_file.unlink()
                    deleted_count += 1
                    logger.info("log_file_deleted", file=str(log_file))

        except Exception as e:
            logger.error("log_cleanup_error", error=str(e))

        return deleted_count

    @staticmethod
    def get_retention_summary() -> dict:
        return {
            "log_retention_days": DataRetentionPolicy.LOG_RETENTION_DAYS,
            "conversation_retention_days": DataRetentionPolicy.CONVERSATION_RETENTION_DAYS,
            "audit_retention_days": DataRetentionPolicy.AUDIT_RETENTION_DAYS,
            "backup_retention_days": DataRetentionPolicy.BACKUP_RETENTION_DAYS
        }


if __name__ == "__main__":
    print("Data Retention Policy:")
    summary = DataRetentionPolicy.get_retention_summary()
    for key, value in summary.items():
        print(f"  {key}: {value} days")

    deleted = DataRetentionPolicy.cleanup_old_logs()
    print(f"\nCleaned up {deleted} old log files")
