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
3. **繁體中文規則**：所有對話與代碼內的開發邏輯註解（comments），依照過去的強制要求，請一律使用
   **「繁體中文（Traditional Chinese）」**。
4. **SRI 與 E2E 測試衝突**：在 HTML 啟用 SRI (`integrity`) 後，Playwright 的 `route.fulfill` 攔截 CDN 腳本會導致 hash 不匹配而被瀏覽器阻擋。**解決方案**：在 `smoke.spec.ts` 的 `installGlobalStubs` 中，攔截 HTML 並動態移除 `integrity` 與 `crossorigin` 屬性，確保測試環境能載入 mock 腳本。
5. **Deno 模組解析與 CI**：Deno 不允許在 production/CI 環境（透過 `deno.json` 控制時）使用 `npm:` 行內前綴或 https URL 的 bare specifier。**規範**：依賴一律宣告在 `deno.json` 的 `imports` 中，程式碼內直接引用別名（如 `import { z } from "zod"`），否則 `deno lint` 與 `deno check` 會失敗。

---

## 🚀 近期重大更新 (v40 - v46)

### 📅 v46 — 資安標頭 (CSP/SRI)、分頁搜尋下推與 CI 穩定化

- **P1 安全強化 (CSP & SRI)**：
  - 在 `main.html` 與 `dashboard.html` 導入 **CSP (Content Security Policy)** 標頭，限制來源安全性。
  - 對所有外部 CDN (SweetAlert2, Tailwind, 7-11 Map) 加入 **SRI (Subresource Integrity)** 校驗，並修正 E2E 測試中 SRI 導致的 Mock 失敗問題。
- **P1/P2 查詢效能下推 (Pagination & Search)**：
  - `orders.ts` 與 `users.ts` API 全面改寫，支援 `limit`, `offset` 與 `search` 參數，將分頁與 `ilike` 模糊搜尋邏輯下推至 PostgreSQL 執行，大幅降低大數據量下的記憶體負擔。
- **P2 前端架構模組化 (階段三)**：
  - 從 `js/dashboard-app.js` 中抽離出 `js/dashboard/events.js` (全域事件代理) 與 `js/dashboard/api.js` (API 封裝)，成功降低主檔案維護難度。
  - 同步修正 `scripts/check_dashboard_event_delegation.py` 驗證腳本以適配新路徑。
- **CI/CD 穩定化**：
  - 統一 Deno 依賴管理，消除 `npm:` 行內前綴引起的 `deno check/lint` 報錯。
  - 修復 `std/testing/asserts` 斷鏈問題。

### 📅 v45.1 — 資安與維護性大升級 (P0-P2 修復)

- **P0 資安防護**：
  - 將 `.env` 與 `.env.staging` 從版本控制移除，阻絕機密外洩 (`.gitignore` 修正)。
  - `getInitData` 與 `settings.ts` 加入 `PUBLIC_SETTINGS_KEYS` 白名單，避免給前端暴露如智付通 Hash 等非公開設定。
  - `orders.ts` 中實作防重複提交，前端產生 UUID 送至後端做 `idempotency_key` 唯一性阻擋；`schema_full.sql` 補齊漂移欄位。
- **P1 權限與注入防護**：
  - `submitOrder` 強制改用 `requireAuth` 取代 `extractAuth`，封鎖未登入訪客送單。
  - `delivery.js` 修復 7-11/全家電子地圖與門市搜尋列表寫入的 `innerHTML`，全面加上 `escapeHtml` 阻擋 XSS 攻擊。
  - OAuth 登入的 `getLineLoginUrl` 加上原點比對（`ALLOWED_REDIRECT_ORIGINS` 白名單），阻擋惡意 redirect 劫持。
- **P2 品質與測試涵蓋**：
  - 解開 `api_integration.spec.ts` 整合測試，將 API 端的合約正式納入 Playwright E2E 回歸保護。
  - **(CI Hotfix)** 修復了 17 個以上潛藏在 Deno Edge Functions 裡的 TypeScript `any` / `unknown` 型別推導錯誤（引發於 Zod schema 轉換時的 Input/Output 型別非對稱，已調整 `validate.ts` 泛型簽章）。

### 📅 v45 — Email 模板抽離、後台模組化 (階段二) 與前端資料流統一

- **P2-1：Email 模板抽離**
  - 新增 `utils/email-templates.ts`，將 `orders.ts` 中原本混雜的 170 行 HTML 模板提取為獨立工廠函數。
  - 提升了業務邏輯的可讀性與模板的可維護性。
- **P1-4：測試品質升級**
  - 在 `smoke.spec.ts` 中加入 `quoteOrder` 回傳結構強驗證。
  - 新增 `tests/e2e/api_integration.spec.ts` (非 mock 整合測試)。
  - 刪除過時的 `test_pm_category.spec.ts`。
- **P2-3：後端模組化 (階段二)**
  - 將 600 多行的 `api/settings.ts` 拆分為 5 個專屬模組：`products.ts`, `categories.ts`, `promotions.ts`, `form-fields.ts`, `bank-accounts.ts`。
  - `index.ts` 路由映射全面轉向子模組。
- **P2-3：前端資料來源統一**
  - `main-app.js` 移除 Supabase 直接查詢邏輯，統一改由 Edge Function `getInitData` 獲取資料。
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
