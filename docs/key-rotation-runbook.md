# 金鑰輪替 SOP

本文件記錄 Script Coffee 需要定期或事件觸發輪替的 secrets。任何曾出現在本機、截圖、log、CI output、git history 或第三方客服對話中的正式金鑰，都應視為已外洩並立即輪替。

## 通用流程

1. 盤點受影響服務與目前使用位置。
2. 在對應平台產生新金鑰，不覆蓋舊金鑰前先確認新金鑰可讀取。
3. 更新 Supabase secrets、GitHub Actions secrets 或外部平台設定。
4. 重新部署 `coffee-api` 或重新跑 GitHub Actions deploy。
5. 用最小交易或測試請求確認新金鑰生效。
6. 撤銷舊金鑰。
7. 在 `DEV_CONTEXT.md` 只記錄輪替完成狀態與日期，不記錄 secret value。

## Supabase 與 GitHub Secrets

主要項目：

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_DB_PASSWORD`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

操作：

1. 到 Supabase Dashboard 產生新的 access token 或重設 DB password。
2. 到 GitHub repo secrets 更新對應值。
3. 若本機需要部署，更新未追蹤的 `.env.supabase.local`。
4. 透過 GitHub Actions `workflow_dispatch deploy=true` 重跑部署。
5. 確認 CI 的 Supabase deploy job 沒有 skipped warning。

## JWT Secret

主要項目：

- `JWT_SECRET`

操作：

1. 產生新的高熵字串。
2. 更新 Supabase Edge Function secret。
3. 重新部署 `coffee-api`。
4. 要求管理者與會員重新登入。
5. 確認登入、後台 API 與會員訂單查詢正常。

## LINE Pay

主要項目：

- LINE Pay Channel ID
- LINE Pay Channel Secret
- LINE Pay API base URL

操作：

1. 到 LINE Pay Merchant 後台產生或重設 Channel Secret。
2. 更新 Supabase Edge Function secrets。
3. 重新部署 `coffee-api`。
4. 建立一筆低金額測試訂單，確認付款連結建立、confirm callback、訂單狀態與付款狀態更新正常。
5. 撤銷舊 secret。

## 街口支付

主要項目：

- `JKOPAY_STORE_ID`
- `JKOPAY_API_KEY`
- `JKOPAY_SECRET_KEY`
- `JKOPAY_BASE_URL`

操作：

1. 到街口商家後台重設 API key / secret。
2. 確認正式環境來源 IP 白名單仍包含目前部署出口。
3. 更新 Supabase Edge Function secrets。
4. 重新部署 `coffee-api`。
5. 建立一筆低金額測試訂單，確認建立付款、result/inquiry 同步、逾期處理與訂單狀態正常。
6. 撤銷舊 key / secret。

## SMTP

主要項目：

- SMTP host / port / username / password
- 寄件者名稱與寄件者 email

操作：

1. 到郵件服務商產生新的 app password 或 SMTP credential。
2. 更新 Supabase Edge Function secrets。
3. 重新部署 `coffee-api`。
4. 從後台對測試訂單發送 Email，確認寄送成功且內容未暴露 secret。
5. 撤銷舊 credential。

## LINE Messaging / Notify 類 Token

主要項目：

- LINE Messaging channel secret/access token
- 店家通知用 token 或 webhook 設定

操作：

1. 到 LINE Developers 或通知服務平台重發 token。
2. 更新 Supabase Edge Function secrets。
3. 重新部署 `coffee-api`。
4. 建立測試訂單或使用後台通知功能確認店家通知、顧客 LINE Flex 通知正常。
5. 撤銷舊 token。

## 驗證清單

- GitHub Actions deploy job 成功。
- Supabase `coffee-api` 最近部署時間符合本次輪替。
- 下單、報價、付款建立、付款確認、我的訂單查詢都可正常使用。
- 後台登入、訂單狀態變更、Email 通知、LINE 通知正常。
- 舊金鑰已撤銷，且沒有出現在 repo、文件、CI output 或測試 fixture。
