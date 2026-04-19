#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT_REF="avnvsjyyeofivgmrchte"
PROFILE="${SUPABASE_PROFILE:-supabase}"
SUPABASE_ARGS=(--workdir "$ROOT_DIR")

if [[ -f "$ROOT_DIR/.env.supabase.local" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env.supabase.local"
  set +a
fi

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  SUPABASE_ARGS+=(--profile "$PROFILE")
fi

exec supabase \
  "${SUPABASE_ARGS[@]}" \
  functions deploy coffee-api \
  --project-ref "$PROJECT_REF" \
  --no-verify-jwt \
  "$@"
