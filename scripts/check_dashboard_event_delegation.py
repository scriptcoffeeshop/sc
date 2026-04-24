#!/usr/bin/env python3
"""
Guardrails for dashboard event delegation.

Checks:
1) No inline event attributes in Vue dashboard runtime files.
2) No legacy data-action attributes in Vue dashboard runtime files.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DASHBOARD_FEATURE_PATH = ROOT / "frontend" / "src" / "features" / "dashboard"
TARGETS = [
    path for path in [
        ROOT / "frontend" / "src" / "pages" / "DashboardPage.vue",
        *DASHBOARD_FEATURE_PATH.glob("*.vue"),
        *DASHBOARD_FEATURE_PATH.glob("*.ts"),
    ]
    if path.exists() and not path.name.endswith(".test.ts")
]

INLINE_EVENT_RE = re.compile(r"\bon[a-z]+=")
DATA_ACTION_RE = re.compile(r'data-action\s*=\s*"([^"]+)"')


def read_text(path: Path) -> str:
    if not path.exists():
        raise FileNotFoundError(f"Missing required file: {path}")
    return path.read_text(encoding="utf-8")


def check_inline_events() -> list[str]:
    errors: list[str] = []
    for path in TARGETS:
        text = read_text(path)
        for match in INLINE_EVENT_RE.finditer(text):
            line = text.count("\n", 0, match.start()) + 1
            errors.append(f"{path.relative_to(ROOT)}:{line} inline event attribute is not allowed")
    return errors


def check_no_data_actions() -> list[str]:
    errors: list[str] = []
    for path in TARGETS:
        text = read_text(path)
        for match in DATA_ACTION_RE.finditer(text):
            line = text.count("\n", 0, match.start()) + 1
            action = match.group(1)
            errors.append(
                f"{path.relative_to(ROOT)}:{line} legacy data-action is not allowed in Vue dashboard runtime: {action}"
            )
    return errors


def main() -> int:
    errors: list[str] = []

    try:
        errors.extend(check_inline_events())
        errors.extend(check_no_data_actions())
    except FileNotFoundError as exc:
        print(f"[check-dashboard-events] ERROR: {exc}", file=sys.stderr)
        return 1

    if errors:
        print("[check-dashboard-events] FAILED", file=sys.stderr)
        for err in errors:
            print(f"  - {err}", file=sys.stderr)
        return 1

    print("[check-dashboard-events] OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
