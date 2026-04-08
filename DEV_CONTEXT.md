# 咖啡訂購系統 - 開發脈絡與狀態紀錄 (Context Tracking)

**這份文件用來記錄專案最近的重要變更、除錯經驗與排版設計決策建立的脈絡。**
為了方便下次進行專案開發或開啟新對話時，讓
AI（Assistant）能快速掌握目前狀態與曾經踩過的坑。

---

## 🛠 給協助審查或接手此專案的 AI 的注意事項

1. **不可輕忽的手機 Cache**：未來如果修改了 js
   代碼但畫面邏輯崩潰，請高度懷疑是瀏覽器快取搗亂。解法是：**只要動了
   js，就必須同時修改 `.html` 引用的 `v=X` 版號**。
2. **事件代理策略**：前台與後台的 inline 事件（`onclick/onchange` 等）已全面改為
   `data-action` + 事件代理。**禁止再加回任何 inline handler**，CI guardrail
   會自動攔截。若新增功能需要按鈕互動，請在 `actionHandlers`（前台）或
   `initializeDashboardEventDelegation` 的 switch（後台）中註冊新
   action。部分函式仍掛載在 `window`
   上，是為了保留舊快取版本的相容性，非必要請勿新增。
3. **繁體中文規則**：所有對話、代碼內的開發邏輯註解（comments）以及 **Git Commit 的註釋訊息（Commit Messages）**，依照過去的強制要求，請一律使用
   **「繁體中文（Traditional Chinese）」**。
4. **SRI 與 E2E 測試衝突**：在 HTML 啟用 SRI (`integrity`) 後，Playwright 的
   `route.fulfill` 攔截 CDN 腳本會導致 hash
   不匹配而被瀏覽器阻擋。**解決方案**：在 `smoke.spec.ts` 的
   `installGlobalStubs` 中，攔截 HTML 並動態移除 `integrity` 與 `crossorigin`
   屬性，確保測試環境能載入 mock 腳本。
5. **Deno 模組解析與 CI**：Deno 不允許在 production/CI 環境（透過 `deno.json`
   控制時）使用 `npm:` 行內前綴或 https URL 的 bare
   specifier。**規範**：依賴一律宣告在 `deno.json` 的 `imports`
   中，程式碼內直接引用別名（如 `import { z } from "zod"`），否則 `deno lint` 與
   `deno check` 會失敗。
6. **分支代碼紀錄追蹤**：從現在起，每次重要更新的同時，必須將 `main` 分支當前最新的版本代碼（Commit Hash）一併紀錄在該次更新區塊或最頂部，以便明確標示部署與進度狀態。
7. **逐筆提交強制規範（不可彙整）**：所有 `main` 分支變更必須逐筆記錄（`日期 + Commit Hash + 訊息`），嚴禁以「本週摘要」、「多筆合併敘述」等彙整方式帶過。若發現漏記，下一次修改必須先補齊遺漏項目再進行新紀錄。
8. **特殊檔案保護**：`google6cb7aa3783369937.html` 是 Google 商品上架必要的驗證檔案。**嚴禁任何刪除或變更**。即便未來進行專案大整理（刪除與網站無關的檔案）時，也必須無條件保留此檔案。

---

## 🚀 近期重大更新（歷史彙整區，僅供回顧）

**目前 `main` 分支最新代碼：請以「逐筆提交紀錄」最後一筆為準。**

## 📜 main 分支逐筆提交紀錄（GitHub 回溯，禁止彙整）

- **資料來源**：`origin/main`
- **紀錄格式**：`YYYY-MM-DD | Commit Hash | Commit Subject`
- **規則**：每一筆 commit 必須保留獨立條目，不可合併摘要。

