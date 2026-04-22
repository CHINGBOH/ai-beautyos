#!/bin/bash

set -e

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="${DB_NAME:-medical_crm}"
DB_HOST="${DB_HOST:-localhost}"
DB_USER="${DB_USER:-postgres}"

mkdir -p "$BACKUP_DIR"

echo "Starting backup at $TIMESTAMP"

if command -v pg_dump &> /dev/null; then
    pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -F c -b -v -f "$BACKUP_DIR/db_backup_$TIMESTAMP.dump"
    echo "Database backup created: db_backup_$TIMESTAMP.dump"
fi

if command -v redis-cli &> /dev/null; then
    redis-cli SAVE
    if [ -f dump.rdb ]; then
        cp dump.rdb "$BACKUP_DIR/redis_backup_$TIMESTAMP.rdb"
        echo "Redis backup created: redis_backup_$TIMESTAMP.rdb"
    fi
fi

find "$BACKUP_DIR" -type f -mtime +90 -delete
echo "Old backups (>90 days) cleaned up"

echo "Backup completed successfully"
