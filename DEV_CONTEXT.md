# 咖啡訂購系統 - 開發脈絡與狀態紀錄 (Context Tracking)

**這份文件用來記錄專案最近的重要變更、除錯經驗與排版設計決策建立的脈絡。**
為了方便下次進行專案開發或開啟新對話時，讓 AI（Assistant）能快速掌握目前狀態與曾經踩過的坑。

---

## 📅 近期重要更新 (v12→v16 階段)

### 1. 付款方式選取外框修復 (v13)
- **問題**：UI 改版後事件綁定從 `onclick` 改為 `data-action` / `data-method`，但 `selectPayment()` 中用來加上 `.active` 外框的選擇器仍使用舊的 `onclick` 屬性查找，導致點選付款方式時沒有顯示外框。
- **修正**：選擇器改為優先查找 `data-method`，並同時保留 `onclick` fallback。

### 2. CI Lint 錯誤修復 (v13)
- **問題**：GitHub Actions 中的 Deno Lint 報錯 (`no-unused-vars`, `require-await`)。
- **修正**：移除未使用的 `applyCorsHeaders` / `jsonResponse` import，將 `getLineLoginUrl` 改為 `Promise.resolve` 包裝。

### 3. 訂單送出靜默失敗修復 (v14)
- **根因 (最關鍵)**：`cart.js` 中判斷「確認送出訂單」按鈕啟用狀態時使用了 `window.state`，但 `state` 是透過 ES module `import` 的，**從未掛載到 `window`**。導致 `window.state?.currentUser` 永遠為 `undefined`，按鈕永遠 disabled。
- **修正**：改為直接使用 ES module 的 `state` 物件。
- **附帶修復**：
  - `auth.js`：401 時拋出「登入已過期」中文錯誤
  - `orders.js`：catch 區塊提供預設錯誤訊息，避免空白彈窗
  - `main-app.js`：按鈕依禁用原因顯示提示文字（未登入/休息中/購物車空）
  - 後端 `orders.ts`：驗證拆分為個別檢查，提供明確錯誤

### 4. 購物車運費即時更新修復 (v15-v16)
- **問題 A (v15)**：清空購物車後底部仍顯示運費/免運標籤。原因是 `calcCartSummary()` 在空購物車時因 `0 < threshold` 為 true 而套用運費，且 `updateCartUI()` 的底部欄位計算在空購物車 early return 之前執行。
- **修正 A**：重構 `updateCartUI()` 執行順序，空購物車檢查提前；`calcCartSummary()` 加入 `cart.length > 0` 保護。
- **問題 B (v16)**：切換配送方式後運費/免運標籤不會即時更新。原因是 `delivery.js` 的 `selectDelivery()` 沒有呼叫 `updateCartUI()`。
- **修正 B**：在 `selectDelivery()` 末尾加入 `window.updateCartUI()`，並在 `main-app.js` 中將 `updateCartUI` 掛載到 `window`。

### 5. 專案規範新增
- `README.md` 新增第 6 點「Browser Subagent 授權」與第 7 點「CI 報錯處理機制」。
- `README.md` 第 5 點新增版號修改時必須同步更新 `DEV_CONTEXT.md` 的規定。

---

## 📅 近期重要更新 (v11 階段)

### 1. 前端直連 Supabase — 公開資料改用 supabase-js 讀取
- **變更點**：新增 `js/supabase-client.js`，在 `config.js` 加入 `SUPABASE_URL` 和 `SUPABASE_ANON_KEY`。`main-app.js` 的 `loadInitData()` 改為利用 `supabase-js` 平行查詢（`Promise.all`）六張公開資料表（商品、分類、設定、欄位、銀行帳號、促銷活動），不再繞道 Edge Function。
- **Fallback 機制**：若 Supabase 直連失敗（例如 RLS 尚未設定或網路問題），會自動降級 (fallback) 回原本的 `?action=getInitData` Edge Function 呼叫。
- **安全性前提**：必須在 Supabase Dashboard 執行 `supabase/migrations/20260228_enable_rls_for_public_data.sql` 來啟用 RLS，確保前端只能 SELECT 公開的已啟用資料，無法進行任何寫入操作。
- **影響範圍**：僅影響前台訂購頁 (`main.html`)。後台管理頁 (`dashboard.html`) 不受影響，仍全部透過 Edge Function 操作。

