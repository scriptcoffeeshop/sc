#!/usr/bin/env python3
"""檢查 repo 衛生規則，避免敏感檔與工具暫存檔被追蹤。"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path, PurePosixPath


BLOCKED_PREFIXES = (
    "supabase/.temp/",
)

ALLOWED_ENV_SUFFIXES = (
    ".example",
    ".sample",
    ".template",
)

PRODUCTION_TS_IGNORE_PREFIXES = (
    "frontend/src/",
    "supabase/functions/coffee-api/",
)

ALLOWED_FRONTEND_SOURCE_JS = {
    "frontend/src/lib/taiwanCityData.js",
    "frontend/src/lib/twCitySelector.js",
}

SOURCE_SUFFIXES = (
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".vue",
)

TEST_SOURCE_SUFFIXES = (
    ".test.js",
    ".test.ts",
    ".test.tsx",
    ".spec.js",
    ".spec.ts",
    ".spec.tsx",
)

ALLOWED_DIRECT_JSON_PARSE = {
    "frontend/src/lib/jsonUtils.ts",
    "supabase/functions/coffee-api/utils/json.ts",
}


def git_ls_files() -> list[str]:
    result = subprocess.run(
        ["git", "ls-files", "-z"],
        check=True,
        capture_output=True,
        text=False,
    )
    return [
        path.decode("utf-8")
        for path in result.stdout.split(b"\0")
        if path
    ]


def is_disallowed_env_file(path: str) -> bool:
    name = PurePosixPath(path).name
    if not name.startswith(".env"):
        return False
    return not path.endswith(ALLOWED_ENV_SUFFIXES)


def is_production_source_file(path: str) -> bool:
    return path.startswith(PRODUCTION_TS_IGNORE_PREFIXES) and path.endswith(
        SOURCE_SUFFIXES
    )


def is_test_source_file(path: str) -> bool:
    return (
        "/tests/" in path
        or "/__tests__/" in path
        or path.endswith(TEST_SOURCE_SUFFIXES)
    )


def is_runtime_source_file(path: str) -> bool:
    return is_production_source_file(path) and not is_test_source_file(path)


def read_source_lines(path: str) -> tuple[list[str], str | None]:
    if not Path(path).exists():
        return [], None
    try:
        return Path(path).read_text(encoding="utf-8").splitlines(), None
    except UnicodeDecodeError:
        return [], f"無法以 UTF-8 讀取 production source：{path}"


def find_ts_ignore_violations(path: str) -> list[str]:
    if not is_production_source_file(path):
        return []

    lines, error = read_source_lines(path)
    if error:
        return [error]

    return [
        f"禁止在 production source 使用 @ts-ignore：{path}:{line_no}"
        for line_no, line in enumerate(lines, start=1)
        if "@ts-ignore" in line
    ]


def find_runtime_parse_violations(path: str) -> list[str]:
    if not is_runtime_source_file(path):
        return []
    if path in ALLOWED_DIRECT_JSON_PARSE:
        return []

    lines, error = read_source_lines(path)
    if error:
        return [error]

    return [
        "禁止在 production runtime 直接使用 JSON.parse，"
        f"請改用共用 json helper：{path}:{line_no}"
        for line_no, line in enumerate(lines, start=1)
        if "JSON.parse(" in line
    ]


def find_anonymous_catch_violations(path: str) -> list[str]:
    if not is_runtime_source_file(path):
        return []

    lines, error = read_source_lines(path)
    if error:
        return [error]

    return [
        f"禁止在 production runtime 使用匿名 catch {{}}：{path}:{line_no}"
        for line_no, line in enumerate(lines, start=1)
        if "catch {" in line
    ]


def is_frontend_production_js(path: str) -> bool:
    return (
        path.startswith("frontend/src/")
        and path.endswith(".js")
        and not path.endswith(".test.js")
    )


def find_frontend_js_violations(path: str) -> list[str]:
    if not is_frontend_production_js(path):
        return []
    if not Path(path).exists():
        return []
    if path in ALLOWED_FRONTEND_SOURCE_JS:
        return []
    return [
        "禁止新增 frontend/src production JS，請改用 TypeScript；"
        f"若是 vendor/data 邊界，需加入 allowlist：{path}"
    ]


def main() -> int:
    tracked_files = git_ls_files()
    violations: list[str] = []

    for raw_path in tracked_files:
        path = PurePosixPath(raw_path).as_posix()

        if path.startswith(BLOCKED_PREFIXES):
            violations.append(f"禁止追蹤 Supabase CLI 暫存檔：{path}")
            continue

        if is_disallowed_env_file(path):
            violations.append(f"禁止追蹤敏感 env 檔案：{path}")

        violations.extend(find_ts_ignore_violations(path))
        violations.extend(find_frontend_js_violations(path))
        violations.extend(find_runtime_parse_violations(path))
        violations.extend(find_anonymous_catch_violations(path))

    if violations:
        print("[repo-hygiene] 發現違規檔案：", file=sys.stderr)
        for item in violations:
            print(f"  - {item}", file=sys.stderr)
        return 1

    print("[repo-hygiene] OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
