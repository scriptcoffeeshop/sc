# DEV_CONTEXT — 咖啡訂購系統

本文件是交接版專案快照，目標是在 3-5 分鐘內讓下一位接手者掌握規則、現況與風險。

最後更新：2026-04-22

---

## 1) 必讀規則

1. 所有工作區命令一律用 `rtk <cmd>`。
2. legacy `js/*.js` 的 cache busting 由 `.frontend-version` 管理；根目錄 `main.html` / `dashboard.html` 已改成瘦身的本機 compat redirect，不再承載實際前後台靜態 DOM。GitHub Pages 的 Vite 產物則在 build 後改寫成穩定 `assets/*.js|css` 路徑，並於 CI deploy 自動注入 commit SHA 版號，避免 push 後 HTML 與 asset 短暫失配。`package.json` 的 `guardrails` 會執行 `python3 scripts/sync_frontend_version.py --check`；若需要提升 legacy 版號，使用 `python3 scripts/sync_frontend_version.py <version>`，不要逐檔手動改 `?v=`。
3. 目前專案流程：修改程式碼後預設不跑本地驗證以節省 token，先 commit/push 並等待 CI；只有 CI 報錯、使用者明確要求，或需要釐清高風險問題時才跑本地 `guardrails` / tests。
4. legacy DOM 互動維持 `data-action` + 事件代理；Vue-owned 區塊優先使用元件事件與 composable，禁止新增 inline `onclick/onchange`。
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
- 前端：`Vite + Vue 3`；實際 deploy 入口為 `frontend/main.html` / `frontend/dashboard.html`，根目錄 `main.html` / `dashboard.html` 僅保留本機 compat redirect
- 後端：`Supabase Edge Functions`（Deno / Hono）
- 前端 legacy 版號來源：`.frontend-version`
- 目前前端版號：`130`
- 部署模式：
  - push 到 `main` / `master` 後會跑 GitHub Actions
  - GitHub Pages 會自動部署前端
  - Supabase `db push` / `coffee-api` deploy 需 repo secrets 已設好

