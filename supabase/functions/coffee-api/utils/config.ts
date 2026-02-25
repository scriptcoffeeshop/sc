// utils/config.ts

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

export const FRONTEND_URL = Deno.env.get("FRONTEND_URL") ||
  "https://scriptcoffeeshop.github.io/sc";

export const ALLOWED_REDIRECT_ORIGINS = [
  "https://scriptcoffeeshop.github.io",
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
