import { supabase } from "./supabase.ts";
import {
  JKOPAY_API_KEY,
  JKOPAY_BASE_URL,
  JKOPAY_PROXY_URL,
  JKOPAY_SECRET_KEY,
  JKOPAY_STORE_ID,
} from "./config.ts";

const DEFAULT_JKOPAY_UAT_BASE_URL = "https://uat-onlinepay.jkopay.app";
const DEFAULT_JKOPAY_PROD_BASE_URL = "https://onlinepay.jkopay.app";

interface JkoPayRuntimeConfig {
  apiKey: string;
  secretKey: string;
  storeId: string;
  baseUrl: string;
  proxyUrl: string;
}

type DenoFetchInit = RequestInit & { client?: Deno.HttpClient };

export interface JkoPayEntryRequest {
  platformOrderId: string;
  currency?: string;
  totalPrice: number;
  finalPrice: number;
  unredeem?: number;
  validTime?: string;
  confirmUrl?: string;
  resultUrl: string;
  resultDisplayUrl: string;
}

export interface JkoPayRefundRequest {
  platformOrderId: string;
  refundOrderId: string;
  refundAmount?: number;
}

export function parseJkoStatusCode(value: unknown): number | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export function mapJkoStatusCodeToPaymentStatus(
  statusCode: number | null,
): "paid" | "refunded" | "failed" | "cancelled" | "pending" {
  if (statusCode === 0) return "paid";
  if (statusCode === 100) return "refunded";
  if (statusCode === 101) return "failed";
  if (statusCode === 102) return "cancelled";
  return "pending";
}

function normalizeBaseUrl(raw: string): string {
  return String(raw || "").trim().replace(/\/+$/, "");
}

function toHexLower(bytes: Uint8Array): string {
  return Array.from(bytes).map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSha256Hex(
  payload: string,
  secretKey: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secretKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );
  return toHexLower(new Uint8Array(signed));
}

async function resolveJkoPayBaseUrl(): Promise<string> {
  const envBaseUrl = normalizeBaseUrl(JKOPAY_BASE_URL);
  if (envBaseUrl) return envBaseUrl;

  let isSandbox = true;
  try {
    const { data: settingRow } = await supabase.from("coffee_settings")
      .select("key, value")
      .in("key", ["jkopay_sandbox", "linepay_sandbox"])
      .order("key", { ascending: true });
    if (Array.isArray(settingRow) && settingRow.length > 0) {
      const jkoRow = settingRow.find((row) => row.key === "jkopay_sandbox");
      const lineRow = settingRow.find((row) => row.key === "linepay_sandbox");
      const raw = String((jkoRow || lineRow)?.value || "").trim().toLowerCase();
      if (raw) {
        isSandbox = !["false", "0", "off", "no"].includes(raw);
      }
    }
  } catch {
    // 忽略設定查詢失敗，回到 UAT 預設值
  }

  return isSandbox ? DEFAULT_JKOPAY_UAT_BASE_URL : DEFAULT_JKOPAY_PROD_BASE_URL;
}

async function resolveJkoPayRuntimeConfig(): Promise<JkoPayRuntimeConfig> {
  const apiKey = String(JKOPAY_API_KEY || "").trim();
  const secretKey = String(JKOPAY_SECRET_KEY || "").trim();
  const storeId = String(JKOPAY_STORE_ID || "").trim();
  const baseUrl = await resolveJkoPayBaseUrl();
  const proxyUrl = String(JKOPAY_PROXY_URL || "").trim();

  const missingKeys: string[] = [];
  if (!apiKey) missingKeys.push("JKOPAY_API_KEY");
  if (!secretKey) missingKeys.push("JKOPAY_SECRET_KEY");
  if (!storeId) missingKeys.push("JKOPAY_STORE_ID");
  if (!baseUrl) missingKeys.push("JKOPAY_BASE_URL");
  if (missingKeys.length > 0) {
    throw new Error(`街口支付設定缺失：${missingKeys.join(", ")}`);
  }

  return {
    apiKey,
    secretKey,
    storeId,
    baseUrl,
    proxyUrl,
  };
}

function buildAbsoluteUrl(baseUrl: string, path: string): string {
  const normalizedPath = String(path || "").trim();
  if (!normalizedPath) throw new Error("街口 API 路徑不可為空");
  if (/^https?:\/\//i.test(normalizedPath)) return normalizedPath;
  return `${baseUrl}${
    normalizedPath.startsWith("/") ? "" : "/"
  }${normalizedPath}`;
}

function tryParseJsonObject(text: string): Record<string, unknown> | null {
  if (!text) return null;
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return null;
  }
  return null;
}

function createProxyClient(proxyUrl: string): Deno.HttpClient | null {
  const raw = String(proxyUrl || "").trim();
  if (!raw) return null;
  if (typeof Deno.createHttpClient !== "function") return null;
  try {
    return Deno.createHttpClient({
      proxy: { url: raw },
    });
  } catch (error) {
    console.warn("[jkopay] create proxy client failed:", error);
    return null;
  }
}

