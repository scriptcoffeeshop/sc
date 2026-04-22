#!/usr/bin/env bash
set -euo pipefail

if [ "${SKIP_E2E_BUILD:-0}" != "1" ]; then
  npm run build
fi

npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
