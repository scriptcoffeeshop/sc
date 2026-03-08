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

---

## 🚀 近期重大更新 (v40 - v44)

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