async function callJkoPayApi(params: {
  method: "GET" | "POST";
  path: string;
  payloadString: string;
  bodyString?: string;
}): Promise<Record<string, unknown>> {
  const config = await resolveJkoPayRuntimeConfig();
  const url = buildAbsoluteUrl(config.baseUrl, params.path);
  const digest = await hmacSha256Hex(params.payloadString, config.secretKey);

  const headers: Record<string, string> = {
    "Content-Type": "application/json;charset=utf-8",
    "api-key": config.apiKey,
    digest,
  };

  const maxRetries = 2;
  const timeoutMs = 8000;
  let attempt = 0;

  while (attempt <= maxRetries) {
    const proxyClient = createProxyClient(config.proxyUrl);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const init: DenoFetchInit = {
        method: params.method,
        headers,
        signal: controller.signal,
      };
      if (params.method !== "GET") {
        init.body = params.bodyString ?? "";
      }
      if (proxyClient) {
        init.client = proxyClient;
      }

      const response = await fetch(url, init);
      const responseText = await response.text();
      const parsed = tryParseJsonObject(responseText);

      if (!response.ok) {
        const responseHint = parsed?.message
          ? String(parsed.message)
          : responseText.slice(0, 240);
        throw new Error(`JKO Pay HTTP ${response.status}: ${responseHint}`);
      }

      if (!parsed) {
        throw new Error(`JKO Pay 回傳非 JSON：${responseText.slice(0, 240)}`);
      }

      return parsed;
    } catch (error) {
      attempt++;
      if (attempt > maxRetries) {
        if (error instanceof Error && error.name === "AbortError") {
          throw new Error("JKO Pay 請求逾時 (Timeout)");
        }
        throw error instanceof Error
          ? error
          : new Error(`JKO Pay 請求失敗: ${String(error)}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    } finally {
      clearTimeout(timeoutId);
      proxyClient?.close();
    }
  }

  throw new Error("JKO Pay 請求失敗");
}

export async function requestJkoPayEntry(
  request: JkoPayEntryRequest,
): Promise<Record<string, unknown>> {
  const config = await resolveJkoPayRuntimeConfig();
  const body = {
    platform_order_id: String(request.platformOrderId || "").trim(),
    store_id: config.storeId,
    currency: String(request.currency || "TWD").trim().toUpperCase(),
    total_price: Math.round(Number(request.totalPrice) || 0),
    final_price: Math.round(Number(request.finalPrice) || 0),
    unredeem: Number.isFinite(Number(request.unredeem))
      ? Math.max(0, Math.round(Number(request.unredeem)))
      : 0,
    valid_time: String(request.validTime || "").trim() || undefined,
    confirm_url: String(request.confirmUrl || "").trim() || undefined,
    result_url: String(request.resultUrl || "").trim(),
    result_display_url: String(request.resultDisplayUrl || "").trim(),
  };

  if (!body.platform_order_id) throw new Error("缺少 platform_order_id");
  if (!body.result_url) throw new Error("缺少 result_url");
  if (!body.result_display_url) throw new Error("缺少 result_display_url");
  if (body.total_price <= 0 || body.final_price <= 0) {
    throw new Error("訂單金額需大於 0");
  }

  const bodyWithoutUndefined = Object.fromEntries(
    Object.entries(body).filter(([, value]) => value !== undefined),
  );
  const bodyString = JSON.stringify(bodyWithoutUndefined);
  return await callJkoPayApi({
    method: "POST",
    path: "/platform/entry",
    payloadString: bodyString,
    bodyString,
  });
}

export async function requestJkoPayInquiry(
  platformOrderIds: string[],
): Promise<Record<string, unknown>> {
  const ids = platformOrderIds.map((id) => String(id || "").trim()).filter(
    Boolean,
  );
  if (!ids.length) throw new Error("至少需要一筆 platform_order_id");
  const queryString = `platform_order_ids=${ids.join(",")}`;
  return await callJkoPayApi({
    method: "GET",
    path: `/platform/inquiry?${queryString}`,
    payloadString: queryString,
  });
}

export async function requestJkoPayRefund(
  request: JkoPayRefundRequest,
): Promise<Record<string, unknown>> {
  const body = {
    platform_order_id: String(request.platformOrderId || "").trim(),
    refund_order_id: String(request.refundOrderId || "").trim(),
    refund_amount: Number.isFinite(Number(request.refundAmount))
      ? Math.max(0, Math.round(Number(request.refundAmount)))
      : undefined,
  };

  if (!body.platform_order_id) throw new Error("缺少 platform_order_id");
  if (!body.refund_order_id) throw new Error("缺少 refund_order_id");

  const bodyWithoutUndefined = Object.fromEntries(
    Object.entries(body).filter(([, value]) => value !== undefined),
  );
  const bodyString = JSON.stringify(bodyWithoutUndefined);
  return await callJkoPayApi({
    method: "POST",
    path: "/platform/refund",
    payloadString: bodyString,
    bodyString,
  });
}
