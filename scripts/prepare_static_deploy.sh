#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DIST_DIR="$ROOT_DIR/frontend/dist"

if [[ ! -d "$DIST_DIR" ]]; then
  echo "dist 目錄不存在，請先執行建置。"
  exit 1
fi

copy_if_exists() {
  local source_path="$1"
  local target_path="$2"
  if [[ -e "$source_path" ]]; then
    mkdir -p "$(dirname "$target_path")"
    cp -R "$source_path" "$target_path"
  fi
}

copy_if_exists "$ROOT_DIR/CNAME" "$DIST_DIR/CNAME"
copy_if_exists "$ROOT_DIR/copy-tracking.html" "$DIST_DIR/copy-tracking.html"
copy_if_exists \
  "$ROOT_DIR/google6cb7aa3783369937.html" \
  "$DIST_DIR/google6cb7aa3783369937.html"

rm -rf "$DIST_DIR/icons"
copy_if_exists "$ROOT_DIR/icons" "$DIST_DIR/icons"
