import { hmacSign } from "../utils/auth.ts";
import { FRONTEND_URL } from "../utils/config.ts";
import { sendEmail } from "../utils/email.ts";
import { normalizeEmailSiteTitle } from "../utils/email-templates.ts";
import { sanitize } from "../utils/html.ts";
import { buildOrderStatusLineFlexMessage } from "../utils/line-flex-template.ts";
import { pushLineFlexMessage } from "../utils/line-messaging.ts";
import { supabase } from "../utils/supabase.ts";

export type LinePayStatus = "paid" | "cancelled";
export const EXPIRED_PAYMENT_CANCEL_REASON = "付款期限已過，自動取消";
const LINEPAY_PAYMENT_TIMEOUT_MS = 20 * 60 * 1000;

interface EmailBranding {
  siteTitle: string;
  siteLogoUrl: string;
}

interface JkoLineNotifyOptions {
  force?: boolean;
}

export function trimLineNotifyError(raw: unknown): string {
  const value = String(raw || "").trim();
  if (!value) return "";
  return value.slice(0, 240);
}

export function isTerminalJkoPaymentStatus(status: string): boolean {
  return ["paid", "failed", "cancelled", "expired", "refunded"].includes(
    String(status || "").trim(),
  );
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export async function hasValidLinePayCallbackSignature(
  orderId: string,
  data: Record<string, unknown>,
): Promise<boolean> {
  const signature = String(data.sig || data.signature || "").trim();
  if (!orderId || !signature) return false;
  const expected = await hmacSign(`linepay-callback:${orderId}`);
  return timingSafeEqual(signature, expected);
}

export async function hasValidJkoPayCallbackSignature(
  orderId: string,
  data: Record<string, unknown>,
): Promise<boolean> {
  const signature = String(data.sig || data.signature || "").trim();
  if (!orderId || !signature) return false;
  const expected = await hmacSign(`jkopay-callback:${orderId}`);
  return timingSafeEqual(signature, expected);
}

export function getJkoCallbackTransaction(
  data: Record<string, unknown>,
): Record<string, unknown> {
  const transaction = data.transaction;
  if (
    transaction && typeof transaction === "object" &&
    !Array.isArray(transaction)
  ) {
    return transaction as Record<string, unknown>;
  }
  return data;
}

export function getJkoOrderIdFromPayload(
  data: Record<string, unknown>,
  transaction: Record<string, unknown>,
): string {
  return String(
    transaction.platform_order_id || data.platform_order_id || data.orderId ||
      "",
  )
    .trim();
}

export function getJkoTradeNoFromPayload(
  data: Record<string, unknown>,
  transaction: Record<string, unknown>,
): string {
  return String(
    transaction.tradeNo || transaction.trade_no || data.tradeNo ||
      data.trade_no || "",
  )
    .trim();
}

export function getJkoStatusCodeFromPayload(
  data: Record<string, unknown>,
  transaction: Record<string, unknown>,
): number | null {
  return parseJkoStatusCode(transaction.status ?? data.status);
}

function parseJkoStatusCode(value: unknown): number | null {
  const normalized = String(value ?? "").trim();
  if (!normalized) return null;
  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizePaymentStatus(
  value: unknown,
  fallback = "pending",
): string {
  const normalized = String(value || "").trim();
  return normalized || fallback;
}

export function parseIsoDate(value: unknown): Date | null {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export function isPaymentExpired(
  paymentExpiresAt: unknown,
  now: Date,
): boolean {
  const deadline = parseIsoDate(paymentExpiresAt);
  if (!deadline) return false;
  return deadline.getTime() <= now.getTime();
}

function resolveOrderPaymentExpiresAt(order: Record<string, unknown>): string {
  const explicit = String(order.payment_expires_at || "").trim();
  if (explicit) return explicit;

  if (String(order.payment_method || "").trim() !== "linepay") {
    return "";
  }

  const createdAt = parseIsoDate(order.created_at);
  if (!createdAt) return "";
  return new Date(createdAt.getTime() + LINEPAY_PAYMENT_TIMEOUT_MS)
    .toISOString();
}

export function buildExpiredOnlinePaymentUpdates(
  order: Record<string, unknown> | null | undefined,
  now: Date = new Date(),
  options: { force?: boolean } = {},
): Record<string, unknown> | null {
  if (!order) return null;
  const paymentMethod = String(order.payment_method || "").trim();
  if (!["linepay", "jkopay"].includes(paymentMethod)) return null;

  const paymentStatus = normalizePaymentStatus(order.payment_status);
  if (
    ["paid", "failed", "cancelled", "expired", "refunded"].includes(
      paymentStatus,
    )
  ) {
    return null;
  }

  const resolvedPaymentExpiresAt = resolveOrderPaymentExpiresAt(order);
  if (!options.force && !isPaymentExpired(resolvedPaymentExpiresAt, now)) {
    return null;
  }

  const updates: Record<string, unknown> = {
    payment_status: "expired",
    payment_last_checked_at: now.toISOString(),
  };
  if (
    resolvedPaymentExpiresAt && !String(order.payment_expires_at || "").trim()
  ) {
    updates.payment_expires_at = resolvedPaymentExpiresAt;
  }
  if (String(order.status || "pending").trim() === "pending") {
    updates.status = "cancelled";
    updates.cancel_reason = EXPIRED_PAYMENT_CANCEL_REASON;
  }
  return updates;
}

export async function expireOnlinePaymentOrderIfNeeded(
  order: Record<string, unknown> | null | undefined,
  now: Date = new Date(),
  options: { force?: boolean } = {},
): Promise<{ changed: boolean; order: Record<string, unknown> | null }> {
  if (!order) return { changed: false, order: null };
  const updates = buildExpiredOnlinePaymentUpdates(order, now, options);
  if (!updates) {
    return { changed: false, order: { ...order } };
  }

  const orderId = String(order.id || "").trim();
  if (orderId) {
    const { error } = await supabase.from("coffee_orders").update(updates).eq(
      "id",
      orderId,
    );
    if (error) {
      console.error(
        `[payment-expiry] failed to persist expired order state: ${orderId} (${error.message})`,
      );
    }
  }

  return {
    changed: true,
    order: {
      ...order,
      ...updates,
    },
  };
}

export async function expireOnlinePaymentOrdersIfNeeded(
  orders: Record<string, unknown>[],
  now: Date = new Date(),
): Promise<Record<string, unknown>[]> {
  const rows = Array.isArray(orders) ? orders : [];
  const normalizedRows: Record<string, unknown>[] = [];
  for (const order of rows) {
    const result = await expireOnlinePaymentOrderIfNeeded(order, now);
    normalizedRows.push(result.order || { ...order });
  }
  return normalizedRows;
}

function resolveEmailLogoUrl(rawLogoUrl: unknown): string {
  const raw = String(rawLogoUrl || "").trim();
  if (!raw) return `${FRONTEND_URL}/icons/logo.png`;
  if (/^https?:\/\//i.test(raw)) return raw;

  const frontendBase = String(FRONTEND_URL || "").replace(/\/+$/, "");
  const normalized = raw.replace(/^\.?\//, "");
  if (!frontendBase) return normalized;
  if (!normalized) return `${frontendBase}/icons/logo.png`;
  return `${frontendBase}/${normalized}`;
}

export function parseReceiptInfo(
  raw: unknown,
): Record<string, unknown> | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    const value = raw.trim();
    if (!value) return null;
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      return null;
    } catch {
      return null;
    }
  }
  if (typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return null;
}

function getDeliveryAddressText(order: Record<string, unknown>): string {
  const deliveryMethod = String(order.delivery_method || "");
  if (deliveryMethod === "delivery" || deliveryMethod === "home_delivery") {
    return `${String(order.city || "")}${String(order.district || "")} ${
      String(order.address || "")
    }`.trim();
  }
  return `${String(order.store_name || "")}${
    String(order.store_address || "").trim()
      ? ` (${String(order.store_address || "").trim()})`
      : ""
  }`.trim();
}

function getLinePayStatusLabel(status: LinePayStatus): string {
  return status === "paid" ? "已付款" : "已取消";
}

function buildLinePayStatusEmailHtml(params: {
  orderId: string;
  siteTitle: string;
  logoUrl: string;
  lineName: string;
  paymentStatus: LinePayStatus;
  total: number;
  deliveryText: string;
  note: string;
}) {
  const statusLabel = getLinePayStatusLabel(params.paymentStatus);
  const statusColor = params.paymentStatus === "paid" ? "#2e7d32" : "#d32f2f";
  const summaryText = params.paymentStatus === "paid"
    ? "您的 LINE Pay 付款已成功完成。"
    : "您的 LINE Pay 付款已取消，若需下單請重新送出。";

  return `
<div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e5ddd5;box-shadow:0 4px 10px rgba(0,0,0,0.08);">
  <div style="background:#6F4E37;color:#fff;padding:22px 20px 20px;text-align:center;">
    <img src="${sanitize(resolveEmailLogoUrl(params.logoUrl))}" alt="${
    sanitize(params.siteTitle)
  } Logo" style="display:block;height:18px;width:auto;max-width:108px;margin:0 auto 10px auto;border:0;outline:none;text-decoration:none;">
    <h1 style="margin:0;font-size:22px;line-height:1.32;font-weight:700;letter-spacing:0.2px;">${
    sanitize(params.siteTitle)
  }</h1>
    <p style="margin:8px 0 0 0;font-size:13px;line-height:1.4;color:#F2EAE4;">LINE Pay 付款狀態通知</p>
  </div>
  <div style="padding:28px 30px;color:#333;line-height:1.65;">
    <h2 style="font-size:18px;color:#6F4E37;margin-top:0;">親愛的 ${
    sanitize(params.lineName)
  }，您好</h2>
    <p style="margin:0 0 14px 0;">${sanitize(summaryText)}</p>
    <div style="background:#f9f6f0;border-left:4px solid #6F4E37;padding:14px 15px;margin:16px 0;border-radius:0 4px 4px 0;">
      <p style="margin:0 0 10px 0;"><strong>訂單編號：</strong> ${
    sanitize(params.orderId)
  }</p>
      <p style="margin:0 0 10px 0;"><strong>付款狀態：</strong> <span style="font-weight:700;color:${statusColor};">${statusLabel}</span></p>
      <p style="margin:0 0 10px 0;"><strong>訂單金額：</strong> $${
    Number(params.total) || 0
  }</p>
      <p style="margin:0 0 10px 0;"><strong>配送資訊：</strong> ${
    sanitize(params.deliveryText || "未提供")
  }</p>
      <p style="margin:0;"><strong>訂單備註：</strong> ${
    sanitize(params.note || "無")
  }</p>
    </div>
  </div>
  <div style="background:#f5f5f5;color:#888;text-align:center;padding:14px 15px;font-size:12px;border-top:1px solid #eee;">
    <p style="margin:0;">此為系統自動發送的信件，請勿直接回覆。</p>
  </div>
</div>`;
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

export async function notifyLinePayPaymentStatusChanged(
  orderId: string,
  paymentStatus: LinePayStatus,
) {
  try {
    const { data: order, error } = await supabase.from("coffee_orders").select(
      "id, status, line_user_id, line_name, email, total, items, delivery_method, city, district, address, store_name, store_address, note, receipt_info, payment_method",
    ).eq("id", orderId).maybeSingle();

    if (error || !order) {
      console.error(
        `[linePayStatusNotify] failed to load order: ${orderId} (${
          error?.message || "not found"
        })`,
      );
      return;
    }

    const { siteTitle, siteLogoUrl } = await getEmailBranding();
    const deliveryText = getDeliveryAddressText(
      order as Record<string, unknown>,
    );
    const lineName = String(order.line_name || "").trim() || "顧客";

    const lineUserId = String(order.line_user_id || "").trim();
    if (lineUserId) {
      const flexMessage = buildOrderStatusLineFlexMessage({
        orderId,
        siteTitle,
        status: String(order.status || "pending"),
        deliveryMethod: String(order.delivery_method || ""),
        city: String(order.city || ""),
        district: String(order.district || ""),
        address: String(order.address || ""),
        storeName: String(order.store_name || ""),
        storeAddress: String(order.store_address || ""),
        paymentMethod: String(order.payment_method || "linepay"),
        paymentStatus,
        total: Number(order.total) || 0,
        items: String(order.items || ""),
        note: String(order.note || ""),
        receiptInfo: parseReceiptInfo(order.receipt_info),
      });
      const flexResult = await pushLineFlexMessage(lineUserId, flexMessage);
      if (!flexResult.success) {
        console.error(
          `[linePayStatusNotify] failed to send LINE flex: ${orderId} -> ${lineUserId} (${flexResult.error})`,
        );
      }
    }

    const customerEmail = String(order.email || "").trim();
    if (customerEmail) {
      const statusSummary = paymentStatus === "paid" ? "付款成功" : "付款取消";
      const subject =
        `[${siteTitle}] 訂單編號 ${orderId} LINE Pay ${statusSummary}通知`;
      const html = buildLinePayStatusEmailHtml({
        orderId,
        siteTitle,
        logoUrl: siteLogoUrl,
        lineName,
        paymentStatus,
        total: Number(order.total) || 0,
        deliveryText,
        note: String(order.note || ""),
      });
      const emailResult = await sendEmail(customerEmail, subject, html);
      if (!emailResult.success) {
        console.error(
          `[linePayStatusNotify] failed to send email: ${orderId} -> ${customerEmail} (${
            emailResult.error || "unknown"
          })`,
        );
      }
    }
  } catch (error) {
    console.error(
      `[linePayStatusNotify] unexpected error while notifying order ${orderId}`,
      error,
    );
  }
}

export async function notifyJkoPayPaymentStatusChanged(
  orderId: string,
  paymentStatus: string,
  options: JkoLineNotifyOptions = {},
) {
  try {
    const { data: order, error } = await supabase.from("coffee_orders").select(
      "id, status, line_user_id, payment_status, line_payment_status_notified, total, items, delivery_method, city, district, address, store_name, store_address, note, receipt_info, payment_method",
    ).eq("id", orderId).maybeSingle();

    if (error || !order) {
      console.error(
        `[jkoPayStatusNotify] failed to load order: ${orderId} (${
          error?.message || "not found"
        })`,
      );
      return;
    }

    const lineUserId = String(order.line_user_id || "").trim();
    if (!lineUserId) {
      const { error: persistError } = await supabase.from("coffee_orders")
        .update({
          line_payment_status_notify_error: "缺少 LINE 使用者 ID",
        }).eq("id", orderId);
      if (persistError) {
        console.warn(
          `[jkoPayStatusNotify] failed to persist missing LINE user id: ${orderId} (${persistError.message})`,
        );
      }
      return;
    }

    const normalizedPaymentStatus = String(paymentStatus || "").trim() ||
      String(order.payment_status || "").trim() || "pending";
    const lastNotifiedStatus = String(order.line_payment_status_notified || "")
      .trim();
    if (!options.force && lastNotifiedStatus === normalizedPaymentStatus) {
      return;
    }

    const { siteTitle } = await getEmailBranding();
    const flexMessage = buildOrderStatusLineFlexMessage({
      orderId,
      siteTitle,
      status: String(order.status || "pending"),
      deliveryMethod: String(order.delivery_method || ""),
      city: String(order.city || ""),
      district: String(order.district || ""),
      address: String(order.address || ""),
      storeName: String(order.store_name || ""),
      storeAddress: String(order.store_address || ""),
      paymentMethod: String(order.payment_method || "jkopay"),
      paymentStatus: normalizedPaymentStatus,
      total: Number(order.total) || 0,
      items: String(order.items || ""),
      note: String(order.note || ""),
      receiptInfo: parseReceiptInfo(order.receipt_info),
    });
    const flexResult = await pushLineFlexMessage(lineUserId, flexMessage);
    if (!flexResult.success) {
      console.error(
        `[jkoPayStatusNotify] failed to send LINE flex: ${orderId} -> ${lineUserId} (${flexResult.error})`,
      );
      const { error: persistError } = await supabase.from("coffee_orders")
        .update({
          line_payment_status_notify_error: trimLineNotifyError(
            flexResult.error,
          ),
        }).eq("id", orderId);
      if (persistError) {
        console.warn(
          `[jkoPayStatusNotify] failed to persist notification error: ${orderId} (${persistError.message})`,
        );
      }
      return;
    }
    const nowIso = new Date().toISOString();
    const { error: persistError } = await supabase.from("coffee_orders").update(
      {
        line_payment_status_notified: normalizedPaymentStatus,
        line_payment_status_notified_at: nowIso,
        line_payment_status_notify_error: "",
      },
    ).eq("id", orderId);
    if (persistError) {
      console.warn(
        `[jkoPayStatusNotify] failed to persist notification success state: ${orderId} (${persistError.message})`,
      );
    }
  } catch (error) {
    console.error(
      `[jkoPayStatusNotify] unexpected error while notifying order ${orderId}`,
      error,
    );
    const { error: persistError } = await supabase.from("coffee_orders").update(
      {
        line_payment_status_notify_error: trimLineNotifyError(error),
      },
    ).eq("id", orderId);
    if (persistError) {
      console.warn(
        `[jkoPayStatusNotify] failed to persist unexpected error: ${orderId} (${persistError.message})`,
      );
    }
  }
}
