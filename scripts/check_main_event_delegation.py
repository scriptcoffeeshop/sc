#!/usr/bin/env python3
"""
Guardrails for storefront event delegation.

Checks:
1) No inline event attributes in main storefront files.
2) Every data-action has a corresponding actionHandlers key in main-app.js.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MAIN_HTML = ROOT / "main.html"
MAIN_APP = ROOT / "js" / "main-app.js"
DELIVERY_JS = ROOT / "js" / "delivery.js"
TARGETS = [MAIN_HTML, MAIN_APP, DELIVERY_JS]

INLINE_EVENT_RE = re.compile(r"\bon(?:click|change|keyup|keydown|submit|input)\s*=")
LEGACY_ONCLICK_SELECTOR_RE = re.compile(r"\[onclick\*")
DATA_ACTION_RE = re.compile(r'data-action\s*=\s*"([^"]+)"')
HANDLERS_BLOCK_RE = re.compile(r"const\s+actionHandlers\s*=\s*\{(?P<body>[\s\S]*?)\n\};")
HANDLER_KEY_RE = re.compile(r"'([^']+)'\s*:")


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
    html_text = read_text(MAIN_HTML)
    app_text = read_text(MAIN_APP)
    actions = set(DATA_ACTION_RE.findall(html_text)) | set(DATA_ACTION_RE.findall(app_text))

    block = HANDLERS_BLOCK_RE.search(app_text)
    if not block:
        return ["Cannot find actionHandlers block in js/main-app.js"]

    handler_keys = set(HANDLER_KEY_RE.findall(block.group("body")))
    missing = sorted(action for action in actions if action not in handler_keys)
    return [f"Missing actionHandlers key: {action}" for action in missing]


def check_legacy_onclick_selector() -> list[str]:
    errors: list[str] = []
    for path in [MAIN_APP, DELIVERY_JS]:
        text = read_text(path)
        for match in LEGACY_ONCLICK_SELECTOR_RE.finditer(text):
            line = text.count("\n", 0, match.start()) + 1
            errors.append(f"{path.relative_to(ROOT)}:{line} legacy [onclick*] selector is not allowed")
    return errors


def main() -> int:
    errors: list[str] = []

    try:
        errors.extend(check_inline_events())
        errors.extend(check_action_coverage())
        errors.extend(check_legacy_onclick_selector())
    except FileNotFoundError as exc:
        print(f"[check-main-events] ERROR: {exc}", file=sys.stderr)
        return 1

    if errors:
        print("[check-main-events] FAILED", file=sys.stderr)
        for err in errors:
            print(f"  - {err}", file=sys.stderr)
        return 1

    print("[check-main-events] OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
