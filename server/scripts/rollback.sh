#!/bin/bash

set -e

NAMESPACE="${NAMESPACE:-default}"
SERVICE_NAME="${SERVICE_NAME:-medical-crm-api}"
DB_NAME="${DB_NAME:-medical_crm}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
MAX_RETAIN="${MAX_RETAIN:-5}"

rollback_usage() {
    echo "Usage: $0 [db|app|full] [version] [options]"
    echo ""
    echo "Commands:"
    echo "  db     Rollback database only"
    echo "  app    Rollback application only"
    echo "  full   Rollback both app and database"
    echo ""
    echo "Options:"
    echo "  -n, --namespace    Kubernetes namespace"
    echo "  -s, --service      Service name"
    echo "  -v, --version      Version to rollback to"
    echo "  -h, --help         Show this help"
    exit 1
}

check_prerequisites() {
    command -v kubectl >/dev/null 2>&1 || { echo "kubectl is required"; exit 1; }
}

rollback_app() {
    local version="${1:-}"

    if [ -z "$version" ]; then
        echo "Rolling back app to previous version..."
        kubectl rollout undo deployment/"$SERVICE_NAME" -n "$NAMESPACE"
    else
        echo "Rolling back app to version: $version"
        kubectl rollout undo deployment/"$SERVICE_NAME" -n "$NAMESPACE" --to-revision="$version"
    fi

    echo "Waiting for rollout..."
    kubectl rollout status deployment/"$SERVICE_NAME" -n "$NAMESPACE" --timeout=300s
    echo "App rollback completed!"
}

rollback_database() {
    local backup_file="${1:-}"

    if [ -z "$backup_file" ]; then
        backup_file=$(ls -t "$BACKUP_DIR"/db_backup_*.dump 2>/dev/null | head -n 1)
        if [ -z "$backup_file" ]; then
            echo "Error: No backup file specified and no backup found in $BACKUP_DIR"
            exit 1
        fi
    fi

    if [ ! -f "$backup_file" ]; then
        echo "Error: Backup file not found: $backup_file"
        exit 1
    fi

    echo "Rolling back database using: $backup_file"

    local db_pod=$(kubectl get pods -n "$NAMESPACE" -l app=postgres -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)

    if [ -z "$db_pod" ]; then
        echo "Error: Database pod not found"
        exit 1
    fi

    kubectl exec -n "$NAMESPACE" "$db_pod" -- pg_restore \
        --dbname="$DB_NAME" \
        --clean \
        --if-exists \
        --no-owner \
        --no-acl \
        -v \
        < "$backup_file"

    echo "Database rollback completed!"
}

cleanup_old_backups() {
    echo "Cleaning up old backups (keeping last $MAX_RETAIN)..."

    cd "$BACKUP_DIR" || exit 1

    ls -t db_backup_*.dump 2>/dev/null | tail -n +$((MAX_RETAIN + 1)) | xargs -r rm -f
    ls -t redis_backup_*.rdb 2>/dev/null | tail -n +$((MAX_RETAIN + 1)) | xargs -r rm -f

    echo "Cleanup completed!"
}

show_history() {
    echo "=== Rollback History ==="
    echo ""

    echo "Application revisions:"
    kubectl rollout history deployment/"$SERVICE_NAME" -n "$NAMESPACE" 2>/dev/null || echo "No history available"
    echo ""

    echo "Database backups:"
    if [ -d "$BACKUP_DIR" ]; then
        ls -lh "$BACKUP_DIR"/db_backup_*.dump 2>/dev/null || echo "No backups found"
    else
        echo "Backup directory not found: $BACKUP_DIR"
    fi
}

COMMAND=""
VERSION=""
NAMESPACE="default"
SERVICE_NAME="medical-crm-api"

while [[ $# -gt 0 ]]; do
    case $1 in
        db|app|full)
            COMMAND="$1"
            shift
            ;;
        -n|--namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        -s|--service)
            SERVICE_NAME="$2"
            shift 2
            ;;
        -v|--version)
            VERSION="$2"
            shift 2
            ;;
        -h|--help)
            rollback_usage
            ;;
        *)
            echo "Unknown option: $1"
            rollback_usage
            ;;
    esac
done

if [ -z "$COMMAND" ]; then
    rollback_usage
fi

check_prerequisites

case "$COMMAND" in
    db)
        rollback_database "$VERSION"
        ;;
    app)
        rollback_app "$VERSION"
        ;;
    full)
        rollback_app "$VERSION"
        rollback_database "$VERSION"
        ;;
esac

echo ""
echo "Rollback operations completed successfully!"
