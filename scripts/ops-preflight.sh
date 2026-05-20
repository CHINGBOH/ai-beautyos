#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$repo_root"

echo "== BeautyOS ops preflight =="
echo "repo: $repo_root"
echo "branch: $(git branch --show-current 2>/dev/null || echo unknown)"
echo "head: $(git rev-parse --short HEAD 2>/dev/null || echo unknown)"

echo
echo "== working tree =="
git status --short

echo
echo "== recent commits =="
git --no-pager log --oneline -5

echo
echo "== required deployment files =="
required_files=(
  "Dockerfile"
  "docker-compose.yml"
  ".github/workflows/docker-image.yml"
  "config/hermes-ops-profile.yaml"
  "config/hermes-app-profile.yaml"
  "config/policies/hermes/ops-deployer.yaml"
)
for file in "${required_files[@]}"; do
  if [[ -f "$file" ]]; then
    echo "ok $file"
  else
    echo "missing $file"
  fi
done

echo
echo "== compose syntax =="
if command -v docker >/dev/null 2>&1; then
  docker compose config --quiet
  echo "ok docker compose config"
else
  echo "skip: docker not installed"
fi

echo
echo "== github cli =="
if command -v gh >/dev/null 2>&1; then
  gh auth status -h github.com || true
  gh workflow list --limit 20 || true
else
  echo "skip: gh not installed"
fi
