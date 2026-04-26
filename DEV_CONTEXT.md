# DEV_CONTEXT — 咖啡訂購系統

本文件是交接版專案快照，目標是在 3-5 分鐘內讓下一位接手者掌握規則、現況與風險。更早的變更摘要移到 `docs/changelog.md`；完整紀錄以 git history 為準。

最後更新：2026-04-26

---

## 1) 必讀規則

1. 所有工作區命令一律用 `rtk <cmd>`。
2. 修改程式碼後預設不跑本機驗證以節省 token，先 commit/push 並等待 CI；只有 CI 報錯、使用者明確要求，或高風險問題需要釐清時才跑本機 `guardrails` / tests。
3. 前後台 runtime 互動以 Vue 元件事件與 composable 為主；禁止新增 inline `onclick/onchange`、`data-action` 事件代理、tracked `js/` legacy 相容殼或 `window.*` 全域 API 回流。
4. 專案溝通、註解與 commit message 以繁體中文為主。
5. Deno 依賴統一放在 `deno.json` 的 `imports`，程式碼直接使用別名。
6. E2E 若攔截 CDN 腳本，需留意 `integrity/crossorigin` 的 SRI 驗證衝突。
7. `google6cb7aa3783369937.html` 為受保護檔案，不可刪除或修改。
8. `.env`、`.env.staging`、`.env.supabase.local` 與 `supabase/.temp/` 屬本機敏感/暫存資料，不能追蹤進 git；`.env.*.example` / `.sample` / `.template` 範本可入版控。
9. 金流正式金鑰只放在 Supabase / GitHub secrets，不寫入 repo、文件或測試 fixture。

---

## 2) 專案快照

- 專案：Script Coffee（前台訂購 + 後台管理）
- 主要分支：`main`
- 前端：`Vite + Vue 3`，正式站入口為根目錄 `/`、`/main.html`、`/dashboard.html`
- 後端：`Supabase Edge Functions`（Deno / Hono）
- 前端 JS/CSS 產物使用 content hash；`.frontend-version` 仍作為非 hash asset 參照的 fallback 版號來源。
- 目前前端版號：`131`
- GitHub Pages source 必須維持 `workflow`；若線上又出現 `/frontend/main.html` 或 `/frontend/dashboard.html`，先檢查 Pages 設定是否漂回 legacy source。
- GitHub Actions 在 `main/master` push 或 `workflow_dispatch deploy=true` 後會部署前端，並在 `SUPABASE_ACCESS_TOKEN` / `SUPABASE_DB_PASSWORD` 存在時執行 Supabase `db push` 與 `coffee-api` deploy。

---

## 3) 目前狀態

### 前端

- Vue-first 遷移已完成；`frontend/src/` 無 production `.js`，互動由 Vue SFC、typed composable 與明確副作用 helper 管理。
- `frontend/tsconfig.json` 啟用 `strict: true`、`exactOptionalPropertyTypes`、`noFallthroughCasesInSwitch`、`noPropertyAccessFromIndexSignature`、`noUncheckedIndexedAccess` 與 `noUnusedLocals`。
- `repo_hygiene_check.py` 阻擋 tracked `.js`、production `JSON.parse` 外溢、匿名 `catch {}`、`@ts-ignore`、`@ts-expect-error`、`eslint-disable`、`as any` 與 production `Record<string, unknown>` 回流。
- 前台主要組裝層為 `frontend/src/pages/MainPage.vue`；商品、配送、付款、底部列、購物車與我的訂單已拆到 `frontend/src/features/storefront/`。
- 後台 orders/products/categories/promotions/formfields/users/blacklist/settings 由 Vue-owned state/actions 管理；取貨付款設定卡片與促銷目標商品 picker 已從大型 modal/card 初步拆出。
- 前端 JSON 解析、錯誤訊息、日期時間、物流追蹤 URL、SweetAlert wrapper 與品牌副作用已集中到共用 helper。

### 後端

- Hono routing + action map 已落地，公開/登入/admin action 定義已依 domain 拆到 `routing/actions/`，POST schema 驗證樣板集中於 routing helper。
- `orders.ts`、`payments.ts`、settings、quote、stores、payment expiry/JKO sync 等核心流程已拆分；`order-submit.ts` 與 `quote.ts` 仍偏大。
- JSON 解析集中於 `utils/json.ts`，訂單/付款/配送 label、Email asset、tracking URL、Email/Flex 文案 helper 已共用。
- LINE Pay 與街口支付固定走正式環境；線上付款逾期會轉 `status=failed`、`payment_status=expired`。
- Rate limiter 預設使用記憶體 store；若設定 Upstash Redis REST env，可切換為分散式配額儲存。

### 測試與守門

- 日常 CI 包含 frontend unit、frontend lint、frontend build、Playwright E2E、Deno fmt/lint/check/test。
- `ci-local` 串入 `guardrails`、`typecheck`、`lint:frontend`、`test:unit`、Deno fmt/lint/check/test。
- Playwright `webServer` 走 `preview:e2e`，CI 會先 build，再用 `SKIP_E2E_BUILD=1 npm run e2e` 重用產物。
- Vue mount/component tests 已開始覆蓋前台高互動元件；E2E 預設 mock 資料改由 JSON fixture 維護。
- 可觀測性 MVP 已加入付款失敗管理員 LINE 告警；正式環境仍需在 Supabase Dashboard 設定 Log Drain 將 Edge Function logs 匯出到團隊 log sink。
- 真實 Supabase local stack golden path 測試以 `npm run test:integration:supabase` 手動執行；此指令會重置本機 Supabase DB，不併入預設 CI。

---

## 4) 已知風險

