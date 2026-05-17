import {
  PXPAYPLUS_BASE_URL,
  PXPAYPLUS_MERCHANT_CODE,
  PXPAYPLUS_MERCHANT_EN_NAME,
  PXPAYPLUS_PROXY_URL,
  PXPAYPLUS_SECRET_KEY,
} from "./config.ts";
import { tryParseJsonRecord } from "./json.ts";
import type { JsonRecord } from "./json.ts";
import { createLogger } from "./logger.ts";

const DEFAULT_PXPAYPLUS_UAT_BASE_URL = "https://uat.pxpayplus.com/px-ec";
const logger = createLogger("pxpayplus");

type DenoFetchInit = RequestInit & { client?: Deno.HttpClient };

interface PxPayPlusRuntimeConfig {
  merchantCode: string;
  merchantEnName: string;
  secretKey: string;
  baseUrl: string;
  proxyUrl: string;
}

export interface PxPayPlusCreateOrderRequest {
  merTradeNo: string;
  amount: number;
  deviceType: 1 | 2 | 3;
  webConfirmUrl?: string;
  webCancelUrl?: string;
  appConfirmUrl?: string;
  appCancelUrl?: string;
  reqTime?: string;
  storeId?: string;
  orderStatusUrl?: string;
  paymentNotifyUrl?: string;
  identity?: string[];
  orderType?: 1 | 2;
}

export interface PxPayPlusRefundRequest {
  merTradeNo: string;
  pxTradeNo: string;
  refundMerTradeNo: string;
  tradeTime: string;
  amount: number;
  reqTime?: string;
  remark1?: string;
  remark2?: string;
  remark3?: string;
}

export type PxPayPlusTradeNoType = "PX" | "Merchant";

export interface PxPayPlusTradeSnapshot {
  statusCode?: string;
  payStatus?: number | string | null;
  merTradeNo?: string;
  transactionId?: string;
  pxTradeNo?: string;
  tradeTime?: string;
  amount?: number | string;
  tradeAmount?: number | string;
  discountAmount?: number | string;
  invoCarrier?: string;
  providerPayload?: JsonRecord;
}

function normalizeBaseUrl(raw: string): string {
  return String(raw || "").trim().replace(/\/+$/, "");
}

function hexToBytes(hex: string): Uint8Array {
  const normalized = String(hex || "").trim();
  if (!normalized || normalized.length % 2 !== 0) {
    throw new Error("全支付 Secret Key 必須是偶數長度的 16 進位字串");
  }
  if (!/^[0-9a-fA-F]+$/.test(normalized)) {
    throw new Error("全支付 Secret Key 必須是 16 進位字串");
  }

  const bytes = new Uint8Array(normalized.length / 2);
  for (let i = 0; i < normalized.length; i += 2) {
    bytes[i / 2] = Number.parseInt(normalized.slice(i, i + 2), 16);
  }
  return bytes;
}

function toHexUpper(bytes: Uint8Array): string {
  return Array.from(bytes).map((value) => value.toString(16).padStart(2, "0"))
    .join("").toUpperCase();
}

function copyToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

export async function hmacSha256UpperHexWithHexKey(
  payload: string,
  secretKeyHex: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    copyToArrayBuffer(hexToBytes(secretKeyHex)),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );
  return toHexUpper(new Uint8Array(signed));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export async function hasValidPxPayPlusSignValue(
  payload: string,
  signature: unknown,
  secretKeyHex = "",
): Promise<boolean> {
  const received = String(signature || "").trim().toUpperCase();
  if (!payload || !received) return false;
  const resolvedSecretKey = String(
    secretKeyHex || Deno.env.get("PXPAYPLUS_SECRET_KEY") ||
      PXPAYPLUS_SECRET_KEY,
  ).trim();
  if (!resolvedSecretKey) return false;
  const expected = await hmacSha256UpperHexWithHexKey(
    payload,
    resolvedSecretKey,
  );
  return timingSafeEqual(received, expected);
}

export function formatPxPayPlusReqTime(
  date: Date = new Date(),
  timeZone = "Asia/Taipei",
): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const valueOf = (type: string) =>
    parts.find((part) => part.type === type)?.value || "";
  return [
    valueOf("year"),
    valueOf("month"),
    valueOf("day"),
    valueOf("hour"),
    valueOf("minute"),
    valueOf("second"),
  ].join("");
}

export function buildPxPayPlusCreateOrderSignPayload(params: {
  merTradeNo: string;
  amount: number;
  deviceType: number;
  reqTime: string;
  storeId?: string;
}): string {
  return [
    String(params.merTradeNo || "").trim(),
    String(Math.round(Number(params.amount) || 0)),
    String(Math.round(Number(params.deviceType) || 0)),
    String(params.reqTime || "").trim(),
    String(params.storeId || "").trim(),
  ].join("");
}

