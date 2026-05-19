#!/usr/bin/env bash
# AI BeautyOS — Postgres backup script.
#
# Produces a compressed pg_dump of the beautyos database. Designed to be run
# from the host against the docker-compose `postgres` service, or from cron.
#
# Usage:
#   ./scripts/db-backup.sh            # writes ./backups/beautyos-<ts>.dump
#   BACKUP_DIR=/var/backups ./scripts/db-backup.sh
#   KEEP=14 ./scripts/db-backup.sh    # rotate, keep last 14 dumps
#
# Restore:
#   docker compose exec -T postgres pg_restore -U beautyos -d beautyos \
#     --clean --if-exists < ./backups/beautyos-<ts>.dump

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-${ROOT_DIR}/backups}"
KEEP="${KEEP:-7}"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="${BACKUP_DIR}/beautyos-${TS}.dump"

mkdir -p "${BACKUP_DIR}"

echo "[db-backup] dumping beautyos -> ${OUT}"

# -Fc = custom format (compressed, supports parallel restore)
# --no-owner so dump can restore into a different role
docker compose -f "${ROOT_DIR}/docker-compose.yml" exec -T postgres \
  pg_dump -U beautyos -d beautyos -Fc --no-owner > "${OUT}"

SIZE=$(du -h "${OUT}" | cut -f1)
echo "[db-backup] done: ${OUT} (${SIZE})"

# Rotate: keep the newest ${KEEP} dumps.
if [[ "${KEEP}" -gt 0 ]]; then
  KEEP_PLUS_ONE=$((KEEP + 1))
  REMOVED=$(ls -1t "${BACKUP_DIR}"/beautyos-*.dump 2>/dev/null \
    | tail -n +${KEEP_PLUS_ONE} \
    | tee >(xargs -r rm -f) | wc -l)
  if [[ "${REMOVED}" -gt 0 ]]; then
    echo "[db-backup] rotated: removed ${REMOVED} old dump(s), keeping latest ${KEEP}"
  fi
fi
