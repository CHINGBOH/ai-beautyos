#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$repo_root"

branch="${BEAUTYOS_OPS_BRANCH:-main}"
dry_run="${BEAUTYOS_OPS_DRY_RUN:-0}"
allow="${BEAUTYOS_OPS_ALLOW_LOCAL_DEPLOY:-0}"
full_stack="${BEAUTYOS_OPS_FULL_STACK:-0}"

compose_files=(-f docker-compose.yml)
if [[ "$full_stack" == "1" ]]; then
  compose_files+=(-f docker-compose.full.yml)
fi

echo "== Local compose deploy =="
echo "repo: $repo_root"
echo "branch: $branch"
echo "full_stack: $full_stack"
echo "head_before: $(git rev-parse --short HEAD)"

commands=(
  "git fetch origin '$branch'"
  "git checkout '$branch'"
  "git pull --ff-only origin '$branch'"
  "GIT_COMMIT=\$(git rev-parse --short HEAD) docker compose ${compose_files[*]} up -d --build web tool-server"
  "docker compose ${compose_files[*]} ps"
)

if [[ "$dry_run" == "1" ]]; then
  if [[ -n "$(git status --short)" ]]; then
    echo "dry-run warning: working tree is currently dirty; actual deploy would refuse."
    git status --short
  fi
  echo "dry-run commands:"
  printf '%s\n' "${commands[@]}"
  exit 0
fi

if [[ -n "$(git status --short)" ]]; then
  echo "Refusing deploy: working tree is dirty." >&2
  git status --short >&2
  exit 1
fi

if [[ "$allow" != "1" ]]; then
  echo "Refusing deploy: set BEAUTYOS_OPS_ALLOW_LOCAL_DEPLOY=1 for confirmed production deploy." >&2
  printf 'planned command: %s\n' "${commands[@]}" >&2
  exit 1
fi

git fetch origin "$branch"
git checkout "$branch"
git pull --ff-only origin "$branch"

export GIT_COMMIT
GIT_COMMIT="$(git rev-parse --short HEAD)"
docker compose "${compose_files[@]}" up -d --build web tool-server
docker compose "${compose_files[@]}" ps

echo "head_after: $GIT_COMMIT"