export function buildPxPayPlusOrderStatusSignPayload(params: {
  transactionId: string;
  reqTime: string;
}): string {
  return `${String(params.transactionId || "").trim()}${
    String(params.reqTime || "").trim()
  }`;
}

export function buildPxPayPlusPaymentNotifySignPayload(params: {
  merTradeNo: string;
  transactionId: string;
  pxTradeNo: string;
  reqTime: string;
}): string {
  return [
    String(params.merTradeNo || "").trim(),
    String(params.transactionId || "").trim(),
    String(params.pxTradeNo || "").trim(),
    String(params.reqTime || "").trim(),
  ].join("");
}

export function buildPxPayPlusRefundSignPayload(params: {
  merTradeNo: string;
  pxTradeNo: string;
  tradeTime: string;
  refundMerTradeNo: string;
  amount: number;
  reqTime: string;
}): string {
  return [
    String(params.merTradeNo || "").trim(),
    String(params.pxTradeNo || "").trim(),
    String(params.tradeTime || "").trim(),
    String(params.refundMerTradeNo || "").trim(),
    String(Math.round(Number(params.amount) || 0)),
    String(params.reqTime || "").trim(),
  ].join("");
}

export function buildPxPayPlusQueryOrderSignPayload(params: {
  tradeNoType: PxPayPlusTradeNoType;
  tradeNo: string;
  reqTime: string;
}): string {
  return [
    String(params.tradeNoType || "").trim(),
    String(params.tradeNo || "").trim(),
    String(params.reqTime || "").trim(),
  ].join("");
}

export function parsePxPayPlusPayStatus(value: unknown): number | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function mapPxPayPlusPayStatusToPaymentStatus(
  payStatus: unknown,
): "paid" | "failed" | "cancelled" | "pending" | "processing" {
  const parsed = parsePxPayPlusPayStatus(payStatus);
  if (parsed === 1) return "paid";
  if (parsed === 2) return "cancelled";
  if (parsed === 3) return "failed";
  if (parsed === 0) return "pending";
  return "processing";
}

export function buildPxPayPlusPaymentMetadataUpdates(
  snapshot: PxPayPlusTradeSnapshot,
  nowIso = new Date().toISOString(),
): JsonRecord {
  const paymentStatus = mapPxPayPlusPayStatusToPaymentStatus(
    snapshot.payStatus,
  );
  const updates: JsonRecord = {
    payment_status: paymentStatus,
    payment_last_checked_at: nowIso,
  };

  const statusCode = String(snapshot.statusCode || "").trim();
  if (statusCode) updates.payment_provider_status_code = statusCode;

  const transactionId = String(snapshot.transactionId || "").trim();
  if (transactionId) {
    updates.payment_id = transactionId;
    updates.payment_provider_transaction_id = transactionId;
  }

  const pxTradeNo = String(snapshot.pxTradeNo || "").trim();
  if (pxTradeNo) updates.payment_provider_trade_no = pxTradeNo;

  const tradeTime = String(snapshot.tradeTime || "").trim();
  if (tradeTime) updates.payment_provider_trade_time = tradeTime;

  if (Number.isFinite(Number(snapshot.tradeAmount))) {
    updates.payment_trade_amount = Math.max(
      0,
      Math.round(Number(snapshot.tradeAmount)),
    );
  }
  if (Number.isFinite(Number(snapshot.discountAmount))) {
    updates.payment_discount_amount = Math.max(
      0,
      Math.round(Number(snapshot.discountAmount)),
    );
  }

  const invoCarrier = String(snapshot.invoCarrier || "").trim();
  if (invoCarrier) updates.payment_invo_carrier = invoCarrier;

  if (snapshot.providerPayload) {
    updates.payment_provider_payload = snapshot.providerPayload;
  }

  if (paymentStatus === "paid") {
    updates.payment_confirmed_at = nowIso;
  }

  return updates;
}

