#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT_REF="avnvsjyyeofivgmrchte"
PROFILE="${SUPABASE_PROFILE:-supabase}"

if [[ -f "$ROOT_DIR/.env.supabase.local" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env.supabase.local"
  set +a
fi

exec supabase \
  --workdir "$ROOT_DIR" \
  --profile "$PROFILE" \
  functions deploy coffee-api \
  --project-ref "$PROJECT_REF" \
  --no-verify-jwt \
  "$@"
