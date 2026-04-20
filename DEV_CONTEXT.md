# DEV_CONTEXT — 咖啡訂購系統

本文件是交接版專案快照，目標是在 3-5 分鐘內讓下一位接手者掌握規則、現況與風險。

最後更新：2026-04-21

---

## 1) 必讀規則

1. 所有工作區命令一律用 `rtk <cmd>`。
2. 只要變更前端 `JS / CSS / HTML`，必須同步更新前端快取版號：
   `python3 scripts/sync_frontend_version.py <version>`。
3. legacy DOM 互動維持 `data-action` + 事件代理；Vue-owned 區塊優先使用元件事件與 composable，禁止新增 inline `onclick/onchange`。
4. 專案溝通、註解、commit message 以繁體中文為主。
5. Deno 依賴統一放在 `deno.json` 的 `imports`，程式碼直接使用別名。
6. E2E 若攔截 CDN 腳本，需留意 `integrity/crossorigin` 的 SRI 驗證衝突。
7. `google6cb7aa3783369937.html` 為受保護檔案，不可刪除或修改。
8. `.env*` 與 `supabase/.temp/` 屬本機敏感/暫存資料，不能追蹤進 git；只有 `.example` / `.sample` / `.template` 類範本可入版控。

---

## 2) 專案快照

- 專案：Script Coffee（前台訂購 + 後台管理）
- 主要分支：`main`
- 前端：`Vite + Vue 3`，保留 legacy `main.html` / `dashboard.html` 相容入口
- 後端：`Supabase Edge Functions`（Deno / Hono）
- 前端版號來源：`.frontend-version`
- 目前前端版號：`113`
- 部署模式：
  - push 到 `main` / `master` 後會跑 GitHub Actions
  - GitHub Pages 會自動部署前端
  - Supabase `db push` / `coffee-api` deploy 需 repo secrets 已設好

