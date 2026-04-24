# DEV_CONTEXT — 咖啡訂購系統

本文件是交接版專案快照，目標是在 3-5 分鐘內讓下一位接手者掌握規則、現況與風險。

最後更新：2026-04-25

---

## 1) 必讀規則

1. 所有工作區命令一律用 `rtk <cmd>`。
2. tracked `js/` legacy 相容殼已移除；正式站入口應是根目錄 `/`、`/main.html`、`/dashboard.html`，並由 GitHub Pages `workflow` 模式直接提供 Vite build 產物。若線上又出現 `/frontend/main.html` 或 `/frontend/dashboard.html`，代表 Pages source 漂回 `legacy / main / root`，請先到 GitHub Pages 設定修正。GitHub Pages 的 Vite 產物會在 build 後改寫成穩定 `assets/*.js|css` 路徑，並於 CI deploy 自動注入 commit SHA 或 `.frontend-version` 版號，避免 push 後 HTML 與 asset 短暫失配。`package.json` 的 `guardrails` 會執行 `python3 scripts/sync_frontend_version.py --check` 與 repo hygiene，禁止 `js/` 相容殼回流。
3. 目前專案流程：修改程式碼後預設不跑本地驗證以節省 token，先 commit/push 並等待 CI；只有 CI 報錯、使用者明確要求，或需要釐清高風險問題時才跑本地 `guardrails` / tests。
4. 前後台 runtime 互動以 Vue 元件事件與 composable 為主；禁止新增 inline `onclick/onchange` 或 `data-action` 事件代理回流。
5. 專案溝通、註解、commit message 以繁體中文為主。
6. Deno 依賴統一放在 `deno.json` 的 `imports`，程式碼直接使用別名。
7. E2E 若攔截 CDN 腳本，需留意 `integrity/crossorigin` 的 SRI 驗證衝突。
8. `google6cb7aa3783369937.html` 為受保護檔案，不可刪除或修改。
9. `.env*` 與 `supabase/.temp/` 屬本機敏感/暫存資料，不能追蹤進 git；只有 `.example` / `.sample` / `.template` 類範本可入版控。
10. 金流正式金鑰只放在 Supabase / GitHub secrets，不寫入 repo、文件或測試 fixture。
11. `frontend/src/types/` 是共享型別來源；新的 composable 請直接用 `.ts`，`guardrails` 會跑 `scripts/check_new_composables_ts.py` 阻擋新增 `use*.js`。

---

## 2) 專案快照

- 專案：Script Coffee（前台訂購 + 後台管理）
- 主要分支：`main`
- 前端：`Vite + Vue 3`；正式站 deploy 入口為根目錄 `/main.html` / `/dashboard.html`（由 GitHub Pages workflow artifact 提供）
- 後端：`Supabase Edge Functions`（Deno / Hono）
- 前端快取版號來源：`.frontend-version`
- 目前前端版號：`131`
- 部署模式：
  - push 到 `main` / `master` 後會跑 GitHub Actions
  - GitHub Pages 會以 `workflow` 模式自動部署前端
  - GitHub Pages deploy actions 使用 Node 24 compatible 版本：`actions/configure-pages@v6`、`actions/upload-pages-artifact@v5`、`actions/deploy-pages@v5`
  - `.github/workflows/ci.yml` 的 `workflow_dispatch` 預設 `deploy=true`，可在 `main/master` 手動補跑前端與 Supabase deploy jobs
  - Supabase `db push` / `coffee-api` deploy 需 repo secrets 已設好
  - 2026-04-23 已確認並修正 GitHub Pages source：從 `legacy / main / root` 切回 `workflow`，並重跑成功 workflow `24798560081` 讓正式站重新指向 build artifact

