# 專案開發規則 (Project Rules)

本專案是一個結合原生 JavaScript、Tailwind CSS 以及由 Vite+Vue 3 驅動的現代化多頁面應用（MPA）。為了維持程式碼品質、安全性與開發效率，請務必遵循以下規則。

## 1. 核心開發與部署規範

- **使用語言**：所有的回應、代碼註解、內部推理過程（思考過程）以及 **Git Commit 的註釋訊息**，都必須使用 **「繁體中文（Traditional Chinese）」**。
- **文字說明修改規定**：程式呈現的文字說明（UI Text），若沒有明確提及需要修改，則**嚴格禁止擅自修改**。若認為有必要，必須先徵得同意。
- **自動化推送與部署**：
  - 修改 Edge Functions 後，必須部署至 Supabase：`supabase functions deploy coffee-api --no-verify-jwt`。
  - 推送前請先在本機跑 `npm run health`；若只改後端、guardrail 或純前端靜態規則，可先用 `npm run ci-local` 快速確認（含 `lint:frontend`、`test:unit`）。
  - `main` / `master` 每次 push 通過 CI 後，會自動：
    - 部署前端到 GitHub Pages
    - 執行 `supabase db push`
    - 部署 `coffee-api` Edge Function
  - GitHub Actions 需預先設定 secrets：
    - `SUPABASE_ACCESS_TOKEN`
    - `SUPABASE_DB_PASSWORD`
  - 若上述 secrets 尚未設定，Supabase 部署 job 會以 warning 跳過後端部署；前端 GitHub Pages 部署仍會繼續。
  - 若需要手動重跑正式部署，可直接在 `.github/workflows/ci.yml` 的 `workflow_dispatch` 執行；預設 `deploy=true`，在 `main/master` 會連同前端與 Supabase deploy jobs 一起跑。
- **檔案版號與快取**：**不可輕忽的手機 Cache**。正式站入口應為根目錄 `/`、`/main.html`、`/dashboard.html`，並由 GitHub Pages `workflow` 模式直接提供 Vite build 產物；若線上又出現 `/frontend/main.html` 或 `/frontend/dashboard.html`，代表 Pages source 漂回 `legacy`，應先檢查 repo 的 GitHub Pages 設定。legacy `js/*.js` 的 `?v=` 仍由 `.frontend-version` 與 `scripts/sync_frontend_version.py` 管理。GitHub Pages 的 Vite 產物則在 build 後統一改寫為穩定 `assets/*.js|css` 路徑，並於 CI deploy 時自動注入 commit SHA 版號，降低 push 後 HTML 與 asset 快取短暫失配造成的按鈕失效。若需要手動提升 legacy 版號，請執行 `python3 scripts/sync_frontend_version.py <新版本號>`，不要逐檔手動改。
- **特殊檔案保護**：`google6cb7aa3783369937.html` 為 Google 商品驗證檔案，**嚴禁刪除或修改**。未來進行專案清理（Cleanup）時，必須將此檔案排除在刪除清單外。

## 2. 前端開發規範 (MPA & Vue 3)

- **事件代理策略**：legacy DOM 互動維持 **`data-action` + 事件代理**；Vue-owned 區塊優先使用元件事件與 composable reactive state。
  - **禁止使用 inline event handler**（如 `onclick`, `onchange`）。
  - 新增 legacy 互動時，請在既有 delegation/router 註冊；若區塊已經是 Vue feature，請直接走元件事件，不要再繞回 document-level delegation。
