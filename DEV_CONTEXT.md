# DEV_CONTEXT — 咖啡訂購系統

本文件用於交接與維運，目標是讓下一位接手者（人或 AI）在 3-5 分鐘內掌握現況。

---

## 1) 協作規範（必讀）

1. 快取版號規則：只要變更任何前端 JS/CSS/HTML，必須同步更新 `?v=` 版號（透過 `python3 scripts/sync_frontend_version.py <version>`）。
2. 事件處理規則：前後台互動統一採用 `data-action` + 事件代理；禁止新增 inline `onclick/onchange`。
3. 語言規則：專案溝通、註解、commit message 以繁體中文為主。
4. SRI 與 E2E：若測試攔截 CDN 腳本，需注意 SRI hash 驗證衝突（測試中需移除 `integrity/crossorigin`）。
5. Deno 依賴規則：依賴須放在 `deno.json` imports，程式碼直接使用別名。
6. 逐筆提交規則：`main` 分支變更需保留逐筆 commit 記錄，不做「本週摘要」合併敘述。
7. 受保護檔案：`google6cb7aa3783369937.html` 不可刪除或修改。
8. 專案命令規則：本工作區命令統一用 `rtk <cmd>`。

---

## 2) 專案現況快照

- 專案：Script Coffee（前台訂購 + 後台管理）
- 前端：Vite + Vue 3（保留 legacy 相容入口）
- 後端：Supabase Edge Functions（Deno/Hono）
- 目前主要分支：`main`
- 前端版號來源：`.frontend-version`
- 最近部署節奏：前端 UI、後台主題（Solarized Light）、圖示與表單管理持續優化

---

## 3) 最近更新（人工摘要）

### 2026-04-09（本次）

- 修正前台副標題分隔符不一致造成的視覺跳動：
  - 將預設文案統一為 `咖啡豆｜耳掛`。
  - 在 `applyBranding` 新增標準化邏輯：若設定值是 `咖啡豆 | 耳掛` 或 `咖啡豆｜耳掛`，皆統一渲染為 `咖啡豆｜耳掛`。
- 修正後台上傳區排版對齊：
  - 「選擇檔案」與「上傳圖示」改用固定 grid 欄位。
  - 配送方式（動態列）與金流設定（靜態列）採同一套樣式。
  - 手機版自動換行，避免按鈕與 file input 擠壓錯位。
- 重整本文件：
  - 刪除重複且相互矛盾的版本敘述。
  - 保留必要規範與完整 commit 逐筆紀錄。

### 2026-04-09（稍早）

- 後台主題改為 Solarized Light，並完成文字/表格/按鈕/彈窗配色一致化。
- 將登入頁 LINE 按鈕恢復綠色系，降低後台藍色文字突兀感。
- 修正後台資源快取：版號升級到 `v=70` 並推送。

---

## 4) 常用檢查指令

```bash
rtk npm run guardrails
rtk npm run build
rtk npm run e2e
rtk python3 scripts/sync_frontend_version.py --check
```

---

## 5) main 分支逐筆提交紀錄（完整，禁止彙整）

- 資料來源：`origin/main`
- 格式：`YYYY-MM-DD | Commit Hash | Commit Subject`

