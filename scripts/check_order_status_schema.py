#!/usr/bin/env python3
"""檢查訂單狀態白名單是否和 schema_full.sql 的 CHECK 約束一致。"""

from __future__ import annotations

import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / "supabase" / "functions" / "coffee-api" / "utils" / "config.ts"
SCHEMA_PATH = ROOT / "supabase" / "schema_full.sql"


def extract_statuses_from_config() -> list[str]:
    text = CONFIG_PATH.read_text(encoding="utf-8")
    match = re.search(
        r"VALID_ORDER_STATUSES\s*=\s*\[(.*?)\];",
        text,
        re.DOTALL,
    )
    if not match:
        raise ValueError(f"找不到 VALID_ORDER_STATUSES：{CONFIG_PATH}")
    return re.findall(r'"([^"]+)"', match.group(1))


def extract_statuses_from_schema() -> list[str]:
    text = SCHEMA_PATH.read_text(encoding="utf-8")
    match = re.search(
        r"status\s+TEXT\s+DEFAULT\s+'pending'\s+CHECK\s*"
        r"\(\s*status\s+IN\s*\((.*?)\)\s*\)",
        text,
        re.DOTALL,
    )
    if not match:
        raise ValueError(f"找不到 coffee_orders.status CHECK 約束：{SCHEMA_PATH}")
    return re.findall(r"'([^']+)'", match.group(1))


def main() -> int:
    try:
        config_statuses = extract_statuses_from_config()
        schema_statuses = extract_statuses_from_schema()
    except ValueError as error:
        print(f"[check-order-status-schema] ERROR: {error}", file=sys.stderr)
        return 1

    if config_statuses != schema_statuses:
        print("[check-order-status-schema] FAILED", file=sys.stderr)
        print(
            "  VALID_ORDER_STATUSES 與 schema_full.sql 的 coffee_orders.status CHECK 不一致。",
            file=sys.stderr,
        )
        print(f"  config: {', '.join(config_statuses)}", file=sys.stderr)
        print(f"  schema: {', '.join(schema_statuses)}", file=sys.stderr)
        return 1

    print("[check-order-status-schema] OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