必要 secrets：

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_DB_PASSWORD`

---

## 3) 目前狀態

### 前端遷移

- 最終目標已確定為 `Vue 3 + Vite SFC`。
- 後台是優先遷移區：
  - `orders`、`products`、`categories`、`promotions`、`formfields`、`users`、`blacklist` 已改成 Vue-owned state/actions (`useDashboardOrders.ts`、`useDashboardProducts.ts`、`useDashboardCategories.ts`、`useDashboardPromotions.ts`、`useDashboardFormFields.ts`、`useDashboardUsers.ts`)；其中 `useDashboardOrders.ts` 已再拆出 `dashboardOrdersView.ts`、`dashboardOrdersSelection.ts`、`dashboardOrdersExport.ts`、`dashboardOrdersBulkActions.ts`，避免單一 composable 持續膨脹
  - `session / tab 切換` 已改成 Vue-owned state/actions (`useDashboardSession.ts`)
  - `settings` / `settings icons` 已改成 Vue-owned state/actions（`useDashboardSettings.ts`、`useDashboardBankAccounts.ts`、`useDashboardSettingsIcons.ts`）；`useDashboardSettings.ts` 的純設定轉換/預設值/legacy migration 已開始抽到 `dashboardSettingsConfig.ts`
  - dashboard categories composable 已補上 category/service/sortable 型別與 API normalize，分類排序與 CRUD 不再依賴隱式 services/null 型別。
  - dashboard users composable 已補上 users/blacklist/service 型別與 API normalize，會員列表、黑名單與權限操作不再依賴隱式 services/null 型別。
  - dashboard 訂單通知 controller 已補上 Email/Flex/notification deps 共用型別，Flex 歷史紀錄也改為 typed parse/write，不再吞掉 localStorage/clipboard 錯誤。
  - `frontend/src/**/*.vue` 已全面轉為 `<script setup lang="ts">`；共用 UI primitive、dashboard sections/settings/order/modals、storefront 顯示元件與 pages 都納入 Vue typecheck。
- `formfields` 也開始收斂：`useDashboardFormFields.ts` 的 field view model、delivery visibility helper、modal HTML/表單值收集已拆到 `dashboardFormFieldsShared.ts` 與 `dashboardFormFieldsDialog.ts`
- `products` 模組也開始收斂：`useDashboardProducts.ts` 的規格 clone、商品 view model/grouping、product form reset/fill、save payload 組裝已拆到 `dashboardProductsShared.ts`
  - `DashboardSettingsSection.vue` 已拆成設定頁組裝層，實際 UI 分散到 branding、section titles、storefront status、bank accounts 等卡片元件；取貨方式與付款對應、金流選項顯示已抽到獨立 `付款與取貨` 頁籤 (`DashboardCheckoutSettingsSection.vue`)
  - `settings` / `formfields` / `orders` / `categories` / `products` / `promotions` / `users` / `blacklist` 的按鈕互動已改成元件事件直連；`products` / `promotions` modal 儲存也已改成元件內 submit，`orders` 也已脫離 `createOrdersActionHandlers()` 與 document-level click/change delegation
  - dashboard feature 層已不再依賴 `js/dashboard/events.js`，也不再暴露 `window.loginWithLine` / `window.showTab` / `window.linePayRefundOrder` 這類全域 API；dashboard boot/service wiring 已移到 `frontend/src/features/dashboard/bootstrapDashboard.ts`，tracked `js/` 相容殼已移除
  - `frontend/tsconfig.json` 與 `frontend/src/types/` 已建立，核心型別先落到 `Order` / `Product` / `CartItem` / `Settings` / `SessionUser`；新的 composable 由 guardrail 阻擋回退到 `.js`
- 前台 `MainPage.vue` 已存在，根目錄 `main.html` 已瘦身為本機 compat redirect；tracked `js/` 相容殼已移除，Vite bundle 直接使用 `frontend/src/` 的 Vue/TS 入口。storefront 的登入／我的訂單／會員資料／登出、公告關閉、付款切換、配送選擇、門市搜尋結果、我的訂單關閉、物流單號複製、轉帳帳號互動與載入失敗重試，已改成 Vue 元件事件或區域 DOM listener，body-level click delegation 已從 storefront 正常流程移除。
- `MainPage.vue` 已是 storefront 組裝層，主要 UI 區塊拆到 `frontend/src/features/storefront/`：`StorefrontHeader.vue`、`StorefrontProductGrid.vue`、`StorefrontDeliverySection.vue`、`StorefrontPaymentSection.vue`、`StorefrontBottomBar.vue`、`StorefrontCartDrawer.vue`、`StorefrontOrderHistoryModal.vue`。
- storefront 的 products / delivery / payment 狀態已從通用 `useStorefrontShell.js` 拆到 `useStorefrontProducts.ts`、`useStorefrontDelivery.ts`、`useStorefrontPayment.ts`；`useStorefrontShell.js` 只保留 header / auth / announcement / order modal 外殼事件。
- `useStorefrontCart.js`、`useStorefrontShell.js` 已轉為 `useStorefrontCart.ts`、`useStorefrontShell.ts`；目前 storefront 仍留在 JS 的 composable 已再縮減。
- `storefrontLegacyBridge.js` 已移除；MainPage 只在頁面邊界注入仍需 DOM/付款副作用的 action。前台 `cart/delivery/form-renderer/orders/main-app` 實作已搬到 `frontend/src/features/storefront/storefront*.ts`，legacy `js/*.js` 相容 re-export 已移除。
- storefront 的配送選項列表與轉帳帳號列表已改由 `MainPage.vue` 直接渲染；配送操作不再掛到 `window`，轉帳帳號選取只保留 state helper，DOM fallback renderer 已移除。
- storefront「我的訂單」列表已由 Vue `StorefrontOrderHistoryCard.vue` 安全渲染；legacy fallback 後續已移除，不再以 `innerHTML` 或手寫 DOM builder 拼接後端訂單資料。
- storefront legacy `js/*.js` 前台相容殼已移除；實作側的 `innerHTML` renderer 已清到 0，商品列表、購物車、動態表單欄位、配送選項與運費/折扣區塊都改成 Vue / DOM API / `replaceChildren()`。
- storefront 高流量 JSON fallback 已集中到 `frontend/src/lib/jsonUtils.ts`；cart/model/dynamic-fields/delivery/auth 路徑不再各自散落 `JSON.parse + catch {}`。
- frontend production code 已移除匿名 `catch {}`；目前 fallback 行為維持不變，錯誤變數統一命名為 `_error`，方便後續集中補觀測與解析 helper。
- frontend feature 模組已不再直接手寫 `JSON.parse`；settings/products/form-fields/session/promotions/storefront receipt/cart/payment 等路徑改共用 `jsonUtils.ts` 的 record/array 解析 helper。
- dashboard 錯誤訊息 fallback 已集中到 `dashboardErrors.ts`；products/categories/promotions/formfields/bank accounts/users/orders/settings/order notification 不再各自維護 `getErrorMessage()`。
- dashboard SweetAlert/form modal 的 input/select/textarea/checkbox 讀值已集中到 `dashboardFormControls.ts`；orders bulk/status、form fields、bank accounts 不再各自維護 DOM 取值 helper。
- 後端 Email template 與 LINE Flex 的配送文字判斷已集中到共用 helper；LINE Flex 訂單狀態通知的欄位 row / separator 組裝也已抽 helper，避免每個欄位重複手寫 Flex JSON。
- 後端 Email template 的出貨/處理中訂單摘要區塊已集中到 `buildOrderStatusSummaryHtml()`，付款狀態、配送文字、備註與追蹤附加內容共用同一套 HTML 組裝。
- 後端報價引擎 `api/quote.ts` 的商品規格解析與單價決定已抽成純 helper，主計價迴圈專注於 quote line 組裝。
- 後端 action routing 的 schema 驗證樣板已集中到 `publicPost` / `authPost` / `adminPost` helper；action map 不再逐筆手寫 `validate(schema, data)`。
- 後端下單流程 `api/order-submit.ts` 已抽出訂單編號、超商類型與付款建單失敗狀態更新 helper，主流程少一層重複更新語句。
- 後端門市地圖 `api/stores.ts` 已共用門市 session 建立、clientUrl allowlist 驗證、callback 欄位取值與成功頁 HTML；綠界/PCSC callback 不再各自複製導回頁。
- 後端門市地圖 callback 再收斂：綠界與 PCSC 共用門市選擇 DB update helper 與錯誤頁 HTML builder，只保留各自 token / 欄位 mapping。
- storefront 門市搜尋與已選門市 DOM 操作已從 `storefrontDeliveryActions.ts` 拆到 `storefrontStoreSearch.ts`；delivery actions 只保留配送切換、地圖 session、門市 token 回填與偏好載入，原入口以 re-export 維持相容。
- storefront 表單 DOM 讀寫 helper 已集中在 `storefrontDeliveryDom.ts`；主入口、送出配送資訊與發票/轉帳偏好不再各自維護 input/select/checkbox 讀取邏輯。
- storefront 錯誤訊息 fallback 已集中到 `storefrontErrors.ts`；主入口、門市搜尋與我的訂單載入不再各自判斷 unknown error。
- 原則：新功能以 Vue-first 為主；剩餘相容層只接受 hotfix、部署修正或移除型重構。
- 2026-04-23 補上 `frontend/src/lib/swal.js`，避免 npm bundle 的 SweetAlert2 覆蓋 Playwright 先注入的 `window.Swal` mock；若 CI 再出現前後台大量需要確認框的 E2E 同時失效，先檢查這層相容。
- `tw-city-selector` 已由 CDN 改為 npm bundle（`frontend/src/lib/twCitySelector.js` + `frontend/src/features/storefront/storefrontDeliveryActions.ts`），`frontend/main.html` / `frontend/index.html` 不再依賴外部 script。

### 後端演進

- `orders.ts`、`payments.ts` 已拆成較小模組，路由匯入點維持不變。
- rate limiter 已抽成共用 store；預設仍走記憶體 backend，但若設定 `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`，可切到 Upstash Redis REST 作為分散式配額儲存。
- LINE Pay / 街口支付已支援付款期限：超過 `payment_expires_at` 的線上付款訂單會自動轉為 `status=failed`、`payment_status=expired`，查詢、付款確認、街口 inquiry/result 流程都會先正規化逾期狀態。
- 街口支付已切正式環境：正式 API base URL 為 `https://onlinepay.jkopay.com`，`JKOPAY_STORE_ID` / `JKOPAY_API_KEY` / `JKOPAY_SECRET_KEY` / `JKOPAY_BASE_URL` 皆走 Supabase secrets。
- Supabase Edge Function production code 已移除匿名 `catch {}`；目前容錯 fallback 行為維持不變，但錯誤變數統一命名為 `_error`，方便後續補觀測與分級紀錄。
- Supabase Edge Function production code 的直接 JSON 解析已集中到 `utils/json.ts`；settings/quote/order/payment/request/JWT/LINE/JKO/user profile 路徑共用 record/array/text helper。
- 後端 Email template 與 LINE Flex 的配送文字判斷已集中到共用 helper；訂單成立、出貨通知、處理中通知與 LINE 訂單狀態通知不再各自拼接宅配/超商地址文案，LINE Flex 欄位 row 也已改走 helper 組裝。
- 後端報價引擎已把商品規格解析、規格啟用判斷與單價決定從主計價迴圈抽成 `resolveQuoteProductPrice()` helper，既有 quote tests 保護規格、無效付款與折扣計算。
- 後端 `routing/action-map.ts` 已把 POST + schema 驗證的重複樣板收斂為 typed helper，新增/調整 action 時比較不容易漏掉方法限制或驗證。
- 後端 `submitOrder` 已把付款建單失敗時的訂單狀態更新收成 `markPaymentRequestFailed()`，LINE Pay / 街口支付分支不再各自手寫相同 update payload。
- 後端超商地圖 callback 已把 PCSC 與綠界共用的 clientUrl 驗證與成功頁組裝集中，保留各自欄位 mapping，但降低 POST/GET callback 相容流程漂移。

### 視覺與互動

- 前台目前已回到暖棕 / 米白系配色。
- 全站固定操作 icon 已改為向量化對齊邏輯，Vue 入口與 compat redirect 皆已補齊，不應再出現 emoji 作為正式操作 icon。
- 後台主題以 `Solarized Light` 為基底。
- 線上付款 UX 已分情境：下單後付款彈窗可提示「稍後可到我的訂單重新打開付款連結」；但在「我的訂單」內會改成直接提示按下方付款按鈕，不再自我指向「我的訂單」。
- 街口支付在「我的訂單」已移除手動「重新整理街口付款狀態」入口，和 LINE Pay 一樣以重新打開付款連結為主要操作。

### 測試與守門

- 基本檢查以 `guardrails`、Deno lint/check/test、Playwright smoke 為主。
- `ci-local` 已串入 `test:unit`，避免 frontend composable regression 只在 `health` 或 deploy/build 後才被看到。
- `ci-local` 已串入完整前端 `typecheck`（`vue-tsc --noEmit -p frontend/tsconfig.json`）；先前的 baseline config 已移除，dashboard 與 storefront 目前都必須通過完整型別檢查。
- `repo_hygiene_check.py` 已禁止 production source（`frontend/src/`、`supabase/functions/coffee-api/`）新增 `@ts-ignore`，避免型別錯誤被靜音。
- `repo_hygiene_check.py` 已禁止新增 frontend production JS；目前 `frontend/src/` 只允許 `twCitySelector.js` / `taiwanCityData.js` 作為 vendor/data 邊界，entry、Swal wrapper、UI helper 已轉 TypeScript。
- `repo_hygiene_check.py` 已禁止 production runtime 直接新增 `JSON.parse` 與匿名 `catch {}`；JSON 解析需集中在 frontend/backend json helper，catch 需具名以便後續補觀測。
- Playwright `webServer` 已改成 `preview:e2e`，預設先 `npm run build` 再 `vite preview`，也不再自動重用既有 4173 server；若真的要重用既有 server，需顯式帶 `PLAYWRIGHT_REUSE_SERVER=1`。CI test job 會先 build frontend artifact，再以 `SKIP_E2E_BUILD=1 npm run e2e` 重用產物，避免 dev-server only 問題與重複 build。
- 2026-04-22 補的 `useDashboardOrders.test.js`、`useDashboardFormFields.test.js` 需 DOM API，已明確標註 `@vitest-environment jsdom`，並把 `jsdom` 列入 devDependencies，避免 CI 只在 optional 依賴缺席時才炸掉。
- 後端 routing/payment 測試已覆蓋 `submitOrder` mock DB 整合與回應檢查、錯誤商品不落單、金流偽造回呼不改單，以及非 admin 跨資源 CRUD 權限邊界。
- `tests/e2e/smoke/` 已依前台、結帳、後台核心、後台設定、後台控制項、bridge removal 拆分，並共用 `tests/e2e/support/smoke-fixtures.ts`；目前覆蓋：
  - 前台暖色樣式
  - 備註欄不得出現 `<slot />`
  - 會員資料彈窗導角
  - 後台手機版頁籤
  - 前後台固定 icon 樣式
  - dashboard settings icon controls 不得退回 document-level event delegation
  - dashboard settings / form fields controls 不得退回 document-level event delegation
- dashboard `orders` / `products` / `categories` / `promotions` / `formfields` / `users` / `blacklist` 不得退回 `coffee:dashboard-*` custom-event bridge
- storefront `products-container` / `dynamic-fields-container` / `cart-items` / `total-price` / `cart-discount-details` / `cart-shipping-notice` / `delivery-options-list` / `bank-accounts-list` 不得退回 imperative `innerHTML` renderer
- storefront「我的訂單」不得將 API 回傳內容當 HTML 插入 DOM，惡意 `<script>` / `<img onerror>` payload 只能以文字顯示
- storefront checkout smoke 已覆蓋 LINE Pay / 街口支付付款彈窗不得重複「稍後付款可到我的訂單」文案，以及「我的訂單」內待付款提示不得再出現「可到我的訂單」。
- `tests/e2e/smoke/storefront-checkout.spec.ts` 使用 `gotoMain()` 以 `domcontentloaded` + 產品容器可見作為導頁完成條件，避免 CI 偶發卡在 `page.goto("/main.html")` 等待完整 `load` 事件。
- 2026-04-22 另補深度 unit test：`useDashboardOrders` 現在覆蓋篩選組合、批次勾選邊界與 shipped tracking URL 驗證；`useDashboardFormFields` 補了 delivery visibility normalize 與 Sortable reorder；`useDashboardSettings` 補 cached `linepay_sandbox` 與自訂配送方式狀態；`useStorefrontCart` 補零數量邊界、固定運費與多促銷疊加。

---

## 4) 已知風險

### Repo hygiene / 金鑰風險

- `.env.staging` 的 git 歷史清理已完成，舊 commit SHA 已不再是目前可達歷史的一部分。
- 但當時出現過的真實金鑰仍必須視為已外洩；剩餘的 P0 是「完成各平台金鑰輪替」，不是再次做 history rewrite。
- 清理流程請看 `docs/repo-hygiene.md`。

### 自動部署限制

- 前端自動部署已正常。
- 手動 `workflow_dispatch` 現在預設也會帶 deploy；若只想跑測試不想部署，需手動把 `deploy` input 關掉。
- 若 GitHub repo 尚未設定 `SUPABASE_ACCESS_TOKEN` / `SUPABASE_DB_PASSWORD`，Supabase deploy job 會跳過 setup / db push / function deploy，並在 Actions summary 寫出「Supabase deployment skipped」；後端 function 變更仍需確認 deploy step 真的有跑，或用本機已登入的 Supabase CLI 手動 `rtk npm run supabase:deploy`。
- 街口正式環境要求的來源 IP 白名單不在 repo 內管理；若使用 Cloudflare、主機防火牆或其他 WAF，需在外部平台另行設定。

### 遷移未完成區

- 專案仍處於 Vue-first 收斂期；根目錄 HTML 是本機 compat redirect，部分 storefront DOM fallback helper 尚待逐步移除。
- 若修改前後台互動，先確認是否碰到 `data-vue-managed` 容器或 remaining DOM fallback helper，避免雙寫回潮。

---

## 5) 最近有效變更

### 2026-04-25

- 全面 Vue 化 Phase 1：移除 tracked `js/` compatibility wrappers，前後台 runtime 入口改由 `frontend/src/` 的 Vue/TypeScript 管理。
- `check_main_event_delegation.py` / `check_dashboard_event_delegation.py` 改為掃描 Vue/TS runtime 檔，阻擋 inline event attribute 與 `data-action` 事件代理回流。
- `repo_hygiene_check.py` 新增 `js/` legacy 相容殼守門，後續若重新加入 tracked `js/` 檔會直接在 guardrails 失敗。
- storefront 轉帳帳號 DOM fallback renderer 已移除：`storefrontBankAccountsUi.ts` 改為 `storefrontBankAccountsState.ts` 純狀態 helper，畫面與複製互動由 `StorefrontPaymentSection.vue` / `useStorefrontPayment.ts` 負責。
- storefront「我的訂單」legacy fallback 已移除；`showMyOrders` 相容出口不再存在，開啟、載入、錯誤/空狀態與複製物流單號都由 `useStorefrontOrderHistory.ts` + `StorefrontOrderHistoryModal.vue` 管理。
- storefront 門市搜尋彈窗改由 `StorefrontStoreSearchPicker.vue` 掛在 SweetAlert 容器內，搜尋輸入、結果列表與門市點選不再由 `storefrontStoreSearch.ts` 手動 `createElement/addEventListener`。
- storefront 配送子區塊顯示已改由 `StorefrontDeliverySection.vue` 依 `selectedDelivery` 綁定 class，`selectDelivery()` 不再手動替配送/宅配/超商/來店區塊加減 `hidden`。
- `storefrontMainApp.ts` 已移除 DOMContentLoaded 自動初始化 fallback；前台初始化由 `MainPage.vue` 的 Vue lifecycle 明確呼叫 `initMainApp()`。
- storefront 購物車 DOM renderer 已移除；`storefrontCartStore.ts` 現在只維護 cart state、localStorage、quote refresh 與 `coffee:cart-updated` 事件，購物車品項、底部總額、運費提示、優惠明細與轉帳應付金額都由 Vue 元件渲染。
- storefront 付款方式顯示已改由 Vue 管理：`StorefrontPaymentSection.vue` 依 runtime snapshot 控制付款卡片可見性、active 狀態、圖示/名稱/說明與轉帳資訊開合，`storefrontMainAppPayments.ts` 不再手動切換 `.payment-option` / `transfer-info-section` DOM class。

### 2026-04-24

- `ci.yml` 的 `workflow_dispatch` 新增 `deploy` boolean input，預設為 `true`；現在在 `main/master` 手動觸發 workflow 會連同 `Deploy Frontend` / `Deploy Supabase` 一起跑，不再只有 test job。
- `frontend/src/features/storefront/storefrontMainApp.ts` 已收斂成組裝層，auth/profile、quote/payment/bank account、LINE Pay/街口回跳分別拆到 `storefrontMainAppAuth.ts`、`storefrontMainAppPayments.ts`、`storefrontMainAppReturns.ts`。
- storefront 付款主流程已再收斂：`storefrontMainAppPayments.ts` 的 quote refresh / 計價請求拆到 `storefrontQuoteManager.ts`，轉帳帳號選取狀態後續已收斂到 `storefrontBankAccountsState.ts`。
- storefront 付款顯示文案已改成 method/status 對照表；LINE Pay、街口、轉帳的付款狀態 guide 不再靠長串條件分支維護，並補 unit test 保護我的訂單付款文案與付款連結 sanitization。
- storefront 送單成功後的會員預設值與配送草稿同步已集中到 `persistSubmittedOrderPreferences()`，localStorage 與背景 profile sync 共用同一個 payload builder，避免預設配送/付款欄位雙寫漂移。
- `tests/e2e/support/smoke-fixtures.ts` 已改成相容 barrel export，實際實作拆到 `smoke-shared.ts`、`smoke-color.ts`、`smoke-global-stubs.ts`、`smoke-main-routes.ts`、`smoke-dashboard-routes.ts`，降低單檔回歸風險。
- dashboard smoke route support 已再拆分：`smoke-dashboard-routes.ts` 現在只保留 dispatcher，實際 state/defaults 與 access/catalog/orders/members/settings handlers 分散到 `smoke-dashboard-state.ts`、`smoke-dashboard-access-routes.ts`、`smoke-dashboard-catalog-routes.ts`、`smoke-dashboard-orders-routes.ts`、`smoke-dashboard-members-routes.ts`、`smoke-dashboard-settings-routes.ts`。
- storefront smoke route support 也已跟上：`smoke-main-routes.ts` 改成 dispatcher，default state/init payload/quote payload 抽到 `smoke-main-state.ts`，前後台 smoke support 結構已趨於一致。
- storefront cart 熱區也開始收斂：新增 `storefrontCartSummary.ts` 集中 cart/quote 對齊、摘要金額、配送 badge/notice 與 delivery meta helper；`storefrontCartStore.ts` 與 `useStorefrontCart.ts` 已共用同一套摘要/配送判斷，並補 `storefrontCartSummary.test.js` 保護 quote 漂移 fallback、免運 badge 與配送名稱解析。
- storefront cart DOM renderer 已再拆出 `storefrontCartUi.ts`：購物車品項列、總額 badge、運費提示與優惠明細 UI builder 不再混在 `storefrontCartStore.ts`，並新增 `storefrontCartUi.test.js` 保護 action dataset、文字安全渲染、運費/免運提示與空狀態隱藏。
- 後台設定資訊架構已調整：取貨方式與付款對應設定、金流選項顯示設定從 `系統設定` 抽到獨立 `付款與取貨` 頁籤，仍共用 `useDashboardSettings.ts` / `saveSettings()`；dashboard settings smoke 已覆蓋新頁籤可載入、增刪取貨方式、儲存 delivery/payment config 與 LINE Pay sandbox。
- `付款與取貨` 頁籤的取貨方式與付款對應設定已從寬表格改成可排序卡片式清單，付款方式以網格勾選呈現，不再需要左右捲動才能檢視；取貨說明欄改為可換行 textarea，smoke 已在 390px 寬度驗證清單不產生水平捲動並保護多行說明儲存。
- 後台品牌、取貨方式、付款選項的文字備援圖示欄位已移除；設定 payload 只保留 `*_icon_url` 與預設圖片，並新增 migration 刪除 `site_icon_emoji` 公開設定。取貨方式卡片比例同步調整為左側資料較緊湊、右側付款規則較寬。
- 後台設定 UI 再整理：圖示上傳控制改為檔案選擇在上、上傳按鈕在下；`區塊標題樣式設定` 改成三張可掃描卡片，內含標題預覽、圖示上傳、標題/大小/顏色/粗體設定，dashboard settings smoke 已覆蓋手機寬度不水平溢出。
- `金流選項顯示設定` 已同步改為卡片式清單，取消表格版面；每個付款方式保留系統代碼、預覽、圖示上傳、顯示名稱與說明欄位，dashboard settings smoke 已覆蓋上傳按鈕位置與手機寬度不水平溢出。
- 前台配送方式卡片的說明文字已跟進後台 textarea，多行內容以 `white-space: pre-line` 呈現；storefront smoke 已覆蓋後端換行說明不被壓成一行。
- 後台設定 UI CSS 已再收斂：區塊標題/金流卡片共用 `settings-config-*` 樣式，並移除已無元件使用的 `settings-routing-table` / `settings-payment-table` / `settings-responsive-wrap` 手機表格相容樣式。
- Supabase Edge Function production code 已移除匿名 `catch {}`，改為統一 `_error` binding；本輪通過 `npm run fmt:check`、`npm run lint`、`npm run check`、`npm run test`、`npm run guardrails` 與 `git diff --check`。
- frontend production code 已移除匿名 `catch {}`，改為統一 `_error` binding；本輪通過 `npm run lint:frontend`、`npm run typecheck`、`npm run build`、`npm run test:unit`、`npm run guardrails` 與 `git diff --check`。
- frontend feature 模組的 JSON 解析 fallback 已集中到 `frontend/src/lib/jsonUtils.ts`，只保留該工具內部直接呼叫 `JSON.parse`；本輪通過 `npm run lint:frontend`、`npm run typecheck`、`npm run test:unit`、`npm run build`、`npm run guardrails` 與 `git diff --check`。
- Supabase Edge Function production JSON 解析 fallback 已集中到 `supabase/functions/coffee-api/utils/json.ts`，只保留該工具內部直接呼叫 `JSON.parse`；本輪通過 `npm run fmt:check`、`npm run lint`、`npm run check`、`npm run test`、`npm run guardrails` 與 `git diff --check`。
- `repo_hygiene_check.py` 新增 runtime 守門，阻擋 production 直接新增 `JSON.parse` 或匿名 `catch {}`；本輪通過 `npm run guardrails`、`python3 scripts/repo_hygiene_check.py` 與 `git diff --check`。
- `payment-shared.ts` 已移除重複的 email branding 與 LINE 通知錯誤截斷 helper，改 re-export `order-shared.ts` 的共用版本；付款專用 `parseReceiptInfo` 因需保留物件原樣回傳語意，仍留在付款模組並由 payments test 保護。
- `payment-shared.ts` 的線上付款逾期狀態機已拆到 `payment-expiry.ts`，再由原檔 re-export 保持既有 import 相容；本輪通過 `npm run fmt:check`、`npm run check`、`payments_test.ts`、`npm run test`、`npm run lint`、`npm run guardrails` 與 `git diff --check`。
- `payment-shared.ts` 的 JKO LINE 通知狀態寫回已集中到 helper，缺 LINE user、通知失敗、略過通知與通知成功不再各自手寫 Supabase update / warning 樣板。
- `payment-jkopay.ts` 的街口訂單狀態同步核心已拆到 `payment-jkopay-sync.ts`，result/inquiry/refund 路由層不再內嵌 DB 狀態機；本輪通過 `npm run fmt:check`、`npm run lint`、`npm run check`、`payments_test.ts`、`npm run test`、`npm run guardrails` 與 `git diff --check`。
- `storefrontDeliveryActions.ts` 已先抽出 `storefrontDeliveryDom.ts`，集中配送偏好/門市資料 normalize 與 DOM input/select/form helper；本輪通過 `npm run lint:frontend`、`npm run typecheck`、`npm run test:unit`、`npm run build`、`npm run guardrails` 與 `git diff --check`。
- `useDashboardPromotions.ts` 已抽出 `dashboardPromotionsShared.ts`，集中促銷 view model、target items normalize、商品規格解析與 product groups；本輪通過 `npm run lint:frontend`、`npm run typecheck`、`npm run test:unit`、`npm run build`、`npm run guardrails` 與 `git diff --check`。
- `frontend/src/features/dashboard/useDashboardOrders.ts` 已收斂成 orchestration layer；篩選/摘要與 view model、選取狀態同步、CSV 匯出、批次更新/刪除分別搬到 `dashboardOrdersView.ts`、`dashboardOrdersSelection.ts`、`dashboardOrdersExport.ts`、`dashboardOrdersBulkActions.ts`。
- dashboard 設定模組開始收斂：`useDashboardSettings.ts` 已改成較薄的 state/action 組裝層，純設定轉換、section defaults、legacy delivery migration、payload 組裝抽到 `dashboardSettingsConfig.ts`；`bootstrapDashboard.ts` 的 tab loader 依賴型別也補上，減少 `Record<string, any>`。
- dashboard 表單欄位模組開始收斂：`useDashboardFormFields.ts` 已保留 action orchestration，field view model、欄位選項序列化、delivery visibility 正規化與 modal DOM helper 分別拆到 `dashboardFormFieldsShared.ts`、`dashboardFormFieldsDialog.ts`，並新增 helper unit test 保護拆分行為。
- dashboard 表單欄位 mutation 流程已再集中：新增/編輯/刪除/啟停共用 `runFormFieldMutation()`，modal values 正規化也集中到單一 helper，減少 success/error/toast/load 樣板重複。
- E2E 支援層下一段已收斂：`tests/e2e/support/smoke-dashboard-routes.ts` 從單檔 800+ 行拆成 dispatcher + 多個 domain handler，dashboard smoke 回歸仍通過，後續要補 route stub 時可直接改對應 domain 檔，不必再回到單一大檔。
- storefront 付款熱區也已開始降溫：`storefrontMainAppPayments.ts` 保留 settings/payment orchestration，quote manager 與 bank account fallback UI 拆出獨立 helper，storefront smoke / checkout 回歸仍通過。
- `useDashboardSettingsIcons.ts` 已補上較明確的 service / preview map / icon upload response 型別與 key guard，維持既有行為但降低 icon 套用時的型別空窗；對應 unit test 仍通過。
- `useDashboardSettingsIcons.ts` 已把品牌、區塊、付款與物流圖示上傳流程集中到 `uploadValidatedIconFile()`，減少 loading modal、錯誤 fallback、成功 toast 與 preview 清除流程重複。
- dashboard products 也開始回到 orchestration：`useDashboardProducts.ts` 現在主要保留載入/排序/儲存 action，view/form/spec 純邏輯搬到 `dashboardProductsShared.ts`，原有 unit test 仍通過。
- dashboard products API 樣板已再收斂：商品排序、新增/編輯、刪除、啟停共用 `postProductAction()` / success guard；啟停商品的完整 update payload 也移到 `dashboardProductsShared.ts`，並補 helper unit test 保護欄位保留。
- 前端靜態檢查已補齊：新增 `eslint.config.mjs` 與 `npm run lint:frontend`，`ci-local` 與 GitHub Actions test job 都會執行 Vue/TypeScript 前端 lint。
- `guardrails` 新增 `scripts/check_dev_context_sync.py`，會比對 `DEV_CONTEXT.md` 的「最後更新」與 `.frontend-version` / 最新變更節點，降低文件與實際狀態漂移。
- 本輪驗證已通過：`npm run lint:frontend`、`npm run typecheck`、`npm run test:unit`、`npm run build`、`npm run ci-local`。

### 2026-04-23

- 修正資料庫 schema 與後端訂單狀態白名單漂移：新增 `202604232050_allow_failed_order_status.sql`，讓 `coffee_orders.status` CHECK 接受 `failed`，並同步 `schema_full.sql`；`guardrails` 新增 `scripts/check_order_status_schema.py`，避免 `VALID_ORDER_STATUSES` 和完整 schema 再次不一致。
- 清除 production source 最後 3 處 `@ts-ignore`：Deno import 已改回依賴 import map / `@deno-types` 正常解析，並把 `repo_hygiene_check.py` 擴充為 production source `@ts-ignore` 守門。
- 完成健康度建議 1-6 的一次性推進：前端 entry / Swal wrapper / UI `cn` helper 轉 TypeScript，`storefrontModels`、`dashboardSettingsShared`、icon helper、LINE Pay 回傳與付款彈窗選項補明確型別；`repo_hygiene_check.py` 新增 production JS allowlist 守門。
- 依賴已升級至 Vue `3.5.33`、Reka UI `2.9.6`、SortableJS `1.15.7`、Vitest `4.1.5`、`@vitejs/plugin-vue 6.0.6`、Vite `8.0.10`、Tailwind CSS `4.2.4`，並新增 `@tailwindcss/postcss`；Tailwind 4 讓部分舊 utility 產出策略不同，已把購物車抽屜與我的訂單 modal 的 viewport 高度、圓角、捲動與 overlay 轉為顯式 CSS guard。
- 品牌 logo 已從 4168px / 約 829.7KB 壓縮為 1024px / 約 82.6KB，建置後 `assets/logo.png` 約 84.6KB。
- GitHub Actions Supabase deploy skipped 情境已補 summary / notice，避免 secrets 缺失時只靠 warning 追查。
- 依健康度檢查處理第一段 npm audit：`sweetalert2` 已由 `^11.10.6` 更新到 `^11.26.24`，對應 advisory 已消失；剩餘 audit 風險集中在 `tw-city-selector@2.1.2` 連帶的 `docsify/marked/vue2`，不建議用 `npm audit fix --force` 降版，後續應以替換或 vendor runtime 方式處理。
- 完成 `tw-city-selector` audit 收斂：已移除 npm dependency，改用本地 `frontend/src/lib/twCitySelector.js` 與 `taiwanCityData.js`，資料取自原 runtime 的繁中縣市/區域/郵遞區號以維持全台宅配行為；新增 `twCitySelector.test.js` 保護縣市、區域、郵遞區號與 `setValue()`。`npm audit --omit=dev` 目前為 0 vulnerabilities。
- 前端型別守門已完成升級：`npm run typecheck` 現在直接執行完整 `frontend/tsconfig.json`，並已串入 `ci-local`；補齊 dashboard products、storefront cart/delivery/form/main app/order submit/order history 等型別邊界與相容全域宣告後，`npm run typecheck:full` 目前可通過。
- Dashboard 剩餘 6 支 JS composable 已轉成 `.ts`：`useDashboardProducts.ts`、`useDashboardPromotions.ts`、`useDashboardCategories.ts`、`useDashboardUsers.ts`、`useDashboardBankAccounts.ts`、`useDashboardSettingsIcons.ts`；`bootstrapDashboard.ts` 也同步轉檔，`check_new_composables_ts.py` allowlist 已清空。
- `storefrontOrderActions.ts` 已由 1324 行縮成出口層：付款狀態/文案搬到 `storefrontPaymentDisplay.ts`，送單流程搬到 `storefrontOrderSubmit.ts`，收據偏好、配送資訊收集與確認彈窗分別拆到 `storefrontOrderReceiptPrefs.ts`、`storefrontOrderDeliveryInfo.ts`、`storefrontOrderConfirmDialog.ts`；2026-04-25 已移除 legacy `showMyOrders()` fallback。
- 前台訂單流程已補強共享型別：新增 `frontend/src/types/storefront.ts`，並讓送單、配送資訊、收據偏好、付款顯示與確認彈窗核心函式改用明確參數/回傳型別；`frontend/src/lib/swalDialogs.ts` 也開始集中常見 SweetAlert2 模式，後續可逐步把重複的 `Swal.fire()` 呼叫收斂到 helper。
- shared legacy 最後一哩路已推進：`config.js`、`auth.js`、`utils.js`、`state.js`、`dashboard/api.js`、`dashboard-branding.js`、`order-shared.js` 的實作已搬到 `frontend/src/lib/*` 或 `frontend/src/features/dashboard/*`；Vite 內部 import 不再直接依賴這批 shared legacy 檔，2026-04-25 已移除 `js/` re-export 相容殼。
- `storefrontMainApp.ts` 已移除剩餘 8 處 `window.*` 相容掛載，quote refresh、付款選項狀態、表單/UI callback 與 app settings/delivery config 都改走 `storefrontRuntime.ts` 模組 bridge；同檔直接 `Swal.*` 呼叫也已收斂到 `frontend/src/lib/swalDialogs.ts` helper。
- 修正前台配送卡片未同步後台設定文案：`storefrontUiSnapshot.ts` 現在改讀 `storefrontRuntime.appSettings/currentDeliveryConfig`，不再依賴已移除的 `window.appSettings/currentDeliveryConfig`；並新增 snapshot unit test 保護後台配送名稱/說明同步。
- 消費者通知已新增付款中狀態 guard：所有支付只要 `payment_status=processing`，自動付款狀態通知、後台手動 LINE Flex 與後台手動 Email 都會略過，不再把「付款確認中」通知發給消費者；店家 LINE 訂單通知不受影響。
- P2 legacy JS 殘留續清：`js/icons.js` 已搬到 `frontend/src/lib/icons.ts`，`js/storefront-models.js` 已搬到 `frontend/src/features/storefront/storefrontModels.ts`，後台訂單通知/狀態控制模組已搬到 `frontend/src/features/dashboard/dashboardOrder*.ts`，`settings-shared.js` 已搬到 `dashboardSettingsShared.ts`。
- `package-lock.json` 已從 `.gitignore` 移除並納入追蹤，Tailwind `content` 掃描也收斂為 `frontend/*.html` 與 `frontend/src/**/*.{js,ts,vue}`，不再掃 legacy `js/` 或根目錄 redirect stub。

### 2026-04-22

- 街口支付已切正式環境：Supabase secrets 已更新正式 Store ID / API Key / Secret Key / base URL，程式預設正式網域改為官方 `https://onlinepay.jkopay.com`，並已手動部署 `coffee-api`；金鑰不可寫入 repo。
- LINE Pay / 街口支付的逾期線上付款會自動轉為失敗訂單：`status=failed`、`payment_status=expired`，並補齊 dashboard filter/label、Email template、LINE Flex 與 routing/payment regression。
- 「我的訂單」內的街口支付手動刷新入口已移除，改為和 LINE Pay 一樣只提供重新打開付款連結；街口回跳 result/inquiry 流程仍保留後端同步能力。
- 付款提示文案已分情境：下單後付款彈窗保留「稍後可到我的訂單重新打開付款連結」，但「我的訂單」卡片改為「請點下方付款按鈕繼續」，避免使用者已在我的訂單時看到自我指向提示。
- 修正 LINE Pay / 街口支付付款彈窗重複提示問題，E2E 已保護付款彈窗中的「我的訂單」只出現一次，且「我的訂單」卡片不含多餘「若您稍後再付款」文案。
- LINE Pay 待付款提示已和街口支付語氣對齊：`請儘快完成 LINE Pay；若稍後付款，可到「我的訂單」重新打開付款連結。`
- storefront legacy 遷移續推：`useStorefrontProducts.ts` 已吸收商品分組 / spec normalize，`useStorefrontDelivery.ts` 已吸收 delivery config fallback/migration；`MainPage.vue` 現在透過 `storefrontUiSnapshot.ts` 同步 products/delivery/payment/dynamic fields state，不再依賴 `coffee:products-updated` 事件或 bridge 的 main-app snapshot export。
- storefront 動態欄位已新增 Vue 元件：`StorefrontDynamicFields.vue` + `useStorefrontDynamicFields.ts` 會依配送方式過濾欄位並套用會員預設值；legacy `renderDynamicFields()` no-op 已移除，保留 `collectDynamicFields()` 供現有送單流程收集欄位。
- storefront runtime bridge 已加上明確型別：`storefrontRuntime.ts` 只允許目前仍需要的 payment/cart/quote/dynamic-field callbacks，避免 legacy callback 名稱回流。
- storefront legacy bridge 已移除：products/delivery/payment/dynamic fields 的快照 glue 走 `storefrontUiSnapshot.ts`；cart/delivery/form/order/main-app 實作搬進 storefront feature TS 檔，2026-04-25 已移除 legacy `js/` 相容 re-export。
- dashboard 訂單 state/view/export/selection 已共用 `dashboardOrderTypes.ts`，`useDashboardOrders` 不再以 `ref<any[]>` 保存訂單，批次操作服務也改用明確介面。
- production frontend 已清除明顯 `any` 型別債：dashboard 訂單 payload、促銷 payload 與 LINE Flex content 改用 `unknown` / `FlexContent` 型別。
- storefront cart storage 解析已改為明確 fallback helper，壞掉的 `coffee_cart` JSON 會回到空購物車並有 unit test 保護。
- storefront 登入預設欄位、付款/配送設定解析與送單後偏好同步已移除空 `catch {}`，改為具名 parse/persist/background sync helper。
- dashboard 訂單狀態 controller 已補上 deps/order 型別與安全錯誤訊息 fallback，狀態更新、退款、確認收款不再依賴隱式 any。
- dashboard promotions composable 已補上 promotion/product/service/sortable 型別，活動目標商品、排序與儲存流程不再依賴隱式 services/null 型別。
- dashboard bank accounts composable 已補上 account/service/sortable 型別與 API normalize，匯款帳號排序與 CRUD 不再依賴隱式 services/null 型別。
- dashboard composable unit test 已補齊缺口：新增 `useDashboardSettings`、`useDashboardFormFields`、`useDashboardCategories`、`useDashboardUsers`、`useDashboardBankAccounts`、`useDashboardSession`、`useDashboardSettingsIcons` tests，dashboard composable 目前全數都有 unit test 檔保護。
- dashboard composable `.ts` 轉換續推：`useDashboardOrders.ts`、`useDashboardFormFields.ts`、`useDashboardSettings.ts` 已完成轉檔並更新引用；`check_new_composables_ts.py` allowlist 同步移除這三支，避免回退到 JS。
- backend settings round-trip tests 已補強：新增專門 `settings_test.ts`，除了既有 routing smoke 外，再覆蓋 `updateSettings -> getSettings` 的正規化/round-trip/upsert/public visibility，特別保護 `delivery_options_config`、`payment_options_config`、`linepay_sandbox` 與相關 icon path 正規化。
- backend `index.ts` 已再拆一層：`routing/action-map.ts` 集中 action → handler 規則，`utils/rate-limit-config.ts` 集中 rate limit 常數與 store 初始化，降低單檔密度。
- frontend 已開始漸進式 TypeScript 引入：新增 `frontend/src/types/`、`frontend/tsconfig.json`，並將 `useDashboardSession`、`useDashboardOrders`、`useDashboardFormFields`、`useDashboardSettings`、`useStorefrontOrderHistory` 轉為 `.ts`。
- 新增 `scripts/check_new_composables_ts.py`，`guardrails` 會阻擋新增 `frontend/src/features/**/use*.js`（既有 allowlist 除外）。
- `scripts/check_new_composables_ts.py` 的 storefront allowlist 已移除 `useStorefrontCart.js`、`useStorefrontShell.js`，避免後續又把這兩支退回 JS。
- 根目錄 `main.html` / `dashboard.html` 已瘦身為本機 compat redirect，不再保留大量 legacy 前後台靜態結構。
- `npm run ci-local` 已納入 `npm run test:unit`，讓 frontend composable unit test 成為日常守門，而不是只在 `health` 才執行。

