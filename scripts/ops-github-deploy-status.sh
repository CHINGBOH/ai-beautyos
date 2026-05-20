#!/usr/bin/env bash
set -euo pipefail

workflow="${BEAUTYOS_OPS_WORKFLOW:-docker-image.yml}"
branch="${BEAUTYOS_OPS_BRANCH:-main}"
limit="${BEAUTYOS_OPS_LIMIT:-10}"

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI is required to inspect GitHub workflow runs" >&2
  exit 1
fi

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$repo_root"

echo "== GitHub workflow status =="
echo "workflow: $workflow"
echo "branch: $branch"

gh run list \
  --workflow "$workflow" \
  --branch "$branch" \
  --limit "$limit"