必要 secrets：

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_DB_PASSWORD`

---

## 3) 目前狀態

### 前端遷移

- 最終目標已確定為 `Vue 3 + Vite SFC`。
- 後台是優先遷移區：
  - `orders`、`products`、`categories`、`promotions`、`formfields`、`users`、`blacklist` 已改成 Vue-owned state/actions (`useDashboardOrders.js`、`useDashboardProducts.js`、`useDashboardCategories.js`、`useDashboardPromotions.js`、`useDashboardFormFields.js`、`useDashboardUsers.js`)
  - `session / tab 切換` 已改成 Vue-owned state/actions (`useDashboardSession.js`)
  - `settings` / `settings icons` 已改成 Vue-owned state/actions（`useDashboardSettings.js`、`useDashboardBankAccounts.js`、`useDashboardSettingsIcons.js`）
  - `settings` / `formfields` 的按鈕互動已改成元件事件直連，不再依賴 `createSettingsActionHandlers()` 或 `settings-controller.js`
  - 剩餘的主要 legacy orchestration 集中在 dashboard bootstrap / window globals，以及仍未移除的 document-level delegation
- 前台 `MainPage.vue` 已存在，但 legacy `main.html` / `js/main-app.js` 仍是相容層的一部分。
- 原則：新功能以 Vue-first 為主；legacy 只接受 hotfix、相容 glue 或部署修正。

### 後端演進

- `orders.ts`、`payments.ts` 已拆成較小模組，路由匯入點維持不變。
- rate limiter 已抽成共用 store；預設仍走記憶體 backend，但若設定 `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`，可切到 Upstash Redis REST 作為分散式配額儲存。

### 視覺與互動

- 前台目前已回到暖棕 / 米白系配色。
- 全站固定操作 icon 已改為向量化對齊邏輯，legacy 入口也已補齊，不應再出現 emoji 作為正式操作 icon。
- 後台主題以 `Solarized Light` 為基底。

### 測試與守門

- 基本檢查以 `guardrails`、Deno lint/check/test、Playwright smoke 為主。
- `tests/e2e/smoke.spec.ts` 已覆蓋：
  - 前台暖色樣式
  - 備註欄不得出現 `<slot />`
  - 會員資料彈窗導角
  - 後台手機版頁籤
  - 前後台固定 icon 樣式
  - dashboard settings icon controls 不得退回 document-level event delegation
  - dashboard settings / form fields controls 不得退回 document-level event delegation
  - dashboard `orders` / `products` / `categories` / `promotions` / `formfields` / `users` / `blacklist` 不得退回 `coffee:dashboard-*` custom-event bridge

---

## 4) 已知風險

### Repo hygiene / 金鑰風險

- `.env.staging` 的 git 歷史清理已完成，舊 commit SHA 已不再是目前可達歷史的一部分。
- 但當時出現過的真實金鑰仍必須視為已外洩；剩餘的 P0 是「完成各平台金鑰輪替」，不是再次做 history rewrite。
- 清理流程請看 `docs/repo-hygiene.md`。

### 自動部署限制

- 前端自動部署已正常。
- 若 GitHub repo 尚未設定 `SUPABASE_ACCESS_TOKEN` / `SUPABASE_DB_PASSWORD`，Supabase deploy job 會跳過，不會真的更新後端。

### 遷移未完成區

- 專案仍處於 Vue / legacy 共存期。
- 若修改前後台互動，先確認是否碰到 bridge event、`data-vue-managed` 容器或 legacy 啟動流程，避免雙寫回潮。

---

## 5) 最近有效變更

### 2026-04-20

- 恢復前台暖色系，修正訂單備註欄位顯示 `<slot />`。
- 對齊會員資料彈窗導角。
- 修正後台手機版頁籤顯示。
- 統一前後台固定 icon 的尺寸、顏色與對齊，legacy 入口也已換成向量 icon。
- dashboard `categories` 已改成 Vue-owned state/actions，不再依賴 `coffee:dashboard-categories-updated`。
- dashboard `promotions` 已改成 Vue-owned state/actions，不再依賴 `coffee:dashboard-promotions-updated`。
- dashboard `formfields` 已改成 Vue-owned state/actions，不再依賴 `coffee:dashboard-formfields-updated`。
- dashboard `users` / `blacklist` 已改成 Vue-owned state/actions，不再依賴 `coffee:dashboard-users-updated` / `coffee:dashboard-blacklist-updated`。
- dashboard `session / tab` 已改成 reactive state，不再依賴 `dashboard-session-controller.js` 來切換登入頁、管理頁與 tab 顯示。
- dashboard `settings` 的 delivery routing / payment options / sandbox 已改成 reactive state，不再由 `settings-controller.js` 直接組 HTML table。
- dashboard `settings` 的 branding / section titles / announcement / store status 已改成 reactive state，並由 `useDashboardSettings.js` 統一提交 payload。
- dashboard `settings` 的 bank accounts 已改成 reactive state，不再依賴 `bank-accounts.js` 的 imperative `innerHTML` renderer。
- dashboard `settings` / `icon library` 的 icon upload、預覽與 quick apply 已改成 Vue 直連 reactive state，不再依賴 `icon-assets-controller.js` 或 document-level change/click delegation。
- dashboard `settings` 的 load/save 已併入 `useDashboardSettings.js`，`settings-controller.js` 已移除。
- dashboard `settings` / `formfields` 的按鈕互動已改成元件內 `@click`，不再經過 `createSettingsActionHandlers()`。
- `Textarea.vue` 已補齊標準 `v-model` 支援，避免設定頁與前台多行欄位寫回失效。
- `coffee_orders` 已保留 `items TEXT` 摘要，新增 `items_json JSONB` 作為結構化訂單明細。
- `coffee_orders.custom_fields`、`coffee_orders.receipt_info` 已改為 JSONB。
- 新增 `scripts/check_migration_names.py`，未來 migration 檔名統一為 `YYYYMMDDHHmm_slug.sql`；歷史 migration 不回改。
- rate limiter 已抽離成可替換 store，支援可選的 Upstash Redis REST backend，未設 env 時會自動回退到既有記憶體策略。
- 新增 repo hygiene 防線：
  - `scripts/repo_hygiene_check.py`
  - `.env.staging.example`
  - `.env.supabase.local.example`
  - `supabase/.temp/` 已忽略且不再追蹤

### 2026-04-19

- 補齊 GitHub Actions 自動部署鏈：
  - 前端自動部署 GitHub Pages
  - Supabase `db push` / Edge Function deploy 可由 CI 執行
- 新增 `scripts/prepare_static_deploy.sh`，確保 `CNAME`、驗證檔與 `icons/` 會進入部署產物。
- 修正 GitHub CI 對無 lockfile 與缺少 Supabase secrets 的相容行為。

### 2026-04-18

- 補齊街口支付訂單狀態流、付款欄位、同步邏輯與 LINE 通知追蹤。
- `coffee_orders` 新增多個付款與通知追蹤欄位，`schema_full.sql` 已同步。

更久以前的完整歷史請直接看 git，不再重貼在本檔：

```bash
rtk git log --oneline origin/main
```

---

## 6) 常用命令

```bash
rtk npm run hygiene
rtk npm run guardrails
rtk npm run ci-local
rtk npm run build
rtk npm run e2e
rtk python3 scripts/sync_frontend_version.py --check
```

---

## 7) 關鍵文件

- `README.md`：專案入口與開發規則
- `docs/frontend-vue-migration-plan.md`：前端 Vue 遷移決策與分階段策略
- `docs/repo-hygiene.md`：敏感檔、金鑰輪替與 git 歷史清理流程
- `tests/e2e/smoke.spec.ts`：目前主要 smoke regression 保護網

---

## 8) 維護方式

- 更新本檔時，優先維護「現況、風險、最近有效變更」。
- 不要再把完整 commit log 貼進 `DEV_CONTEXT.md`；git 歷史本身就是唯一真實來源。
- 若變更會影響交接判斷，更新本檔即可；若只是一般小修，保留在 commit history 就好。