<!-- MAIN_COMMIT_LOG_START -->
- `2026-04-09` | `39d5dbc` | style: bump version to v67 to force Solarized theme refresh
- `2026-04-09` | `9c36d03` | feat: migrate dashboard theme to Solarized Light
- `2026-04-09` | `44d388e` | feat: Add Google Merchant Center verification file
- `2026-04-07` | `e389b59` | ci: fix email template closure error
- `2026-04-07` | `f23d1f2` | feat: replace email status logic and branding
- `2026-04-07` | `88e2b69` | test: fix E2E for status confirm dialog
- `2026-02-22` | `83f5a9a` | 初次提交：咖啡訂購系統與修復
- `2026-02-22` | `3570cd3` | 新增超商取貨 ECPay 電子地圖門市選擇
- `2026-02-22` | `12af433` | 改用門市清單 API 搜尋選擇門市
- `2026-02-22` | `3ef4d30` | fix: 更新 main 與 dashboard 頁面
- `2026-02-22` | `ff5d2cf` | fix: 修正綠界電子地圖流程與資料表
- `2026-02-22` | `be03ba9` | fix(dashboard): resolve XSS vulnerability in editCategory and display order notes
- `2026-02-22` | `d617a95` | fix(main): escape script closing tag in JS template to prevent HTML parsing error
- `2026-02-22` | `161933f` | chore(api): hardcode ECPay test parameters
- `2026-02-22` | `78cbe1f` | Update ECPay parameters to production
- `2026-02-22` | `c76eea1` | Switch ECPay logistics from B2C to C2C subtypes
- `2026-02-22` | `d1fd336` | Force HTTPS for ECPay ServerReplyURL callback
- `2026-02-22` | `d4408e8` | Fix ServerReplyURL to use full /functions/v1/ path
- `2026-02-22` | `e1ac417` | feat: Add Order & Shipping Email Notification via SMTP
- `2026-02-22` | `16cab22` | feat(ui): Make email optional with warning and save to local storage
- `2026-02-22` | `23b148a` | feat: 新增用戶管理與黑名單功能至 dashboard
- `2026-02-22` | `0196eaf` | feat: 新增記憶使用者配送偏好設定功能
- `2026-02-22` | `9cfc855` | feat: 記憶配送偏好至資料庫並顯示於後台
- `2026-02-22` | `28a2624` | fix: 超商取貨自動帶入問題與後台店號顯示
- `2026-02-22` | `574602e` | fix: 後台用戶清單顯示超商店號
- `2026-02-22` | `9a6dfe3` | feat: 新增來店取貨選項並加入營業時間提示
- `2026-02-22` | `4d57f7c` | style: 更新來店取貨資訊(地址、電話與官方LINE)
- `2026-02-22` | `f52dc30` | style: 更新來店取貨地圖文字及LINE連結樣式
- `2026-02-22` | `df1fb94` | fix: 修正來店取貨被判定為無效配送方式
- `2026-02-22` | `8503b98` | style: 交換來店取貨與宅配到府的按鈕順序
- `2026-02-22` | `20ccc78` | feat: 新增 RWD 響應式網頁設計(手機/平板/桌面)
- `2026-02-22` | `3345a47` | feat: 商品多規格系統 + 購物車 Drawer 改造
- `2026-02-22` | `f31ab7d` | fix: 縮小手機底部按鈕 + 規格按鈕加入紅圈數量badge
- `2026-02-22` | `17d908f` | refactor: 模組化重構
- `2026-02-22` | `af93b2f` | feat: 模組化重構、新增商品自由排序功能、訂單確認視窗顯示店號與備註
- `2026-02-23` | `f065459` | feat: 支援滑鼠與觸控的商品拖曳排序 (SortableJS)
- `2026-02-23` | `a5c3e93` | fix: add version query string to bypass browser cache for dashboard-app.js
- `2026-02-23` | `fcd9a17` | fix: resolve undefined store pickup translation and beautify order confirmation/shipping emails with HTML
- `2026-02-23` | `625578e` | fix: resolve blank page issue for ECPay map in LINE in-app browser by using same-window redirect and localStorage cart persistence
- `2026-02-23` | `2e18d6b` | fix: detect LINE in-app browser and use store search modal instead of ECPay map to fix blank page
- `2026-02-23` | `21fa973` | fix: remove non-existent stopStoreMapPolling import that broke entire main page
- `2026-02-23` | `2c8a138` | fix: remove undefined stopStoreMapPolling call in selectDelivery
- `2026-02-23` | `677b722` | fix: remove isInAppBrowser check that calls broken GetStoreList API, and add cache buster to main.html
- `2026-02-23` | `f92534a` | feat: dynamic form editing system with brand settings
- `2026-02-23` | `b5d95f9` | fix: store redirect and add title styling features
- `2026-02-23` | `37077ce` | chore: backend security hardening (JWT, price calculation, ECPay secrets)
- `2026-02-23` | `28809b5` | fix: address 8 priority security and architecture issues
- `2026-02-23` | `00bbe17` | fix: remove checkMacValue from store map callback (unsupported by ECPay logistic map)
- `2026-02-23` | `22cd3dd` | feat: 整合 LINE Pay、線上轉帳及退款功能
- `2026-02-23` | `0b1e828` | fix: 付款區塊隱藏條件與選項選取狀態修正
- `2026-02-23` | `76d60b3` | feat: 配送順序調整與轉帳 UX 優化
- `2026-02-23` | `c871af3` | fix: 修正 JS 點擊選項導致未定義 currentTarget 中斷的問題
- `2026-02-23` | `6f74a8a` | style: 調整配送文案與匯款帳號複製按鈕位置
- `2026-02-23` | `bf9346f` | feat: 實作匯款帳戶單選並將目標帳號紀錄至訂單與管理後台
- `2026-02-23` | `ccf873e` | fix: 訂單成立視窗改為單獨顯示顧客選擇的匯款帳號
- `2026-02-23` | `07d1999` | feat: 實作下單時檢查帳號停權狀態並顯示原因
- `2026-02-23` | `22f8996` | Add README.md with project rules and update email templates
- `2026-02-23` | `8f830ae` | Remove supabase/ from tracking, update README & .gitignore
- `2026-02-24` | `47f82da` | feat: add home_delivery option with Taiwan zipcode selector
- `2026-02-24` | `d21caff` | docs: add rule to include --no-verify-jwt when deploying supabase functions
- `2026-02-24` | `edcdcd0` | fix: tw-city-selector initialization timing issue causing empty address list
- `2026-02-24` | `94ba0d1` | fix: ensure tw-city-selector initializes on home_delivery click as fallback
- `2026-02-24` | `30fe4ed` | feat: add tracking number input and courier query links for admin
- `2026-02-24` | `2d1147a` | docs: add rule to prevent unauthorized modification of textual content in code
- `2026-02-24` | `ec9ca30` | feat: implement configurable payment routing matrix for each delivery method
- `2026-02-24` | `2e83a89` | fix: add missing cod-option id to allow dynamic hiding of cod payment option
- `2026-02-24` | `91df475` | feat: make delivery options customizable and reorderable from admin dashboard
- `2026-02-24` | `b8d54e7` | feat: allow customizing payment option names and icons from admin dashboard
- `2026-02-24` | `f27ca9a` | Fix bank account selection, enhance security (XSS, CORS, Auth), and apply custom settings
- `2026-02-24` | `b330201` | Enhance delivery preferences restoration on load
- `2026-02-24` | `27cdd8b` | Remove DEPLOY.md
- `2026-02-24` | `142deca` | Update README with modularization and Zod validation rules
- `2026-02-24` | `2a6515f` | Upload all project contents including supabase/ and environment templates
- `2026-02-25` | `b6e75fb` | feat: 新增運費設定與商品促銷功能
- `2026-02-25` | `2f6e23b` | feat: 促銷條件精細化支援依『商品規格』指定活動項目
- `2026-02-25` | `ce8c8d8` | fix: 強化後端型別檢查與空值防護以修復 CI 失敗
- `2026-02-25` | `7c2c71f` | fix: 深度強化後端 API 型別檢查以徹底解決 CI 失敗問題
- `2026-02-25` | `258d47d` | style: 修正 Deno 程式碼格式以通過 CI 檢查
- `2026-02-25` | `9c3da4d` | fix: 優化 Deno Lint 變數定義以完全通過 CI
- `2026-02-25` | `591649a` | fix: 徹底修復 Deno TS Type Check 與 Any 轉型問題
- `2026-02-25` | `1d852f3` | fix: 修正促銷折扣誤發動於未勾選規格的問題 (修復屬性對應錯誤)
- `2026-02-25` | `c66b7c2` | fix: 修正重新整理頁面後購物車丟失折扣活動的問題 (因為狀態尚未載入完成)
- `2026-02-25` | `80f774c` | feat: 商品規格按鈕改版為 In-line Stepper 加減算盤 (移除時還原為加入按鈕)
- `2026-02-25` | `08e43d3` | style: 修正商品規格切換為算盤控制列時的排版塌陷問題 (移除 absolute)
- `2026-02-25` | `2735273` | style: 優化規格按鈕 UI (結合紅點數量標記並放大中央標籤文字)
- `2026-02-25` | `15098a8` | Update project rules and temporarily track supabase folder
- `2026-02-25` | `de5f1ea` | style: bottom bar price layout - apply option B (dynamic badges)
- `2026-02-25` | `4831da0` | feat: refine bottom bar and enhance cart discount details UI
- `2026-02-26` | `0daf2a4` | fix: resolve null submitBtn issue during login by forcing browser cache refresh
- `2026-02-26` | `4fde3fc` | fix: re-add hidden submit-btn to circumvent mobile browser JS caching null crashes
- `2026-02-26` | `81ac7c8` | fix: import cart variable in main-app.js to prevent undefined variable crash on login
- `2026-02-26` | `b24df83` | fix: bump JS version to v7 to invalidate cache for cart variable fix
- `2026-02-26` | `43fc36b` | feat: implement bottom sheet for product variants (Option C)
- `2026-02-26` | `4716bb8` | Revert "feat: implement bottom sheet for product variants (Option C)"
- `2026-02-26` | `345e339` | feat: implement Option A expanding vertically stepper for products
- `2026-02-27` | `dbf00dc` | docs: add DEV_CONTEXT.md to track development state and pitfalls
- `2026-02-27` | `63007e7` | docs: add rule to mandate reading DEV_CONTEXT.md upon project load
- `2026-02-28` | `c3cc8ab` | feat: 改進三 — 前端直連 Supabase 讀取公開資料
- `2026-02-28` | `08fb8fe` | feat: 改進一 + 改進二 — 前端事件代理 & 後端 Hono 路由
- `2026-02-28` | `b0d1301` | style: fix deno fmt errors in index.ts
- `2026-03-01` | `9ad9df6` | fix(ui): correct payment option active class selector and update v=13
- `2026-03-01` | `fa0e3c8` | fix(ci): resolve deno lint errors for unused vars and require-await
- `2026-03-01` | `10d8c68` | docs: add auto-fix rules for CI errors
- `2026-03-01` | `342a5cb` | fix: resolve silent order submission failures - fix cart submit button disabled due to window.state (use ES module state) - throw explicit error on 401 in authFetch - provide fallback error messages in orders.js catch - show descriptive reason on disabled submit button - split backend validation for clearer error messages
- `2026-03-01` | `ea2a743` | fix: reset shipping fee and badges when cart is empty - reorder updateCartUI to check empty cart before calculating totals - add cart.length guard in calcCartSummary shipping calculation - reset all price displays to /bin/zsh when cart is cleared
- `2026-03-01` | `a97a94e` | fix: recalculate shipping fee instantly when switching delivery method - call updateCartUI() at end of selectDelivery() in delivery.js - expose updateCartUI on window in main-app.js - ensures free-shipping badge updates immediately on delivery switch
- `2026-03-01` | `9f7b21d` | docs: update README rule #5 and sync DEV_CONTEXT.md with v12-v16 changes
- `2026-03-01` | `a249428` | fix: import updateCartUI in main-app.js to resolve ReferenceError crashing page load
- `2026-03-01` | `0a9c886` | docs: add v17 fix to DEV_CONTEXT
- `2026-03-01` | `5833456` | feat: show free shipping threshold details in cart discount section
- `2026-03-01` | `caffdf3` | fix: add version parameter to ES module imports in main-app.js to bypass browser cache
- `2026-03-01` | `5f7348b` | fix: resolve ES module fragmentation by appending consistent version query string to all internal imports
- `2026-03-01` | `61c6d03` | fix: correct delivery.js version import in main-app.js and bump all imports to v21 to solve state fragmentation
- `2026-03-01` | `f59da94` | ci: fix deno fmt formatting errors in index.ts and orders.ts
- `2026-03-01` | `011c9f0` | feat: add CI auto-check workflow and update README rule #7 with detailed post-push CI verification steps
- `2026-03-01` | `44c2fda` | feat: integrate PCSC official emap for 7-11 store selection, keep ECPay for FamilyMart
- `2026-03-01` | `21fb8f6` | fix: add localhost origins to CORS allowed list for local development
- `2026-03-01` | `8d53ac2` | fix: use correct PCSC c2cemap.ashx endpoint for 7-11 store map
- `2026-03-01` | `0d575e8` | debug: add PCSC callback field dump to diagnose Miss Token error
- `2026-03-01` | `bfb8c75` | fix: clean up PCSC callback debug, keep robust token extraction
- `2026-03-01` | `3505ff9` | docs: update DEV_CONTEXT, task list, and walkthrough with CI automation and PCSC map integration details
- `2026-03-01` | `7d62d34` | feat: optimize checkout UI - enforce map store selection and add shipping fee difference hint
- `2026-03-01` | `33cd38b` | docs: update README rule #5 to ask before recording to DEV_CONTEXT
- `2026-03-01` | `03a2b02` | fix: bind updateDistricts to window and update delivery address text
- `2026-03-01` | `846d3fc` | docs: record v22 checkout UI optimization and v23 delivery district fix to DEV_CONTEXT
- `2026-03-01` | `c4da49c` | feat(cart): separate shipping fee from discounts and improve free shipping hint
- `2026-03-01` | `5215f70` | docs: record v24 to DEV_CONTEXT and revert README rule to auto-record
- `2026-03-01` | `1eb844d` | fix: correct FRONTEND_URL to include /sc subpath for LINE Pay callback
- `2026-03-02` | `67bc6f8` | feat(cart): enhance shipping fee display with dark red color and threshold text
- `2026-03-02` | `c5fd19e` | docs: record v25 shipping display enhancement to DEV_CONTEXT
- `2026-03-02` | `4fd65e4` | feat: drag-sort categories and sync product category on rename (v26)
- `2026-03-02` | `ac70739` | docs: record v26 category drag-sort and rename sync to DEV_CONTEXT
- `2026-03-02` | `53f2f8e` | refactor: use glob for HTML targets in sync_frontend_version.py
- `2026-03-02` | `02d3865` | refactor: implement event delegation in dashboard and sync frontend version to v27
- `2026-03-02` | `b0e68cc` | feat: event delegation v28-v32, guardrail scripts, E2E smoke tests, delivery legacy cleanup
- `2026-03-02` | `a7192da` | fix(ci): install @playwright/test via npm for proper TS module resolution
- `2026-03-02` | `a7e6eb0` | fix(e2e): block SweetAlert2 CDN to prevent mock override in smoke tests
- `2026-03-02` | `b10b338` | docs: 重新整理 DEV_CONTEXT.md — 按版本倒序排列、精簡內容
- `2026-03-02` | `f971324` | feat(v33): 新增隱私權/退換貨政策頁面 + 下單同意勾選
- `2026-03-02` | `24111bc` | fix: 更新 E2E 測試加入政策勾選步驟 + .gitignore 排除 node_modules
- `2026-03-02` | `815d551` | fix(v34): 更新宅配顯示文字與 Email 格式
- `2026-03-02` | `b716184` | style: deno fmt 修正 api/orders.ts 格式
- `2026-03-05` | `94929ac` | feat(v35): 將動態表單欄位區塊移至配送方式與付款方式之間
- `2026-03-05` | `71ac2e7` | feat(v36): 表單欄位依配送方式顯示/隱藏
- `2026-03-05` | `b859aee` | feat(v37): 移除 phone/email 系統保護 + Email 連動表單欄位 + 標題動態化
- `2026-03-05` | `4f69e04` | fix(v38): 後台配送方式可見性無法顯示
- `2026-03-06` | `94c6541` | feat(v39): 優化訂單通知 Email 寄件人與排版
- `2026-03-07` | `5c6c3dc` | feat(v40): 會員資料功能 — 自動帶入常用資料
- `2026-03-08` | `d3ad068` | fix(v41): 購物車有品項時按鈕文字未更新的問題
- `2026-03-08` | `39b3218` | fix(v42): 解決編輯商品時分類選單可能為空的 Race Condition
- `2026-03-08` | `fdd34c9` | feat(v43): align user management API, fix promotion formulas, and strengthen zod validation
- `2026-03-08` | `ea5c576` | chore: fix deno formatting issues for CI
- `2026-03-08` | `7738ad2` | docs: reorganize DEV_CONTEXT.md timeline and commit v44 changes
- `2026-03-08` | `5520f35` | fix(ci): use deno.json imports for deno lint no-import-prefix
- `2026-03-08` | `ca1ac45` | chore(fmt): run deno fmt on root to fix CI
- `2026-03-08` | `2ceb201` | test(ci): adjust python scripts for v44 dashboard modules structure
- `2026-03-08` | `6c9d1ba` | test(ci): adjust python scripts for main-app double quotes format
- `2026-03-08` | `93f2174` | chore(ci): upgrade setup-deno to v2.x to match local formatting
- `2026-03-08` | `c507107` | fix(ci): use working-directory for deno steps so deno.json is found
- `2026-03-08` | `59faaf8` | feat(v45): security + stability + DX improvements
- `2026-03-09` | `97d9b78` | refactor: backend modularization phase 2, email template extraction, and frontend data source unification (P2-1, P1-4, P2-3)
- `2026-03-09` | `fe26f4a` | chore: bump frontend version to v45
- `2026-03-09` | `2cc99cf` | ci: auto-fix CI errors
- `2026-03-09` | `5032df5` | chore: remove tracked env files
- `2026-03-09` | `b6c6fc8` | fix(security): resolve P0-P2 security and maintenance issues
- `2026-03-09` | `f762598` | fix(frontend): resolve P0/P1 frontend vulnerabilities and idempotency
- `2026-03-09` | `3b830c6` | ci: fix lint no-explicit-any error
- `2026-03-09` | `5ce4368` | feat/fix: advanced P1-P2 security and scalability optimizations
- `2026-03-09` | `759440e` | refactor(frontend): decouple event delegation and API layer from dashboard-app.js (#P2)
- `2026-03-09` | `c0d354b` | ci: auto-fix CI errors, replace bare internal specifiers and unlisted modules
- `2026-03-09` | `3f61932` | test(tools): fix event delegation guardrail path parsing for new events.js
- `2026-03-09` | `498f2c0` | test(e2e): strip SRI attributes in Playwright stubs to fix CDN mock rejection
- `2026-03-09` | `1c8b471` | ci: restore bare specifier imports in test files for deno lint compliance
- `2026-03-09` | `bbd01fa` | chore: enable deno in vscode settings and update dev context
- `2026-03-09` | `ba19e85` | fix: remove SRI attributes from tailwind CDN to fix CORS blockage and bump version to 46
- `2026-03-09` | `51e7a80` | feat: 升級訂單中心並新增顧客訂單追蹤頁
- `2026-03-09` | `cbb3ac6` | fix: 保留批次付款狀態清空值
- `2026-03-09` | `2fa5e57` | feat: 移除追蹤頁並擴充出貨物流資訊
- `2026-03-09` | `1bdd2c3` | chore: 重整 migration 版號避免重複衝突
- `2026-03-09` | `49b050b` | fix(dashboard): avoid premature order status updates from dropdown
- `2026-03-09` | `1e245f9` | feat(orders): add tracking number copy action for customers
- `2026-03-09` | `a97019a` | feat(email): simplify confirmation title and add tracking copy button
- `2026-03-09` | `d27664c` | chore(email): format template for backend ci
- `2026-03-09` | `3692944` | fix(email): normalize site title by removing confirmation suffix
- `2026-03-09` | `5863543` | docs(context): record v51 order and email updates
- `2026-03-09` | `5667df5` | chore: test ci auto fix workflow
- `2026-03-09` | `80d3734` | chore(ci): auto-fix deno formatting
- `2026-03-09` | `997b3a3` | chore(ci): remove generated test error
- `2026-03-09` | `d5b7aea` | chore(ci): auto-fix deno formatting
- `2026-03-09` | `866d6b0` | fix(db): move pg_trgm to extensions schema to resolve security warning
- `2026-03-10` | `4916573` | feat(api): refactor quote engine and add unit tests
- `2026-03-10` | `b5b9359` | chore(ci): auto-fix deno formatting
- `2026-03-10` | `2aa74c4` | fix(ci): add mock environment variables to test step
- `2026-03-10` | `1df5453` | fix(api): expose linepay_sandbox to admin in getSettings
- `2026-03-10` | `6b0d99b` | fix: keep linepay sandbox toggle state after save
- `2026-03-11` | `28d4441` | fix: stabilize settings flow and clean dashboard dead code
- `2026-03-11` | `099a4b7` | feat: support drag-and-drop sorting for bank accounts
- `2026-03-11` | `fe486e7` | feat: migrate frontend shell to Vite + Vue 3
- `2026-03-11` | `f38f21c` | docs: record Vite+Vue3 migration audit status
- `2026-03-11` | `0c59ad9` | refactor: mount all pages via Vue SFC components
- `2026-03-11` | `4dfcbaf` | refactor: start phase2 vue-driven main storefront flow
- `2026-03-11` | `b005659` | feat(dashboard): vue bridge categories users blacklist
- `2026-03-11` | `606a91d` | feat(dashboard): vue bridge products promotions formfields
- `2026-03-11` | `d3da416` | fix(ci): auto init legacy pages for smoke tests
- `2026-03-11` | `01fcf14` | refactor(vite): align runtime and ci with vue3 architecture
- `2026-03-11` | `8c9b886` | docs: sync project rules from DEV_CONTEXT and remove legacy rules
- `2026-03-11` | `a3d410c` | fix(ci): avoid lockfile-dependent node setup in workflow
- `2026-03-11` | `0b0edbf` | chore: setup keep-alive.yml to prevent Supabase project from pausing
- `2026-03-14` | `67c7eeb` | ci: optimize keep-alive workflow and clean up legacy logs
- `2026-03-14` | `60e8cd1` | ci: fix syntax warnings in keep-alive workflow
- `2026-03-25` | `70b6446` | chore: save state before icon upgrade
- `2026-03-26` | `1dec545` | fix(cors): 加入 localhost:5173 至 CORS 允許清單以支援 Vite 開發伺服器
- `2026-03-26` | `ab8963c` | chore: 清理專案，移除閒置備份與一次性測試腳本
- `2026-04-03` | `708c840` | feat: replace emoji UI with PNG icons and reka-based admin refresh
- `2026-04-03` | `5c1f7da` | chore: format settings api for ci fmt check
- `2026-04-03` | `b3295dc` | feat: unify admin modals with ui components and add icon library
- `2026-04-05` | `2e64a99` | feat: regenerate icon pack with flatter minimalist style
- `2026-04-06` | `cb0eaca` | docs: update DEV_CONTEXT with v62 icon redesign record
- `2026-04-06` | `fb9fd80` | fix: ensure generated icons work for legacy /icons path
- `2026-04-06` | `eb46ad1` | fix: rebalance icon proportions across storefront and dashboard
- `2026-04-06` | `7fd46fc` | fix: reduce payment method icon size for better visual balance
- `2026-04-06` | `fdd7226` | fix: correct shipping and discount display conditions in cart UI
- `2026-04-06` | `0649093` | fix: further reduce payment icon footprint in checkout cards
- `2026-04-06` | `8bb890d` | fix: align legacy payment icon containers with modern option-icon sizing
- `2026-04-06` | `5728a8f` | fix: unify payment and delivery icon sizing in storefront cards
- `2026-04-06` | `c61febc` | fix: match payment card sizing with delivery and restore check icon
- `2026-04-06` | `b697c4c` | fix: bump frontend cache version and verify shipping/discount across browsers
- `2026-04-06` | `7c19f32` | style: center align text in delivery and payment option cards
- `2026-04-07` | `2c8ad69` | add logo.png
- `2026-04-07` | `f23d1f2` | feat: replace supabase icons with local logo overriding logic and bump version
- `2026-04-07` | `168427e` | docs: update DEV_CONTEXT.md for v73 icon upgrade
- `2026-04-07` | `0981a5f` | fix: update hardcoded brand-coffee.png to logo.png in Vue templates and supply missing Vite asset
- `2026-04-07` | `71f95eb` | docs: track main branch commit hash in DEV_CONTEXT.md
- `2026-04-07` | `4747540` | fix: restore icon replacement flow and sync brand logo updates
- `2026-04-07` | `ce5ca7f` | docs: update DEV_CONTEXT latest main commit hash
- `2026-04-07` | `92f22dc` | docs: enforce per-commit main log and backfill origin/main history
- `2026-04-07` | `77f9753` | feat: apply local /sc/icons/logo.png for brand icon and remove upload size cap
- `2026-04-07` | `08e4595` | docs: append latest main commit to per-commit log
- `2026-04-07` | `e3c2488` | ci: auto-fix CI errors
- `2026-04-07` | `c4b0822` | fix: remove Supabase logo upload and site_icon_url, favicon now always uses local icons/logo.png
- `2026-04-07` | `609a9b3` | fix: replace emoji section titles with PNG icons and skeleton loading for professional initial page load
- `2026-04-07` | `5a761cc` | fix: prevent path duplication in resolveAssetUrl causing /sc/sc/icons/ 404s
- `2026-04-07` | `8a11f03` | update: change fallback site title and subtitle to Script Coffee
- `2026-04-07` | `50e6b77` | fix: increase drag icon size and resolve absolute paths in Vue files
- `2026-04-07` | `5e9c9f3` | docs: 新增 Git Commit 註釋需使用繁體中文之強制規定
- `2026-04-07` | `54716b3` | ci: auto-fix CI errors
- `2026-04-07` | `cd053ce` | chore: 修復 drag 圖示為 inline SVG 及還原隨時上傳 Logo 功能
- `2026-04-07` | `bf32caf` | docs: 記錄 drag 圖示與 Logo 上傳之修復紀錄於 DEV_CONTEXT.md
- `2026-04-07` | `06f8871` | fix: import resolveAssetUrl in form-renderer.js
- `2026-04-07` | `79afde0` | docs: 記錄 js/form-renderer.js 的熱修復
- `2026-04-07` | `3f54fb5` | fix(ui): correct logo upload button click delegation and bind reset logo event
- `2026-04-07` | `6ca5675` | docs: 記錄 ui 修復紀錄於 DEV_CONTEXT.md
- `2026-04-07` | `e1ede02` | feat(ui): add explicit upload button for site logo
- `2026-04-07` | `e18ded5` | docs: track UI button commit
- `2026-04-07` | `07694d0` | fix(ui): ignore file type inputs in global click delegator to allow native file picker dialogs
- `2026-04-07` | `516bbed` | docs: track file dialog hotfix
- `2026-04-07` | `f06d1da` | 修正：新增電子郵件格式檢查機制並補上會員資料儲存前驗證
- `2026-04-07` | `d48a2b0` | 功能：新增索取收據流程並同步訂單後台與 Email 顯示
- `2026-04-07` | `f45b06c` | 調整：收據欄位順序改為統一編號優先並同步前後台與 Email
- `2026-04-07` | `c7cb1ca` | 修正：將收據資訊併入訂單內容並同步 Email 明細
- `2026-04-07` | `25f18c3` | fix: remove duplicated receipt section in order content
- `2026-04-07` | `bd1ba43` | chore: bind project deploy commands to fixed supabase settings
- `2026-04-07` | `9d8905d` | chore: make supabase scripts load project-local credentials
- `2026-04-07` | `029a8f3` | 文件：同步專案綁定流程到 README 與 DEV_CONTEXT
- `2026-04-07` | `ad4664e` | 設定：初始化 RTK（Codex）專案檔案
- `2026-04-07` | `bfd6c4c` | feat: 新增訂單狀態變更確認流程與 LINE Flex Message 產生器
- `2026-04-07` | `88e2b69` | test: 修復訂單確認 UI 改動導致 E2E 測試報錯 (移除 mock 失效的 Swal 點擊等待)
<!-- MAIN_COMMIT_LOG_END -->

### 📅 v67 — 後台配色遷移至 Solarized Light (暖色調優化)

- **優化背景**
  - 使用者反應原本的「企業藍」配色（Enterprise Light）在淺色主題下過於突兀，特別是藍色文字與純白背景的對比。
  - 將整體配色切換為經典的 **Solarized Light** 風格：
    - 背景：`#FDF6E3` (Base3)
    - 側邊欄與表格標題：`#EEE8D5` (Base2)
    - 主要文字：`#586E75` (Base01)
    - 主要按鈕與連結：`#268BD2` (Solarized Blue)
- **視覺修究**
  - 將所有硬編碼的深藍色 (`#1E293B`) 替換為深灰綠色 (`#073642`)，使整體視覺更柔和一致。
  - 調整按鈕漸層為 Solarized Blue 系列，懸浮狀態改為 Cyan 色調。
  - 修正 Modal 遮罩層顏色，由深藍灰改為深色 Solarized。
- **強制快取刷新**
  - 前端版本號由 `v=60` 跳升至 `v=67`（中間包含多次微調測試），確保所有瀏覽器（特別是 Safari）能立即載入新的 Solarized 樣式。
- **驗證**
  - 使用 Browser Subagent 擷取 `dashboard.html` 畫面，確認米黃色背景與藍色標題已正確生效。

### 📅 v66 — 保護 Google 驗證檔案與基礎設施維護

- **GoogleMerchantCenter 驗證**
  - 新增並保護 `google6cb7aa3783369937.html`，此檔案嚴禁刪除與修改。
  - 於 `README.md` 與 `DEV_CONTEXT.md` 建立永久保留規則。
- **基礎設施**
  - 同步 origin/main 的最新變更，包含修正 email 模板語法錯誤與 CI 穩定化。

### 📅 v77 — 補強專案級 GitHub / Supabase 綁定與交接文件

- **需求背景**
  - 使用者在切換不同專案後，會遇到 `origin` SSH 身分混用、Supabase CLI 登入狀態互相覆蓋，導致部署時權限或連線不穩定。
- **已落地修正**
  - GitHub：
    - 專案 `origin` 固定為 `git@github-scriptcoffeeshop:scriptcoffeeshop/sc.git`。
    - 專案 local git config 固定 `core.sshCommand=ssh -i ~/.ssh/id_ed25519 -o IdentitiesOnly=yes`。
    - `~/.ssh/config` 補齊 `Host github-scriptcoffeeshop` 專用設定（`IdentityFile` / `IdentitiesOnly` / `UseKeychain`）。
  - Supabase：
    - 新增 `scripts/supabase_deploy.sh`、`scripts/supabase_db_push.sh`，固定 `project-ref=avnvsjyyeofivgmrchte` 並統一從專案根目錄讀取 `.env.supabase.local`。
    - `package.json` 新增/調整：
      - `npm run supabase:deploy`
      - `npm run supabase:db:push`
      - `npm run deploy` 也改走上述封裝腳本。
    - `.env.supabase.local` 作為本機專案憑證來源（`SUPABASE_ACCESS_TOKEN` / `SUPABASE_DB_PASSWORD` / `SUPABASE_PROFILE`），且由 `.env.*` 自動忽略，不入版控。
- **驗證結果**
  - 在執行 `supabase logout --yes` 後，仍可透過 `bash scripts/supabase_db_push.sh --dry-run` 成功連線並取得 `Remote database is up to date.`，確認已達成「專案級獨立憑證」目標。
  - `npm run guardrails` 通過。

### 📅 v76 — 優化首屏載入體驗與修復拖曳圖示 / 標題顯示問題

- **問題描述**
  - 首頁在資料載入前會閃現預設的「咖啡豆訂購」與舊版 emoji 標題，且商品載入文字較為生硬。
  - GitHub Pages 部署環境下會發生 `/sc/sc/icons/` 的路徑拼接錯誤，導致圖示 404 破圖。
  - 後台 Vue 頁面中商品管理的拖曳排序圖示因為絕對路徑 `/icons/` 導致載入失敗 (404)。
  - 拖曳排序的圖示尺寸過小不易點擊。
- **修正**
  - **首屏與載入優化**：
    - 將預設網站標題與副標題由「咖啡豆訂購 / 新鮮烘焙・產地直送」變更為「Script Coffee / 咖啡豆 | 耳掛」。並同步修改所有環境的 `<title>`。
    - 移除首頁 `main.html` 及 `MainPage.vue` 的 emoji 區塊前綴，改用本地 PNG 圖示預設顯示。
    - 將生硬的「載入商品中...」替換成 Skeleton (骨架屏) 脈動動畫。
  - **路徑防錯處理**：
    - 在 `js/icons.js` 的 `resolveAssetUrl` 加入去重複邏輯，若路徑已包含 base 子目錄名稱則不疊加，避免 `/sc/sc/` 雙重路徑。
    - 一次性修復所有 Vue 檔案（`DashboardPage.vue`, `MainPage.vue` 等）及 HTML 內寫死的絕對路徑 `/icons/`，變更為相對路徑 `icons/` 以適應不同部屬環境。
  - **拖曳圖示優化**：
    - 在 `css/common.css` 中將 `.drag-handle-icon` 與 `.drag-handle-icon-sm` 的長寬加大至 `1.5rem` 與 `1.25rem`，並提高 opacity 讓使用者更易辨識點擊。
  - 前端快取版號升級為 `v=60`（同步 `.frontend-version`, `.html`, 腳本等）。
- **驗證**
  - 使用 Browser Subagent 模擬 GitHub Pages 環境載入並擷取圖片，確認標題修正、圖示不破圖、骨架屏正常運作。
  - 本地 CI / Linter / Tests 全數通過。

### 📅 v75 — 後台品牌 Icon 改為套用本地 `/sc/icons/logo.png` + 取消 500KB 限制

- **需求**
  - 後台品牌 icon 上傳流程需改成走本地 `/sc/icons/` 路徑，避免再顯示 Supabase Storage 長網址。
  - 直接套用 `logo.png`，並移除前端 500KB 上傳限制。
  - 確認 Chrome 頁籤 icon 使用 `logo.png`。
- **修正**
  - `supabase/functions/coffee-api/api/settings.ts`
    - `uploadSiteIcon` 改為直接寫入 `coffee_settings.site_icon_url = "icons/logo.png"` 並回傳該路徑。
    - 回傳訊息明確標示已套用 `/sc/icons/logo.png`。
  - `js/dashboard-app.js`
    - 品牌 icon 上傳改呼叫 `?action=uploadSiteIcon`。
    - 移除 500KB 檔案大小限制，只保留圖片格式檢查。
    - 品牌 icon URL 顯示改為解析後路徑（可看到 `/sc/icons/logo.png`）。
  - `main.html`、`dashboard.html`、`frontend/*.html`
    - 補上 `link#dynamic-favicon` 預設指向 `logo.png`，確保頁籤 icon 預設為品牌圖示。
  - 快取版號升級至 `v=56`（`.frontend-version`、`main.html`、`dashboard.html`）。
- **驗證**
  - `npm run build` 通過。
  - `npm run guardrails` 通過。
  - `npm run e2e` 通過（6/6）。
  - Chromium 環境檢查受 sandbox 限制無法穩定直接啟動 headless shell；已改以 `link#dynamic-favicon` 與實際輸出檔案路徑雙重確認為 `icons/logo.png`。

### 📅 v74 — 修正 logo 套用與後台 icon 可替換性（移除過度強制映射）

- **問題描述**
  - `resolveAssetUrl` 將所有 `supabase.co/storage` 圖示網址都強制改成 `icons/logo.png`，導致後台上傳付款/配送/品牌圖示後看起來無法替換（永遠顯示 logo）。
  - 後台頁首與登入區品牌圖示未與設定同步，造成「已更新品牌 icon 但後台不變」的感受。
- **修正**
  - `js/icons.js`：移除 `resolveAssetUrl` 針對 Supabase URL 的全域強制替換邏輯，恢復正常使用實際圖示網址。
  - `js/dashboard-app.js`：新增 `syncDashboardBrandIcons`，在載入設定與更新 `s-site-icon-url` 時同步更新後台登入/頁首/品牌設定標題圖示。
  - `frontend/src/pages/DashboardPage.vue` 與 `dashboard.html`：補上後台品牌圖示節點 ID（`dashboard-login-logo`、`dashboard-header-logo`、`settings-brand-logo`）供同步更新。
  - `js/form-renderer.js`：favicon 改用 `resolveAssetUrl(site_icon_url || brand fallback)`，確保本地 `icons/logo.png` 與自訂 icon 都能正確套用。
  - `main.html`：預設 `#site-icon` 改為 `logo.png`，避免 legacy 首屏仍顯示舊 emoji。
  - 前端快取版號升級為 `v=55`（`.frontend-version`、`main.html`、`dashboard.html` 同步）。
- **驗證**
  - `npm run build` 通過。
  - `npm run guardrails` 通過。

### 📅 v73 — 替換 Supabase 遠端圖示為本地 GitHub 同步圖示

- **需求描述**
  - 將原本位於 Supabase Storage 上的品牌或網站圖示替換成本地路徑，並直接將新設計的 `logo.png` 同步儲存至 GitHub 存儲庫內（`sc/icons/logo.png`）。
- **修正與異動**
  - 使用 `git` 提交了未追蹤的本地檔案 `icons/logo.png` 並推送到遠端儲存庫。
  - `js/icons.js` 修改：
    - `ICON_FILE_MAP` 中的 `brand` 預設鍵值導向 `icons/logo.png`。
    - `resolveAssetUrl(rawUrl)` 新增替換邏輯：若檢測到傳統的 `supabase.co/storage` 網址字串，將自動截斷並強制導向 `icons/logo.png`，避免遠端圖示錯誤影響前台服務。
  - `前端快取版號`：配合 `js/icons.js` 異動，已將 `.frontend-version` 進版至 `v=54`，並透過腳本同步更新 `.html`。
- **驗證**
  - `npm run build` 與 `npm run guardrails` 通過。

### 📅 v72 — 配送/付款卡片文字置中對齊（桌機與手機一致）

- **需求**
  - 配送方式與付款方式卡片內文需統一置中，避免不同裝置下文字對齊不一致。
- **修正**
  - `css/main.css` 在 `.delivery-option, .payment-option` 基礎樣式新增 `text-align: center;`。
  - 使桌機/手機都沿用同一置中規則，維持配送與付款兩區視覺一致。
- **驗證**
  - `npm run build` 通過。
  - `npm run guardrails` 通過。

### 📅 v71 — Safari/跨瀏覽器檢查與快取版號修正（運費/折扣顯示）

- **問題判斷**
  - 使用者回報 Safari 顯示「運費/折扣不更新」，Chrome 正常。
  - 程式邏輯在跨瀏覽器 smoke 測試（Chromium/WebKit/Firefox）可正常通過，問題主因判定為快取版本未刷新。
- **修正**
  - 前端版號由 `v=52` 升至 `v=53`（`.frontend-version`、`main.html`、`dashboard.html` 同步）。
  - 強制瀏覽器（特別是 Safari）重新抓取最新入口模組，避免沿用舊快取導致顯示落後。
- **驗證**
  - `npm run build` 通過。
  - `npm run guardrails` 通過。
  - `npx playwright test tests/e2e/smoke.spec.ts --config=playwright.config.ts --browser=all` 通過（18/18）。

### 📅 v70 — 對齊付款/配送卡片尺寸並修正付款勾選圖示 404

- **問題描述**
  - 付款方式卡片在桌機下比配送方式卡片寬，整體方框比例不一致。
  - 付款卡片右上角勾選圖示在特定路徑環境下顯示為破圖（`selected-check.png` 載入失敗）。
- **修正**
  - `frontend/src/pages/MainPage.vue` 與 `main.html`：將付款區塊 grid 由 `lg:grid-cols-3` 改為 `lg:grid-cols-5`，與配送區塊一致。
  - `frontend/src/pages/MainPage.vue`：勾選圖示改用 `getDefaultIconUrl("selected")` 動態路徑，避免 Vite 與部署子路徑的資源解析差異。
  - `main.html`：勾選圖示路徑改為相對路徑 `icons/selected-check.png`，避免絕對路徑造成 404。
- **驗證**
  - `npm run build` 通過。
  - `npm run guardrails` 通過。
  - `npm run e2e` 通過（6/6）。

### 📅 v69 — 統一付款/配送 Icon 尺寸規則（移除付款專屬縮放）

- **問題描述**
  - 付款方式 icon 經過多次局部縮放後，和配送方式 icon 產生明顯比例落差，視覺看起來不協調。
- **修正**
  - `css/main.css` 移除 `.payment-option .option-icon` 與其內部 `.ui-icon-img` 的專屬尺寸覆寫。
  - 付款與配送改為共用同一套 `.option-icon` 尺寸規則，確保卡片圖示比例一致。
- **驗證**
  - `npm run build` 通過。
  - `npm run guardrails` 通過。

### 📅 v68 — 修正 Legacy 主頁付款 Icon 結構（避免圖示被放大）

- **問題根因**
  - 使用 `main.html`（legacy）時，付款 icon 容器仍是舊結構 `text-2xl mb-2`，不是 `.option-icon`。
  - `main-app.js` 以 `setIconElement` 注入 PNG 後，圖示缺少固定容器尺寸，視覺上被放大到不符合整體比例。
- **修正**
  - 將 `main.html` 付款區塊三個選項（`cod/linepay/transfer`）改為與新版一致：
    - `check-mark` 改為 `<img class="ui-icon-img">`
    - icon 容器改為 `<div class="option-icon" ...>`
    - 補上對應預設 PNG 圖示
- **驗證**
  - `npm run build` 通過。
  - `npm run guardrails` 通過。

### 📅 v67 — 再次微調付款方式 Icon 尺寸（縮小本體占比）

- **問題描述**
  - 付款方式卡片 icon 在前版調整後，視覺權重仍偏大，與卡片文字層級不平衡。
- **修正**
  - `css/main.css` 進一步縮小 `.payment-option .option-icon` 容器尺寸。
  - 新增 `.payment-option .option-icon .ui-icon-img` 規則，獨立下修圖示本體占比（桌機/手機分開設定）。
  - 調整 mobile `margin-bottom`，讓 icon 與文案間距更自然。
- **驗證**
  - `npm run build` 通過。
  - `npm run guardrails` 通過。

### 📅 v66 — 修正折扣/運費顯示判斷（避免無運費規則時誤顯示免運）

- **問題描述**
  - 前台在部分配送設定下（例如未設定免運門檻、固定運費規則不完整）會出現「免運費」或「未達免運門檻」誤判，導致折扣與運費顯示看起來不正確。
- **修正**
  - `js/cart.js` 新增運費顯示狀態判斷，僅在「有運費規則（基本運費/免運門檻）」時顯示運費標籤。
  - 將「未達免運門檻」文案改為僅在有門檻時顯示；若無門檻但有運費，改顯示「配送方式運費」。
  - `frontend/src/pages/MainPage.vue` 同步調整 Vue 端條件（`showShippingBadge` / `isFreeShipping` / `showShippingNotice`），確保與 `cart.js` 一致。
- **驗證**
  - `npm run build` 通過。
  - `npm run guardrails` 通過。
  - `npm run e2e` 通過（6/6）。

### 📅 v65 — 微調付款方式 Icon 尺寸（修正前台卡片視覺過大）

- **問題描述**
  - 前台付款方式卡片中的 icon 在新版比例調整後視覺偏大，與文字與卡片留白不平衡。
- **修正**
  - `css/main.css` 新增 `.payment-option .option-icon` 專屬尺寸覆寫，僅縮小付款 icon，不影響配送 option 的圖示比例。
  - 行動版同步調整付款 icon 尺寸與下方間距，避免小螢幕壓迫感。
- **驗證**
  - `npm run build` 通過。
  - `npm run guardrails` 通過。

### 📅 v64 — 調整扁平化 Icon 比例（圖形放大與前後台顯示尺寸對齊）

- **問題描述**
  - 扁平化 icon 套用後，部分場景（導覽列、區塊標題、付款/配送卡片、後台預覽）出現圖形視覺偏小與比例不協調。
- **修正**
  - `scripts/generate_icons.py` 新增圖形層放大（`GLYPH_SCALE`），讓圖示主體在底板中佔比更合理，並重新生成全部 icon（`frontend/public/icons` 與 `icons`）。
  - `css/common.css` 調整共用 icon 尺寸：`ui-icon-inline / ui-icon-inline-lg / ui-icon-title`，統一前後台縮放比例。
  - `css/main.css` 調整前台 icon 容器（`#site-icon`、`.option-icon`、`.check-mark`），移除雙重外框造成的視覺壓縮。
  - `css/dashboard.css` 將後台 `.icon-upload-preview` 由 `object-fit: cover` 改為 `contain`，避免預覽裁切導致比例失真。
- **驗證**
  - `npm run build` 通過。
  - `npm run guardrails` 通過。

### 📅 v63 — 修復扁平化 Icon 在 Legacy 路徑無法顯示（補齊 `/icons` 相容輸出）

- **問題根因**
  - `js/icons.js` 的預設圖示路徑使用 `icons/*.png`，在 legacy 靜態路徑下會請求 `/icons/...`。
  - 先前僅產出 `frontend/public/icons/`，專案根目錄缺少 `icons/`，導致部分環境發生 404 而顯示不到圖示。
- **修正**
  - `scripts/generate_icons.py` 改為雙路徑輸出：`frontend/public/icons/` 與 `icons/`。
  - 重新生成 icon，兩個目錄皆有完整 33 張 PNG，確保 Vite/Legacy 兩種載入模式都可顯示。
- **驗證**
  - `npm run build` 通過。

### 📅 v62 — Icon 視覺扁平化重製（全站 PNG 全量替換 + 自動生成腳本）

- **Icon 全量替換（扁平 / 簡約）**
  - 以同一套視覺語言重製 `frontend/public/icons/` 下 33 張 PNG，統一為扁平化底色 + 線性圖形，移除舊版高光與浮雕感。
  - 主要涵蓋品牌、導覽、物流、金流、狀態與操作圖示，並維持既有檔名與對應鍵值，避免前端映射斷裂。
- **新增可重複產生工具**
  - 新增 `scripts/generate_icons.py`，可一鍵重生整套 icon，降低後續改風格的人工作業成本。
  - 支援 `--preview` 產生預覽圖（`/tmp/generated-icon-sheet.png`）供快速目視檢查。
- **版本控制**
  - 已 commit 並 push 至 `main`：`2e64a99`（`feat: regenerate icon pack with flatter minimalist style`）。
- **驗證**
  - `npm run build` 通過。
  - `npm run guardrails` 通過。
  - `npm run e2e` 通過（6/6）。

### 📅 v61 — 修復 GitHub CI `Setup Node.js` 失敗（lockfile 相依調整）

- **根因**
  - Workflow 在 `actions/setup-node` 啟用了 `cache: npm`，且安裝使用 `npm ci`。
  - 但專案 `.gitignore` 目前忽略 `package-lock.json`，Runner 上不存在 lockfile，導致 Node setup/安裝流程在 CI 失敗。
- **修正**
  - `.github/workflows/ci.yml` 移除 `cache: "npm"` 設定。
  - `Install frontend dependencies` 由 `npm ci` 改為 `npm install`，避免 lockfile 硬相依。
- **驗證**
  - 本機 `npm run e2e` 通過（6/6）。
  - 本機 `npm run guardrails` 通過。

### 📅 v60 — 執行架構全面切換至 Vite + Vue3（CI / E2E / Guardrails）

- **測試與 CI 執行路徑改為 Vite**
  - `playwright.config.ts` 的 webServer 改為 `npm run dev -- --host 127.0.0.1 --port 4173 --strictPort`，不再使用 `python3 -m http.server`。
  - `.github/workflows/ci.yml` 改為 `npm ci` 後執行 Playwright，移除 CI 內 `npm init -y` 臨時流程。
- **Guardrails 檢查目標切到 Vue Page Template**
  - `scripts/check_main_event_delegation.py`：改檢查 `frontend/src/pages/MainPage.vue`。
  - `scripts/check_dashboard_event_delegation.py`：改檢查 `frontend/src/pages/DashboardPage.vue`。
  - 事件代理與 `data-action` 規則從 legacy HTML 轉為 Vue 模板為主。
- **修正 Vite 下模組雙實例問題**
  - 將 `js/` 內部 import 的 `?v=52`（含舊版 `?v=51`）統一移除，避免同一模組因 query string 差異被載入成不同實例（例：`cart.js` 在 Vue 與 legacy 初始化中狀態分裂）。
  - 這項修正直接解掉 Vue 路徑下「加入購物車後送單按鈕仍顯示購物車為空」的行為不一致。
- **E2E smoke 測試同步更新**
  - `tests/e2e/smoke.spec.ts` selector 對齊 Vue 元件結構（商品加購按鈕、底部購物車按鈕）。
  - 補上購物車 localStorage 輪詢斷言，降低非同步更新造成的測試不穩定。
- **樣式修正**
  - `css/dashboard.css` 新增 `.modal-overlay.hidden { display: none !important; }`，修正 hidden modal 仍攔截點擊事件。
- **驗證**
  - `npm run e2e` 通過（6/6）。
  - `npm run guardrails` 通過。
  - `npm run build` 通過。
  - `npm run ci-local` 通過。

### 📅 v59 — 第二階段延伸：Dashboard 商品/促銷/表單改由 Vue 元件渲染

- **Dashboard 三個區塊改為 Vue 接管**
  - `DashboardPage.vue` 的商品管理清單、促銷活動清單、表單欄位清單改為 `v-for` / `v-if` 模板渲染。
  - 所有互動操作維持 `data-action`，沿用既有事件代理，不加 inline handler。
- **Legacy 模組新增 Vue 橋接事件與 view model**
  - `dashboard-app.js` 新增：
    - `coffee:dashboard-products-updated`
    - `coffee:dashboard-promotions-updated`
    - `coffee:dashboard-formfields-updated`
  - 保留非 Vue 模式 fallback `innerHTML` 渲染，確保相容性。
- **拖曳排序在 Vue 模式下維持可用**
  - 商品：依分類 `tbody.sortable-tbody` 重新掛載 `Sortable`。
  - 促銷：`#promotions-table` 重新掛載 `Sortable`。
  - 表單欄位：`#formfields-sortable` 重新掛載 `Sortable`，並統一 destroy/re-init，避免重複實例。
- **驗證**
  - `npm run build` 通過。
  - `npm run guardrails` 通過。

### 📅 v58 — 第二階段延伸：Dashboard 分類/用戶/黑名單改由 Vue 元件渲染

- **Dashboard 三個管理區塊改為 Vue 接管畫面**
  - `DashboardPage.vue` 的分類清單、用戶表格、黑名單表格改為 `v-for` / `v-if` 模板渲染。
  - 保留既有 `data-action` 介面，沿用 `js/dashboard/events.js` 事件代理，不新增 inline 事件。
- **Legacy 模組加入 Vue 橋接事件**
  - `dashboard-app.js` 新增：
    - `coffee:dashboard-categories-updated`
    - `coffee:dashboard-users-updated`
    - `coffee:dashboard-blacklist-updated`
  - 各自輸出 view model 供 Vue 渲染，並保留非 Vue 模式 fallback HTML 渲染路徑。
- **分類拖曳排序相容**
  - 分類區新增 `initializeCategorySortable`，在 Vue 接管模式下於資料更新後重新掛載 `Sortable`。
  - 空資料時會先銷毀既有排序實例，避免殘留狀態。
- **驗證**
  - `npm run build` 通過。
  - `npm run guardrails` 通過。

### 📅 v57 — 第二階段啟動：前台商品與購物車邏輯改由 Vue 元件渲染

- **前台主流程改為 Vue 控制渲染**
  - `MainPage.vue` 商品列表改為 Vue `v-for` + `@click` 直接控制（不再依賴商品區 `innerHTML`）。
  - `MainPage.vue` 購物車內容、優惠/運費提示、總額區塊改為 Vue 模板渲染。
  - 購物車操作（加減數量、移除、開關抽屜、送單入口）改為 Vue 事件綁定。
- **Legacy 模組加入 Vue 橋接事件**
  - `products.js` 新增 view model 組裝與 `coffee:products-updated` 事件，支援 Vue 直接接管商品區。
  - `cart.js` 新增 `coffee:cart-updated` 事件與快照輸出，讓 Vue 接收購物車/總額/優惠資料。
  - `cart.js` 補上 `default` 規格回退邏輯，避免無規格商品無法加入購物車。
- **初始化策略調整**
  - `main-app.js`、`dashboard-app.js` 移除自動 `DOMContentLoaded` 啟動，改為由 Vue 頁面 `onMounted` 顯式初始化。
- **驗證**
  - `npm run build` 通過。
  - `npm run guardrails` 通過。

### 📅 v56 — 全頁面改為 Vue 元件掛載（移除 Legacy HTML 載入器）

- **三個頁面改為 Vue SFC 實體頁面**
  - 新增 `frontend/src/pages/MainPage.vue`、`DashboardPage.vue`、`PolicyPage.vue`。
  - `main/dashboard/policy` 的 body 結構已遷移至 Vue template，頁面初始化改由元件生命週期 (`onMounted`) 觸發。
- **移除 LegacyPage 與同步腳本**
  - 刪除 `frontend/src/components/LegacyPage.vue`。
  - 刪除 `scripts/sync_legacy_to_vite.js`，`package.json` 同步移除 `sync:legacy/predev/prebuild`。
  - 不再依賴 `frontend/public/legacy` 靜態鏡像。
- **入口與樣式策略更新**
  - `frontend/src/entries/*.js` 改為直接掛載 `pages/*.vue`。
  - `common/main/dashboard` CSS 改由 entry 透過 ES module import 打包，不再由 HTML 直接連到 legacy 資源。
  - `PolicyPage.vue` 補回原先在 `policy.html` head 內的政策頁樣式規則。
- **驗證**
  - `npm run build` 通過。
  - `npm run guardrails` 通過。

### 📅 v55 — Vite + Vue 3 架構稽核與遷移現況確認

- **Vite + Vue 3 入口已完成**
  - 新增 `frontend/` 多頁入口（`index/main/dashboard/policy`）與 `vite.config.js`。
  - `package.json` 已提供 `npm run dev/build/preview`，並在 `predev/prebuild` 自動執行 `sync:legacy`。
- **目前為「相容遷移架構」，非純 Vue 重寫**
  - Vue 僅負責頁面殼層與啟動流程（`LegacyPage.vue` + entries），實際業務流程仍由既有 `js/main-app.js`、`js/dashboard-app.js` 等 legacy 模組執行。
  - 根目錄 `main.html/dashboard.html/policy.html` 仍保留作為 legacy source，透過 `scripts/sync_legacy_to_vite.js` 同步到 `frontend/public/legacy`。
- **稽核結論（是否都使用 Vite+Vue3）**
  - 若以「啟動/打包流程」判斷：**是**（已改由 Vite）。
  - 若以「全部 UI 與商業邏輯皆為 Vue 元件」判斷：**否**（仍是 Vue 殼 + legacy 邏輯）。
- **驗證**
  - `npm run build` 已通過（Vite 產物正常）。

### 📅 v54 — 匯款帳號支援拖曳排序（後台）

- **後台匯款帳號排序**
  - `dashboard-app.js` 的匯款帳號管理區塊改為可拖曳排序（左側 `☰` 拖曳手把）。
  - 使用 `Sortable` 在 `#bank-accounts-sortable` 啟用排序，拖曳完成後呼叫 API 即時儲存。
  - 排序失敗時會顯示錯誤並自動重新載入列表，避免 UI 與 DB 狀態不一致。
- **後端 API 新增**
  - `api/bank-accounts.ts` 新增 `reorderBankAccounts`，沿用 `batch_update_sort` RPC 寫入 `coffee_bank_accounts.sort_order`。
  - `index.ts` 新增 `reorderBankAccounts` action 路由，沿用 `reorderIdsSchema` 驗證。
- **快取版號同步**
  - 依專案規則將前端資源版本由 `v=51` 升級為 `v=52`（含 `.frontend-version` 與 HTML/JS 參照）。
- **驗證與部署**
  - `npm run ci-local` 全數通過。
  - 已執行 `supabase functions deploy coffee-api --no-verify-jwt`。

### 📅 v53 — 設定穩定性修復、LINE Pay Sandbox 回填與冗餘清理

- **修復 LINE Pay Sandbox 勾選狀態回彈**
  - 後台 `loadSettings()` 新增 `linepay_sandbox` 的健壯判斷與本地快取 fallback，避免後端暫時缺鍵時被預設值覆蓋。
  - `saveSettings()` 成功後寫入本地快取並重新載入設定，確保畫面與資料一致。
- **後端設定鍵補齊**
  - `api/settings.ts` 將 `linepay_sandbox` 納入 `PUBLIC_SETTINGS_KEYS`，讓 `getSettings` 可回傳此鍵。
  - 新增 migration：`20260313_allow_anon_read_linepay_sandbox.sql`，將 `linepay_sandbox` 納入 `coffee_settings` 匿名可讀白名單。
- **冗餘代碼移除**
  - 移除後台未使用空函式 `togglePromoType`、`movePromotion` 與其 `window` 掛載。
- **驗證**
  - `npm run ci-local` 全數通過（guardrails/fmt/lint/check/test）。
  - 已完成 `supabase functions deploy coffee-api --no-verify-jwt` 與 `supabase db push`。

### 📅 v52 — 型別安全強化、CI 自動修復與 E2E 測試擴充

- **型別安全性優化 (Type Safety)**：
  - 重構 `utils/validate.ts` 中的 `validate`
    函數，採用更健壯的泛型簽名以正確處理 Zod Schema 的 `.transform()`。
  - 清理 Edge Functions (`index.ts`) 中所有不必要的 `any` 型別斷言，確保 API
    合約在編譯期即受保護。
- **CI 自動修復工作流實作**：
  - 開發 `scripts/push_and_watch.py` 取代傳統 `git push`。
  - 該腳本會監控 GitHub Actions 狀況，若執行 `deno fmt`
    失敗（格式錯誤），腳本會自動修復、commit 並重新推送。
  - 有助於維持程式碼風格一致性並減少 CI 阻塞。
- **E2E 測試涵蓋率擴充**：
  - 建立 `tests/e2e/features.spec.ts`，新增以下測試案例：
    - **ECPay 地圖**：驗證門市選擇地圖觸發與導向邏輯。
    - **報表匯出**：驗證後台 CSV 下載功能與檔名格式。
    - **出貨更新**：驗證訂單狀態變更為 `shipped` 時的 API 通訊。
    - **黑名單管理**：驗證後台封鎖用戶流程與 SweetAlert2 交互。
- **維護注意事項更新**：
  - 在 `installGlobalStubs` 中補全了對 `Swal` 的完整 Mock（含 `close`,
    `showLoading`, `mixin`），避免後台初始化掛掉。
- **資料庫安全性優化**：
  - 修復 Supabase 針對 public schema 擴充的安全性警告 (Extension in Public
    SECURITY)。
  - 新增遷移檔 `20260312_move_pg_trgm_to_extensions.sql` 將 `pg_trgm` 移至
    `extensions` schema。
  - 更新 `20260311_advanced_security_and_indexes.sql` 確保後續初始化正確指定
    schema。

### 📅 v51 — 訂單狀態防誤觸、物流單號可複製、Email 標題正規化

- **後台訂單狀態下拉防誤觸**：
  - 修正 `change-order-status` 事件時機，避免「僅點開下拉」就觸發 `狀態已更新`。
  - 補上狀態比對（同值不更新）與 E2E 回歸測試。
- **物流單號複製體驗**：
  - 前台「我的訂單」新增 `📋 複製` 按鈕，與後台一致可直接複製物流單號。
  - Playwright 新增前台複製物流單號測試。
- **Email 模板調整**：
  - 訂購確認信標題改為只顯示站名（不再附加 `訂購確認` 字樣）。
  - 已出貨通知信在物流單號旁新增 `📋 複製單號` 按鈕。
  - 新增 `normalizeEmailSiteTitle()`，若站名尾端誤設為 `... 訂購確認`
    會自動去除，並同步套用到確認信/出貨信主旨。
- **部署注意**：
  - 此次有修改 Edge Function（`supabase/functions/coffee-api`），已執行：
    `supabase functions deploy coffee-api --no-verify-jwt`。

### 📅 v48 — 移除公開追蹤頁、修復勾選 UI、出貨資訊擴充

- **移除訂單追蹤功能**：
  - 刪除 `track.html` 與 `js/track-app.js`。
  - `main.html` 移除「訂單追蹤」入口，並在後端移除 `trackOrder` action 與對應
    schema 路由綁定。
- **修復後台訂單勾選顯示問題**：
  - 原因是事件代理對 checkbox 也套用了 `preventDefault`，導致勾選狀態無法切換。
  - `js/dashboard/events.js` 已改為：checkbox 走 `change` 事件處理，不再被 click
    代理阻止預設行為。
- **出貨資訊升級（物流商 + 追蹤網址）**：
  - 後端 `updateOrderStatus / batchUpdateOrderStatus` 支援
    `shippingProvider`、`trackingUrl`。
  - 新增
    migration：`supabase/migrations/20260309_add_shipping_provider_and_tracking_url.sql`。
  - 修正 migration 版號衝突：將重複的 `20260309_*` 重編為
    `20260310_*`、`20260311_*`，確保可連續 `supabase db push`。
  - `schema_full.sql` 的 `coffee_orders` 新增
    `shipping_provider`、`tracking_url` 欄位。
  - 後台在狀態切換為「已出貨」時可填入物流單號、物流商與追蹤網址，並支援批次設定。
  - 顧客端「我的訂單」與出貨通知信會顯示物流商、物流單號與追蹤網址（若有）。

### 📅 v47 — 訂單中心升級與顧客訂單追蹤上線

- **後台訂單中心升級（多條件篩選 + 批次操作 + CSV 匯出）**：
  - `dashboard.html`
    訂單區塊新增多條件篩選控件（訂單狀態、付款方式、付款狀態、配送方式、時間區間、金額區間）。
  - `js/dashboard-app.js`
    訂單渲染邏輯改為「可組合篩選」，並新增勾選機制與「全選目前篩選結果」。
  - 新增批次操作：`batchUpdateOrderStatus`（批次狀態更新，可附付款狀態與共用物流單號）、`batchDeleteOrders`（批次刪除）。
  - 新增 CSV 匯出：可匯出「目前篩選結果」或「目前勾選訂單」，含 UTF-8 BOM 以提升
    Excel 開啟相容性。
- **顧客端訂單追蹤頁（降低客服詢問）**：
  - 新增 `track.html` 與 `js/track-app.js`，提供顧客以「訂單編號 +
    手機末碼」查詢進度。
  - 顯示內容含：訂單目前狀態、配送/付款資訊、收件資訊、物流單號與物流連結、狀態時間軸。
  - `main.html` 新增「訂單追蹤（免登入）」入口。
- **後端 API 擴充（模組化 + Schema 驗證）**：
  - `schemas/order.ts` 新增：
    - `batchUpdateOrderStatusSchema`
    - `batchDeleteOrdersSchema`
    - `trackOrderSchema`
  - `api/orders.ts` 新增：
    - `batchUpdateOrderStatus`（逐筆沿用既有 `updateOrderStatus` 流程）
    - `batchDeleteOrders`
    - `trackOrder`
  - `index.ts` 正式註冊上述 action 與 validate。
- **版本與驗證**：
  - 前端版號升級至 `v47`（`?v=47`）。
  - 本機檢查已通過：`npm run guardrails`、`npm run ci-local`、`npm run e2e`。

### 📅 v46 — 資安標頭 (CSP/SRI)、分頁搜尋下推與 CI 穩定化

- **P1 安全強化 (CSP & SRI)**：
  - 在 `main.html` 與 `dashboard.html` 導入 **CSP (Content Security Policy)**
    標頭，限制來源安全性。
  - 對所有外部 CDN (SweetAlert2, Tailwind, 7-11 Map) 加入 **SRI (Subresource
    Integrity)** 校驗，並修正 E2E 測試中 SRI 導致的 Mock 失敗問題。
- **P1/P2 查詢效能下推 (Pagination & Search)**：
  - `orders.ts` 與 `users.ts` API 全面改寫，支援 `limit`, `offset` 與 `search`
    參數，將分頁與 `ilike` 模糊搜尋邏輯下推至 PostgreSQL
    執行，大幅降低大數據量下的記憶體負擔。
- **P2 前端架構模組化 (階段三)**：
  - 從 `js/dashboard-app.js` 中抽離出 `js/dashboard/events.js` (全域事件代理) 與
    `js/dashboard/api.js` (API 封裝)，成功降低主檔案維護難度。
  - 同步修正 `scripts/check_dashboard_event_delegation.py`
    驗證腳本以適配新路徑。
- **CI/CD 穩定化**：
  - 統一 Deno 依賴管理，消除 `npm:` 行內前綴引起的 `deno check/lint` 報錯。
  - 修復 `std/testing/asserts` 斷鏈問題。

### 📅 v45.1 — 資安與維護性大升級 (P0-P2 修復)

- **P0 資安防護**：
  - 將 `.env` 與 `.env.staging` 從版本控制移除，阻絕機密外洩 (`.gitignore`
    修正)。
  - `getInitData` 與 `settings.ts` 加入 `PUBLIC_SETTINGS_KEYS`
    白名單，避免給前端暴露如智付通 Hash 等非公開設定。
  - `orders.ts` 中實作防重複提交，前端產生 UUID 送至後端做 `idempotency_key`
    唯一性阻擋；`schema_full.sql` 補齊漂移欄位。
- **P1 權限與注入防護**：
  - `submitOrder` 強制改用 `requireAuth` 取代
    `extractAuth`，封鎖未登入訪客送單。
  - `delivery.js` 修復 7-11/全家電子地圖與門市搜尋列表寫入的
    `innerHTML`，全面加上 `escapeHtml` 阻擋 XSS 攻擊。
  - OAuth 登入的 `getLineLoginUrl` 加上原點比對（`ALLOWED_REDIRECT_ORIGINS`
    白名單），阻擋惡意 redirect 劫持。
- **P2 品質與測試涵蓋**：
  - 解開 `api_integration.spec.ts` 整合測試，將 API 端的合約正式納入 Playwright
    E2E 回歸保護。
  - **(CI Hotfix)** 修復了 17 個以上潛藏在 Deno Edge Functions 裡的 TypeScript
    `any` / `unknown` 型別推導錯誤（引發於 Zod schema 轉換時的 Input/Output
    型別非對稱，已調整 `validate.ts` 泛型簽章）。

### 📅 v45 — Email 模板抽離、後台模組化 (階段二) 與前端資料流統一

- **P2-1：Email 模板抽離**
  - 新增 `utils/email-templates.ts`，將 `orders.ts` 中原本混雜的 170 行 HTML
    模板提取為獨立工廠函數。
  - 提升了業務邏輯的可讀性與模板的可維護性。
- **P1-4：測試品質升級**
  - 在 `smoke.spec.ts` 中加入 `quoteOrder` 回傳結構強驗證。
  - 新增 `tests/e2e/api_integration.spec.ts` (非 mock 整合測試)。
  - 刪除過時的 `test_pm_category.spec.ts`。
- **P2-3：後端模組化 (階段二)**
  - 將 600 多行的 `api/settings.ts` 拆分為 5 個專屬模組：`products.ts`,
    `categories.ts`, `promotions.ts`, `form-fields.ts`, `bank-accounts.ts`。
  - `index.ts` 路由映射全面轉向子模組。
- **P2-3：前端資料來源統一**
  - `main-app.js` 移除 Supabase 直接查詢邏輯，統一改由 Edge Function
    `getInitData` 獲取資料。
  - 刪除已無引用的 `js/supabase-client.js`。
  - 消滅前、後端兩套 Mapping 邏輯，大幅提升安全性與資料一致性。

### 📅 v44 — 單一 quoteOrder 計價引擎上線 + dashboard 事件模組化

- **後端單一計價引擎**
  - 新增
    `supabase/functions/coffee-api/api/quote.ts`，集中處理：商品規格驗證、促銷套用、運費門檻、可用付款方式。
  - `orders.ts` 中 `submitOrder` 改用 `quote.ts` 計價，移除重複邏輯。`index.ts`
    註冊 `quoteOrder` action。
- **前端改讀後端 quote 結果**
  - `main-app.js` 加入 `window.refreshQuote`。`cart.js` 不再本地重算，改讀
    `state.orderQuote`。
  - `delivery.js` 切換配送時觸發重算。
- **dashboard 模組化 (階段一)**
  - 拆分 `dashboard/modules/` (orders, products, settings, users)
    建構事件處理器，降低主檔耦合。前端版號進階至 `v=44`。

### 📅 v43 — P0/P1 修復：用戶管理契約、促銷計價一致性、Schema 驗證補強

- **用戶 API 契約**：操作 payload 統一改為
  `targetUserId`，防止錯位，`getBlacklist` 改 camelCase。
- **促銷邏輯修正**：處理了 0.9/9/90 等折扣值格式，前後端同步計價邏輯並加入時窗
  (`start_time/end_time`) 判斷。
- **Zod 覆蓋補強**：新增 profile, users schema。所有 backend mutation (reorder,
  delete, list) 強制過 validate。 Frontend 版號推進至 `v=43`。

### 📅 v42 — 解決商品編輯時分類選項失效的 Race Condition 問題

- **修復**：`dashboard-app.js` 中 `showProductModal` 及 `editProduct` 在互動前若
  `categories` 為空，強制
  `await loadCategories()`。解決快速點擊編輯時選單無選項的 Bug。

### 📅 v41 — 修復購物車結帳按鈕狀態

- **修復**：將 `updateFormState` 提升至全域。移除 `cart.js`
  舊有寫死的按鈕切換邏輯，統一由 `updateFormState`
  正確判斷並連動「確認送出訂單」文字與 disabled 狀態。

### 📅 v40 — 會員資料功能：自動帶入常用資料

- **新功能**：新增 `getUserProfile` / `updateUserProfile` API。`coffee_users`
  擴充 `default_custom_fields`。
- **前端整合**：`main.html`
  新增會員資料按鈕；送單後自動回填電話、信箱及自訂表單欄位紀錄至 DB。

---

## 📦 核心功能演進 (v31 - v39)

- **v39 (Email 優化)**：寄件人改為 "Script Coffee"。Email
  內文動態插入排序後的自訂表單欄位。
- **v38 (UI/Email 同步)**：後台配送方式可見度修復（`dashboardSettings`
  提早載入）。Email 及前端宅配顯示文字移除多餘括號。
- **v37 (系統欄位與標題)**：解除 phone/email 保護鎖；Email 標題連動
  `site_title`。
- **v36 (動態配送欄位)**：`coffee_form_fields` 新增
  `delivery_visibility`。前台依賴選擇的物流隱藏不需填寫的欄位。
- **v35 (表單重排)**：動態表單區塊移至物流與付款之間。
- **v34 (文字統一)**：統一「全台宅配」文字及出貨通知信格式。
- **v33 (政策與條款)**：新增隱私權與退換貨政策勾選，未勾選無法送單。
- **v32 (匯款體驗)**：支援點擊卡片與 radio
  切換，修復切換付款方式時丟失選項的問題。
- **v31 (送單覆蓋與清理)**：清除 legacy inline selector。補齊 Playwright 之
  `submitOrder`, `transfer`, `linepay` 回歸測試。

---

## 🏗️ 早期開發與架構除錯 (v10 - v30)

- **v30 (E2E 測試)**：導入 Playwright Smoke Test，涵蓋前/後台核心路徑。
- **v28-v29 (事件代理)**：全面清除 HTML 內的 `onclick/onchange`，導入
  `data-action` 統一代理機制，搭配 CI Guardrail 檢查。
- **v27 (版號單一來源)**：統一以 `.frontend-version` 為版號來源，新增 Python
  同步腳本。
- **v26 (拖曳排序)**：分類與商品支援 Sortable.js 拖曳。
- **v24-v25 (UI與串接)**：運費提示改版；針對 LINE Pay 404 補上完整的 URL
  路徑參數。
- **CI & 7-11 PCSC 整合**：建立自動修復 lint 流程。整合 PCSC 官方地圖 API。
- **v19-v21 (模組快取坑)**：經歷 ES Module 碎片化與快取衝突，確立「動 JS 必更動
  HTML 版號」與 Python 統一推升機制。
- **v12-v18 (架構調適)**：首度導入事件代理，處理全域變數未掛載 (`window.state`)
  等 Bug。
- **v11 (直連 DB)**：引入 `supabase-js` 平行加速前台加載資料，開啟 RLS。
- **v10 (設計更迭)**：移除底部固定送出鈕，改由表單整合結帳流程，購物車加上折扣
  Badge。
