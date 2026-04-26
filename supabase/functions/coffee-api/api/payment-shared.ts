import { hmacSign } from "../utils/auth.ts";
import { shouldSkipCustomerNotificationForPaymentStatus } from "./customer-notification-policy.ts";
import { resolveEmailLogoUrl } from "../utils/email-assets.ts";
import { sendEmail } from "../utils/email.ts";
import { sanitize } from "../utils/html.ts";
import { asJsonRecord } from "../utils/json.ts";
import type { JsonRecord } from "../utils/json.ts";
import { createLogger } from "../utils/logger.ts";
import { parseReceiptInfoRecord } from "../utils/receipt-info.ts";
import { buildOrderStatusLineFlexMessage } from "../utils/line-flex-template.ts";
import { pushLineFlexMessage } from "../utils/line-messaging.ts";
import {
  LINE_ORDER_NOTIFY_CHANNEL_ACCESS_TOKEN,
  LINE_ORDER_NOTIFY_TO,
} from "../utils/config.ts";
import { supabase } from "../utils/supabase.ts";
import { getEmailBranding, trimLineNotifyError } from "./order-shared.ts";

export { getEmailBranding, trimLineNotifyError } from "./order-shared.ts";
export { parseReceiptInfoRecord as parseReceiptInfo } from "../utils/receipt-info.ts";
export {
  buildExpiredOnlinePaymentUpdates,
  EXPIRED_PAYMENT_FAILURE_REASON,
  expireOnlinePaymentOrderIfNeeded,
  expireOnlinePaymentOrdersIfNeeded,
  isPaymentExpired,
  normalizePaymentStatus,
  parseIsoDate,
} from "./payment-expiry.ts";

export type LinePayStatus = "paid" | "cancelled";

interface JkoLineNotifyOptions {
  force?: boolean;
}

export interface AdminPaymentFailureNotificationParams {
  orderId: string;
  paymentMethod: string;
  phase: string;
  reason: string;
  providerStatusCode?: string;
}

const logger = createLogger("payment-shared");

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
  data: JsonRecord,
): Promise<boolean> {
  const signature = String(data.sig || data.signature || "").trim();
  if (!orderId || !signature) return false;
  const expected = await hmacSign(`linepay-callback:${orderId}`);
  return timingSafeEqual(signature, expected);
}

export async function hasValidJkoPayCallbackSignature(
  orderId: string,
  data: JsonRecord,
): Promise<boolean> {
  const signature = String(data.sig || data.signature || "").trim();
  if (!orderId || !signature) return false;
  const expected = await hmacSign(`jkopay-callback:${orderId}`);
  return timingSafeEqual(signature, expected);
}

export function getJkoCallbackTransaction(
  data: JsonRecord,
): JsonRecord {
  const transaction = data.transaction;
  if (
    transaction && typeof transaction === "object" &&
    !Array.isArray(transaction)
  ) {
    return asJsonRecord(transaction);
  }
  return data;
}

export function getJkoOrderIdFromPayload(
  data: JsonRecord,
  transaction: JsonRecord,
): string {
  return String(
    transaction.platform_order_id || data.platform_order_id || data.orderId ||
      "",
  )
    .trim();
}

export function getJkoTradeNoFromPayload(
  data: JsonRecord,
  transaction: JsonRecord,
): string {
  return String(
    transaction.tradeNo || transaction.trade_no || data.tradeNo ||
      data.trade_no || "",
  )
    .trim();
}

export function getJkoStatusCodeFromPayload(
  data: JsonRecord,
  transaction: JsonRecord,
): number | null {
  return parseJkoStatusCode(transaction.status ?? data.status);
}

