#!/usr/bin/env python3
"""檢查 Supabase migration 檔名格式，避免新舊規格繼續混用。"""

from __future__ import annotations

import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MIGRATIONS_DIR = ROOT / "supabase" / "migrations"
EXPECTED_RE = re.compile(r"^\d{12}_[a-z0-9_]+\.sql$")

# 既有 migration 可能已在遠端環境套用，不能再任意改名。
LEGACY_ALLOWLIST = {
    "20260228_enable_rls_for_public_data.sql",
    "20260308_order_idempotency.sql",
    "20260309_add_shipping_provider_and_tracking_url.sql",
    "20260310_add_tracking_and_idempotency.sql",
    "20260311_advanced_security_and_indexes.sql",
    "20260312_move_pg_trgm_to_extensions.sql",
    "20260313_allow_anon_read_linepay_sandbox.sql",
    "20260406185338_use_local_icons.sql",
}


def main() -> int:
    if not MIGRATIONS_DIR.exists():
        print(f"[check-migration-names] ERROR: 找不到目錄 {MIGRATIONS_DIR}", file=sys.stderr)
        return 1

    violations: list[str] = []
    for path in sorted(MIGRATIONS_DIR.glob("*.sql")):
        name = path.name
        if EXPECTED_RE.match(name):
            continue
        if name in LEGACY_ALLOWLIST:
            continue
        violations.append(name)

    if violations:
        print("[check-migration-names] FAILED", file=sys.stderr)
        print(
            "  新 migration 檔名必須使用 YYYYMMDDHHmm_slug.sql；既有歷史檔案不可再新增例外。",
            file=sys.stderr,
        )
        for name in violations:
            print(f"  - {name}", file=sys.stderr)
        return 1

    print("[check-migration-names] OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
