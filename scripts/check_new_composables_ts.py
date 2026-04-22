#!/usr/bin/env python3
"""阻擋新增 JS composable，逐步把 feature state 收斂到 TypeScript。"""

from __future__ import annotations

import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FEATURES_DIR = ROOT / "frontend" / "src" / "features"
LEGACY_JS_COMPOSABLE_ALLOWLIST = {
    "frontend/src/features/dashboard/useDashboardBankAccounts.js",
    "frontend/src/features/dashboard/useDashboardCategories.js",
    "frontend/src/features/dashboard/useDashboardProducts.js",
    "frontend/src/features/dashboard/useDashboardPromotions.js",
    "frontend/src/features/dashboard/useDashboardSettingsIcons.js",
    "frontend/src/features/dashboard/useDashboardUsers.js",
}


def main() -> int:
    if not FEATURES_DIR.exists():
        print(
            f"[check-new-composables-ts] ERROR: 找不到目錄 {FEATURES_DIR}",
            file=sys.stderr,
        )
        return 1

    violations: list[str] = []
    for path in sorted(FEATURES_DIR.rglob("use*.js")):
        if path.name.endswith(".test.js"):
            continue

        relative_path = path.relative_to(ROOT).as_posix()
        if relative_path in LEGACY_JS_COMPOSABLE_ALLOWLIST:
            continue

        violations.append(relative_path)

    if violations:
        print("[check-new-composables-ts] FAILED", file=sys.stderr)
        print(
            "  新 composable 請改用 .ts；既有 JS composable 只允許沿用 allowlist。",
            file=sys.stderr,
        )
        for path in violations:
            print(f"  - {path}", file=sys.stderr)
        return 1

    print("[check-new-composables-ts] OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