- **前端型別治理**：共享型別統一放在 `frontend/src/types/`；新的 composable 請直接用 `.ts`，`npm run guardrails` 會執行 `scripts/check_new_composables_ts.py` 阻擋新增 `use*.js`。
- **SRI 與 E2E 測試相容性**：HTML 使用了 SRI (`integrity`)。在進行 Playwright 測試時，若需 mock 腳本，必須透過 `installGlobalStubs` 動態移除 `integrity` 屬性，避免瀏覽器阻擋載入。
- **Vite 整合**：雖然專案包含 legacy 資源，但打包與啟動流程已由 Vite 接管。請透過 `npm run dev` 或 `npm run build` 進行開發與建構；`npm run e2e` 會走 production build + `vite preview`，避免只在 dev server 才通過。
- **Repo 衛生規則**：
  - `supabase/.temp/` 屬於 Supabase CLI 本機暫存資料，現在由 `.gitignore` 忽略，不應提交。
  - `.env.staging`、`.env.supabase.local` 等敏感檔只保留在本機；請使用 `.env.staging.example`、`.env.supabase.local.example` 作為範本。
  - 可透過 `npm run hygiene` 或 `npm run guardrails` 檢查目前 tracked file 是否誤含敏感檔。
  - 本機完整健康檢查請使用 `npm run health`；若只需快速確認後端與守門規則，可用 `npm run ci-local`（含 `lint:frontend`、`test:unit`）；E2E 快篩可用 `npm run e2e:smoke`。若已先 `npm run build`，`health` 會重用產物，不再重複 build。
  - `npm run guardrails` 目前也會執行 `scripts/check_dev_context_sync.py`，確認 `DEV_CONTEXT.md` 的「最後更新」與前端版號沒有和實際狀態漂移。
  - Smoke E2E 已依前台、結帳、後台核心、後台設定、後台控制項、bridge removal 拆到 `tests/e2e/smoke/`；`tests/e2e/support/smoke-fixtures.ts` 保留相容 barrel export，實際共用路由、global stub、顏色比對 helper 請分別維護在 `smoke-main-routes.ts`、`smoke-dashboard-routes.ts`、`smoke-global-stubs.ts`、`smoke-color.ts`。
  - 已知歷史風險與清理步驟記錄於 [docs/repo-hygiene.md](docs/repo-hygiene.md)。

## 3. 後端與資料庫規範 (Deno & Supabase)

- **Deno 模組解析**：**禁止使用 bare specifiers**。所有依賴必須宣告在 `deno.json` 的 `imports` 中，程式碼內僅引用別名（例如 `import { z } from "zod"`）。
- **架構設計**：
  - 業務邏輯放入 `api/`，工具函數放入 `utils/`，並在 `index.ts` 集中分派。
  - 所有寫入操作 (Mutation) 必須透過 **Zod Schema** 進行驗證。
  - API 必須支援分頁 (`limit`/`offset`) 與搜尋下推至資料庫層級。
- **Migration 命名**：
  - 新增 `supabase/migrations/*.sql` 時，檔名統一使用 `YYYYMMDDHHmm_slug.sql`。
  - 已上線或已套用的歷史 migration **不可為了統一命名而回改檔名**。
  - 可透過 `npm run guardrails` 檢查命名是否符合規範。

## 4. 維護流程

- **脈絡繼承**：開啟對話後，**優先讀取 `DEV_CONTEXT.md`** 以掌握除錯經驗與排版變更脈絡。
- **紀錄更新**：每次完成階段性變更後，應自動將重點摘要紀錄於 `DEV_CONTEXT.md` 中。

## 5. 專案綁定規範（GitHub / Supabase）

- **GitHub（固定本專案 SSH）**：
  - 本專案 `origin` 預設為：`git@github-scriptcoffeeshop:scriptcoffeeshop/sc.git`。
  - 本專案 local git config 已固定 `core.sshCommand` 使用 `~/.ssh/id_ed25519`，避免切到其他專案時使用錯誤 SSH 身分。
  - GitHub Pages 由 `.github/workflows/ci.yml` 在 `main/master` push 成功後自動部署，repo 設定中的 Pages source 必須維持 `build_type=workflow`，不可回退到 `legacy / main / root`。
  - `.github/workflows/ci.yml` 的 `workflow_dispatch` 已支援手動部署；若要演練測試但不 deploy，可將 `deploy` input 關閉。
- **Supabase（固定本專案憑證來源）**：
  - 請優先使用：
    - `npm run supabase:deploy`
    - `npm run supabase:db:push`
  - 以上指令會透過 `scripts/supabase_deploy.sh` 與 `scripts/supabase_db_push.sh` 自動載入專案根目錄的 `.env.supabase.local`。
  - `.env.supabase.local` 建議至少包含：
    - `SUPABASE_ACCESS_TOKEN`
    - `SUPABASE_DB_PASSWORD`
    - `SUPABASE_PROFILE`（預設可用 `supabase`）
  - `.env.supabase.local` 屬於本機敏感檔案，不應提交到 git（目前由 `.env.*` 規則自動忽略）。
