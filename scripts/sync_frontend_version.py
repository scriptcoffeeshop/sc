#!/usr/bin/env python3
"""
同步根目錄相容入口中的 `?v=XX` 版本參數，避免手動漏改造成快取問題。

用法:
  python3 scripts/sync_frontend_version.py
  python3 scripts/sync_frontend_version.py 27
  python3 scripts/sync_frontend_version.py --check
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
VERSION_FILE = ROOT / ".frontend-version"
TARGETS: list[Path] = list(ROOT.glob("*.html"))

VERSION_PATTERN = re.compile(r"\?v=\d+")


def ensure_version(version: str) -> str:
    version = version.strip()
    if not re.fullmatch(r"\d+", version):
        raise ValueError(f"版本號必須為純數字，收到: {version!r}")
    return version


def read_version() -> str:
    if not VERSION_FILE.exists():
        raise FileNotFoundError(
            f"找不到版本檔: {VERSION_FILE}. 請先建立並填入數字版本。"
        )
    return ensure_version(VERSION_FILE.read_text(encoding="utf-8"))


def write_version(version: str) -> None:
    VERSION_FILE.write_text(f"{version}\n", encoding="utf-8")


def replace_versions(version: str) -> tuple[int, list[Path]]:
    changed_files: list[Path] = []
    changed_count = 0

    for path in TARGETS:
        text = path.read_text(encoding="utf-8")
        new_text, count = VERSION_PATTERN.subn(f"?v={version}", text)
        if count > 0 and new_text != text:
            path.write_text(new_text, encoding="utf-8")
            changed_files.append(path)
            changed_count += count

    return changed_count, changed_files


def check_versions(version: str) -> tuple[bool, list[str]]:
    errors: list[str] = []

    for path in TARGETS:
        text = path.read_text(encoding="utf-8")
        for match in VERSION_PATTERN.finditer(text):
            found = match.group(0).split("=")[1]
            if found != version:
                errors.append(f"{path.relative_to(ROOT)}: 發現 ?v={found}，預期 ?v={version}")

    return len(errors) == 0, errors


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("version", nargs="?", help="指定要同步的版本號（純數字）")
    parser.add_argument(
        "--check",
        action="store_true",
        help="僅檢查版本是否一致，不修改檔案",
    )
    args = parser.parse_args()

    try:
        if args.version:
            version = ensure_version(args.version)
            write_version(version)
        else:
            version = read_version()
    except (ValueError, FileNotFoundError) as e:
        print(f"[sync-frontend-version] 錯誤: {e}", file=sys.stderr)
        return 1

    if args.check:
        ok, errors = check_versions(version)
        if not ok:
            print("[sync-frontend-version] 檢查失敗：版本不一致", file=sys.stderr)
            for item in errors:
                print(f"  - {item}", file=sys.stderr)
            return 1
        print(f"[sync-frontend-version] 檢查通過，版本={version}")
        return 0

    changed_count, changed_files = replace_versions(version)
    print(f"[sync-frontend-version] 版本={version}，更新參照數={changed_count}")
    for path in changed_files:
        print(f"  - {path.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
