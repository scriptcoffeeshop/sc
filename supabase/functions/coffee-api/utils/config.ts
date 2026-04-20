// utils/config.ts
import { assertRequiredEnv } from "./env-check.ts";
assertRequiredEnv();

export const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
export const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

export const LINE_LOGIN_CHANNEL_ID = Deno.env.get("LINE_LOGIN_CHANNEL_ID") ||
  "";
export const LINE_LOGIN_CHANNEL_SECRET =
  Deno.env.get("LINE_LOGIN_CHANNEL_SECRET") || "";
export const LINE_ADMIN_USER_ID = Deno.env.get("LINE_ADMIN_USER_ID") || "";

export const JWT_SECRET = Deno.env.get("JWT_SECRET") || "";

export const SMTP_USER = Deno.env.get("SMTP_USER") || "";
export const SMTP_PASS = Deno.env.get("SMTP_PASS") || "";

export const ECPAY_MERCHANT_ID = Deno.env.get("ECPAY_MERCHANT_ID") || "";
export const ECPAY_HASH_KEY = Deno.env.get("ECPAY_HASH_KEY") || "";
export const ECPAY_HASH_IV = Deno.env.get("ECPAY_HASH_IV") || "";
export const ECPAY_IS_STAGE = Deno.env.get("ECPAY_IS_STAGE") === "true";

export const LINEPAY_CHANNEL_ID = Deno.env.get("LINEPAY_CHANNEL_ID") || "";
export const LINEPAY_CHANNEL_SECRET = Deno.env.get("LINEPAY_CHANNEL_SECRET") ||
  "";

export const JKOPAY_STORE_ID = Deno.env.get("JKOPAY_STORE_ID") || "";
export const JKOPAY_API_KEY = Deno.env.get("JKOPAY_API_KEY") || "";
export const JKOPAY_SECRET_KEY = Deno.env.get("JKOPAY_SECRET_KEY") || "";
export const JKOPAY_BASE_URL = Deno.env.get("JKOPAY_BASE_URL") || "";
export const JKOPAY_PROXY_URL = Deno.env.get("JKOPAY_PROXY_URL") || "";

export const LINE_MESSAGING_CHANNEL_ACCESS_TOKEN =
  Deno.env.get("LINE_MESSAGING_CHANNEL_ACCESS_TOKEN") ||
  Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN") ||
  "";
export const LINE_ORDER_NOTIFY_CHANNEL_ACCESS_TOKEN =
  Deno.env.get("LINE_ORDER_NOTIFY_CHANNEL_ACCESS_TOKEN") || "";
export const LINE_ORDER_NOTIFY_TO = Deno.env.get("LINE_ORDER_NOTIFY_TO") || "";
export const LINE_MESSAGING_API_BASE_URL =
  Deno.env.get("LINE_MESSAGING_API_BASE_URL") || "https://api.line.me";

export const FRONTEND_URL = Deno.env.get("FRONTEND_URL") ||
  "https://scriptcoffeeshop.github.io/sc";
export const UPSTASH_REDIS_REST_URL = Deno.env.get("UPSTASH_REDIS_REST_URL") ||
  "";
export const UPSTASH_REDIS_REST_TOKEN =
  Deno.env.get("UPSTASH_REDIS_REST_TOKEN") || "";

export const ALLOWED_REDIRECT_ORIGINS = [
  "https://scriptcoffeeshop.github.io",
  "https://scriptcoffee.com.tw",
  "http://scriptcoffee.com.tw",
  "https://www.scriptcoffee.com.tw",
  "http://www.scriptcoffee.com.tw",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  Deno.env.get("ALLOWED_REDIRECT_ORIGINS") || Deno.env.get("ALLOWED_ORIGIN") ||
  "",
].filter(Boolean);

export const VALID_ORDER_STATUSES = [
  "pending",
  "processing",
  "shipped",
  "completed",
  "cancelled",
];
