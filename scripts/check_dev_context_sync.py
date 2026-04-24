#!/usr/bin/env python3
"""
檢查 DEV_CONTEXT 的摘要欄位是否與現況同步。

目前檢查：
1. `目前前端版號` 是否與 `.frontend-version` 一致
2. `最後更新` 是否與最近變更章節中的最新日期一致
"""

from __future__ import annotations

import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEV_CONTEXT_FILE = ROOT / "DEV_CONTEXT.md"
VERSION_FILE = ROOT / ".frontend-version"

LAST_UPDATED_PATTERN = re.compile(r"^最後更新：(\d{4}-\d{2}-\d{2})$", re.MULTILINE)
FRONTEND_VERSION_PATTERN = re.compile(
    r"^- 目前前端版號：`(\d+)`$", re.MULTILINE
)
SECTION_DATE_PATTERN = re.compile(r"^### (\d{4}-\d{2}-\d{2})$", re.MULTILINE)


def read_text(path: Path) -> str:
    if not path.exists():
        raise FileNotFoundError(f"找不到檔案：{path.relative_to(ROOT)}")
    return path.read_text(encoding="utf-8")


def main() -> int:
    try:
        dev_context_text = read_text(DEV_CONTEXT_FILE)
        frontend_version = read_text(VERSION_FILE).strip()
    except FileNotFoundError as exc:
        print(f"[check-dev-context-sync] 錯誤: {exc}", file=sys.stderr)
        return 1

    errors: list[str] = []

    version_match = FRONTEND_VERSION_PATTERN.search(dev_context_text)
    if not version_match:
        errors.append("DEV_CONTEXT.md 找不到 `目前前端版號` 欄位")
    elif version_match.group(1) != frontend_version:
        errors.append(
            "DEV_CONTEXT.md 的前端版號不同步："
            f"目前為 {version_match.group(1)}，預期 {frontend_version}"
        )

    last_updated_match = LAST_UPDATED_PATTERN.search(dev_context_text)
    if not last_updated_match:
        errors.append("DEV_CONTEXT.md 找不到 `最後更新` 欄位")
    else:
        section_dates = SECTION_DATE_PATTERN.findall(dev_context_text)
        if section_dates:
            latest_section_date = max(section_dates)
            if last_updated_match.group(1) != latest_section_date:
                errors.append(
                    "DEV_CONTEXT.md 的 `最後更新` 未對齊最近變更章節："
                    f"目前為 {last_updated_match.group(1)}，預期 {latest_section_date}"
                )

    if errors:
        print("[check-dev-context-sync] 檢查失敗", file=sys.stderr)
        for item in errors:
            print(f"  - {item}", file=sys.stderr)
        return 1

    print(
        "[check-dev-context-sync] 檢查通過，"
        f"版本={frontend_version}，最後更新={last_updated_match.group(1)}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
