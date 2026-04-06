#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PROFILE="${SUPABASE_PROFILE:-supabase}"

if [[ -n "${SUPABASE_DB_PASSWORD:-}" ]]; then
  exec supabase \
    --workdir "$ROOT_DIR" \
    --profile "$PROFILE" \
    db push --linked -p "$SUPABASE_DB_PASSWORD" \
    "$@"
fi

exec supabase \
  --workdir "$ROOT_DIR" \
  --profile "$PROFILE" \
  db push --linked \
  "$@"
