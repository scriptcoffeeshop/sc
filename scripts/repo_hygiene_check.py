#!/usr/bin/env python3
"""檢查 repo 衛生規則，避免敏感檔與工具暫存檔被追蹤。"""

from __future__ import annotations

import subprocess
import sys
from pathlib import PurePosixPath


BLOCKED_PREFIXES = (
    "supabase/.temp/",
)

ALLOWED_ENV_SUFFIXES = (
    ".example",
    ".sample",
    ".template",
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

    if violations:
        print("[repo-hygiene] 發現違規檔案：", file=sys.stderr)
        for item in violations:
            print(f"  - {item}", file=sys.stderr)
        return 1

    print("[repo-hygiene] OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
