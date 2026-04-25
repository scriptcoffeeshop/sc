import { hmacSign } from "../utils/auth.ts";
import {
  FRONTEND_URL,
  LINE_ORDER_NOTIFY_CHANNEL_ACCESS_TOKEN,
  LINE_ORDER_NOTIFY_TO,
  SUPABASE_URL,
} from "../utils/config.ts";
import { normalizeEmailSiteTitle } from "../utils/email-templates.ts";
import { sanitize } from "../utils/html.ts";
import { asJsonRecord, tryParseJsonRecord } from "../utils/json.ts";
import {
  normalizeReceiptInfo,
  parseReceiptInfo,
  type ReceiptInfo,
} from "../utils/receipt-info.ts";
import { buildOrderStatusLineFlexMessage } from "../utils/line-flex-template.ts";
import { pushLineFlexMessage } from "../utils/line-messaging.ts";
import { supabase } from "../utils/supabase.ts";

export { normalizeReceiptInfo, parseReceiptInfo };
export type { ReceiptInfo };

export type CustomFields = Record<string, string>;

interface EmailBranding {
  siteTitle: string;
  siteLogoUrl: string;
}

export interface OrderCreatedLineNotifyParams {
  orderId: string;
  status: string;
  deliveryMethod: string;
  city: string;
  district: string;
  address: string;
  storeName: string;
  storeAddress: string;
  paymentMethod: string;
  paymentStatus: string;
  total: number;
  ordersText: string;
  note: string;
  receiptInfo: ReceiptInfo | null;
}

export interface LineNotificationSendResult {
  attempted: boolean;
  success: boolean;
  target: string;
  error: string;
}

function normalizeCustomFieldValue(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeCustomFieldValue(item))
      .filter(Boolean)
      .join(", ");
  }
  if (typeof value === "object") {
    const json = JSON.stringify(value);
    return json === "{}" ? "" : json;
  }
  return String(value).trim();
}

export function parseCustomFieldsRecord(
  raw: unknown,
): CustomFields | null {
  if (raw === null || raw === undefined) return {};

  let parsed: unknown = raw;
  if (typeof raw === "string") {
    const str = raw.trim();
    if (!str) return {};
    parsed = tryParseJsonRecord(str);
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }

  const normalized: CustomFields = {};
  for (const [key, value] of Object.entries(asJsonRecord(parsed))) {
    const normalizedKey = String(key || "").trim();
    if (!normalizedKey) continue;
    const normalizedValue = normalizeCustomFieldValue(value);
    if (!normalizedValue) continue;
    normalized[normalizedKey] = normalizedValue;
  }

  return normalized;
}

export function normalizeCustomFields(raw: unknown): CustomFields {
  return parseCustomFieldsRecord(raw) ?? {};
}

export function buildReceiptHtml(receiptInfo: ReceiptInfo | null): string {
  if (!receiptInfo) return "";
  return `<p style="margin: 0 0 10px 0;"><strong>收據資訊：</strong><br>
    統一編號：${sanitize(receiptInfo.taxId) || "未填寫"}<br>
    買受人：${sanitize(receiptInfo.buyer) || "未填寫"}<br>
    地址：${sanitize(receiptInfo.address) || "未填寫"}<br>
    壓印日期：${receiptInfo.needDateStamp ? "需要" : "不需要"}
  </p>`;
}

export function stripLegacyReceiptBlock(
  rawItems: unknown,
  receiptInfo: ReceiptInfo | null,
): string {
  const text = String(rawItems || "");
  if (!receiptInfo || !text.includes("[收據資訊]")) return text;

  const lines = text.split(/\r?\n/);
  const markerIndex = lines.findIndex((line) => line.trim() === "[收據資訊]");
  if (markerIndex < 0) return text;

  const receiptTail = lines.slice(markerIndex).join("\n");
  const looksLikeReceiptTail = receiptTail.includes("統一編號：") &&
    receiptTail.includes("壓印日期：");
  if (!looksLikeReceiptTail) return text;

  const kept = lines.slice(0, markerIndex);
  while (kept.length > 0 && kept[kept.length - 1].trim() === "") kept.pop();
  return kept.join("\n");
}

