#!/usr/bin/env python3
"""
Guardrails for dashboard event delegation.

Checks:
1) No inline event attributes in dashboard files (onclick/onchange/...).
2) Every data-action used in dashboard templates has a corresponding handler.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DASHBOARD_HTML = ROOT / "dashboard.html"
DASHBOARD_APP = ROOT / "js" / "dashboard-app.js"
DASHBOARD_MODULES = list((ROOT / "js" / "dashboard" / "modules").glob("*.js"))
TARGETS = [DASHBOARD_HTML, DASHBOARD_APP] + DASHBOARD_MODULES

INLINE_EVENT_RE = re.compile(r"\bon(?:click|change|keyup|keydown|submit|input)\s*=")
DATA_ACTION_RE = re.compile(r'data-action\s*=\s*"([^"]+)"')
SWITCH_CASE_RE = re.compile(r'case ["\']([^"\']+)["\']')
CHANGE_HANDLER_RE = re.compile(r'target\.dataset\.action\s*!==\s*["\']([^"\']+)["\']')
OBJECT_KEY_RE = re.compile(r'["\']([-a-zA-Z0-9_]+)["\']\s*:')


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


def check_action_coverage() -> list[str]:
    actions = set()
    handled = set()

    for path in TARGETS:
        text = read_text(path)
        actions.update(DATA_ACTION_RE.findall(text))
        
        if path != DASHBOARD_HTML:
            handled.update(SWITCH_CASE_RE.findall(text))
            handled.update(CHANGE_HANDLER_RE.findall(text))
            handled.update(OBJECT_KEY_RE.findall(text))

    missing = sorted(action for action in actions if action not in handled)
    return [f"Missing data-action handler: {action}" for action in missing]


def main() -> int:
    errors: list[str] = []

    try:
        errors.extend(check_inline_events())
        errors.extend(check_action_coverage())
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
