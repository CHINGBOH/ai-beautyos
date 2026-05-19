#!/usr/bin/env bash
# Apply scripts/db-roles.sql with a strong password from $HERMES_DB_PASSWORD.
#
# Connects via the running `beautyos-postgres` container (no host port needed).
# Required: HERMES_DB_PASSWORD (>=16 chars, not a known placeholder).
# Optional: PG_CONTAINER (default: beautyos-postgres), PG_DB (default: beautyos),
#           PG_OWNER (default: beautyos).

set -euo pipefail

CONTAINER="${PG_CONTAINER:-beautyos-postgres}"
DB="${PG_DB:-beautyos}"
OWNER="${PG_OWNER:-beautyos}"

if [[ -z "${HERMES_DB_PASSWORD:-}" ]]; then
  echo "ERROR: HERMES_DB_PASSWORD env var is required." >&2
  echo "  example: HERMES_DB_PASSWORD=\$(openssl rand -base64 24) $0" >&2
  exit 64
fi

# Belt-and-braces — db-roles.sql also enforces this server-side.
if [[ ${#HERMES_DB_PASSWORD} -lt 16 ]]; then
  echo "ERROR: HERMES_DB_PASSWORD must be at least 16 characters." >&2
  exit 64
fi
case "$HERMES_DB_PASSWORD" in
  change-me|change_me|changeme|password|beautyos)
    echo "ERROR: HERMES_DB_PASSWORD is a known placeholder/weak value." >&2
    exit 64
    ;;
esac

if ! docker inspect "$CONTAINER" >/dev/null 2>&1; then
  echo "ERROR: container '$CONTAINER' not found. Is the stack up?" >&2
  exit 69
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "[apply-db-roles] running db-roles.sql against $CONTAINER ($DB as $OWNER)…"
docker exec -i \
  -e PGPASSWORD="$HERMES_DB_PASSWORD" \
  "$CONTAINER" \
  psql -U "$OWNER" -d "$DB" \
       -v ON_ERROR_STOP=1 \
       -v "hermes_password='$HERMES_DB_PASSWORD'" \
       < "$SCRIPT_DIR/db-roles.sql"

echo "[apply-db-roles] OK. Update Hermes adapter env (HERMES_DB_URL) with the new password."
