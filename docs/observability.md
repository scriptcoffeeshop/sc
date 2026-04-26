# 可觀測性 Runbook

本專案的 `coffee-api` Edge Function 會以 JSON string 寫入 `console.info/warn/error`，讓 Supabase Edge Function logs 可被 Log Drain 匯出後解析、查詢與告警。Supabase Dashboard 的 Log Drain、Logflare source、Datadog pipeline/monitor 屬外部平台設定，不由 repo 自動建立。

## Log Drain 目標

1. 在 Supabase Dashboard 的 Log Drains 建立 `function_logs` 匯出。
2. 目的地二選一：
   - Datadog：使用 Datadog Logs intake，並在 pipeline 將 `event_message` 或 message body 解析為 JSON。
   - Logflare：使用 Logflare HTTP ingestion/source endpoint，並保留原始 payload 以便回溯。
3. drain 建好後，用一筆測試下單或 `getInitData` 觸發 `coffee-api`，確認 sink 內能查到 `scope=action-audit`。

參考：
- Supabase Log Drains: https://supabase.com/docs/guides/telemetry/log-drains
- Supabase Logs: https://supabase.com/docs/guides/platform/logs
- Logflare ingestion: https://docs.logflare.app/concepts/ingestion/

## Edge Function Log Schema

一般 logger 格式：

```json
{
  "level": "info",
  "scope": "action-audit",
  "message": "Action completed",
  "details": {},
  "timestamp": "2026-04-26T04:00:00.000Z"
}
```

`scope=action-audit` 的 `details` 會固定包含：

```json
{
  "ts": "2026-04-26T04:00:00.000Z",
  "action": "submitOrder",
  "access": "public",
  "method": "POST",
  "ip": "203.0.113.10",
  "userId": "",
  "role": "",
  "isAdmin": false,
  "status": 200,
  "durationMs": 123,
  "success": true,
  "error": ""
}
```

## 建議告警

- API error rate：`scope=action-audit AND details.success=false`，5 分鐘錯誤率大於 5% 或連續 3 筆 `level=error` 告警。
- API latency：`scope=action-audit` 依 `details.action` 分組，監控 `p95(details.durationMs)`，超過 2000ms 持續 10 分鐘告警。
- 5xx：`scope=action-audit AND details.status>=500` 立即通知。
- 金流失敗：保留既有管理員 LINE 告警，同時在 log sink 監控 `scope=payment-shared AND level=error`，避免 LINE token 或目標 id 設定錯誤時沒有備援訊號。

## 維運檢查

- 每次修改 `utils/logger.ts` 或 `index.ts` action wrapper 後，要確認 `scope`、`details.action`、`details.status`、`details.durationMs`、`details.success` 仍可被 sink parse。
- 若 Datadog/Logflare 查不到欄位，先看 sink 收到的是 Supabase outer payload 還是純 `event_message`，再調整 parser。
- 若只查得到 `message` 原文，表示 JSON parser 沒套上；告警不要直接依字串比對長期維護。