### 2026-04-21

- 顧客端街口支付資訊已補齊：下單完成提示、街口回跳結果與「我的訂單」現在會顯示付款方式、待付款提示、付款期限、失敗/取消/逾期說明；手動重新整理街口付款狀態入口已於 2026-04-22 移除。
- storefront「我的訂單」彈窗已放大為較實用的桌機尺寸，避免付款資訊與操作按鈕擁擠。
- 桌機版 storefront header / login prompt 已重新限制在與主內容卡相同的 `max-w-3xl` 寬度，登入提示文案與 LINE 按鈕在桌機版會同列顯示，不再出現過寬的橫幅比例失衡。
- Playwright smoke 已新增兩類保護：街口支付顧客端狀態/操作驗證，以及桌機版登入提示比例驗證。
- 本機健康檢查入口已補齊：`npm run health` 現在會串 `ci-local + build + 全量 Playwright`；`npm run e2e` 改成跑所有 E2E spec，`npm run e2e:smoke` 保留快速冒煙檢查。
- GitHub Actions 的 Playwright 步驟已改成走 `npm run e2e`，避免本機與 CI 的 E2E 覆蓋範圍分岔。
- README 已更新為現行 `guardrails` / `sync_frontend_version.py --check` 流程，不再要求協作者逐檔手動 bump `?v=`；Smoke E2E 從單一 3000+ 行檔案拆成 `tests/e2e/smoke/` 多檔與共用 fixture。
- repo 內已追蹤的 `.DS_Store` / `supabase/.DS_Store` 已從 git index 移除，之後由 `.gitignore` 接手忽略。
- `tests/e2e/features.spec.ts` 已對齊目前 Vue storefront / dashboard 行為：全家地圖選門市、CSV 匯出、用戶封鎖、訂單狀態更新四條 feature 測試現在都可被全量 `npm run e2e` 穩定執行。
- `DashboardSettingsSection.vue` 已由 979 行巨型單檔拆成 39 行組裝層，並新增六個設定卡片元件：branding、section titles、storefront status、delivery/payment routing、payment options、bank accounts。
- `DashboardOrdersSection.vue` 已由 483 行拆成 31 行 section shell，並抽出 `DashboardOrdersToolbar.vue` 與 `DashboardOrderCard.vue`。
- 後台訂單通知控制器曾先拆為 legacy JS 協調層；2026-04-23 已搬入 `frontend/src/features/dashboard/dashboardOrderNotifications.ts` 與相關 `dashboardOrderFlex*.ts` / `dashboardOrderEmailController.ts`。
- E2E 新增通知 smoke，驗證後台訂單卡的 `LINE通知` / `發送信件` 仍會打到正確 API。
- storefront legacy `innerHTML` renderer 已清到 0；前台 `js/products.js` 已移除，`js/cart.js`、`js/delivery.js`、`js/form-renderer.js`、`js/orders.js`、`js/main-app.js` 的實作已搬到 storefront feature TS 檔，2026-04-25 已移除相容 re-export；dashboard form fields 的配送可見性 checkbox 也不再拼接 `innerHTML`。
- storefront smoke 現在會直接阻擋 `products-container`、`dynamic-fields-container`、`cart-items`、`total-price`、`cart-discount-details`、`cart-shipping-notice`、`delivery-options-list`、`bank-accounts-list` 上的 `innerHTML` setter。
- `MainPage.vue` 已從 1209 行拆到 472 行，Storefront Wave 2 的 header / product grid / delivery / payment / bottom bar / cart drawer / order history section 都已拆成獨立 Vue 元件。
- 後台 LINE Flex 建構邏輯已從 legacy JS 拆分並於 2026-04-23 搬到 `frontend/src/features/dashboard/dashboardOrderFlexMessage.ts`、`dashboardOrderFlexBody.ts`、`dashboardOrderFlexBubble.ts`、`dashboardOrderFlexLayout.ts`。
- 前端快取版號更新為 `130`。

