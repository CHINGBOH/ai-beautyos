#!/bin/bash

set -e

NAMESPACE="${NAMESPACE:-default}"
SERVICE_NAME="${SERVICE_NAME:-medical-crm-api}"
CURRENT_VERSION="${CURRENT_VERSION:-}"
NEW_VERSION="${NEW_VERSION:-}"
BLUE_GREEN_FILE="/tmp/blue_green_state"

usage() {
    echo "Usage: $0 [deploy|rollback|status] [options]"
    echo ""
    echo "Commands:"
    echo "  deploy    Deploy new version (blue-green)"
    echo "  rollback  Rollback to previous version"
    echo "  status    Show current deployment status"
    echo ""
    echo "Options:"
    echo "  -n, --namespace    Kubernetes namespace (default: default)"
    echo "  -s, --service      Service name (default: medical-crm-api)"
    echo "  -v, --version      New version to deploy"
    echo "  -r, --release      Release name (for rollback)"
    echo "  -w, --wait         Wait for rollout (default: 300s)"
    echo "  -h, --help         Show this help"
    exit 1
}

check_prerequisites() {
    command -v kubectl >/dev/null 2>&1 || { echo "kubectl is required but not installed."; exit 1; }
    command -v helm >/dev/null 2>&1 || { echo "helm is required but not installed."; exit 1; }
}

health_check() {
    local endpoint="$1"
    local timeout="${2:-60}"
    local start_time=$(date +%s)

    echo "Waiting for health check on $endpoint..."

    while true; do
        local current_time=$(date +%s)
        local elapsed=$((current_time - start_time))

        if [ $elapsed -gt $timeout ]; then
            echo "Health check timeout after ${timeout}s"
            return 1
        fi

        if curl -sf "$endpoint/health/ready" > /dev/null 2>&1; then
            echo "Health check passed!"
            return 0
        fi

        echo "Waiting... (${elapsed}s/${timeout}s)"
        sleep 5
    done
}

deploy_blue_green() {
    if [ -z "$NEW_VERSION" ]; then
        echo "Error: --version is required for deploy"
        exit 1
    fi

    echo "Starting blue-green deployment..."
    echo "Current version: ${CURRENT_VERSION:-none}"
    echo "New version: $NEW_VERSION"

    kubectl set image deployment/"$SERVICE_NAME" \
        "$SERVICE_NAME"="$SERVICE_NAME:$NEW_VERSION" \
        -n "$NAMESPACE"

    echo "Waiting for rollout..."
    kubectl rollout status deployment/"$SERVICE_NAME" -n "$NAMESPACE" --timeout="${WAIT_TIMEOUT:-300s}"

    local blue_endpoint="http://$SERVICE_NAME-blue.$NAMESPACE.svc.cluster.local:8000"
    local green_endpoint="http://$SERVICE_NAME-green.$NAMESPACE.svc.cluster.local:8000"

    if health_check "$blue_endpoint" 120; then
        echo "Switching traffic to blue..."
        kubectl patch service/"$SERVICE_NAME" -n "$NAMESPACE" \
            -p '{"spec":{"selector":{"deployment":"'$SERVICE_NAME'-blue"}}}'
    fi

    echo "$NEW_VERSION:$(date +%s)" >> "$BLUE_GREEN_FILE"

    echo "Deployment completed successfully!"
    echo "New version $NEW_VERSION is now serving traffic."
}

rollback_blue_green() {
    local release="${RELEASE:-}"

    if [ -z "$release" ]; then
        if [ -f "$BLUE_GREEN_FILE" ]; then
            release=$(tail -n 1 "$BLUE_GREEN_FILE" | cut -d: -f1)
        else
            echo "Error: No release specified and no history found"
            exit 1
        fi
    fi

    echo "Rolling back to version: $release"

    kubectl rollout undo deployment/"$SERVICE_NAME" -n "$NAMESPACE"

    echo "Waiting for rollback..."
    kubectl rollout status deployment/"$SERVICE_NAME" -n "$NAMESPACE" --timeout="${WAIT_TIMEOUT:-300s}"

    echo "Rollback completed!"
}

show_status() {
    echo "=== Blue-Green Deployment Status ==="

    local blue_replicas=$(kubectl get deployment "$SERVICE_NAME-blue" -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "N/A")
    local green_replicas=$(kubectl get deployment "$SERVICE_NAME-green" -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "N/A")
    local current_replicas=$(kubectl get deployment "$SERVICE_NAME" -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "N/A")

    echo ""
    echo "Main deployment: $SERVICE_NAME"
    echo "  Ready replicas: ${current_replicas:-0}"
    echo ""
    echo "Blue environment: $SERVICE_NAME-blue"
    echo "  Ready replicas: ${blue_replicas:-0}"
    echo ""
    echo "Green environment: $SERVICE_NAME-green"
    echo "  Ready replicas: ${green_replicas:-0}"
    echo ""

    if [ -f "$BLUE_GREEN_FILE" ]; then
        echo "Deployment history:"
        tail -n 5 "$BLUE_GREEN_FILE" | while read -r line; do
            echo "  - $line"
        done
    fi
}

WAIT_TIMEOUT="300"
COMMAND=""

while [[ $# -gt 0 ]]; do
    case $1 in
        deploy|rollback|status)
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
            NEW_VERSION="$2"
            shift 2
            ;;
        -r|--release)
            RELEASE="$2"
            shift 2
            ;;
        -w|--wait)
            WAIT_TIMEOUT="$2"
            shift 2
            ;;
        -h|--help)
            usage
            ;;
        *)
            echo "Unknown option: $1"
            usage
            ;;
    esac
done

if [ -z "$COMMAND" ]; then
    usage
fi

check_prerequisites

case "$COMMAND" in
    deploy)
        deploy_blue_green
        ;;
    rollback)
        rollback_blue_green
        ;;
    status)
        show_status
        ;;
esac