---

## 📅 近期重要更新 (v10 階段)

### 1. TypeScript 與模組修復
- **Deno / Zod 問題**：修正了 `fix_ts.ts` 腳本中因為 Deno 未宣告導致的 TypeScript 錯誤（補上 `declare const Deno: any;`）；替 Supabase Edge Functions (`settings.ts`) 引入的 `zod` 加上 `@ts-ignore` 消除編輯器層級的找不到模組報錯（不影響執行）。

### 2. 移除底部確認送出按鈕 (UI 簡化)
- **變更點**：為了簡化行動版底部版面，將 `main.html` 在畫面底部的「確認送出」按鈕徹底移除。
- **後續影響與踩坑紀錄**：
  - **空值報錯 (Null Reference)**：因為移除了按鈕，原有的 `js/main-app.js` 舊程式碼在使用者登入或切換狀態時，因為找不到 `submitBtn` 而發生了 `null is not an object` TypeError，導致頁面登入崩潰。
  - **嚴重的 Cache (快取) 問題**：由於手機版瀏覽器與 LINE 內建瀏覽器的快取極強，即便更新了防呆（`if(submitBtn)`），前端依然會拿舊版 JS 配新版 HTML，因此一再當機。
  - **最終解決方案**：
    1. 在 `main.html` 放入一顆幽靈按鈕（隱藏的 `#submit-btn` 加上 `display: none;`），做為相容舊版快取 JS 的安全降落區塊。
    2. 無論何時修改 JS，**務必要更新** `main.html` 裡面 `src="js/main-app.js?v=XX"` 的版號，這幾次下來已經推進到 `v=10`。

### 3. 加入購物車折扣細項與視覺化
- **UI 變更**：原本滿額折扣只顯示在底部。現在購物車打開後，`cart-discount-details` 區塊中會清楚列出每一筆套用的活動與扣除金額（例如：`🏷️ 全館滿千折百 -$100`）。
- **標籤功能**：`cart.js` 的 `calcPromotions` 中計算哪些項目適用折扣後，符合條件的商品右側會被打上 `[適用優惠]` 的紅色小 Badge。

### 4. 手機版商品規格 Stepper 文字遮擋排版問題
- **問題描述**：原本商品清單的按鈕裡，同時塞了規格名稱和 `[ - 1 + ]` 計算器。在手機看時文字會被擠壓成如「半...」、「單...」等無法辨識的狀態。
- **設計嘗試與決定 (方案 A 落定)**：
  - 曾經嘗試**方案 C (底部滑出 Drawer)**，但在開發上線後認為體驗不如預期而快速透過 `git revert` 撤銷。
  - **現行方案 A**：當商品加入購物車後，該顆操作按鈕會在原地從一行「長高為上下兩行」。上半部維持原本的名稱與價格文字，下半部專心放增減數量的 `− [數值] +` 按鈕，從此不互相擠壓；並藉由這顆數量文字，捨棄了原本按鈕外部的紅點數量標籤，使畫面更清爽。

### 5. Git 版本控制規範調整
- **現行規則**：在開發過程中，先將 `.gitignore` 的 `#supabase/` 短暫註解掉（允許 Push），目的是讓本機更改的設定可以推到 GitHub 上備份。未來專案確認完成後，應執行特殊的 cleanup 刪除不需要部署至 Pages 的檔案。

---

## 🛠 給協助審查或接手此專案的 AI 的注意事項

1. **不可輕忽的手機 Cache**：未來如果修改了 js 代碼但畫面邏輯崩潰，請高度懷疑是瀏覽器快取搗亂。解法是：**只要動了 js，就必須同時修改 `.html` 引用的 `v=X` 版號**。
2. **Global Window Functions**：因為當前的實作包含了很多寫在 `.html` 原生的 `onclick="window.xxx()"` 事件，因此如果在 module 裡面新寫了函數（如 `openSpecDrawer` 等），務必記得去 `main-app.js` 全局綁定給 `window`。
3. **繁體中文規則**：所有對話與代碼內的開發邏輯註解（comments），依照過去的強制要求，請一律使用 **「繁體中文（Traditional Chinese）」**。
