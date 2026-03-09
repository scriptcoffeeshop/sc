#!/usr/bin/env python3
"""
 CI Auto-fix watcher script
 This script pushes code to GitHub and then polls the GitHub Actions API
 to check the status of the resulting CI run. If it fails due to formatting,
 it will run the local auto-fixer (`deno fmt`) and push again.
"""

import subprocess
import sys
import json
import time
import os
import urllib.request
import urllib.error

REPO_OWNER = "scriptcoffeeshop"
REPO_NAME = "sc"

def run_command(cmd, capture_output=False, shell=False):
    try:
        if capture_output:
            result = subprocess.run(cmd, shell=shell, check=True, capture_output=True, text=True)
            return result.stdout.strip()
        else:
            subprocess.run(cmd, shell=shell, check=True)
            return True
    except subprocess.CalledProcessError as e:
        if capture_output:
            return e.stdout.strip() if e.stdout else ""
        return False

def get_current_sha():
    return run_command(["git", "rev-parse", "HEAD"], capture_output=True)

def api_request(url):
    req = urllib.request.Request(url)
    req.add_header("Accept", "application/vnd.github.v3+json")
    
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
        
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        print(f"API Error {e.code}: {e.read().decode()}")
        return None
    except Exception as e:
        print(f"Request failed: {e}")
        return None

def find_run_for_sha(sha, max_retries=5):
    url = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/actions/runs?head_sha={sha}&per_page=1"
    
    for i in range(max_retries):
        data = api_request(url)
        if data and data.get("workflow_runs") and len(data["workflow_runs"]) > 0:
            return data["workflow_runs"][0]
        
        print(f"Waiting for GitHub Actions to register run... ({i+1}/{max_retries})")
        time.sleep(5)
        
    return None

def get_failed_jobs(run_id):
    url = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/actions/runs/{run_id}/jobs"
    data = api_request(url)
    
    if not data or not data.get("jobs"):
        return []
        
    failed_jobs = []
    for job in data["jobs"]:
        if job.get("conclusion") == "failure":
            # Find the specific failing step
            failing_steps = [s["name"] for s in job.get("steps", []) if s.get("conclusion") == "failure"]
            failed_jobs.append({
                "name": job["name"],
                "failing_steps": failing_steps
            })
            
    return failed_jobs

def apply_auto_fix(failing_steps):
    needs_repush = False
    
    if any("Verify formatting" in step for step in failing_steps) or any("deno fmt" in step for step in failing_steps):
        print("🔧 Auto-fixing Deno formatting...")
        # Execute the fix
        root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        api_dir = os.path.join(root_dir, "supabase", "functions", "coffee-api")
        
        # Determine deno path if set
        deno_install = os.environ.get("DENO_INSTALL")
        deno_cmd = os.path.join(deno_install, "bin", "deno") if deno_install else "deno"
        
        success = run_command([deno_cmd, "fmt", "."], shell=False, capture_output=False)
        # We need to run inside the api dir, or pass it as target
        if not success:
             # Try running inside the dir manually if previous failed
             subprocess.run([deno_cmd, "fmt", "."], cwd=api_dir)
             
        # Check if files changed
        status = run_command(["git", "status", "--porcelain"], capture_output=True)
        if status:
            print("📝 Committing auto-fixes...")
            run_command(["git", "add", "."])
            run_command(["git", "commit", "-m", "chore(ci): auto-fix deno formatting"])
            needs_repush = True
        else:
            print("⚠️ Formatting tool ran but no files were changed in git.")
            
    if any("Linting" in step for step in failing_steps):
        print("⚠️ CI failed on Linting. This requires manual intervention.")
        
    if any("Type Check" in step for step in failing_steps):
        print("⚠️ CI failed on Type Checking. This requires manual intervention.")
        
    return needs_repush
    
def main():
    args = sys.argv[1:]
    
    # 1. Provide an easy way to push or skip push if testing
    if "--skip-push" not in args:
        print("🚀 Pushing to remote...")
        if not run_command(["git", "push"]):
            print("❌ Git push failed. Aborting.")
            return 1
            
    sha = get_current_sha()
    print(f"📌 Tracking commit: {sha[:7]}")
    
    # Wait for GitHub to register the event
    time.sleep(3)
    
    # 2. Find the run
    run = find_run_for_sha(sha)
    if not run:
        print("❌ Could not find a GitHub Actions run for this commit.")
        return 1
        
    run_id = run["id"]
    print(f"✅ Found Workflow Run: {run_id}")
    print(f"🔗 URL: {run['html_url']}")
    
    # 3. Poll for completion
    status = run.get("status")
    conclusion = run.get("conclusion")
    
    while status != "completed":
        print(f"⏳ Waiting for CI to finish... (Status: {status})")
        time.sleep(10)
        
        run = api_request(f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/actions/runs/{run_id}")
        if not run:
            print("❌ Failed to fetch run status.")
            return 1
            
        status = run.get("status")
        conclusion = run.get("conclusion")
        
    print(f"\n🏁 Complete! Conclusion: {conclusion}")
    
    # 4. Handle results
    if conclusion == "success":
        print("🎉 CI passed successfully!")
        return 0
        
    elif conclusion == "failure":
        print("❌ CI failed. Analyzing jobs...")
        failed_jobs = get_failed_jobs(run_id)
        
        all_failing_steps = []
        for job in failed_jobs:
            print(f"  - Job '{job['name']}' failed at step: {', '.join(job['failing_steps'])}")
            all_failing_steps.extend(job['failing_steps'])
            
        # Try auto-fixing
        if apply_auto_fix(all_failing_steps):
            print("🚀 Pushing auto-fixed code and monitoring new run...")
            run_command(["git", "push"])
            
            # Recursive call to watch the new run.
            new_sha = get_current_sha()
            print(f"\n🔄 Restarting monitor for new commit: {new_sha[:7]}...")
            
            # Restart loop logic inline to avoid bash process replacement issues
            args.append("--skip-push")
            os.execv(sys.executable, ['python3'] + sys.argv + ['--skip-push'])
        else:
            print("🛑 Could not auto-fix. Manual intervention required.")
            return 1
    else:
        print(f"⚠️ Unknown conclusion: {conclusion}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
