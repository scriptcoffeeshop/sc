# 咖啡訂購系統 - 開發脈絡與狀態紀錄 (Context Tracking)

**這份文件用來記錄專案最近的重要變更、除錯經驗與排版設計決策建立的脈絡。**
為了方便下次進行專案開發或開啟新對話時，讓 AI（Assistant）能快速掌握目前狀態與曾經踩過的坑。

---

## 📅 近期重要更新 (v24 階段)

### 1. 優化運費與免運提示獨立顯示 (v24)
- **問題源由**：原本未達免運時，運費依然顯示於購物車的「已套用優惠與折抵」區段內，邏輯上不合理且缺乏刺激消費的醒目提示。
- **解決方案**：修改 `cart.js` 的 `updateCartUI` 與 HTML，將未滿免運的運費移出優惠區塊（只在真實達標時才放入優惠區的免運條目）。同時新增一個專屬的橘色邊框提示元件，明確顯示「未達免運門檻 (滿$XXXX)」以及「還差 $XXX」，強化視覺引導效果。前端快取版號推進至 `v=24`。

---

## 📅 近期重要更新 (v22 & v23 階段)

### 1. 修復宅配區域下拉選單連動 (v23)
- **問題源由**：在 ES Module (`type="module"`) 環境中，所有的函式宣告都會被封裝在模組私有作用域內。這導致 `main.html` 中寫死在 HTML 的 `onchange="updateDistricts()"` 沒辦法找到該函式而報錯，造成選取縣市後，區域下拉選單無法更新。
- **解決方案**：在 `main-app.js` 的全域掛載區中明確加上 `window.updateDistricts = updateDistricts;` 以暴露此功能。同時依指示將介面文案調校為精準的「📍 配送地址 (限新竹市/竹北市)」。全網頁版號推進至 `v=23`。

### 2. 優化結帳介面：強制電子地圖選店與運費差額提示 (v22)
- **防呆與強制性**：為減少使用者自行填寫錯誤的門市代號與地址造成出貨災難，將 `main.html` 中的手動門市表單移除 (但保留 `type="hidden"` 供 JS 原理存取)。將來全部限制使用官方電子地圖選店。
- **文案統合**：為相容 7-11 使用的 PCSC 地圖，將全站涉及選店按鈕與 Loading 框的「綠界超商地圖」字眼皆簡化為「超商地圖」。
- **促進客單價轉換**：在 `cart.js` 新增判斷。當處於未達免運門檻的情況，不只單純顯示加收的運費，還會於折扣明細區塊用橘字提示消費者「**，還差 $XXX 免運**」，以刺激消費者湊滿額度。全站版號推進至 `v=22`。


## 📅 近期重要更新 (CI 與 7-11 PCSC 整合階段)

### 1. CI 報錯自動抓取與修復機制 (README #7)
- **機制建立**：在 `README.md` 中確立了每次推送後自動偵錯並修復的 SOP。
- **自動化 Workflow**：建立了 `.agents/workflows/ci-check.md`，定義了從 GitHub API 抓取失敗任務、在本機執行 `deno fmt`/`lint`/`check` 到重新推送的完整流程（指令已標記為 `// turbo-all`）。
- **實戰經驗**：成功解決了 `Backend CI` 中 `Verify formatting` 的失敗情況，透過本機 `deno fmt` 自動修正後全綠通過。

### 2. 7-11 超商取貨：從綠界轉向 PCSC 官方電子地圖
- **變更點**：應使用者要求，將 7-11 的選店地圖從綠界 (ECPay) 更換為 PCSC 官方系統，全家則維持原樣。
- **關鍵發現 (c2cemap.ashx)**：原本使用 `emap.pcsc.com.tw/ecmap/default.aspx` 端點會因不支援 C2C 而回傳 E0014 錯誤。經測試確認，正確的 C2C 取貨地圖端點應為 `https://emap.presco.com.tw/c2cemap.ashx`，並需帶上 `servicetype: '1'` 參數。
- **後端 Callback 處理**：
  - 新增 `createPcscMapSession` 與 `pcscMapCallback` 端點。
  - PCSC 會以 POST 回傳全小寫欄位（`storeid`, `storename`, `storeaddress`, `tempvar`）。
  - **Token 處理**：原本發往 PCSC 的 `tempvar` 會原樣回傳，後端必須能正確解析 `multipart/form-data` 以提取 token 進行 Session 匹配。
- **CORS 陷阱**：由於 Edge Function 預設只允許產線 Origin，導致 localhost 開發時會被封鎖。已在 `config.ts` 的 `ALLOWED_REDIRECT_ORIGINS` 加入 `localhost:5500` 解決本地偵錯問題。