<!-- MAIN_COMMIT_LOG_START -->
- `2026-04-09` | `0b78029` | fix(dashboard): align file picker and upload button layout
- `2026-04-09` | `ade83d6` | chore(cache): bump frontend asset version to v70
- `2026-04-09` | `f15a8a4` | style(dashboard): refine solarized text balance and restore LINE login green
- `2026-04-09` | `6c138cf` | fix: align resource version query strings in HTML files to pass CI guardrails
- `2026-04-09` | `bf6533c` | fix: resolve Vue syntax error and remaining duplicate classes
- `2026-04-09` | `a757a83` | fix: resolve duplicate class attributes in dashboard HTML and Vue templates
- `2026-04-09` | `4e79f97` | style: achieve 100% Solarized consistency for dashboard and bump version to v69
- `2026-04-09` | `d30c756` | style: harmonize overall text and border colors with Solarized Light theme
- `2026-04-09` | `39d5dbc` | style: bump version to v67 to force Solarized theme refresh
- `2026-04-09` | `9c36d03` | feat: migrate dashboard theme to Solarized Light
- `2026-04-09` | `44d388e` | Add files via upload
- `2026-04-09` | `e389b59` | test: fix broken assertion in smoke tests due to template formatting
- `2026-04-09` | `a43394b` | style: run deno fmt to fix ci formatting error
- `2026-04-09` | `432bd92` | fix(ci): restore missing template string closure
- `2026-04-09` | `d8f4988` | fix: address style, layout, icon upload, and email issues
- `2026-04-09` | `727355b` | fix: switch to enterprise light theme + fix CI version sync + fix sidebar icons
- `2026-04-09` | `d5b8e1d` | fix: ensure .hidden overrides grid display on admin-page
- `2026-04-09` | `c6dab8f` | fix: add cache-busting params to CSS links for dark theme
- `2026-04-09` | `f6d8f42` | feat: enterprise dark theme dashboard redesign
- `2026-04-09` | `7d6d9c8` | chore: install ui-ux-pro-max-skill for AI assistant
- `2026-04-09` | `001738b` | fix: strip legacy /sc/ prefix from icon paths on custom domain
- `2026-04-09` | `4582508` | chore: add google site verification meta tag
- `2026-04-09` | `78bb921` | chore: add scriptcoffee.com.tw to ALLOWED_REDIRECT_ORIGINS for CORS support
- `2026-04-09` | `d870999` | feat: add index.html to redirect root traffic to main.html
- `2026-04-09` | `8f66586` | chore: fix typo in custom domain to scriptcoffee.com.tw
- `2026-04-09` | `d6850eb` | chore: add CNAME for custom domain scriptcofee.com.tw
- `2026-04-08` | `5e8071a` | feat: add tracking-url CTA button in LINE flex message
- `2026-04-08` | `e8938a7` | feat: flex 顯示收據需求並將統編改為選填
- `2026-04-08` | `b4b96dc` | 功能：後台支援 LINE Flex 一鍵發送並串接官方推播 API
- `2026-04-08` | `c804732` | 修正：補強門市回呼安全、對齊電話欄位驗證並強化限流
- `2026-04-08` | `46ed6ea` | fix(ui): equalize icons in dashboard.html to match Vue implementation
- `2026-04-07` | `26d5df0` | docs: 記錄修復 E2E 報錯的 commit
- `2026-04-07` | `88e2b69` | test: 修復訂單確認 UI 改動導致 E2E 測試報錯 (移除 mock 失效的 Swal 點擊等待)
- `2026-04-07` | `e23be84` | docs: 記錄稍早新增訂單確認與 Flex Message 功能的 commit
- `2026-04-07` | `bfd6c4c` | feat: 新增訂單狀態變更確認流程與 LINE Flex Message 產生器
- `2026-04-07` | `ad4664e` | 設定：初始化 RTK（Codex）專案檔案
- `2026-04-07` | `029a8f3` | 文件：同步專案綁定流程到 README 與 DEV_CONTEXT
- `2026-04-07` | `9d8905d` | chore: make supabase scripts load project-local credentials
- `2026-04-07` | `bd1ba43` | chore: bind project deploy commands to fixed supabase settings
- `2026-04-07` | `25f18c3` | fix: remove duplicated receipt section in order content
- `2026-04-07` | `c7cb1ca` | 修正：將收據資訊併入訂單內容並同步 Email 明細
- `2026-04-07` | `f45b06c` | 調整：收據欄位順序改為統一編號優先並同步前後台與 Email
- `2026-04-07` | `d48a2b0` | 功能：新增索取收據流程並同步訂單後台與 Email 顯示
- `2026-04-07` | `f06d1da` | 修正：新增電子郵件格式檢查機制並補上會員資料儲存前驗證
- `2026-04-07` | `516bbed` | docs: track file dialog hotfix
- `2026-04-07` | `07694d0` | fix(ui): ignore file type inputs in global click delegator to allow native file picker dialogs
- `2026-04-07` | `e18ded5` | docs: track UI button commit
- `2026-04-07` | `e1ede02` | feat(ui): add explicit upload button for site logo
- `2026-04-07` | `6ca5675` | docs: 記錄 ui 修復紀錄於 DEV_CONTEXT.md
- `2026-04-07` | `3f54fb5` | fix(ui): correct logo upload button click delegation and bind reset logo event
- `2026-04-07` | `79afde0` | docs: 記錄 js/form-renderer.js 的熱修復
- `2026-04-07` | `06f8871` | fix: import resolveAssetUrl in form-renderer.js
- `2026-04-07` | `bf32caf` | docs: 記錄 drag 圖示與 Logo 上傳之修復紀錄於 DEV_CONTEXT.md
- `2026-04-07` | `cd053ce` | chore: 修復 drag 圖示為 inline SVG 及還原隨時上傳 Logo 功能
- `2026-04-07` | `54716b3` | ci: auto-fix CI errors
- `2026-04-07` | `5e9c9f3` | docs: 新增 Git Commit 註釋需使用繁體中文之強制規定
- `2026-04-07` | `42749fa` | docs: append latest main commit and v76 changes to per-commit log
- `2026-04-07` | `23d3356` | docs: generate v76 release notes in DEV_CONTEXT.md covering UI optimizations and absolute path fixes
- `2026-04-07` | `50e6b77` | fix: increase drag icon size and resolve absolute paths in Vue files
- `2026-04-07` | `8a11f03` | update: change fallback site title and subtitle to Script Coffee
- `2026-04-07` | `5a761cc` | fix: prevent path duplication in resolveAssetUrl causing /sc/sc/icons/ 404s
- `2026-04-07` | `609a9b3` | fix: replace emoji section titles with PNG icons and skeleton loading for professional initial page load
- `2026-04-07` | `c4b0822` | fix: remove Supabase logo upload and site_icon_url, favicon now always uses local icons/logo.png
- `2026-04-07` | `e3c2488` | ci: auto-fix CI errors
- `2026-04-07` | `08e4595` | docs: append latest main commit to per-commit log
- `2026-04-07` | `77f9753` | feat: apply local /sc/icons/logo.png for brand icon and remove upload size cap
- `2026-04-07` | `92f22dc` | docs: enforce per-commit main log and backfill origin/main history
- `2026-04-07` | `ce5ca7f` | docs: update DEV_CONTEXT latest main commit hash
- `2026-04-07` | `4747540` | fix: restore icon replacement flow and sync brand logo updates
- `2026-04-07` | `71f95eb` | docs: track main branch commit hash in DEV_CONTEXT.md
- `2026-04-07` | `0981a5f` | fix: update hardcoded brand-coffee.png to logo.png in Vue templates and supply missing Vite asset
- `2026-04-07` | `168427e` | docs: update DEV_CONTEXT.md for v73 icon upgrade
- `2026-04-07` | `f23d1f2` | feat: replace supabase icons with local logo overriding logic and bump version
- `2026-04-07` | `2c8ad69` | add logo.png
- `2026-04-06` | `7c19f32` | style: center align text in delivery and payment option cards
- `2026-04-06` | `b697c4c` | fix: bump frontend cache version and verify shipping/discount across browsers
- `2026-04-06` | `c61febc` | fix: match payment card sizing with delivery and restore check icon
- `2026-04-06` | `5728a8f` | fix: unify payment and delivery icon sizing in storefront cards
- `2026-04-06` | `8bb890d` | fix: align legacy payment icon containers with modern option-icon sizing
- `2026-04-06` | `0649093` | fix: further reduce payment icon footprint in checkout cards
- `2026-04-06` | `fdd7226` | fix: correct shipping and discount display conditions in cart UI
- `2026-04-06` | `7fd46fc` | fix: reduce payment method icon size for better visual balance
- `2026-04-06` | `eb46ad1` | fix: rebalance icon proportions across storefront and dashboard
- `2026-04-06` | `fb9fd80` | fix: ensure generated icons work for legacy /icons path
- `2026-04-06` | `cb0eaca` | docs: update DEV_CONTEXT with v62 icon redesign record
- `2026-04-05` | `2e64a99` | feat: regenerate icon pack with flatter minimalist style
- `2026-04-03` | `b3295dc` | feat: unify admin modals with ui components and add icon library
- `2026-04-03` | `5c1f7da` | chore: format settings api for ci fmt check
- `2026-04-03` | `708c840` | feat: replace emoji UI with PNG icons and reka-based admin refresh
- `2026-03-26` | `ab8963c` | chore: 清理專案，移除閒置備份與一次性測試腳本
- `2026-03-26` | `1dec545` | fix(cors): 加入 localhost:5173 至 CORS 允許清單以支援 Vite 開發伺服器
- `2026-03-25` | `70b6446` | chore: save state before icon upgrade
- `2026-03-14` | `60e8cd1` | ci: fix syntax warnings in keep-alive workflow
- `2026-03-14` | `67c7eeb` | ci: optimize keep-alive workflow and clean up legacy logs
- `2026-03-11` | `0b0edbf` | chore: setup keep-alive.yml to prevent Supabase project from pausing
- `2026-03-11` | `a3d410c` | fix(ci): avoid lockfile-dependent node setup in workflow
- `2026-03-11` | `8c9b886` | docs: sync project rules from DEV_CONTEXT and remove legacy rules
- `2026-03-11` | `01fcf14` | refactor(vite): align runtime and ci with vue3 architecture
- `2026-03-11` | `d3da416` | fix(ci): auto init legacy pages for smoke tests
- `2026-03-11` | `606a91d` | feat(dashboard): vue bridge products promotions formfields
- `2026-03-11` | `b005659` | feat(dashboard): vue bridge categories users blacklist
- `2026-03-11` | `4dfcbaf` | refactor: start phase2 vue-driven main storefront flow
- `2026-03-11` | `0c59ad9` | refactor: mount all pages via Vue SFC components
- `2026-03-11` | `f38f21c` | docs: record Vite+Vue3 migration audit status
- `2026-03-11` | `fe486e7` | feat: migrate frontend shell to Vite + Vue 3
- `2026-03-11` | `099a4b7` | feat: support drag-and-drop sorting for bank accounts
- `2026-03-11` | `28d4441` | fix: stabilize settings flow and clean dashboard dead code
- `2026-03-10` | `6b0d99b` | fix: keep linepay sandbox toggle state after save
- `2026-03-10` | `1df5453` | fix(api): expose linepay_sandbox to admin in getSettings
- `2026-03-10` | `2aa74c4` | fix(ci): add mock environment variables to test step
- `2026-03-10` | `b5b9359` | chore(ci): auto-fix deno formatting
- `2026-03-10` | `4916573` | feat(api): refactor quote engine and add unit tests
- `2026-03-09` | `866d6b0` | fix(db): move pg_trgm to extensions schema to resolve security warning
- `2026-03-09` | `d5b7aea` | chore(ci): auto-fix deno formatting
- `2026-03-09` | `997b3a3` | chore(ci): remove generated test error
- `2026-03-09` | `80d3734` | chore(ci): auto-fix deno formatting
- `2026-03-09` | `5667df5` | chore: test ci auto fix workflow
- `2026-03-09` | `5863543` | docs(context): record v51 order and email updates
- `2026-03-09` | `3692944` | fix(email): normalize site title by removing confirmation suffix
- `2026-03-09` | `d27664c` | chore(email): format template for backend ci
- `2026-03-09` | `a97019a` | feat(email): simplify confirmation title and add tracking copy button
- `2026-03-09` | `1e245f9` | feat(orders): add tracking number copy action for customers
- `2026-03-09` | `49b050b` | fix(dashboard): avoid premature order status updates from dropdown
- `2026-03-09` | `1bdd2c3` | chore: 重整 migration 版號避免重複衝突
- `2026-03-09` | `2fa5e57` | feat: 移除追蹤頁並擴充出貨物流資訊
- `2026-03-09` | `cbb3ac6` | fix: 保留批次付款狀態清空值
- `2026-03-09` | `51e7a80` | feat: 升級訂單中心並新增顧客訂單追蹤頁
- `2026-03-09` | `ba19e85` | fix: remove SRI attributes from tailwind CDN to fix CORS blockage and bump version to 46
- `2026-03-09` | `bbd01fa` | chore: enable deno in vscode settings and update dev context
- `2026-03-09` | `1c8b471` | ci: restore bare specifier imports in test files for deno lint compliance
- `2026-03-09` | `498f2c0` | test(e2e): strip SRI attributes in Playwright stubs to fix CDN mock rejection
- `2026-03-09` | `3f61932` | test(tools): fix event delegation guardrail path parsing for new events.js
- `2026-03-09` | `c0d354b` | ci: auto-fix CI errors, replace bare internal specifiers and unlisted modules
- `2026-03-09` | `759440e` | refactor(frontend): decouple event delegation and API layer from dashboard-app.js (#P2)
- `2026-03-09` | `5ce4368` | feat/fix: advanced P1-P2 security and scalability optimizations
- `2026-03-09` | `3b830c6` | ci: fix lint no-explicit-any error
- `2026-03-09` | `f762598` | fix(frontend): resolve P0/P1 frontend vulnerabilities and idempotency
- `2026-03-09` | `b6c6fc8` | fix(security): resolve P0-P2 security and maintenance issues
- `2026-03-09` | `5032df5` | chore: remove tracked env files
- `2026-03-09` | `2cc99cf` | ci: auto-fix CI errors
- `2026-03-09` | `fe26f4a` | chore: bump frontend version to v45
- `2026-03-09` | `97d9b78` | refactor: backend modularization phase 2, email template extraction, and frontend data source unification (P2-1, P1-4, P2-3)
- `2026-03-08` | `59faaf8` | feat(v45): security + stability + DX improvements
- `2026-03-08` | `c507107` | fix(ci): use working-directory for deno steps so deno.json is found
- `2026-03-08` | `93f2174` | chore(ci): upgrade setup-deno to v2.x to match local formatting
- `2026-03-08` | `6c9d1ba` | test(ci): adjust python scripts for main-app double quotes format
- `2026-03-08` | `2ceb201` | test(ci): adjust python scripts for v44 dashboard modules structure
- `2026-03-08` | `ca1ac45` | chore(fmt): run deno fmt on root to fix CI
- `2026-03-08` | `5520f35` | fix(ci): use deno.json imports for deno lint no-import-prefix
- `2026-03-08` | `7738ad2` | docs: reorganize DEV_CONTEXT.md timeline and commit v44 changes
- `2026-03-08` | `ea5c576` | chore: fix deno formatting issues for CI
- `2026-03-08` | `fdd34c9` | feat(v43): align user management API, fix promotion formulas, and strengthen zod validation
- `2026-03-08` | `39b3218` | fix(v42): 解決編輯商品時分類選單可能為空的 Race Condition
- `2026-03-08` | `d3ad068` | fix(v41): 購物車有品項時按鈕文字未更新的問題
- `2026-03-07` | `5c6c3dc` | feat(v40): 會員資料功能 — 自動帶入常用資料
- `2026-03-06` | `94c6541` | feat(v39): 優化訂單通知 Email 寄件人與排版
- `2026-03-05` | `4f69e04` | fix(v38): 後台配送方式可見性無法顯示
- `2026-03-05` | `b859aee` | feat(v37): 移除 phone/email 系統保護 + Email 連動表單欄位 + 標題動態化
- `2026-03-05` | `71ac2e7` | feat(v36): 表單欄位依配送方式顯示/隱藏
- `2026-03-05` | `94929ac` | feat(v35): 將動態表單欄位區塊移至配送方式與付款方式之間
- `2026-03-02` | `b716184` | style: deno fmt 修正 api/orders.ts 格式
- `2026-03-02` | `815d551` | fix(v34): 更新宅配顯示文字與 Email 格式
- `2026-03-02` | `24111bc` | fix: 更新 E2E 測試加入政策勾選步驟 + .gitignore 排除 node_modules
- `2026-03-02` | `f971324` | feat(v33): 新增隱私權/退換貨政策頁面 + 下單同意勾選
- `2026-03-02` | `b10b338` | docs: 重新整理 DEV_CONTEXT.md — 按版本倒序排列、精簡內容
- `2026-03-02` | `a7e6eb0` | fix(e2e): block SweetAlert2 CDN to prevent mock override in smoke tests
- `2026-03-02` | `a7192da` | fix(ci): install @playwright/test via npm for proper TS module resolution
- `2026-03-02` | `b0e68cc` | feat: event delegation v28-v32, guardrail scripts, E2E smoke tests, delivery legacy cleanup
- `2026-03-02` | `02d3865` | refactor: implement event delegation in dashboard and sync frontend version to v27
- `2026-03-02` | `53f2f8e` | refactor: use glob for HTML targets in sync_frontend_version.py
- `2026-03-02` | `ac70739` | docs: record v26 category drag-sort and rename sync to DEV_CONTEXT
- `2026-03-02` | `4fd65e4` | feat: drag-sort categories and sync product category on rename (v26)
- `2026-03-02` | `c5fd19e` | docs: record v25 shipping display enhancement to DEV_CONTEXT
- `2026-03-02` | `67bc6f8` | feat(cart): enhance shipping fee display with dark red color and threshold text
- `2026-03-01` | `1eb844d` | fix: correct FRONTEND_URL to include /sc subpath for LINE Pay callback
- `2026-03-01` | `5215f70` | docs: record v24 to DEV_CONTEXT and revert README rule to auto-record
- `2026-03-01` | `c4da49c` | feat(cart): separate shipping fee from discounts and improve free shipping hint
- `2026-03-01` | `846d3fc` | docs: record v22 checkout UI optimization and v23 delivery district fix to DEV_CONTEXT
- `2026-03-01` | `03a2b02` | fix: bind updateDistricts to window and update delivery address text
- `2026-03-01` | `33cd38b` | docs: update README rule #5 to ask before recording to DEV_CONTEXT
- `2026-03-01` | `7d62d34` | feat: optimize checkout UI - enforce map store selection and add shipping fee difference hint
- `2026-03-01` | `3505ff9` | docs: update DEV_CONTEXT, task list, and walkthrough with CI automation and PCSC map integration details
- `2026-03-01` | `bfb8c75` | fix: clean up PCSC callback debug, keep robust token extraction
- `2026-03-01` | `0d575e8` | debug: add PCSC callback field dump to diagnose Miss Token error
- `2026-03-01` | `8d53ac2` | fix: use correct PCSC c2cemap.ashx endpoint for 7-11 store map
- `2026-03-01` | `21fb8f6` | fix: add localhost origins to CORS allowed list for local development
- `2026-03-01` | `44c2fda` | feat: integrate PCSC official emap for 7-11 store selection, keep ECPay for FamilyMart
- `2026-03-01` | `011c9f0` | feat: add CI auto-check workflow and update README rule #7 with detailed post-push CI verification steps
- `2026-03-01` | `f59da94` | ci: fix deno fmt formatting errors in index.ts and orders.ts
- `2026-03-01` | `61c6d03` | fix: correct delivery.js version import in main-app.js and bump all imports to v21 to solve state fragmentation
- `2026-03-01` | `5f7348b` | fix: resolve ES module fragmentation by appending consistent version query string to all internal imports
- `2026-03-01` | `caffdf3` | fix: add version parameter to ES module imports in main-app.js to bypass browser cache
- `2026-03-01` | `5833456` | feat: show free shipping threshold details in cart discount section
- `2026-03-01` | `0a9c886` | docs: add v17 fix to DEV_CONTEXT
- `2026-03-01` | `a249428` | fix: import updateCartUI in main-app.js to resolve ReferenceError crashing page load
- `2026-03-01` | `9f7b21d` | docs: update README rule #5 and sync DEV_CONTEXT.md with v12-v16 changes
- `2026-03-01` | `a97a94e` | fix: recalculate shipping fee instantly when switching delivery method - call updateCartUI() at end of selectDelivery() in delivery.js - expose updateCartUI on window in main-app.js - ensures free-shipping badge updates immediately on delivery switch
- `2026-03-01` | `ea2a743` | fix: reset shipping fee and badges when cart is empty - reorder updateCartUI to check empty cart before calculating totals - add cart.length guard in calcCartSummary shipping calculation - reset all price displays to /bin/zsh when cart is cleared
- `2026-03-01` | `342a5cb` | fix: resolve silent order submission failures - fix cart submit button disabled due to window.state (use ES module state) - throw explicit error on 401 in authFetch - provide fallback error messages in orders.js catch - show descriptive reason on disabled submit button - split backend validation for clearer error messages
- `2026-03-01` | `10d8c68` | docs: add auto-fix rules for CI errors
- `2026-03-01` | `fa0e3c8` | fix(ci): resolve deno lint errors for unused vars and require-await
- `2026-03-01` | `9ad9df6` | fix(ui): correct payment option active class selector and update v=13
- `2026-02-28` | `b0d1301` | style: fix deno fmt errors in index.ts
- `2026-02-28` | `08fb8fe` | feat: 改進一 + 改進二 — 前端事件代理 & 後端 Hono 路由
- `2026-02-28` | `c3cc8ab` | feat: 改進三 — 前端直連 Supabase 讀取公開資料
- `2026-02-27` | `63007e7` | docs: add rule to mandate reading DEV_CONTEXT.md upon project load
- `2026-02-27` | `dbf00dc` | docs: add DEV_CONTEXT.md to track development state and pitfalls
- `2026-02-26` | `345e339` | feat: implement Option A expanding vertically stepper for products
- `2026-02-26` | `4716bb8` | Revert "feat: implement bottom sheet for product variants (Option C)"
- `2026-02-26` | `43fc36b` | feat: implement bottom sheet for product variants (Option C)
- `2026-02-26` | `b24df83` | fix: bump JS version to v7 to invalidate cache for cart variable fix
- `2026-02-26` | `81ac7c8` | fix: import cart variable in main-app.js to prevent undefined variable crash on login
- `2026-02-26` | `4fde3fc` | fix: re-add hidden submit-btn to circumvent mobile browser JS caching null crashes
- `2026-02-26` | `0daf2a4` | fix: resolve null submitBtn issue during login by forcing browser cache refresh
- `2026-02-25` | `4831da0` | feat: refine bottom bar and enhance cart discount details UI
- `2026-02-25` | `de5f1ea` | style: bottom bar price layout - apply option B (dynamic badges)
- `2026-02-25` | `15098a8` | Update project rules and temporarily track supabase folder
- `2026-02-25` | `2735273` | style: 優化規格按鈕 UI (結合紅點數量標記並放大中央標籤文字)
- `2026-02-25` | `08e43d3` | style: 修正商品規格切換為算盤控制列時的排版塌陷問題 (移除 absolute)
- `2026-02-25` | `80f774c` | feat: 商品規格按鈕改版為 In-line Stepper 加減算盤 (移除時還原為加入按鈕)
- `2026-02-25` | `c66b7c2` | fix: 修正重新整理頁面後購物車丟失折扣活動的問題 (因為狀態尚未載入完成)
- `2026-02-25` | `1d852f3` | fix: 修正促銷折扣誤發動於未勾選規格的問題 (修復屬性對應錯誤)
- `2026-02-25` | `591649a` | fix: 徹底修復 Deno TS Type Check 與 Any 轉型問題
- `2026-02-25` | `9c3da4d` | fix: 優化 Deno Lint 變數定義以完全通過 CI
- `2026-02-25` | `258d47d` | style: 修正 Deno 程式碼格式以通過 CI 檢查
- `2026-02-25` | `7c2c71f` | fix: 深度強化後端 API 型別檢查以徹底解決 CI 失敗問題
- `2026-02-25` | `ce8c8d8` | fix: 強化後端型別檢查與空值防護以修復 CI 失敗
- `2026-02-25` | `2f6e23b` | feat: 促銷條件精細化支援依『商品規格』指定活動項目
- `2026-02-25` | `b6e75fb` | feat: 新增運費設定與商品促銷功能
- `2026-02-24` | `2a6515f` | Upload all project contents including supabase/ and environment templates
- `2026-02-24` | `142deca` | Update README with modularization and Zod validation rules
- `2026-02-24` | `27cdd8b` | Remove DEPLOY.md
- `2026-02-24` | `b330201` | Enhance delivery preferences restoration on load
- `2026-02-24` | `f27ca9a` | Fix bank account selection, enhance security (XSS, CORS, Auth), and apply custom settings
- `2026-02-24` | `b8d54e7` | feat: allow customizing payment option names and icons from admin dashboard
- `2026-02-24` | `91df475` | feat: make delivery options customizable and reorderable from admin dashboard
- `2026-02-24` | `2e83a89` | fix: add missing cod-option id to allow dynamic hiding of cod payment option
- `2026-02-24` | `ec9ca30` | feat: implement configurable payment routing matrix for each delivery method
- `2026-02-24` | `2d1147a` | docs: add rule to prevent unauthorized modification of textual content in code
- `2026-02-24` | `30fe4ed` | feat: add tracking number input and courier query links for admin
- `2026-02-24` | `94ba0d1` | fix: ensure tw-city-selector initializes on home_delivery click as fallback
- `2026-02-24` | `edcdcd0` | fix: tw-city-selector initialization timing issue causing empty address list
- `2026-02-24` | `d21caff` | docs: add rule to include --no-verify-jwt when deploying supabase functions
- `2026-02-24` | `47f82da` | feat: add home_delivery option with Taiwan zipcode selector
- `2026-02-23` | `8f830ae` | Remove supabase/ from tracking, update README & .gitignore
- `2026-02-23` | `22f8996` | Add README.md with project rules and update email templates
- `2026-02-23` | `07d1999` | feat: 實作下單時檢查帳號停權狀態並顯示原因
- `2026-02-23` | `ccf873e` | fix: 訂單成立視窗改為單獨顯示顧客選擇的匯款帳號
- `2026-02-23` | `bf9346f` | feat: 實作匯款帳戶單選並將目標帳號紀錄至訂單與管理後台
- `2026-02-23` | `6f74a8a` | style: 調整配送文案與匯款帳號複製按鈕位置
- `2026-02-23` | `c871af3` | fix: 修正 JS 點擊選項導致未定義 currentTarget 中斷的問題
- `2026-02-23` | `76d60b3` | feat: 配送順序調整與轉帳 UX 優化
- `2026-02-23` | `0b1e828` | fix: 付款區塊隱藏條件與選項選取狀態修正
- `2026-02-23` | `22cd3dd` | feat: 整合 LINE Pay、線上轉帳及退款功能
- `2026-02-23` | `00bbe17` | fix: remove checkMacValue from store map callback (unsupported by ECPay logistic map)
- `2026-02-23` | `28809b5` | fix: address 8 priority security and architecture issues
- `2026-02-23` | `37077ce` | chore: backend security hardening (JWT, price calculation, ECPay secrets)
- `2026-02-23` | `b5d95f9` | fix: store redirect and add title styling features
- `2026-02-23` | `f92534a` | feat: dynamic form editing system with brand settings
- `2026-02-23` | `677b722` | fix: remove isInAppBrowser check that calls broken GetStoreList API, and add cache buster to main.html
- `2026-02-23` | `2c8a138` | fix: remove undefined stopStoreMapPolling call in selectDelivery
- `2026-02-23` | `21fa973` | fix: remove non-existent stopStoreMapPolling import that broke entire main page
- `2026-02-23` | `2e18d6b` | fix: detect LINE in-app browser and use store search modal instead of ECPay map to fix blank page
- `2026-02-23` | `625578e` | fix: resolve blank page issue for ECPay map in LINE in-app browser by using same-window redirect and localStorage cart persistence
- `2026-02-23` | `fcd9a17` | fix: resolve undefined store pickup translation and beautify order confirmation/shipping emails with HTML
- `2026-02-23` | `a5c3e93` | fix: add version query string to bypass browser cache for dashboard-app.js
- `2026-02-23` | `f065459` | feat: 支援滑鼠與觸控的商品拖曳排序 (SortableJS)
- `2026-02-22` | `af93b2f` | feat: 模組化重構、新增商品自由排序功能、訂單確認視窗顯示店號與備註
- `2026-02-22` | `17d908f` | refactor: 模組化重構
- `2026-02-22` | `f31ab7d` | fix: 縮小手機底部按鈕 + 規格按鈕加入紅圈數量badge
- `2026-02-22` | `3345a47` | feat: 商品多規格系統 + 購物車 Drawer 改造
- `2026-02-22` | `20ccc78` | feat: 新增 RWD 響應式網頁設計(手機/平板/桌面)
- `2026-02-22` | `8503b98` | style: 交換來店取貨與宅配到府的按鈕順序
- `2026-02-22` | `df1fb94` | fix: 修正來店取貨被判定為無效配送方式
- `2026-02-22` | `f52dc30` | style: 更新來店取貨地圖文字及LINE連結樣式
- `2026-02-22` | `4d57f7c` | style: 更新來店取貨資訊(地址、電話與官方LINE)
- `2026-02-22` | `9a6dfe3` | feat: 新增來店取貨選項並加入營業時間提示
- `2026-02-22` | `574602e` | fix: 後台用戶清單顯示超商店號
- `2026-02-22` | `28a2624` | fix: 超商取貨自動帶入問題與後台店號顯示
- `2026-02-22` | `9cfc855` | feat: 記憶配送偏好至資料庫並顯示於後台
- `2026-02-22` | `0196eaf` | feat: 新增記憶使用者配送偏好設定功能
- `2026-02-22` | `23b148a` | feat: 新增用戶管理與黑名單功能至 dashboard
- `2026-02-22` | `16cab22` | feat(ui): Make email optional with warning and save to local storage
- `2026-02-22` | `e1ac417` | feat: Add Order & Shipping Email Notification via SMTP
- `2026-02-22` | `d4408e8` | Fix ServerReplyURL to use full /functions/v1/ path
- `2026-02-22` | `d1fd336` | Force HTTPS for ECPay ServerReplyURL callback
- `2026-02-22` | `c76eea1` | Switch ECPay logistics from B2C to C2C subtypes
- `2026-02-22` | `78cbe1f` | Update ECPay parameters to production
- `2026-02-22` | `161933f` | chore(api): hardcode ECPay test parameters
- `2026-02-22` | `d617a95` | fix(main): escape script closing tag in JS template to prevent HTML parsing error
- `2026-02-22` | `be03ba9` | fix(dashboard): resolve XSS vulnerability in editCategory and display order notes
- `2026-02-22` | `ff5d2cf` | fix: 修正綠界電子地圖流程與資料表
- `2026-02-22` | `3ef4d30` | fix: 更新 main 與 dashboard 頁面
- `2026-02-22` | `12af433` | 改用門市清單 API 搜尋選擇門市
- `2026-02-22` | `3570cd3` | 新增超商取貨 ECPay 電子地圖門市選擇
- `2026-02-22` | `83f5a9a` | 初次提交：咖啡訂購系統與修復
<!-- MAIN_COMMIT_LOG_END -->