export async function buildCustomFieldsHtml(
  rawCustomFields: unknown,
): Promise<string> {
  const parsedFields = parseCustomFieldsRecord(rawCustomFields);
  if (parsedFields === null) {
    const raw = typeof rawCustomFields === "string"
      ? rawCustomFields.trim()
      : "";
    if (!raw) return "";
    return `<p style="margin: 0 0 10px 0;"><strong>其他資訊：</strong> ${
      sanitize(raw)
    }</p>`;
  }

  if (!Object.keys(parsedFields).length) return "";

  const { data: formFields } = await supabase.from("coffee_form_fields")
    .select("field_key, label, sort_order")
    .eq("enabled", true)
    .order("sort_order", { ascending: true });

  let customFieldsHtml = "";

  if (formFields && formFields.length > 0) {
    for (const field of formFields) {
      const key = String(field.field_key || "");
      if (!Object.prototype.hasOwnProperty.call(parsedFields, key)) continue;
      customFieldsHtml += `<p style="margin: 0 0 10px 0;"><strong>${
        sanitize(String(field.label || key))
      }：</strong> ${sanitize(String(parsedFields[key]))}</p>`;
      delete parsedFields[key];
    }
  }

  for (const [key, val] of Object.entries(parsedFields)) {
    customFieldsHtml += `<p style="margin: 0 0 10px 0;"><strong>${
      sanitize(key)
    }：</strong> ${sanitize(String(val))}</p>`;
  }

  return customFieldsHtml;
}

export async function getEmailBranding(): Promise<EmailBranding> {
  const { data: settingsRows } = await supabase.from("coffee_settings")
    .select("key, value")
    .in("key", ["site_title", "site_icon_url"]);

  let siteTitleRaw = "";
  let siteLogoUrl = "";
  for (const row of settingsRows || []) {
    const key = String(row.key || "");
    if (key === "site_title") {
      siteTitleRaw = String(row.value || "");
      continue;
    }
    if (key === "site_icon_url") {
      siteLogoUrl = String(row.value || "").trim();
    }
  }

  return {
    siteTitle: normalizeEmailSiteTitle(siteTitleRaw),
    siteLogoUrl,
  };
}

export async function isOrderConfirmationAutoEmailEnabled(): Promise<boolean> {
  const { data: settingRow } = await supabase.from("coffee_settings").select(
    "value",
  ).eq("key", "order_confirmation_auto_email_enabled").maybeSingle();

  const rawValue = String(settingRow?.value || "").trim();
  if (!rawValue) return true;

  const normalized = rawValue.toLowerCase();
  return !["false", "0", "off", "no"].includes(normalized);
}

function parseLineNotifyTargets(raw: string): string[] {
  const list = String(raw || "")
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
  return [...new Set(list)];
}

export function trimLineNotifyError(raw: unknown): string {
  const value = String(raw || "").trim();
  if (!value) return "";
  return value.slice(0, 240);
}

async function buildOrderCreatedFlexMessage(
  params: OrderCreatedLineNotifyParams,
): Promise<Record<string, unknown>> {
  const { siteTitle } = await getEmailBranding();
  return buildOrderStatusLineFlexMessage({
    orderId: params.orderId,
    siteTitle,
    status: params.status,
    deliveryMethod: params.deliveryMethod,
    city: params.city,
    district: params.district,
    address: params.address,
    storeName: params.storeName,
    storeAddress: params.storeAddress,
    paymentMethod: params.paymentMethod,
    paymentStatus: params.paymentStatus,
    total: params.total,
    items: params.ordersText,
    note: params.note,
    receiptInfo: params.receiptInfo,
  });
}

