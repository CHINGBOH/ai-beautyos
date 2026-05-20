#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$repo_root"

web_url="${BEAUTYOS_WEB_URL:-http://127.0.0.1:3000/healthz}"

echo "== repository =="
echo "branch: $(git branch --show-current 2>/dev/null || echo unknown)"
echo "head: $(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
git status --short

echo
echo "== compose services =="
if command -v docker >/dev/null 2>&1; then
  docker compose ps
else
  echo "docker not installed"
fi

echo
echo "== health =="
if command -v curl >/dev/null 2>&1; then
  curl -fsS "$web_url" || true
  echo
else
  echo "curl not installed"
fi

echo
echo "== recent web logs =="
if command -v docker >/dev/null 2>&1; then
  docker compose logs --tail 80 web || true
fi
