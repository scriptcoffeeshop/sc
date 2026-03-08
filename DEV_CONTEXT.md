# 咖啡訂購系統 - 開發脈絡與狀態紀錄 (Context Tracking)

**這份文件用來記錄專案最近的重要變更、除錯經驗與排版設計決策建立的脈絡。**
為了方便下次進行專案開發或開啟新對話時，讓 AI（Assistant）能快速掌握目前狀態與曾經踩過的坑。

---

## 🛠 給協助審查或接手此專案的 AI 的注意事項

1. **不可輕忽的手機 Cache**：未來如果修改了 js 代碼但畫面邏輯崩潰，請高度懷疑是瀏覽器快取搗亂。解法是：**只要動了 js，就必須同時修改 `.html` 引用的 `v=X` 版號**。
2. **事件代理策略**：前台與後台的 inline 事件（`onclick/onchange` 等）已全面改為 `data-action` + 事件代理。**禁止再加回任何 inline handler**，CI guardrail 會自動攔截。若新增功能需要按鈕互動，請在 `actionHandlers`（前台）或 `initializeDashboardEventDelegation` 的 switch（後台）中註冊新 action。部分函式仍掛載在 `window` 上，是為了保留舊快取版本的相容性，非必要請勿新增。
3. **繁體中文規則**：所有對話與代碼內的開發邏輯註解（comments），依照過去的強制要求，請一律使用 **「繁體中文（Traditional Chinese）」**。

---

## 📅 v37 — 移除系統欄位保護 + Email 連動表單欄位 + 標題動態化

- 前台 `dashboard-app.js`：移除 `protectedKeys`，phone/email 不再有 🔒 系統標記，可被停用或刪除。
- 後端 `settings.ts`：`deleteFormField` 移除 `protectedKeys` 保護，允許刪除任何欄位。
- 後端 `orders.ts`：
  - 電話必填驗證和格式驗證改為條件式（無電話時不驗證）。
  - Email 模板中「聯絡電話」改為條件顯示（`phone` 為空則不顯示）。
  - Email 標題從硬編碼 `[咖啡訂購]` 改用 `site_title` 系統設定。
  - 出貨通知 Email 標題同步使用 `site_title`。

---

## 📅 v36 — 表單欄位依配送方式顯示/隱藏

- 資料庫 `coffee_form_fields` 新增 `delivery_visibility` TEXT 欄位（JSON 格式）。
- 後端 `settings.ts`：`addFormField`/`updateFormField` 加入 `deliveryVisibility` 參數讀寫。
- 後台 `dashboard-app.js`：
  - 新增 `dashboardSettings` 全域變數快取系統設定。
  - 表單管理的新增/編輯 modal 加入「🚚 配送方式可見性」勾選面板。
  - 欄位列表顯示配送限制 badge（🚫 在 xxx 時隱藏）。
- 前台 `form-renderer.js`：`renderDynamicFields` 新增第 3 參數 `deliveryMethod`，依 `delivery_visibility` 過濾欄位。
- 前台 `delivery.js`：`selectDelivery` 切換配送方式時呼叫 `window.rerenderFormFields()`。
- 前台 `main-app.js`：暴露 `window.rerenderFormFields` 全域函式，帶入 `state.selectedDelivery`。

---

## 📅 v35 — 將動態表單欄位移至配送方式與付款方式之間

- `main.html`：`#dynamic-fields-container` 從商品列表上方移至配送方式 `</div>` 與付款方式 `<div>` 之間。

---

## 📅 v40 — 會員資料功能：自動帶入常用資料

- 新增 `api/profile.ts`：`getUserProfile` / `updateUserProfile` API。
- `index.ts`：註冊 `getUserProfile`、`updateUserProfile` 路由。
- `utils/users.ts`：`mapToCamel` 加入 `defaultCustomFields` 欄位對應。
- `schema_full.sql`：`coffee_users` 新增 `default_custom_fields TEXT DEFAULT '{}'`。
- `main.html`：使用者登入後顯示「👤 會員資料」按鈕。
- `main-app.js`：
  - `showProfileModal()` SweetAlert2 彈窗，動態渲染表單欄位供使用者編輯預設值。
  - `prefillUserFields()` 函式：登入後自動回填 phone/email 及所有動態自訂欄位。
- `orders.js`：訂單送出後背景呼叫 `updateUserProfile` 同步資料到 DB。

---

## 📅 v39 — 優化訂單通知 Email 寄件人與排版

- 後端 `utils/email.ts`：寄件人名稱從 `☕ 咖啡豆訂購系統` 改為 `Script Coffee`。
- 後端 `orders.ts`：
  - 移除了 Email 內文 `<h1>` 標題（訂購確認）的 `☕` 符號。
  - 重構自訂表單欄位（`customFields`）處理邏輯：從 `coffee_form_fields` 資料表動態取得標籤名稱（取代預設欄位 Key）並依前台設定的 `sort_order` 排序。
  - 將自訂欄位資訊移至**「聯絡電話」 上方**呈現，並移除原本置於訂單資料下方的「其他資訊」區塊。