- `.env.staging` 曾出現在 git 歷史；歷史清理已完成，但當時出現過的真實金鑰仍視為已外洩，需完成各平台輪替。清理背景見 `docs/repo-hygiene.md`，輪替 SOP 見 `docs/key-rotation-runbook.md`。
- Supabase deploy job 依賴 GitHub secrets；若缺少 `SUPABASE_ACCESS_TOKEN` 或 `SUPABASE_DB_PASSWORD`，CI 會跳過後端部署並在 summary 寫明原因。
- 街口正式環境的來源 IP 白名單不在 repo 內管理，需到外部平台維護。
- 修改前後台互動時，優先確認 guardrails 與 smoke tests 是否仍阻擋 `innerHTML` renderer、`data-action` 事件代理、document-level delegation 與舊全域 API 回潮。
- CI 前端 deploy 會下載 test job 上傳的 `frontend-dist` artifact；若 Pages deploy 找不到產物，先檢查 `.github/workflows/ci.yml` 的 artifact name/path。

---

## 5) 最近有效變更

### 2026-04-26

- 付款與取貨設定收斂為簡潔卡片式管理；取貨方式卡片保留排序、圖示、名稱、啟用、說明、運費/免運與付款勾選，金流卡片保留前台顯示名稱、圖示與說明。
- LINE Pay Sandbox 模式移除：前端不再顯示或儲存 sandbox toggle，後端固定使用正式 API base URL，設定 API 會忽略並隱藏棄用 key。
- DEV_CONTEXT 瘦身為交接快照，歷史變更移到 `docs/changelog.md`；CI 補前端 typecheck 並重用 `frontend-dist` artifact；ESLint explicit any 改為 warning，空 block 回到預設檢查。
- 新增 `docs/key-rotation-runbook.md`；`DashboardDeliveryPaymentSettingsCard.vue` 拆出單一取貨方式卡片，`DashboardPromotionModal.vue` 拆出目標商品 picker。
- `routing/action-map.ts` 拆為 config 與公開/登入/admin action 模組；`MainPage.vue` 事件橋抽到 storefront composable；Vite JS/CSS 改 content hash；env ignore 改為精準規則並追蹤安全範本。
- 前台配送地址表單拆為配送到府/全台宅配子元件；新增 Vue mount tests、UI primitives、E2E JSON fixture、taiwanCityData JSON 化與付款失敗管理員 LINE 告警。

### 2026-04-25

- Vue 化完成最後一哩：移除 tracked `js/` compatibility wrappers，前後台 runtime 入口改由 `frontend/src/` 的 Vue/TypeScript 管理。
- 前台購物車、付款、公告、會員、門市、配送、動態欄位、收據與送單狀態陸續改為 Vue-owned state。
- 後台 settings/formfields/orders/categories/products/promotions/users/blacklist 互動改成元件事件直連，不再依賴 document-level delegation 或 legacy bridge。

### 2026-04-24

- `workflow_dispatch` 新增 `deploy` input，預設為 `true`，可在 `main/master` 手動補跑前端與 Supabase deploy jobs。
- E2E support 與 smoke specs 依前台/後台 domain 拆分，降低單檔 fixture 維護成本。
- 後台付款與取貨設定頁籤、金流卡片與區塊標題設定完成卡片化整理。

### 2026-04-23

- 前端型別守門升級完成：`npm run typecheck` 改跑完整 `frontend/tsconfig.json` 並串入 `ci-local`。
- 新增 frontend ESLint 與 `lint:frontend`，CI/local 守門開始檢查 Vue/TypeScript source。
- 後端訂單狀態 schema、production `@ts-ignore`、production JS allowlist、npm audit 與 Supabase deploy skipped summary 完成收斂。

### 2026-04-22

- 街口支付切正式環境，LINE Pay / 街口逾期線上付款會自動轉失敗與逾期。
- Dashboard composable unit tests 補齊主要 coverage；前端開始完整 TypeScript 化。
- Backend settings round-trip tests 補強，保護 delivery/payment config 與公開設定可見性。

### 2026-04-21

- 本機健康檢查入口補齊：`health = ci-local + build + 全量 Playwright`，`e2e` 改跑所有 E2E spec。
- Dashboard settings/orders 大型單檔初步拆分；前台 `MainPage.vue` 從巨型檔拆到多個 storefront 元件。

### 2026-04-20

- 前台暖色系、會員彈窗導角、後台手機頁籤、固定 icon 對齊完成修正。
- `coffee_orders` 新增 `items_json`，`custom_fields` 與 `receipt_info` 改為 JSONB。
- 新增 migration 命名與 repo hygiene 防線，開始阻擋敏感檔與 legacy pattern 回流。

---

## 6) 常用命令

`rtk npm run hygiene`、`rtk npm run guardrails`、`rtk npm run typecheck`、`rtk npm run test:unit`、`rtk npm run test:integration:supabase`、`rtk npm run ci-local`、`rtk npm run build`、`rtk npm run e2e`

---

## 7) 關鍵文件

- `README.md`：專案入口與開發規則
- `docs/changelog.md`：較長的歷史變更摘要
- `docs/frontend-vue-migration-plan.md`：前端 Vue 遷移決策與分階段策略
- `docs/repo-hygiene.md`：敏感檔、金鑰外洩背景與 git 歷史清理流程
- `docs/key-rotation-runbook.md`：LINE Pay / 街口 / JWT / SMTP / Supabase / GitHub secrets 輪替 SOP
- `tests/e2e/smoke/`：主要 smoke regression 保護網
- `tests/e2e/support/`：E2E route/stub fixture

- 更新本檔時，優先維護「規則、現況、風險、最近一週摘要」。
- 不要再把完整 commit log 貼進 `DEV_CONTEXT.md`；git 歷史本身就是唯一真實來源。
- 若變更會影響交接判斷，更新本檔即可；一般小修留在 commit history。