function resolvePxPayPlusRuntimeConfig(): PxPayPlusRuntimeConfig {
  const merchantCode = String(
    Deno.env.get("PXPAYPLUS_MERCHANT_CODE") || PXPAYPLUS_MERCHANT_CODE || "",
  ).trim();
  const merchantEnName = String(
    Deno.env.get("PXPAYPLUS_MERCHANT_EN_NAME") ||
      PXPAYPLUS_MERCHANT_EN_NAME ||
      "",
  ).trim();
  const secretKey = String(
    Deno.env.get("PXPAYPLUS_SECRET_KEY") || PXPAYPLUS_SECRET_KEY || "",
  ).trim();
  const baseUrl = normalizeBaseUrl(
    Deno.env.get("PXPAYPLUS_BASE_URL") || PXPAYPLUS_BASE_URL || "",
  ) ||
    DEFAULT_PXPAYPLUS_UAT_BASE_URL;
  const proxyUrl = String(
    Deno.env.get("PXPAYPLUS_PROXY_URL") || PXPAYPLUS_PROXY_URL || "",
  ).trim();

  const missingKeys: string[] = [];
  if (!merchantCode) missingKeys.push("PXPAYPLUS_MERCHANT_CODE");
  if (!secretKey) missingKeys.push("PXPAYPLUS_SECRET_KEY");
  if (missingKeys.length > 0) {
    throw new Error(`全支付設定缺失：${missingKeys.join(", ")}`);
  }

  return { merchantCode, merchantEnName, secretKey, baseUrl, proxyUrl };
}