### 2026-04-20

- 恢復前台暖色系，修正訂單備註欄位顯示 `<slot />`。
- 對齊會員資料彈窗導角。
- 修正後台手機版頁籤顯示。
- 統一前後台固定 icon 的尺寸、顏色與對齊，Vue 入口與 compat redirect 也已換成向量 icon。
- dashboard `categories` 已改成 Vue-owned state/actions，不再依賴 `coffee:dashboard-categories-updated`。
- dashboard `promotions` 已改成 Vue-owned state/actions，不再依賴 `coffee:dashboard-promotions-updated`。
- dashboard `formfields` 已改成 Vue-owned state/actions，不再依賴 `coffee:dashboard-formfields-updated`。
- dashboard `users` / `blacklist` 已改成 Vue-owned state/actions，不再依賴 `coffee:dashboard-users-updated` / `coffee:dashboard-blacklist-updated`。
- dashboard `session / tab` 已改成 reactive state，不再依賴 `dashboard-session-controller.js` 來切換登入頁、管理頁與 tab 顯示。
- dashboard `settings` 的 delivery routing / payment options / sandbox 已改成 reactive state，不再由 `settings-controller.js` 直接組 HTML table。
- dashboard `settings` 的 branding / section titles / announcement / store status 已改成 reactive state，並由 `useDashboardSettings.ts` 統一提交 payload。
- dashboard `settings` 的 bank accounts 已改成 reactive state，不再依賴 `bank-accounts.js` 的 imperative `innerHTML` renderer。
- dashboard `settings` / `icon library` 的 icon upload、預覽與 quick apply 已改成 Vue 直連 reactive state，不再依賴 `icon-assets-controller.js` 或 document-level change/click delegation。
- dashboard `settings` 的 load/save 已併入 `useDashboardSettings.ts`，`settings-controller.js` 已移除。
- dashboard `settings` / `formfields` 的按鈕互動已改成元件內 `@click`，不再經過 `createSettingsActionHandlers()`。
- dashboard `categories` / `users` / `blacklist` 的按鈕與搜尋已改成元件內 `@click` / `@keyup.enter`，不再經過 `createUsersActionHandlers()`、`search-users` 的 document keyup delegation，`useDashboardUsers.ts` 也已改用 reactive `activeTab` 判斷黑名單頁。
- dashboard `products` / `promotions` 的按鈕與 modal 儲存已改成元件內 `@click` / `@submit.prevent`，不再經過 `createProductsActionHandlers()` 或 `product-form` / `promotion-form` 的 imperative submit listener。
- dashboard `orders` 的重整、Flex 歷史、勾選、批次操作、通知、退款、收款確認、狀態提交與刪除已改成元件內 `@click` / `@change`，`js/dashboard/events.js` 與 `createOrdersActionHandlers()` 已移除。
- dashboard page 已改成由 Vue `onMounted()` 直接載入 public branding；`dashboard-globals.js`、`initDashboardApp()` fallback 與舊的 `window.*` dashboard helper 已移除。
- `Textarea.vue` 已補齊標準 `v-model` 支援，避免設定頁與前台多行欄位寫回失效。
- storefront `delivery-options-list` / `bank-accounts-list` 已改由 `MainPage.vue` 直接渲染；配送選項沒有全域 renderer 或 `window.selectDelivery` 橋接，轉帳帳號 DOM renderer 後續已移除。
- storefront `storefrontOrderActions.ts` 的「我的訂單」legacy fallback 後續已移除，API XSS payload smoke 由 Vue modal/card 路徑保護。
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
rtk npm run test:unit
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
- `tests/e2e/smoke/`：主要 smoke regression 保護網
- `tests/e2e/support/smoke-fixtures.ts`：Smoke E2E 共用 route/stub fixture

---

## 8) 維護方式

- 更新本檔時，優先維護「現況、風險、最近有效變更」。
- 不要再把完整 commit log 貼進 `DEV_CONTEXT.md`；git 歷史本身就是唯一真實來源。
- 若變更會影響交接判斷，更新本檔即可；若只是一般小修，保留在 commit history 就好。
