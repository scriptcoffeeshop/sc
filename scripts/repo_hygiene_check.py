#!/usr/bin/env python3
"""檢查 repo 衛生規則，避免敏感檔與工具暫存檔被追蹤。"""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path, PurePosixPath


BLOCKED_PREFIXES = (
    "supabase/.temp/",
)

BLOCKED_LEGACY_JS_PREFIXES = (
    "js/",
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

ALLOWED_FRONTEND_SOURCE_JS: set[str] = set()

ALLOWED_TRACKED_JS: set[str] = set()

SOURCE_SUFFIXES = (
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".vue",
)

TEST_SOURCE_SUFFIXES = (
    ".test.ts",
    ".test.tsx",
    ".spec.ts",
    ".spec.tsx",
)

ALLOWED_DIRECT_JSON_PARSE = {
    "frontend/src/lib/jsonUtils.ts",
    "supabase/functions/coffee-api/utils/json.ts",
}

DANGEROUS_GIT_ADD_DOT_PATTERN = re.compile(
    r"(?:\bgit\s+add\s+\.|[\"']git[\"']\s*,\s*[\"']add[\"']\s*,\s*[\"']\.[\"'])"
)

TYPE_ESCAPE_PATTERNS = (
    ("@ts-ignore", "@ts-ignore"),
    ("@ts-expect-error", "@ts-expect-error"),
    ("eslint-disable", "eslint-disable"),
    ("as any", "as any"),
)

FRONTEND_OVERBROAD_TYPE_PATTERNS = (
    ("Record<string, unknown>", "Record<string, unknown>"),
)


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


def find_type_escape_violations(path: str) -> list[str]:
    if not is_production_source_file(path):
        return []

    lines, error = read_source_lines(path)
    if error:
        return [error]

    violations: list[str] = []
    for line_no, line in enumerate(lines, start=1):
        for token, label in TYPE_ESCAPE_PATTERNS:
            if token in line:
                violations.append(
                    f"禁止在 production source 使用 {label}：{path}:{line_no}"
                )
    return violations


def find_frontend_overbroad_type_violations(path: str) -> list[str]:
    if not path.startswith("frontend/src/") or not is_runtime_source_file(path):
        return []

    lines, error = read_source_lines(path)
    if error:
        return [error]

    violations: list[str] = []
    for line_no, line in enumerate(lines, start=1):
        for token, label in FRONTEND_OVERBROAD_TYPE_PATTERNS:
            if token in line:
                violations.append(
                    "禁止在 frontend runtime 使用過寬型別 "
                    f"{label}，請改用命名介面或具體 payload 型別：{path}:{line_no}"
                )
    return violations


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


def is_frontend_source_js(path: str) -> bool:
    return path.startswith("frontend/src/") and path.endswith(".js")


def find_frontend_js_violations(path: str) -> list[str]:
    if not is_frontend_source_js(path):
        return []
    if not Path(path).exists():
        return []
    if path in ALLOWED_FRONTEND_SOURCE_JS:
        return []
    return [
        "禁止新增 frontend/src JS，請改用 TypeScript；"
        f"若是 vendor/data 邊界，需加入 allowlist：{path}"
    ]


def find_tracked_js_violations(path: str) -> list[str]:
    if not path.endswith(".js"):
        return []
    if path in ALLOWED_TRACKED_JS:
        return []
    return [
        "禁止追蹤 .js 檔；前端/測試請用 .ts 或 .vue，"
        f"工具設定請用 .cjs 或 .mjs：{path}"
    ]


def find_script_git_add_dot_violations(path: str) -> list[str]:
    if not path.startswith("scripts/") or not path.endswith((".py", ".sh")):
        return []

    lines, error = read_source_lines(path)
    if error:
        return [error]

    return [
        "禁止 scripts 使用全倉暫存指令，請明確列出要 stage 的路徑，"
        f"避免自動化誤提交無關變更：{path}:{line_no}"
        for line_no, line in enumerate(lines, start=1)
        if DANGEROUS_GIT_ADD_DOT_PATTERN.search(line)
    ]


def main() -> int:
    tracked_files = git_ls_files()
    violations: list[str] = []

    for raw_path in tracked_files:
        path = PurePosixPath(raw_path).as_posix()

        if path.startswith(BLOCKED_PREFIXES):
            violations.append(f"禁止追蹤 Supabase CLI 暫存檔：{path}")
            continue

        if path.startswith(BLOCKED_LEGACY_JS_PREFIXES):
            if Path(path).exists():
                violations.append(
                    f"禁止追蹤 legacy js 相容殼，請改由 frontend/src Vue/TS 入口管理：{path}"
                )
            continue

        if is_disallowed_env_file(path):
            violations.append(f"禁止追蹤敏感 env 檔案：{path}")

        violations.extend(find_tracked_js_violations(path))
        violations.extend(find_type_escape_violations(path))
        violations.extend(find_frontend_overbroad_type_violations(path))
        violations.extend(find_frontend_js_violations(path))
        violations.extend(find_runtime_parse_violations(path))
        violations.extend(find_anonymous_catch_violations(path))
        violations.extend(find_script_git_add_dot_violations(path))

    if violations:
        print("[repo-hygiene] 發現違規檔案：", file=sys.stderr)
        for item in violations:
            print(f"  - {item}", file=sys.stderr)
        return 1

    print("[repo-hygiene] OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