---

## 📅 近期重要更新 (v21 階段)

### 1. 徹底修復免運明細顯示為「來店自取」的 Bug (v21)
- **問題**：使用者回報免運明細全部顯示為「來店自取免運」，無法隨配送方式自動切換。經 Browser Subagent 排查，又是 **ES Module 的幽靈快取問題**。
- **根因**：在先前的 v20 修復策略中，我撰寫了 Python Regex 來加上 `?v=20`，但那個 Regex `([^v]+?)` 意外排除了檔名內含 `v` 的檔案，導致 `delivery.js` **成為了漏網之魚**，其引用依然停留在 `v=19`！這造成 `main-app.js` 與 `cart.js` 各自對應到了不同的 `state.js` 實體（也就是嚴重的 State Fragmentation 狀態碎裂），因此購物車模組永遠讀到預設第一筆選項「來店自取」，無視使用者切換結果。
- **修正**：手動修復了 `main-app.js` 上的遺漏版號，並寫了更嚴謹的 Python 替換腳本，將全網站所有的 JavaScript 內部引用統一推升至 `?v=21`，這才真正確保了各模組間的記憶體狀態大一統。

---

## 📅 近期重要更新 (v20 階段)

### 1. 終極解決 ES Module 碎片化與快取問題 (v20)
- **問題**：在 v19 更新中，為了防範瀏覽器快取，將 `main-app.js` 的 `import` 全部加上了 `?v=19` 版號參數。但這引發了更致命的「**ES Module 碎片化**」錯誤：`main-app.js` 載入的是 `state.js?v=19` 並將取得的商品存入其中，然而其他子模組 (如 `products.js`) 內部卻因為使用相對路徑 `import { state } from './state.js'` (無參數) 而載入另一個獨立的記憶體實例。結果造成讀取不到商品，首頁白畫面。
- **修正**：撰寫 Python 腳本，將 `js/` 目錄下**所有**的 `.js` 檔案中各自的 `import` 宣告，全部加上了統一的 `?v=20` 參數。這確保了所有模組在瀏覽器中引用的都是**同一個位址**（即同一個記憶體實例），成功還原共享狀態並徹底擊破快取問題。`main.html` 及 `dashboard.html` 亦同步推進至 `v=20`。

---

## 📅 近期重要更新 (v19 階段)

### 1. 徹底解決 ES Module 快取問題 (v19)
- **問題**：使用者回報 v18 開發的免運明細功能失效。Browser Subagent 檢查後確認 `cart.js` 的新邏輯沒有被執行。原因是雖然修改了 `main.html` 中的 `<script src="js/main-app.js?v=18">`，但 `main-app.js` 內部的 `import { ... } from './cart.js'` 未帶版號，導致瀏覽器繼續使用舊版的 `cart.js` 快取。
- **修正**：在 `js/main-app.js` 頂端的所有區域模組匯入（如 `./cart.js`, `./utils.js` 等）全部加上 `?v=19` 後綴，強迫瀏覽器重新下載最新的模組檔案。並將 `main.html` 版號同步推進至 `v=19`。

---

## 📅 近期重要更新 (v18 階段)

### 1. 購物車新增免運門檻明細顯示 (v18)
- **問題**：使用者回報雖然底部總金額旁有「免運費」標籤，但希望在購物車彈出區塊的「已套用優惠活動」明細中，也能清楚列出是因為達到什麼門檻而獲得免運，提升使用者體驗。
- **修正**：修改 `cart.js` 的 `updateCartUI()`。在渲染 `#cart-discount-details` 折扣明細區塊時，除了原有的商品滿件/滿額折扣（`hasPromos`），新增對免運 (`isFreeShipping`) 的判斷。若達成免運，會動態從 `appSettings` 取出當前選擇的配送方式名稱與免運門檻，並以藍色樣式（如 `🚚 超商取件免運 (滿$500)` ）與商品折扣一併顯示在「已套用優惠與折抵」區塊中。

---

## 📅 近期重要更新 (v17 階段)

### 1. 修復 main-app.js ES Module 中斷錯誤 (v17)
- **問題**：在上一版 (v16) 中，將 `updateCartUI` 掛載到 `window` 時，忘記在 `main-app.js` 頂部的 `import` 清單中引入它。這導致 ES Module 拋出 `ReferenceError` 並**中斷了整個腳本的執行**。結果導致 `DOMContentLoaded` 事件未綁定，也沒有呼叫 `loadInitData()`，使得首頁商品區卡在「載入商品中...」。
- **修正**：在 `js/main-app.js` 的 `import` 清單中補上 `updateCartUI`，解決 ReferenceError 並恢復正常載入腳本。

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