---

## 📅 v38 — 修復後台配送選項無法顯示文字與同步 Email 格式

- 前端 `orders.js` 中的 `home_delivery` 顯示文字從「全台宅配(含郵遞區號)」改為「全台宅配」。
- 同步修改後端 `api/orders.ts` 中的 Email 模板：
  - 收件資訊格式統一，處理了 `storeAddress` 可能為空的情境以避免出現多餘括號。
  - 將出貨通知中的 `family_mart` 文字「全家 取貨/取貨付款」移除多餘空白，與建立訂單通知統一。

---

## 📅 v34 — 修改宅配選項文字與同步 Email 格式

- 前端 `orders.js` 中的 `home_delivery` 顯示文字從「全台宅配(含郵遞區號)」改為「全台宅配」。
- 同步修改後端 `api/orders.ts` 中的 Email 模板：
  - 收件資訊格式統一，處理了 `storeAddress` 可能為空的情境以避免出現多餘括號。
  - 將出貨通知中的 `family_mart` 文字「全家 取貨/取貨付款」移除多餘空白，與建立訂單通知統一。

---

## 📅 v33 — 隱私權與退換貨政策頁面 + 下單同意勾選

- 新增 `policy.html`（隱私權政策 + 退換貨政策），使用與訂購頁一致的視覺風格。
- `main.html` 備註上方新增同意 checkbox，連結可開新分頁查看政策。
- `orders.js` 的 `submitOrder()` 加入勾選驗證，未勾選會顯示提示且無法下單。

---

## 📅 v32 — 匯款帳號選取同步強化 & E2E 回歸

- **radio 同步**：匯款帳號 radio 移除 `pointer-events-none`，允許直接點擊；點卡片/點 radio 皆透過 `selectBankAccount` 統一更新。
- **E2E 補強**：進入轉帳後預設第一筆為選取狀態（藍框 + checked）、直接點第二筆 radio 需同步切換、複製按鈕不影響選取、`transfer→cod→transfer` 切換後選取仍保留。transfer 送單改為先選第二筆帳號再驗證 payload。

---

## 📅 v31 — delivery legacy 清理 & E2E 送單覆蓋

- **清除 legacy**：`selectDelivery`、`checkStoreToken`、`loadDeliveryPrefs` 改為僅用 `.delivery-option[data-id="..."]`，移除所有 `[onclick*]` 選擇器 fallback。
- **guardrail 強化**：`check_main_event_delegation.py` 新增禁止 `[onclick*` selector 檢查。
- **E2E 送單**：新增 `submitOrder` happy path、`transfer`（驗證帳號末 5 碼 payload）、`linepay`（驗證跳轉）smoke test。

---

## 📅 v30 — Playwright E2E Smoke Test

- 新增 `playwright.config.ts` + `tests/e2e/smoke.spec.ts`。
- 前台 smoke：資料載入、配送縣市切換、轉帳帳號選取/複製。後台 smoke：自動登入、訂單狀態切換、商品編輯 modal。
- 以 route mock 攔截 API，降低外部依賴。CI 新增 `Setup Node.js` + `Install Playwright browser` + `Run E2E smoke tests`。

---

## 📅 v29 — 前台 inline 事件清理完畢

- 移除 `main.html` 配送縣市 `onchange`，改由 `main-app.js` 初始化時綁定 `change` 事件。
- 「重試」按鈕、轉帳帳號卡片/複製按鈕改為 `data-action`。`selectPayment` 固定用 `data-method`。
- 新增 `scripts/check_main_event_delegation.py` CI guardrail。

---

## 📅 v28 — 後台事件代理全面完成

- 後台動態列表（訂單、商品、分類、促銷、物流、用戶、黑名單、表單欄位、匯款帳號）內的 inline handler 全改為 `data-action`。
- 擴充 `initializeDashboardEventDelegation`，含 click + change 事件。補 `parseId` 工具。
- 新增 `scripts/check_dashboard_event_delegation.py` CI guardrail。

---

## 📅 v27 — 前端快取版號「單一來源」機制

- 新增 `/.frontend-version` 為唯一版號來源。
- 新增 `scripts/sync_frontend_version.py`（同步：`python3 scripts/sync_frontend_version.py 27`；檢查：`--check`）。
- CI 新增 `Verify frontend cache version sync` 步驟。

---

## 📅 v26 — 分類拖曳排序 & 更名商品同步

- 分類管理改用 Sortable.js 拖曳排序（`drag-handle-cat`），拖曳完成後一次傳 `ids` 陣列。
- 後端 `updateCategory` 在更名時同步更新 `coffee_products.category` 欄位。

