#!/usr/bin/env python3
"""Push the current branch and watch the Backend CI workflow.

If CI fails on Deno formatting, this script can run `deno fmt` for the Edge
Function and commit that narrow fix. It refuses to auto-fix when the worktree
is already dirty so unrelated local work cannot be swept into the commit.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
import subprocess
import sys
import time
import urllib.error
import urllib.request

REPO_OWNER = "scriptcoffeeshop"
REPO_NAME = "sc"
WORKFLOW_NAME = "Backend CI"
ROOT_DIR = Path(__file__).resolve().parents[1]
API_DIR = ROOT_DIR / "supabase" / "functions" / "coffee-api"
API_REL_PATH = "supabase/functions/coffee-api"


def run_command(cmd: list[str], capture_output: bool = False, cwd: Path = ROOT_DIR):
    try:
        result = subprocess.run(
            cmd,
            check=True,
            capture_output=capture_output,
            text=True,
            cwd=cwd,
        )
        return result.stdout.strip() if capture_output else True
    except subprocess.CalledProcessError as error:
        if capture_output:
            return error.stdout.strip() if error.stdout else ""
        return False


def get_current_sha() -> str:
    return str(run_command(["git", "rev-parse", "HEAD"], capture_output=True))


def get_git_status(paths: list[str] | None = None) -> str:
    cmd = ["git", "status", "--porcelain"]
    if paths:
        cmd.extend(["--", *paths])
    return str(run_command(cmd, capture_output=True))


def api_request(url: str):
    req = urllib.request.Request(url)
    req.add_header("Accept", "application/vnd.github.v3+json")

    token = os.environ.get("GITHUB_TOKEN")
    if token:
        req.add_header("Authorization", f"Bearer {token}")

    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode())
    except urllib.error.HTTPError as error:
        print(f"[ci-watch] API error {error.code}: {error.read().decode()}")
        return None
    except Exception as error:
        print(f"[ci-watch] Request failed: {error}")
        return None


def find_run_for_sha(sha: str, max_retries: int = 5):
    url = (
        f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}"
        f"/actions/runs?head_sha={sha}&per_page=10"
    )

    for attempt in range(max_retries):
        data = api_request(url)
        if data and data.get("workflow_runs"):
            for run in data["workflow_runs"]:
                if run.get("name") == WORKFLOW_NAME:
                    return run

        print(
            "[ci-watch] Waiting for GitHub Actions to register run... "
            f"({attempt + 1}/{max_retries})"
        )
        time.sleep(5)

    return None


def get_failed_jobs(run_id: int) -> list[dict[str, object]]:
    url = (
        f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}"
        f"/actions/runs/{run_id}/jobs"
    )
    data = api_request(url)

    if not data or not data.get("jobs"):
        return []

    failed_jobs: list[dict[str, object]] = []
    for job in data["jobs"]:
        if job.get("conclusion") != "failure":
            continue
        failing_steps = [
            step["name"]
            for step in job.get("steps", [])
            if step.get("conclusion") == "failure"
        ]
        failed_jobs.append({
            "name": job["name"],
            "failing_steps": failing_steps,
        })

    return failed_jobs


def apply_auto_fix(failing_steps: list[str]) -> bool:
    needs_repush = False
    is_formatting_failure = (
        any("Verify formatting" in step for step in failing_steps)
        or any("deno fmt" in step for step in failing_steps)
    )

    if is_formatting_failure:
        dirty_status = get_git_status()
        if dirty_status:
            print("[ci-watch] Worktree has uncommitted changes; refusing auto-fix.")
            print(dirty_status)
            return False

        print("[ci-watch] Auto-fixing Deno formatting...")
        deno_install = os.environ.get("DENO_INSTALL")
        deno_cmd = (
            str(Path(deno_install) / "bin" / "deno")
            if deno_install
            else "deno"
        )

        if not run_command([deno_cmd, "fmt", "."], cwd=API_DIR):
            print("[ci-watch] Deno formatting failed; manual intervention required.")
            return False

        status = get_git_status([API_REL_PATH])
        if status:
            print("[ci-watch] Committing formatting fixes...")
            run_command(["git", "add", API_REL_PATH])
            run_command([
                "git",
                "commit",
                "-m",
                "chore(ci): auto-fix deno formatting",
            ])
            needs_repush = True
        else:
            print("[ci-watch] Formatting tool ran but no files changed.")

    if any("Linting" in step for step in failing_steps):
        print("[ci-watch] CI failed on linting. Manual intervention required.")

    if any("Type Check" in step for step in failing_steps):
        print("[ci-watch] CI failed on type checking. Manual intervention required.")

    return needs_repush


def main() -> int:
    if "--skip-push" not in sys.argv[1:]:
        print("[ci-watch] Pushing to remote...")
        if not run_command(["git", "push"]):
            print("[ci-watch] Git push failed. Aborting.")
            return 1

    sha = get_current_sha()
    print(f"[ci-watch] Tracking commit: {sha[:7]}")
    time.sleep(3)

    run = find_run_for_sha(sha)
    if not run:
        print("[ci-watch] Could not find a GitHub Actions run for this commit.")
        return 1

    run_id = int(run["id"])
    print(f"[ci-watch] Found workflow run: {run_id}")
    print(f"[ci-watch] URL: {run['html_url']}")

    status = run.get("status")
    conclusion = run.get("conclusion")
    while status != "completed":
        print(f"[ci-watch] Waiting for CI to finish... (status: {status})")
        time.sleep(10)

        run = api_request(
            f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}"
            f"/actions/runs/{run_id}"
        )
        if not run:
            print("[ci-watch] Failed to fetch run status.")
            return 1

        status = run.get("status")
        conclusion = run.get("conclusion")

    print(f"\n[ci-watch] Complete. Conclusion: {conclusion}")

    if conclusion == "success":
        print("[ci-watch] CI passed successfully.")
        return 0

    if conclusion != "failure":
        print(f"[ci-watch] Unknown conclusion: {conclusion}")
        return 1

    print("[ci-watch] CI failed. Analyzing jobs...")
    failed_jobs = get_failed_jobs(run_id)

    all_failing_steps: list[str] = []
    for job in failed_jobs:
        failing_steps = job.get("failing_steps", [])
        step_text = ", ".join(str(step) for step in failing_steps)
        print(f"  - Job '{job['name']}' failed at step: {step_text}")
        all_failing_steps.extend(str(step) for step in failing_steps)

    if not apply_auto_fix(all_failing_steps):
        print("[ci-watch] Could not auto-fix. Manual intervention required.")
        return 1

    print("[ci-watch] Pushing auto-fixed code and monitoring new run...")
    if not run_command(["git", "push"]):
        print("[ci-watch] Auto-fixed push failed.")
        return 1

    new_sha = get_current_sha()
    print(f"\n[ci-watch] Restarting monitor for new commit: {new_sha[:7]}...")

    next_args = [arg for arg in sys.argv if arg != "--skip-push"]
    next_args.append("--skip-push")
    os.execv(sys.executable, [sys.executable, *next_args])
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
