#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v supabase >/dev/null 2>&1; then
  echo "Supabase CLI is required for integration tests." >&2
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "psql is required to seed the local Supabase database." >&2
  exit 1
fi

supabase start
supabase db reset --local

STATUS_ENV="$(supabase status -o env)"
API_URL="$(printf '%s\n' "$STATUS_ENV" | awk -F= '$1 == "API_URL" { print $2 }')"
DB_URL="$(printf '%s\n' "$STATUS_ENV" | awk -F= '$1 == "DB_URL" { print $2 }')"
SERVICE_ROLE_KEY="$(printf '%s\n' "$STATUS_ENV" | awk -F= '$1 == "SERVICE_ROLE_KEY" { print $2 }')"

API_URL="${API_URL:-http://127.0.0.1:54321}"
if [[ -z "${DB_URL:-}" || -z "${SERVICE_ROLE_KEY:-}" ]]; then
  echo "Unable to read DB_URL or SERVICE_ROLE_KEY from 'supabase status -o env'." >&2
  exit 1
fi

psql "$DB_URL" -v ON_ERROR_STOP=1 \
  -f supabase/functions/coffee-api/tests/integration/supabase_golden_path_seed.sql

ENV_FILE="$(mktemp)"
cat > "$ENV_FILE" <<EOF
SUPABASE_URL=$API_URL
SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY
JWT_SECRET=integration-test-secret
LINE_ADMIN_USER_ID=integration-admin
FRONTEND_URL=http://127.0.0.1:4173
ALLOWED_REDIRECT_ORIGINS=http://127.0.0.1:4173,http://localhost:4173
EOF

cleanup() {
  if [[ -n "${FUNCTIONS_PID:-}" ]]; then
    kill "$FUNCTIONS_PID" >/dev/null 2>&1 || true
  fi
  rm -f "$ENV_FILE"
}
trap cleanup EXIT

supabase functions serve coffee-api --env-file "$ENV_FILE" --no-verify-jwt >/tmp/coffee-api-integration.log 2>&1 &
FUNCTIONS_PID="$!"

for _ in {1..30}; do
  if curl -fsS "$API_URL/functions/v1/coffee-api?action=getProducts" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

cd supabase/functions/coffee-api
RUN_SUPABASE_INTEGRATION=1 \
COFFEE_API_INTEGRATION_URL="$API_URL/functions/v1/coffee-api" \
JWT_SECRET=integration-test-secret \
SUPABASE_URL="$API_URL" \
SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY" \
deno test --allow-env --allow-net --allow-read tests/integration/supabase_golden_path_test.ts