function parseJkoStatusCode(value: unknown): number | null {
  const normalized = String(value ?? "").trim();
  if (!normalized) return null;
  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function getDeliveryAddressText(order: JsonRecord): string {
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

function parseNotifyTargets(raw: string): string[] {
  return [
    ...new Set(
      String(raw || "")
        .split(/[\n,]/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}

function getPaymentMethodLabel(paymentMethod: string): string {
  if (paymentMethod === "linepay") return "LINE Pay";
  if (paymentMethod === "jkopay") return "街口支付";
  if (paymentMethod === "transfer") return "線上轉帳";
  if (paymentMethod === "cod") return "貨到付款";
  return paymentMethod || "未知付款方式";
}

function getPaymentFailurePhaseLabel(phase: string): string {
  if (phase === "request") return "建立付款請求";
  if (phase === "confirm") return "付款確認";
  if (phase === "inquiry") return "付款查詢";
  if (phase === "callback") return "付款回呼";
  return phase || "付款流程";
}

export function buildAdminPaymentFailureFlexMessage(
  params: AdminPaymentFailureNotificationParams & {
    siteTitle: string;
    lineName?: string;
    total?: number;
  },
): JsonRecord {
  const paymentMethodLabel = getPaymentMethodLabel(params.paymentMethod);
  const phaseLabel = getPaymentFailurePhaseLabel(params.phase);
  const detailLines = [
    { label: "訂單編號", value: params.orderId },
    { label: "付款方式", value: paymentMethodLabel },
    { label: "失敗階段", value: phaseLabel },
    { label: "顧客", value: params.lineName || "未提供" },
    { label: "金額", value: `$${Number(params.total) || 0}` },
  ];
  if (params.providerStatusCode) {
    detailLines.push({ label: "狀態碼", value: params.providerStatusCode });
  }
  detailLines.push({ label: "原因", value: params.reason });

  return {
    type: "flex",
    altText: `${paymentMethodLabel} 付款失敗：${params.orderId}`,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#B42318",
        contents: [{
          type: "text",
          text: "付款失敗告警",
          color: "#FFFFFF",
          weight: "bold",
          size: "lg",
        }],
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          {
            type: "text",
            text: params.siteTitle || "Script Coffee",
            weight: "bold",
            color: "#3C2415",
            wrap: true,
          },
          ...detailLines.map((line) => ({
            type: "box",
            layout: "baseline",
            spacing: "sm",
            contents: [
              {
                type: "text",
                text: line.label,
                color: "#6B7280",
                size: "xs",
                flex: 2,
              },
              {
                type: "text",
                text: String(line.value || "未提供").slice(0, 220),
                color: "#111827",
                size: "sm",
                wrap: true,
                flex: 5,
              },
            ],
          })),
        ],
      },
    },
  };
}

export async function notifyAdminPaymentFailure(
  params: AdminPaymentFailureNotificationParams,
) {
  try {
    const notifyTargets = parseNotifyTargets(
      String(LINE_ORDER_NOTIFY_TO || ""),
    );
    const notifyToken = String(LINE_ORDER_NOTIFY_CHANNEL_ACCESS_TOKEN || "")
      .trim();
    if (!notifyTargets.length || !notifyToken) {
      logger.warn("Skip payment failure admin LINE notification", {
        orderId: params.orderId,
        hasTarget: notifyTargets.length > 0,
        hasToken: Boolean(notifyToken),
      });
      return;
    }

    const { siteTitle } = await getEmailBranding();
    const { data: order } = await supabase.from("coffee_orders").select(
      "line_name, total",
    ).eq("id", params.orderId).maybeSingle();
    const flexMessage = buildAdminPaymentFailureFlexMessage({
      ...params,
      siteTitle,
      lineName: String(order?.line_name || ""),
      total: Number(order?.total) || 0,
    });

    for (const target of notifyTargets) {
      const result = await pushLineFlexMessage(
        target,
        flexMessage,
        notifyToken,
      );
      if (!result.success) {
        logger.error("Failed to send payment failure admin LINE notification", {
          orderId: params.orderId,
          target,
          error: result.error,
        });
      }
    }
  } catch (error) {
    logger.error("Unexpected payment failure admin notification error", {
      orderId: params.orderId,
      error,
    });
  }
}

async function updateJkoLineNotifyState(
  orderId: string,
  payload: JsonRecord,
  failureContext: string,
) {
  const { error } = await supabase.from("coffee_orders").update(payload).eq(
    "id",
    orderId,
  );
  if (error) {
    logger.warn("Failed to update JKO LINE notify state", {
      orderId,
      context: failureContext,
      error: error.message,
    });
  }
}

async function persistJkoLineNotifyError(
  orderId: string,
  error: unknown,
  failureContext = "failed to persist notification error",
) {
  await updateJkoLineNotifyState(
    orderId,
    { line_payment_status_notify_error: trimLineNotifyError(error) },
    failureContext,
  );
}

async function clearJkoLineNotifyError(orderId: string) {
  await updateJkoLineNotifyState(
    orderId,
    { line_payment_status_notify_error: "" },
    "failed to clear skipped notification error",
  );
}

async function persistJkoLineNotifySuccess(
  orderId: string,
  paymentStatus: string,
) {
  await updateJkoLineNotifyState(
    orderId,
    {
      line_payment_status_notified: paymentStatus,
      line_payment_status_notified_at: new Date().toISOString(),
      line_payment_status_notify_error: "",
    },
    "failed to persist notification success state",
  );
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

export async function notifyLinePayPaymentStatusChanged(
  orderId: string,
  paymentStatus: LinePayStatus,
) {
  if (shouldSkipCustomerNotificationForPaymentStatus(paymentStatus)) {
    return;
  }

  try {
    const { data: order, error } = await supabase.from("coffee_orders").select(
      "id, status, line_user_id, line_name, email, total, items, delivery_method, city, district, address, store_name, store_address, note, receipt_info, payment_method",
    ).eq("id", orderId).maybeSingle();

    if (error || !order) {
      logger.error("Failed to load LINE Pay order for status notification", {
        orderId,
        error: error?.message || "not found",
      });
      return;
    }

    const { siteTitle, siteLogoUrl } = await getEmailBranding();
    const deliveryText = getDeliveryAddressText(
      asJsonRecord(order),
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
        receiptInfo: parseReceiptInfoRecord(order.receipt_info),
      });
      const flexResult = await pushLineFlexMessage(lineUserId, flexMessage);
      if (!flexResult.success) {
        logger.error("Failed to send LINE Pay status flex", {
          orderId,
          lineUserId,
          error: flexResult.error,
        });
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
        logger.error("Failed to send LINE Pay status email", {
          orderId,
          customerEmail,
          error: emailResult.error || "unknown",
        });
      }
    }
  } catch (error) {
    logger.error("Unexpected error while notifying LINE Pay order", {
      orderId,
      error,
    });
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
      logger.error("Failed to load JKO Pay order for status notification", {
        orderId,
        error: error?.message || "not found",
      });
      return;
    }

    const normalizedPaymentStatus = String(paymentStatus || "").trim() ||
      String(order.payment_status || "").trim() || "pending";
    if (
      shouldSkipCustomerNotificationForPaymentStatus(normalizedPaymentStatus)
    ) {
      await clearJkoLineNotifyError(orderId);
      return;
    }

    const lineUserId = String(order.line_user_id || "").trim();
    if (!lineUserId) {
      await persistJkoLineNotifyError(
        orderId,
        "缺少 LINE 使用者 ID",
        "failed to persist missing LINE user id",
      );
      return;
    }

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
      receiptInfo: parseReceiptInfoRecord(order.receipt_info),
    });
    const flexResult = await pushLineFlexMessage(lineUserId, flexMessage);
    if (!flexResult.success) {
      logger.error("Failed to send JKO Pay status flex", {
        orderId,
        lineUserId,
        error: flexResult.error,
      });
      await persistJkoLineNotifyError(orderId, flexResult.error);
      return;
    }
    await persistJkoLineNotifySuccess(orderId, normalizedPaymentStatus);
  } catch (error) {
    logger.error("Unexpected error while notifying JKO Pay order", {
      orderId,
      error,
    });
    await persistJkoLineNotifyError(
      orderId,
      error,
      "failed to persist unexpected error",
    );
  }
}