---

## 📅 v25 — 運費提示視覺強化

- 未達免運提示改為深紅色 (`#991b1b`) + 淡紅底 (`#fef2f2`)，金額前加 `+` 號，文案改為「未達🚚 XXX免運門檻」+ 下方「還差 $XXX 即可免運」。

---

## 📅 v24 — 運費/免運提示區塊獨立 & LINE Pay 404 修復

- 未達免運的運費提示從「已套用優惠」區塊移出，成為獨立醒目元件。
- **LINE Pay 404**：`FRONTEND_URL` 缺 `/sc` 子路徑 → `supabase secrets set FRONTEND_URL="https://scriptcoffeeshop.github.io/sc"`。
- **教訓**：任何後端回調 URL 都依賴 `FRONTEND_URL`，必須含完整子路徑 `/sc`。

---

## 📅 v22–v23 — 結帳介面優化 & 宅配下拉修復

- **v23**：`onchange="updateDistricts()"` 在 ES Module 作用域內無效 → 加 `window.updateDistricts = updateDistricts;`。文案改為「📍 配送地址 (限新竹市/竹北市)」。
- **v22**：移除手動門市表單（改 `type="hidden"`），強制使用電子地圖選店。「綠界超商地圖」文案統一為「超商地圖」。購物車新增未達免運橘字提示。

---

## 📅 CI & 7-11 PCSC 整合

- **CI 報錯機制**：`.agents/workflows/ci-check.md` 定義從 GitHub API 抓失敗 → 本機 `deno fmt`/`lint`/`check` 修正 → 重推的 SOP。
- **7-11 PCSC 地圖**：從綠界改為 PCSC 官方 `https://emap.presco.com.tw/c2cemap.ashx`（需 `servicetype: '1'`）。全家維持綠界。
- 後端新增 `createPcscMapSession` / `pcscMapCallback`。PCSC 回傳全小寫欄位 + `multipart/form-data`。
- **CORS**：`config.ts` 的 `ALLOWED_REDIRECT_ORIGINS` 加入 `localhost:5500`。

---

## 📅 v21 — 免運明細「來店自取」Bug（State Fragmentation）

- Python Regex `([^v]+?)` 漏改 `delivery.js` 版號 → `main-app.js` 和 `cart.js` 載入不同 `state.js` 實體 → 永遠讀到「來店自取」。
- **解法**：更嚴謹的 Python 腳本統一推升所有 JS import 版號。

---

## 📅 v20 — ES Module 碎片化

- `main-app.js` 的 import 帶 `?v=19` 但子模組內部 import 不帶 → 載入不同記憶體實例 → 商品白畫面。
- **解法**：Python 腳本將 `js/` 下所有 `.js` 的 import 加統一版號。

---

## 📅 v19 — ES Module 快取

- 改了 `cart.js` 但 `main-app.js` 的 `import` 未帶版號 → 瀏覽器用舊版 → 免運功能失效。
- **解法**：所有 import 加 `?v=19` 後綴。

---

## 📅 v18 — 購物車免運門檻明細

- `updateCartUI()` 在折扣明細區塊新增免運判斷，以藍色樣式顯示「🚚 超商取件免運 (滿$500)」。

---

## 📅 v17 — main-app.js Module 中斷

- `updateCartUI` 掛載到 `window` 但忘記 import → ReferenceError 中斷整個腳本 → 首頁白畫面。

---

## 📅 v12–v16 — 事件代理首次導入 & 連鎖修復

- **v13**：付款方式選取外框修復（選擇器改用 `data-method`）+ CI Lint 修復。
- **v14**：訂單送出靜默失敗（`window.state` 未掛載 → 按鈕永遠 disabled）改為直接用 ES module `state`。
- **v15–v16**：購物車運費即時更新（`calcCartSummary` 加 `cart.length > 0` 保護；`selectDelivery` 末尾呼叫 `window.updateCartUI()`）。

---

## 📅 v11 — 前端直連 Supabase

- 新增 `supabase-client.js` + `config.js` 加入 `SUPABASE_URL` / `SUPABASE_ANON_KEY`。
- `loadInitData()` 改用 `supabase-js` 平行查詢六張公開表，含 fallback 回 Edge Function。
- 需執行 `supabase/migrations/20260228_enable_rls_for_public_data.sql` 啟用 RLS。僅影響前台。

---

## 📅 v10 — 底部按鈕移除 & 購物車折扣視覺化

- 移除底部「確認送出」按鈕 → 幽靈按鈕（`display:none`）相容舊快取。
- 購物車折扣明細列出每筆活動扣除金額 + 適用商品打紅色 Badge。
- **In-line Stepper（方案 A）**：加入購物車後按鈕原地長高為上下兩行（名稱/價格 + 增減按鈕），取代 Bottom Drawer（方案 C 已 revert）。