export async function sendAdminOrderCreatedFlexNotification(
  params: OrderCreatedLineNotifyParams,
) {
  const notifyTargets = parseLineNotifyTargets(
    String(LINE_ORDER_NOTIFY_TO || ""),
  );
  if (!notifyTargets.length) {
    console.error(
      "[submitOrder] missing LINE_ORDER_NOTIFY_TO, skip admin notification",
    );
    return;
  }
  const notifyToken = String(LINE_ORDER_NOTIFY_CHANNEL_ACCESS_TOKEN || "")
    .trim();
  if (!notifyToken) {
    console.error(
      "[submitOrder] missing LINE_ORDER_NOTIFY_CHANNEL_ACCESS_TOKEN, skip admin notification",
    );
    return;
  }

  const flexMessage = await buildOrderCreatedFlexMessage(params);
  for (const target of notifyTargets) {
    const result = await pushLineFlexMessage(target, flexMessage, notifyToken);
    if (!result.success) {
      console.error(
        `[submitOrder] failed to send admin LINE flex notification: ${params.orderId} -> ${target} (${result.error})`,
      );
    }
  }
}

export async function sendCustomerOrderCreatedFlexNotification(
  params: OrderCreatedLineNotifyParams & { lineUserId: string },
): Promise<LineNotificationSendResult> {
  const target = String(params.lineUserId || "").trim();
  if (!target) {
    return { attempted: false, success: false, target: "", error: "" };
  }

  const flexMessage = await buildOrderCreatedFlexMessage(params);
  const result = await pushLineFlexMessage(target, flexMessage);
  return {
    attempted: true,
    success: result.success,
    target,
    error: result.success ? "" : trimLineNotifyError(result.error),
  };
}

export async function persistOrderCreatedLineNotifyResult(
  orderId: string,
  result: LineNotificationSendResult,
) {
  const updates = {
    line_order_created_notified: result.success ? "sent" : "failed",
    line_order_created_notified_at: result.attempted
      ? new Date().toISOString()
      : null,
    line_order_created_notify_error: result.error,
    line_order_created_notify_target: result.target,
  };
  const { error } = await supabase.from("coffee_orders").update(updates).eq(
    "id",
    orderId,
  );
  if (error) {
    console.warn(
      `[submitOrder] failed to persist line notification result: ${orderId} (${error.message})`,
    );
  }
}

export async function createLinePayCallbackSignature(orderId: string) {
  return await hmacSign(`linepay-callback:${orderId}`);
}

export async function createJkoPayCallbackSignature(orderId: string) {
  return await hmacSign(`jkopay-callback:${orderId}`);
}

export function resolveMainPageUrlWithQuery(query: URLSearchParams): string {
  const qs = query.toString();
  const frontendBase = String(FRONTEND_URL || "").trim().replace(/\/+$/, "") ||
    "https://scriptcoffeeshop.github.io/sc";

  try {
    const url = new URL("main.html", `${frontendBase}/`);
    url.protocol = "https:";
    url.search = qs;
    return url.toString();
  } catch (_error) {
    const fallback = new URL(
      "main.html",
      "https://scriptcoffeeshop.github.io/sc/",
    );
    fallback.search = qs;
    return fallback.toString();
  }
}

export function resolveApiCallbackBase(req: Request): string {
  const supabaseBase = String(SUPABASE_URL || "").trim().replace(/\/+$/, "");
  if (supabaseBase) {
    return `${supabaseBase}/functions/v1/coffee-api`;
  }

  const endpoint = new URL(req.url);
  const origin = endpoint.origin.startsWith("https://")
    ? endpoint.origin
    : endpoint.origin.replace(/^http:\/\//i, "https://");
  return `${origin}${endpoint.pathname}`;
}

export function resolveJkoPaymentExpiresAtIso(qrTimeoutRaw: unknown): string {
  const timeoutNumber = Number(qrTimeoutRaw);
  if (Number.isFinite(timeoutNumber) && timeoutNumber > 0) {
    const timeoutMs = timeoutNumber > 1_000_000_000_000
      ? timeoutNumber
      : timeoutNumber * 1000;
    const timeoutDate = new Date(timeoutMs);
    if (!Number.isNaN(timeoutDate.getTime())) {
      return timeoutDate.toISOString();
    }
  }
  return new Date(Date.now() + 20 * 60 * 1000).toISOString();
}

export function resolveLinePayPaymentExpiresAtIso(
  now: Date = new Date(),
): string {
  return new Date(now.getTime() + 20 * 60 * 1000).toISOString();
}