function buildAbsoluteUrl(baseUrl: string, path: string): string {
  const normalizedPath = String(path || "").trim();
  if (!normalizedPath) throw new Error("全支付 API 路徑不可為空");
  if (/^https?:\/\//i.test(normalizedPath)) return normalizedPath;
  return `${baseUrl}${
    normalizedPath.startsWith("/") ? "" : "/"
  }${normalizedPath}`;
}

function createProxyClient(proxyUrl: string): Deno.HttpClient | null {
  const raw = String(proxyUrl || "").trim();
  if (!raw) return null;
  if (typeof Deno.createHttpClient !== "function") return null;
  try {
    return Deno.createHttpClient({ proxy: { url: raw } });
  } catch (error) {
    logger.warn("Create proxy client failed", error);
    return null;
  }
}

async function callPxPayPlusApi(params: {
  method: "GET" | "POST";
  path: string;
  signPayload: string;
  body?: JsonRecord;
}): Promise<JsonRecord> {
  const config = resolvePxPayPlusRuntimeConfig();
  const url = buildAbsoluteUrl(config.baseUrl, params.path);
  const signValue = await hmacSha256UpperHexWithHexKey(
    params.signPayload,
    config.secretKey,
  );
  const headers: Record<string, string> = {
    "Content-Type": "application/json;charset=utf-8",
    "PX-MerCode": config.merchantCode,
    "PX-SignValue": signValue,
  };
  if (config.merchantEnName) headers["PX-MerEnName"] = config.merchantEnName;

  const maxRetries = 2;
  const timeoutMs = 15000;
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
      if (params.body) init.body = JSON.stringify(params.body);
      if (proxyClient) init.client = proxyClient;

      const response = await fetch(url, init);
      const responseText = await response.text();
      const parsed = tryParseJsonRecord(responseText);
      if (!response.ok) {
        throw new Error(
          `全支付 HTTP ${response.status}: ${responseText.slice(0, 240)}`,
        );
      }
      if (!parsed) {
        throw new Error(`全支付回傳非 JSON：${responseText.slice(0, 240)}`);
      }
      return parsed;
    } catch (error) {
      attempt++;
      if (attempt > maxRetries) {
        if (error instanceof Error && error.name === "AbortError") {
          throw new Error("全支付請求逾時 (Timeout)");
        }
        throw error instanceof Error
          ? error
          : new Error(`全支付請求失敗: ${String(error)}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    } finally {
      clearTimeout(timeoutId);
      proxyClient?.close();
    }
  }

  throw new Error("全支付請求失敗");
}

export async function requestPxPayPlusCreateOrder(
  request: PxPayPlusCreateOrderRequest,
): Promise<JsonRecord> {
  const reqTime = String(request.reqTime || "").trim() ||
    formatPxPayPlusReqTime();
  const body: JsonRecord = {
    mer_trade_no: String(request.merTradeNo || "").trim(),
    amount: Math.round(Number(request.amount) || 0),
    device_type: request.deviceType,
    web_confirm_url: String(request.webConfirmUrl || "").trim() || undefined,
    web_cancel_url: String(request.webCancelUrl || "").trim() || undefined,
    app_confirm_url: String(request.appConfirmUrl || "").trim() || undefined,
    app_cancel_url: String(request.appCancelUrl || "").trim() || undefined,
    req_time: reqTime,
    store_id: String(request.storeId || "").trim() || undefined,
    order_status_url: String(request.orderStatusUrl || "").trim() || undefined,
    payment_notify_url: String(request.paymentNotifyUrl || "").trim() ||
      undefined,
    identity: Array.isArray(request.identity) && request.identity.length
      ? request.identity.map((item) => String(item || "").trim()).filter(
        Boolean,
      )
      : undefined,
    order_type: request.orderType,
  };
  for (const key of Object.keys(body)) {
    if (body[key] === undefined) delete body[key];
  }
  if (!body.mer_trade_no) throw new Error("缺少 mer_trade_no");
  if (Number(body.amount) <= 0) throw new Error("訂單金額需大於 0");

  return await callPxPayPlusApi({
    method: "POST",
    path: "/CreateOrder",
    body,
    signPayload: buildPxPayPlusCreateOrderSignPayload({
      merTradeNo: String(body.mer_trade_no),
      amount: Number(body.amount),
      deviceType: Number(body.device_type),
      reqTime,
      storeId: String(body.store_id || ""),
    }),
  });
}

export async function requestPxPayPlusRefund(
  request: PxPayPlusRefundRequest,
): Promise<JsonRecord> {
  const reqTime = String(request.reqTime || "").trim() ||
    formatPxPayPlusReqTime();
  const body: JsonRecord = {
    mer_trade_no: String(request.merTradeNo || "").trim(),
    px_trade_no: String(request.pxTradeNo || "").trim(),
    refund_mer_trade_no: String(request.refundMerTradeNo || "").trim(),
    trade_time: String(request.tradeTime || "").trim(),
    amount: Math.round(Number(request.amount) || 0),
    remark1: String(request.remark1 || "").trim(),
    remark2: String(request.remark2 || "").trim(),
    remark3: String(request.remark3 || "").trim(),
    req_time: reqTime,
  };
  if (!body.mer_trade_no) throw new Error("缺少 mer_trade_no");
  if (!body.px_trade_no) throw new Error("缺少 px_trade_no");
  if (!body.refund_mer_trade_no) throw new Error("缺少 refund_mer_trade_no");
  if (!body.trade_time) throw new Error("缺少 trade_time");
  if (Number(body.amount) <= 0) throw new Error("退款金額需大於 0");

  return await callPxPayPlusApi({
    method: "POST",
    path: "/Refund",
    body,
    signPayload: buildPxPayPlusRefundSignPayload({
      merTradeNo: String(body.mer_trade_no),
      pxTradeNo: String(body.px_trade_no),
      tradeTime: String(body.trade_time),
      refundMerTradeNo: String(body.refund_mer_trade_no),
      amount: Number(body.amount),
      reqTime,
    }),
  });
}

export async function requestPxPayPlusCheckStatus(
  transactionId: string,
  reqTime = formatPxPayPlusReqTime(),
): Promise<JsonRecord> {
  const normalizedTransactionId = String(transactionId || "").trim();
  if (!normalizedTransactionId) throw new Error("缺少 transaction_id");
  const normalizedReqTime = String(reqTime || "").trim();
  return await callPxPayPlusApi({
    method: "GET",
    path: `/CheckStatus/${encodeURIComponent(normalizedTransactionId)}/${
      encodeURIComponent(normalizedReqTime)
    }`,
    signPayload: buildPxPayPlusOrderStatusSignPayload({
      transactionId: normalizedTransactionId,
      reqTime: normalizedReqTime,
    }),
  });
}

export async function requestPxPayPlusQueryOrder(
  tradeNoType: PxPayPlusTradeNoType,
  tradeNo: string,
  reqTime = formatPxPayPlusReqTime(),
): Promise<JsonRecord> {
  const normalizedTradeNo = String(tradeNo || "").trim();
  if (!normalizedTradeNo) throw new Error("缺少 trade_no");
  const normalizedReqTime = String(reqTime || "").trim();
  return await callPxPayPlusApi({
    method: "GET",
    path: `/Order/${encodeURIComponent(tradeNoType)}/${
      encodeURIComponent(normalizedTradeNo)
    }/${encodeURIComponent(normalizedReqTime)}`,
    signPayload: buildPxPayPlusQueryOrderSignPayload({
      tradeNoType,
      tradeNo: normalizedTradeNo,
      reqTime: normalizedReqTime,
    }),
  });
}

export async function requestPxPayPlusQueryOrderHistory(
  tradeNoType: PxPayPlusTradeNoType,
  tradeNo: string,
  reqTime = formatPxPayPlusReqTime(),
): Promise<JsonRecord> {
  const normalizedTradeNo = String(tradeNo || "").trim();
  if (!normalizedTradeNo) throw new Error("缺少 trade_no");
  const normalizedReqTime = String(reqTime || "").trim();
  return await callPxPayPlusApi({
    method: "GET",
    path: `/OrderHistory/${encodeURIComponent(tradeNoType)}/${
      encodeURIComponent(normalizedTradeNo)
    }/${encodeURIComponent(normalizedReqTime)}`,
    signPayload: buildPxPayPlusQueryOrderSignPayload({
      tradeNoType,
      tradeNo: normalizedTradeNo,
      reqTime: normalizedReqTime,
    }),
  });
}