必要 secrets：

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_DB_PASSWORD`

---

## 3) 目前狀態

### 前端遷移

- 最終目標已確定為 `Vue 3 + Vite SFC`。
- 後台是優先遷移區：
  - `orders`、`products`、`categories`、`promotions`、`formfields`、`users`、`blacklist` 已改成 Vue-owned state/actions (`useDashboardOrders.js`、`useDashboardProducts.js`、`useDashboardCategories.js`、`useDashboardPromotions.js`、`useDashboardFormFields.js`、`useDashboardUsers.js`)
  - `session / tab 切換` 已改成 Vue-owned state/actions (`useDashboardSession.ts`)
  - `settings` / `settings icons` 已改成 Vue-owned state/actions（`useDashboardSettings.js`、`useDashboardBankAccounts.js`、`useDashboardSettingsIcons.js`）
  - `DashboardSettingsSection.vue` 已拆成設定頁組裝層，實際 UI 分散到 branding、section titles、storefront status、delivery/payment routing、payment options、bank accounts 六個卡片元件
  - `settings` / `formfields` / `orders` / `categories` / `products` / `promotions` / `users` / `blacklist` 的按鈕互動已改成元件事件直連；`products` / `promotions` modal 儲存也已改成元件內 submit，`orders` 也已脫離 `createOrdersActionHandlers()` 與 document-level click/change delegation
  - dashboard feature 層已不再依賴 `js/dashboard/events.js`，也不再暴露 `window.loginWithLine` / `window.showTab` / `window.linePayRefundOrder` 這類全域 API；dashboard boot/service wiring 已移到 `frontend/src/features/dashboard/bootstrapDashboard.js`，`js/dashboard-app.js` 現在只剩薄相容殼
  - `frontend/tsconfig.json` 與 `frontend/src/types/` 已建立，核心型別先落到 `Order` / `Product` / `CartItem` / `Settings` / `SessionUser`；新的 composable 由 guardrail 阻擋回退到 `.js`
- 前台 `MainPage.vue` 已存在，根目錄 `main.html` 已瘦身為本機 compat redirect；`js/main-app.js` 仍保留作為 Vite bundle 內的相容層。storefront 的登入／我的訂單／會員資料／登出、公告關閉、付款切換、配送選擇、門市搜尋結果、我的訂單關閉、物流單號複製、轉帳帳號互動與載入失敗重試，已改成 Vue 元件事件或區域 DOM listener，body-level click delegation 已從 storefront 正常流程移除。
- `MainPage.vue` 已是 storefront 組裝層，主要 UI 區塊拆到 `frontend/src/features/storefront/`：`StorefrontHeader.vue`、`StorefrontProductGrid.vue`、`StorefrontDeliverySection.vue`、`StorefrontPaymentSection.vue`、`StorefrontBottomBar.vue`、`StorefrontCartDrawer.vue`、`StorefrontOrderHistoryModal.vue`。
- storefront 的 products / delivery / payment 狀態已從通用 `useStorefrontShell.js` 拆到 `useStorefrontProducts.ts`、`useStorefrontDelivery.ts`、`useStorefrontPayment.ts`；`useStorefrontShell.js` 只保留 header / auth / announcement / order modal 外殼事件。
- `useStorefrontCart.js`、`useStorefrontShell.js` 已轉為 `useStorefrontCart.ts`、`useStorefrontShell.ts`；目前 storefront 仍留在 JS 的 composable 已再縮減。
- `storefrontLegacyBridge.js` 已移除 icons、delivery、payment 的通用 shell export，改分成 `deliveryDeps`、`paymentDeps`、`shellDeps`；目前主要仍承接 cart、order history、main-app 初始化與 auth/config/state glue，下一步再處理 `cart.js`、`orders.js`、`main-app.js` 的高風險切面。
- storefront 的配送選項列表與轉帳帳號列表已改由 `MainPage.vue` 直接渲染；legacy `renderDeliveryOptions()` / `renderBankAccounts()` 在 `data-vue-managed="true"` 容器下只保留相容 fallback，不再是正常 runtime path。
- storefront「我的訂單」列表已改成 DOM API 安全渲染，`js/orders.js` 不再以 `innerHTML` 拼接後端訂單資料。
- storefront legacy `js/*.js` 的 `innerHTML` renderer 已清到 0；商品列表、購物車、動態表單欄位、配送選項與運費/折扣區塊都改成 DOM API / `replaceChildren()`。
- 原則：新功能以 Vue-first 為主；legacy 只接受 hotfix、相容 glue 或部署修正。

### 後端演進

- `orders.ts`、`payments.ts` 已拆成較小模組，路由匯入點維持不變。
- rate limiter 已抽成共用 store；預設仍走記憶體 backend，但若設定 `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`，可切到 Upstash Redis REST 作為分散式配額儲存。
- LINE Pay / 街口支付已支援付款期限：超過 `payment_expires_at` 的線上付款訂單會自動轉為 `status=failed`、`payment_status=expired`，查詢、付款確認、街口 inquiry/result 流程都會先正規化逾期狀態。
- 街口支付已切正式環境：正式 API base URL 為 `https://onlinepay.jkopay.com`，`JKOPAY_STORE_ID` / `JKOPAY_API_KEY` / `JKOPAY_SECRET_KEY` / `JKOPAY_BASE_URL` 皆走 Supabase secrets。

### 視覺與互動

- 前台目前已回到暖棕 / 米白系配色。
- 全站固定操作 icon 已改為向量化對齊邏輯，legacy 入口也已補齊，不應再出現 emoji 作為正式操作 icon。
- 後台主題以 `Solarized Light` 為基底。
- 線上付款 UX 已分情境：下單後付款彈窗可提示「稍後可到我的訂單重新打開付款連結」；但在「我的訂單」內會改成直接提示按下方付款按鈕，不再自我指向「我的訂單」。
- 街口支付在「我的訂單」已移除手動「重新整理街口付款狀態」入口，和 LINE Pay 一樣以重新打開付款連結為主要操作。

### 測試與守門

- 基本檢查以 `guardrails`、Deno lint/check/test、Playwright smoke 為主。
- `ci-local` 已串入 `test:unit`，避免 frontend composable regression 只在 `health` 或 deploy/build 後才被看到。
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
- 2026-04-22 另補深度 unit test：`useDashboardOrders` 現在覆蓋篩選組合、批次勾選邊界與 shipped tracking URL 驗證；`useDashboardFormFields` 補了 delivery visibility normalize 與 Sortable reorder；`useDashboardSettings` 補 cached `linepay_sandbox` 與自訂配送方式狀態；`useStorefrontCart` 補零數量邊界、固定運費與多促銷疊加。

---

## 4) 已知風險

### Repo hygiene / 金鑰風險

- `.env.staging` 的 git 歷史清理已完成，舊 commit SHA 已不再是目前可達歷史的一部分。
- 但當時出現過的真實金鑰仍必須視為已外洩；剩餘的 P0 是「完成各平台金鑰輪替」，不是再次做 history rewrite。
- 清理流程請看 `docs/repo-hygiene.md`。

### 自動部署限制

- 前端自動部署已正常。
- 若 GitHub repo 尚未設定 `SUPABASE_ACCESS_TOKEN` / `SUPABASE_DB_PASSWORD`，Supabase deploy job 會跳過 setup / db push / function deploy，但整體 job 仍可能顯示成功；後端 function 變更需確認 deploy step 真的有跑，或用本機已登入的 Supabase CLI 手動 `rtk npm run supabase:deploy`。
- 街口正式環境要求的來源 IP 白名單不在 repo 內管理；若使用 Cloudflare、主機防火牆或其他 WAF，需在外部平台另行設定。

### 遷移未完成區

- 專案仍處於 Vue / legacy 共存期。
- 若修改前後台互動，先確認是否碰到 bridge event、`data-vue-managed` 容器或 legacy 啟動流程，避免雙寫回潮。

---

## 5) 最近有效變更

### 2026-04-22

- 街口支付已切正式環境：Supabase secrets 已更新正式 Store ID / API Key / Secret Key / base URL，程式預設正式網域改為官方 `https://onlinepay.jkopay.com`，並已手動部署 `coffee-api`；金鑰不可寫入 repo。
- LINE Pay / 街口支付的逾期線上付款會自動轉為失敗訂單：`status=failed`、`payment_status=expired`，並補齊 dashboard filter/label、Email template、LINE Flex 與 routing/payment regression。
- 「我的訂單」內的街口支付手動刷新入口已移除，改為和 LINE Pay 一樣只提供重新打開付款連結；街口回跳 result/inquiry 流程仍保留後端同步能力。
- 付款提示文案已分情境：下單後付款彈窗保留「稍後可到我的訂單重新打開付款連結」，但「我的訂單」卡片改為「請點下方付款按鈕繼續」，避免使用者已在我的訂單時看到自我指向提示。
- 修正 LINE Pay / 街口支付付款彈窗重複提示問題，E2E 已保護付款彈窗中的「我的訂單」只出現一次，且「我的訂單」卡片不含多餘「若您稍後再付款」文案。
- LINE Pay 待付款提示已和街口支付語氣對齊：`請儘快完成 LINE Pay；若稍後付款，可到「我的訂單」重新打開付款連結。`
- storefront legacy 遷移續推：`MainPage.vue` 已移除對 `js/products.js` / `getProductsViewModel` 的直接 import，商品清單改只透過 `coffee:products-updated` 事件同步，降低 products legacy 模組與 Vue shell 的耦合。
- storefront legacy bridge 已集中：`MainPage.vue`、`StorefrontDeliverySection`、`useStorefrontCart`、`useStorefrontOrderHistory` 不再靜態 import legacy `js/*.js`；products/delivery/cart/orders/main-app/icons/utils/auth/config/state glue 統一收斂於 `storefrontLegacyBridge.js`，page shell 只依賴 storefront feature/composable。
- dashboard composable unit test 已補齊缺口：新增 `useDashboardSettings`、`useDashboardFormFields`、`useDashboardCategories`、`useDashboardUsers`、`useDashboardBankAccounts`、`useDashboardSession`、`useDashboardSettingsIcons` tests，dashboard composable 目前全數都有 unit test 檔保護。
- backend settings round-trip tests 已補強：新增專門 `settings_test.ts`，除了既有 routing smoke 外，再覆蓋 `updateSettings -> getSettings` 的正規化/round-trip/upsert/public visibility，特別保護 `delivery_options_config`、`payment_options_config`、`linepay_sandbox` 與相關 icon path 正規化。
- backend `index.ts` 已再拆一層：`routing/action-map.ts` 集中 action → handler 規則，`utils/rate-limit-config.ts` 集中 rate limit 常數與 store 初始化，降低單檔密度。
- frontend 已開始漸進式 TypeScript 引入：新增 `frontend/src/types/`、`frontend/tsconfig.json`，並將 `useDashboardSession`、`useStorefrontOrderHistory` 轉為 `.ts`。
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
- `js/dashboard/modules/order-notifications-controller.js` 已縮成 29 行協調層，Flex payload、Flex 歷史與 Email 發送拆到獨立模組，站名來源也改走 dashboard settings state，不再直接讀 `#s-site-title` DOM。
- E2E 新增通知 smoke，驗證後台訂單卡的 `LINE通知` / `發送信件` 仍會打到正確 API。
- storefront legacy `innerHTML` renderer 已清到 0；`js/products.js`、`js/cart.js`、`js/form-renderer.js`、`js/delivery.js`、`js/main-app.js`、`js/icons.js` 改走 DOM API，dashboard form fields 的配送可見性 checkbox 也不再拼接 `innerHTML`。
- storefront smoke 現在會直接阻擋 `products-container`、`dynamic-fields-container`、`cart-items`、`total-price`、`cart-discount-details`、`cart-shipping-notice`、`delivery-options-list`、`bank-accounts-list` 上的 `innerHTML` setter。
- `MainPage.vue` 已從 1209 行拆到 472 行，Storefront Wave 2 的 header / product grid / delivery / payment / bottom bar / cart drawer / order history section 都已拆成獨立 Vue 元件。
- `js/dashboard/modules/order-flex-message.js` 已從 491 行拆到 40 行協調層，主要內容分到 `order-flex-body.js`、`order-flex-bubble.js`、`order-flex-layout.js`。
- 前端快取版號更新為 `130`。

### 2026-04-20

- 恢復前台暖色系，修正訂單備註欄位顯示 `<slot />`。
- 對齊會員資料彈窗導角。
- 修正後台手機版頁籤顯示。
- 統一前後台固定 icon 的尺寸、顏色與對齊，legacy 入口也已換成向量 icon。
- dashboard `categories` 已改成 Vue-owned state/actions，不再依賴 `coffee:dashboard-categories-updated`。
- dashboard `promotions` 已改成 Vue-owned state/actions，不再依賴 `coffee:dashboard-promotions-updated`。
- dashboard `formfields` 已改成 Vue-owned state/actions，不再依賴 `coffee:dashboard-formfields-updated`。
- dashboard `users` / `blacklist` 已改成 Vue-owned state/actions，不再依賴 `coffee:dashboard-users-updated` / `coffee:dashboard-blacklist-updated`。
- dashboard `session / tab` 已改成 reactive state，不再依賴 `dashboard-session-controller.js` 來切換登入頁、管理頁與 tab 顯示。
- dashboard `settings` 的 delivery routing / payment options / sandbox 已改成 reactive state，不再由 `settings-controller.js` 直接組 HTML table。
- dashboard `settings` 的 branding / section titles / announcement / store status 已改成 reactive state，並由 `useDashboardSettings.js` 統一提交 payload。
- dashboard `settings` 的 bank accounts 已改成 reactive state，不再依賴 `bank-accounts.js` 的 imperative `innerHTML` renderer。
- dashboard `settings` / `icon library` 的 icon upload、預覽與 quick apply 已改成 Vue 直連 reactive state，不再依賴 `icon-assets-controller.js` 或 document-level change/click delegation。
- dashboard `settings` 的 load/save 已併入 `useDashboardSettings.js`，`settings-controller.js` 已移除。
- dashboard `settings` / `formfields` 的按鈕互動已改成元件內 `@click`，不再經過 `createSettingsActionHandlers()`。
- dashboard `categories` / `users` / `blacklist` 的按鈕與搜尋已改成元件內 `@click` / `@keyup.enter`，不再經過 `createUsersActionHandlers()`、`search-users` 的 document keyup delegation，`useDashboardUsers.js` 也已改用 reactive `activeTab` 判斷黑名單頁。
- dashboard `products` / `promotions` 的按鈕與 modal 儲存已改成元件內 `@click` / `@submit.prevent`，不再經過 `createProductsActionHandlers()` 或 `product-form` / `promotion-form` 的 imperative submit listener。
- dashboard `orders` 的重整、Flex 歷史、勾選、批次操作、通知、退款、收款確認、狀態提交與刪除已改成元件內 `@click` / `@change`，`js/dashboard/events.js` 與 `createOrdersActionHandlers()` 已移除。
- dashboard page 已改成由 Vue `onMounted()` 直接載入 public branding；`dashboard-globals.js`、`initDashboardApp()` fallback 與舊的 `window.*` dashboard helper 已移除。
- `Textarea.vue` 已補齊標準 `v-model` 支援，避免設定頁與前台多行欄位寫回失效。
- storefront `delivery-options-list` / `bank-accounts-list` 已改由 `MainPage.vue` 直接渲染，`renderDeliveryOptions()` / `renderBankAccounts()` 在 Vue-managed 容器上會直接退出，不再走 imperative `innerHTML` renderer。
- storefront `js/orders.js` 的「我的訂單」列表已改成 DOM API 建構，移除 legacy `innerHTML` 訂單列表 renderer，並補上 API XSS payload smoke。
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
