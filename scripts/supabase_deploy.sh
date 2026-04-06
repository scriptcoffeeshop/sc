#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT_REF="avnvsjyyeofivgmrchte"
PROFILE="${SUPABASE_PROFILE:-supabase}"

exec supabase \
  --workdir "$ROOT_DIR" \
  --profile "$PROFILE" \
  functions deploy coffee-api \
  --project-ref "$PROJECT_REF" \
  --no-verify-jwt \
  "$@"
