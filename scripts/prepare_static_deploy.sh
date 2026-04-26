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

resolve_frontend_asset_version() {
  local version="${FRONTEND_ASSET_VERSION:-}"

  if [[ -z "$version" && -f "$ROOT_DIR/.frontend-version" ]]; then
    version="$(tr -d '[:space:]' < "$ROOT_DIR/.frontend-version")"
  fi

  if [[ -z "$version" ]]; then
    echo "找不到 FRONTEND_ASSET_VERSION，且 .frontend-version 不存在或為空。"
    exit 1
  fi

  if [[ ! "$version" =~ ^[A-Za-z0-9._-]+$ ]]; then
    echo "前端 asset 版本格式不合法：$version"
    exit 1
  fi

  printf '%s' "$version"
}

inject_frontend_asset_version() {
  local version="$1"
  python3 - "$DIST_DIR" "$version" <<'PY'
from pathlib import Path
import re
import sys

dist_dir = Path(sys.argv[1])
version = sys.argv[2]
html_files = sorted(dist_dir.glob("*.html"))

asset_ref_pattern = re.compile(
    r"""(\./assets/[^"'?#]+\.(?:js|css))(?:\?v=[A-Za-z0-9._-]+)?"""
)
hashed_asset_ref_pattern = re.compile(
    r"""\./assets/[^"'?#]*-[A-Za-z0-9_-]{6,}\.(?:js|css)"""
)

if not html_files:
    raise SystemExit("dist 目錄中找不到 HTML 入口檔，無法注入前端 asset 版本。")

for path in html_files:
    text = path.read_text(encoding="utf-8")
    updated_text, _ = asset_ref_pattern.subn(
        lambda match: match.group(1)
        if hashed_asset_ref_pattern.fullmatch(match.group(1))
        else f"{match.group(1)}?v={version}",
        text,
    )
    path.write_text(updated_text, encoding="utf-8")
PY
}

ASSET_VERSION="$(resolve_frontend_asset_version)"
inject_frontend_asset_version "$ASSET_VERSION"

copy_if_exists "$DIST_DIR/main.html" "$DIST_DIR/index.html"

write_legacy_dist_redirect() {
  local output_name="$1"
  local target_name="$2"
  local title="$3"
  local output_path="$DIST_DIR/frontend/dist/$output_name"
  local target_path="../../$target_name"

  mkdir -p "$(dirname "$output_path")"
  cat > "$output_path" <<HTML
<!doctype html>
<html lang="zh-TW">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>$title</title>
    <meta http-equiv="refresh" content="0; url=$target_path" />
    <script>
      window.location.replace(
        new URL("$target_path", window.location.href).toString(),
      );
    </script>
  </head>
  <body>
    <p>如果您沒有被自動重新導向，請點擊 <a href="$target_path">這裡</a>。</p>
  </body>
</html>
HTML
}

rm -rf "$DIST_DIR/frontend/dist"
write_legacy_dist_redirect "index.html" "main.html" "Script Coffee"
write_legacy_dist_redirect "main.html" "main.html" "Script Coffee"
write_legacy_dist_redirect "dashboard.html" "dashboard.html" "管理後台 | Script Coffee"
write_legacy_dist_redirect "policy.html" "policy.html" "服務條款與政策 | Script Coffee"
write_legacy_dist_redirect "copy-tracking.html" "copy-tracking.html" "複製物流單號 | Script Coffee"
