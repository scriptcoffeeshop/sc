// utils/env-check.ts — 啟動時檢查必要環境變數

const REQUIRED_VARS = [
  "JWT_SECRET",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

const OPTIONAL_VARS = [
  "LINEPAY_CHANNEL_ID",
  "LINEPAY_CHANNEL_SECRET",
  "JKOPAY_STORE_ID",
  "JKOPAY_API_KEY",
  "JKOPAY_SECRET_KEY",
  "JKOPAY_BASE_URL",
  "JKOPAY_PROXY_URL",
  "LINE_MESSAGING_CHANNEL_ACCESS_TOKEN",
  "LINE_ORDER_NOTIFY_CHANNEL_ACCESS_TOKEN",
  "LINE_ORDER_NOTIFY_TO",
  "ECPAY_MERCHANT_ID",
  "SMTP_USER",
  "SMTP_PASS",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
] as const;

/** 啟動時執行，缺少必要變數直接 throw 阻止函式啟動 */
export function assertRequiredEnv(): void {
  const missing: string[] = [];
  for (const name of REQUIRED_VARS) {
    const val = Deno.env.get(name);
    if (!val || val.trim() === "") {
      missing.push(name);
    }
  }
  if (missing.length > 0) {
    throw new Error(
      `[FATAL] 缺少必要環境變數：${missing.join(", ")}。函式無法啟動。`,
    );
  }

  // 選擇性警告（不阻擋啟動）
  for (const name of OPTIONAL_VARS) {
    const val = Deno.env.get(name);
    if (!val || val.trim() === "") {
      console.warn(`[WARN] 環境變數 ${name} 未設定，相關功能可能無法使用。`);
    }
  }
}
