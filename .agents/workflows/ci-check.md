---
description: 推送後自動偵測 CI 報錯並修復
---

# 推送後 CI 自動偵錯與修復流程

每次執行 `git push` 成功後，必須立即執行以下步驟：

// turbo-all

## 步驟

1. **等待 CI 執行完成**
   ```bash
   sleep 30
   ```

2. **透過 GitHub API 抓取最新 CI 結果**
   ```bash
   curl -s 'https://api.github.com/repos/scriptcoffeeshop/sc/actions/runs?per_page=1' | python3 -c "import sys,json; d=json.load(sys.stdin)['workflow_runs'][0]; print(f\"Run #{d['run_number']}: {d['conclusion'] or d['status']}  ({d['name']})\")"
   ```

3. **若結果為 `failure`，查詢失敗步驟**
   - 從 CI Run 的 jobs API 取得失敗的 step name
   ```bash
   curl -s 'https://api.github.com/repos/scriptcoffeeshop/sc/actions/runs/<RUN_ID>/jobs' | python3 -c "
   import sys,json
   jobs = json.load(sys.stdin)['jobs']
   for job in jobs:
       for step in job['steps']:
           if step['conclusion'] == 'failure':
               print(f\"❌ Step {step['number']}: {step['name']}")
   "
   ```

4. **依據失敗步驟分別修復**
   - **Verify formatting** (`deno fmt --check` 失敗)：
     ```bash
     ~/.deno/bin/deno fmt supabase/functions/coffee-api/
     ```
   - **Linting** (`deno lint` 失敗)：
     - 查看報錯訊息
     ```bash
     ~/.deno/bin/deno lint supabase/functions/coffee-api/
     ```
     - 手動依據錯誤修正對應檔案（注意不破壞邏輯）
   - **Type Check** (`deno check` 失敗)：
     ```bash
     ~/.deno/bin/deno check supabase/functions/coffee-api/index.ts
     ```
     - 依據 type error 修正對應檔案
   - **Run Tests** (`deno test` 失敗)：
     ```bash
     ~/.deno/bin/deno test --allow-all supabase/functions/coffee-api/tests/
     ```
     - 依據測試結果修正對應的邏輯（不可刪除測試）

5. **修正後重新推送**
   ```bash
   git add -A && git commit -m "ci: auto-fix CI errors" && git push
   ```

6. **再次等待並確認 CI 通過**
   - 重複步驟 1-2，確認 `conclusion` 為 `success`
   - 若仍然失敗，重複步驟 3-6（最多重試 3 次）

## 注意事項
- Deno 安裝路徑為 `~/.deno/bin/deno`，若不存在需先安裝：
  ```bash
  curl -fsSL https://deno.land/install.sh | sh
  ```
- 修復過程中不可破壞原有業務邏輯
- 所有修改必須以最小範圍進行
