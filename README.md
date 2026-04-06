# 專案開發規則 (Project Rules)

本專案是一個結合原生 JavaScript、Tailwind CSS 以及由 Vite+Vue 3 驅動的現代化多頁面應用（MPA）。為了維持程式碼品質、安全性與開發效率，請務必遵循以下規則。

## 1. 核心開發與部署規範

- **使用語言**：所有的回應、代碼註解、內部推理過程（思考過程）以及 **Git Commit 的註釋訊息**，都必須使用 **「繁體中文（Traditional Chinese）」**。
- **文字說明修改規定**：程式呈現的文字說明（UI Text），若沒有明確提及需要修改，則**嚴格禁止擅自修改**。若認為有必要，必須先徵得同意。
- **自動化推送與部署**：
  - 修改 Edge Functions 後，必須部署至 Supabase：`supabase functions deploy coffee-api --no-verify-jwt`。
  - 建議使用 `python3 scripts/push_and_watch.py` 進行推送，此腳本會自動監控 CI 狀態並嘗試自動修復格式錯誤。
- **檔案版號與快取**：**不可輕忽的手機 Cache**。只要修改了任何 `.js` 檔案，必須同步修改引用該檔案之 `.html` 或 Vue 元件中的 `v=X` 版號（例如 `?v=52` 提升至 `?v=53`）。

## 2. 前端開發規範 (MPA & Vue 3)

- **事件代理策略**：前台與後台全面採用 **`data-action` + 事件代理** 機制。
  - **禁止使用 inline event handler**（如 `onclick`, `onchange`）。
  - 新增互動時，請在 `actionHandlers` (前台) 或 `initializeDashboardEventDelegation` (後台) 的 `switch` 中註冊新動作。
- **SRI 與 E2E 測試相容性**：HTML 使用了 SRI (`integrity`)。在進行 Playwright 測試時，若需 mock 腳本，必須透過 `installGlobalStubs` 動態移除 `integrity` 屬性，避免瀏覽器阻擋載入。
- **Vite 整合**：雖然專案包含 legacy 資源，但打包與啟動流程已由 Vite 接管。請透過 `npm run dev` 或 `npm run build` 進行開發與建構。

## 3. 後端與資料庫規範 (Deno & Supabase)

- **Deno 模組解析**：**禁止使用 bare specifiers**。所有依賴必須宣告在 `deno.json` 的 `imports` 中，程式碼內僅引用別名（例如 `import { z } from "zod"`）。
- **架構設計**：
  - 業務邏輯放入 `api/`，工具函數放入 `utils/`，並在 `index.ts` 集中分派。
  - 所有寫入操作 (Mutation) 必須透過 **Zod Schema** 進行驗證。
  - API 必須支援分頁 (`limit`/`offset`) 與搜尋下推至資料庫層級。

## 4. 維護流程

- **脈絡繼承**：開啟對話後，**優先讀取 `DEV_CONTEXT.md`** 以掌握除錯經驗與排版變更脈絡。
- **紀錄更新**：每次完成階段性變更後，應自動將重點摘要紀錄於 `DEV_CONTEXT.md` 中。

## 5. 專案綁定規範（GitHub / Supabase）

- **GitHub（固定本專案 SSH）**：
  - 本專案 `origin` 預設為：`git@github-scriptcoffeeshop:scriptcoffeeshop/sc.git`。
  - 本專案 local git config 已固定 `core.sshCommand` 使用 `~/.ssh/id_ed25519`，避免切到其他專案時使用錯誤 SSH 身分。
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
