#!/usr/bin/env bash
set -euo pipefail

workflow="${BEAUTYOS_OPS_WORKFLOW:-docker-image.yml}"
ref="${BEAUTYOS_OPS_REF:-main}"
dry_run="${BEAUTYOS_OPS_DRY_RUN:-0}"

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI is required to trigger GitHub workflow runs" >&2
  exit 1
fi

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$repo_root"

echo "== Trigger image build workflow =="
echo "workflow: $workflow"
echo "ref: $ref"

if [[ "$dry_run" == "1" ]]; then
  echo "dry-run command:"
  echo "gh workflow run '$workflow' --ref '$ref'"
  exit 0
fi

gh workflow run "$workflow" --ref "$ref"

echo
echo "latest runs:"
gh run list --workflow "$workflow" --branch "$ref" --limit 5
