import { supabase } from "../utils/supabase.ts";
import {
  extractAuth,
  hmacSign,
  requireAdmin,
  requireAuth,
} from "../utils/auth.ts";
import { FRONTEND_URL } from "../utils/config.ts";
import { sendEmail } from "../utils/email.ts";
import { normalizeEmailSiteTitle } from "../utils/email-templates.ts";
import { sanitize } from "../utils/html.ts";
import { buildOrderStatusLineFlexMessage } from "../utils/line-flex-template.ts";
import { pushLineFlexMessage } from "../utils/line-messaging.ts";
import { requestLinePayAPI } from "../utils/linepay.ts";
import {
  mapJkoStatusCodeToPaymentStatus,
  parseJkoStatusCode,
  requestJkoPayInquiry,
  requestJkoPayRefund,
} from "../utils/jkopay.ts";

type LinePayStatus = "paid" | "cancelled";

interface EmailBranding {
  siteTitle: string;
  siteLogoUrl: string;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

async function hasValidLinePayCallbackSignature(
  orderId: string,
  data: Record<string, unknown>,
): Promise<boolean> {
  const signature = String(data.sig || data.signature || "").trim();
  if (!orderId || !signature) return false;
  const expected = await hmacSign(`linepay-callback:${orderId}`);
  return timingSafeEqual(signature, expected);
}

async function hasValidJkoPayCallbackSignature(
  orderId: string,
  data: Record<string, unknown>,
): Promise<boolean> {
  const signature = String(data.sig || data.signature || "").trim();
  if (!orderId || !signature) return false;
  const expected = await hmacSign(`jkopay-callback:${orderId}`);
  return timingSafeEqual(signature, expected);
}

function getJkoCallbackTransaction(
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

function getJkoOrderIdFromPayload(
  data: Record<string, unknown>,
  transaction: Record<string, unknown>,
): string {
  return String(
    transaction.platform_order_id || data.platform_order_id || data.orderId ||
      "",
  )
    .trim();
}

function getJkoTradeNoFromPayload(
  data: Record<string, unknown>,
  transaction: Record<string, unknown>,
): string {
  return String(
    transaction.tradeNo || transaction.trade_no || data.tradeNo ||
      data.trade_no || "",
  )
    .trim();
}

function getJkoStatusCodeFromPayload(
  data: Record<string, unknown>,
  transaction: Record<string, unknown>,
): number | null {
  return parseJkoStatusCode(transaction.status ?? data.status);
}

async function syncJkoPayOrderStatus(params: {
  orderId: string;
  statusCode: number | null;
  tradeNo: string;
}): Promise<{
  success: boolean;
  orderId: string;
  paymentStatus: string;
  statusCode: number | null;
  tradeNo: string;
  message?: string;
  error?: string;
}> {
  const { orderId, statusCode, tradeNo } = params;
  const { data: order, error: orderError } = await supabase.from(
    "coffee_orders",
  )
    .select("id, payment_method, payment_status, payment_id")
    .eq("id", orderId)
    .maybeSingle();
  if (orderError) {
    return {
      success: false,
      orderId,
      paymentStatus: "pending",
      statusCode,
      tradeNo,
      error: orderError.message,
    };
  }
  if (!order) {
    return {
      success: false,
      orderId,
      paymentStatus: "pending",
      statusCode,
      tradeNo,
      error: "找不到訂單",
    };
  }
  if (String(order.payment_method || "") !== "jkopay") {
    return {
      success: false,
      orderId,
      paymentStatus: String(order.payment_status || "pending"),
      statusCode,
      tradeNo,
      error: "此訂單非使用街口支付",
    };
  }

  const mappedPaymentStatus = mapJkoStatusCodeToPaymentStatus(statusCode);
  const nextPaymentStatus = mappedPaymentStatus === "pending"
    ? String(order.payment_status || "pending") || "pending"
    : mappedPaymentStatus;

  const updates: Record<string, unknown> = {};
  if (nextPaymentStatus !== String(order.payment_status || "")) {
    updates.payment_status = nextPaymentStatus;
  }
  if (tradeNo && tradeNo !== String(order.payment_id || "")) {
    updates.payment_id = tradeNo;
  }

  if (Object.keys(updates).length > 0) {
    const { error: updateError } = await supabase.from("coffee_orders").update(
      updates,
    )
      .eq("id", orderId);
    if (updateError) {
      return {
        success: false,
        orderId,
        paymentStatus: nextPaymentStatus,
        statusCode,
        tradeNo,
        error: updateError.message,
      };
    }
  }

  return {
    success: true,
    orderId,
    paymentStatus: nextPaymentStatus,
    statusCode,
    tradeNo,
    message: "街口付款狀態已同步",
  };
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

function parseReceiptInfo(raw: unknown): Record<string, unknown> | null {
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

async function getEmailBranding(): Promise<EmailBranding> {
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

async function notifyLinePayPaymentStatusChanged(
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

export async function linePayConfirm(data: Record<string, unknown>) {
  const transactionId = String(data.transactionId || "");
  const orderId = String(data.orderId || "");

  if (!transactionId || !orderId) {
    return { success: false, error: "缺少必要參數" };
  }

  // 安全驗證：從資料庫讀取應付總額，不信任前端傳入的 amount
  const { data: order, error: oErr } = await supabase.from("coffee_orders")
    .select("id, total, payment_id, payment_status, payment_method")
    .eq("id", orderId)
    .maybeSingle();

  if (oErr || !order) return { success: false, error: "找不到訂單資料" };
  if (order.payment_status === "paid") {
    return { success: true, message: "此訂單已完成付款", orderId };
  }
  if (order.payment_method !== "linepay") {
    return { success: false, error: "此訂單非使用 LINE Pay 付款" };
  }

  // 驗證 TransactionId 是否與 Request 階段存入的一致
  if (String(order.payment_id) !== transactionId) {
    return { success: false, error: "交易 ID 不匹配，存疑請求" };
  }

  try {
    // deno-lint-ignore no-explicit-any
    const confirmRes: any = await requestLinePayAPI(
      "POST",
      `/v3/payments/${transactionId}/confirm`,
      {
        amount: order.total,
        currency: "TWD",
      },
    );

    if (confirmRes.returnCode === "0000") {
      const { error: updateError } = await supabase.from("coffee_orders")
        .update({ payment_status: "paid" })
        .eq("id", orderId);
      if (updateError) {
        return { success: false, error: updateError.message, orderId };
      }
      await notifyLinePayPaymentStatusChanged(orderId, "paid");
      return { success: true, message: "付款已確認", orderId };
    } else {
      // 確認失敗時更新狀態為 failed 方便查案
      await supabase.from("coffee_orders").update({ payment_status: "failed" })
        .eq("id", orderId);
      return {
        success: false,
        error: `付款確認失敗: ${
          confirmRes.returnMessage || confirmRes.returnCode
        }`,
        orderId,
      };
    }
  } catch (e) {
    return {
      success: false,
      error: "LINE Pay 確認 API 調用失敗: " + String(e),
      orderId,
    };
  }
}

export async function linePayCancel(
  data: Record<string, unknown>,
  req: Request,
) {
  const orderId = String(data.orderId || "");
  if (!orderId) return { success: false, error: "缺少訂單編號" };
  const auth = await extractAuth(req);
  const signatureVerified = await hasValidLinePayCallbackSignature(
    orderId,
    data,
  );
  if (!auth && !signatureVerified) {
    return { success: false, error: "請先登入" };
  }

  const { data: order, error: orderErr } = await supabase.from("coffee_orders")
    .select(
      "payment_status, line_user_id, payment_method",
    )
    .eq("id", orderId)
    .maybeSingle();
  if (orderErr) return { success: false, error: orderErr.message };
  if (order && String(order.payment_method || "") !== "linepay") {
    return { success: false, error: "此訂單非使用 LINE Pay 付款" };
  }

  let statusChanged = false;
  if (order && order.payment_status === "pending") {
    const canCancelByAuth = Boolean(
      auth && (order.line_user_id === auth.userId || auth.isAdmin),
    );
    if (!signatureVerified && !canCancelByAuth) {
      return { success: false, error: "無權限取消此訂單" };
    }
    const { error: updateError } = await supabase.from("coffee_orders").update({
      payment_status: "cancelled",
    })
      .eq("id", orderId);
    if (updateError) return { success: false, error: updateError.message };
    statusChanged = true;
  }

  if (statusChanged) {
    await notifyLinePayPaymentStatusChanged(orderId, "cancelled");
  }
  return { success: true, message: "付款已取消", orderId };
}

export async function linePayRefund(
  data: Record<string, unknown>,
  req: Request,
) {
  await requireAdmin(req);
  const orderId = String(data.orderId || "");
  const refundAmount = data.refundAmount
    ? parseInt(String(data.refundAmount))
    : 0;
  if (!orderId) return { success: false, error: "缺少訂單編號" };

  const { data: order, error: oErr } = await supabase.from("coffee_orders")
    .select("payment_id, total, payment_status, payment_method").eq(
      "id",
      orderId,
    ).maybeSingle();
  if (oErr || !order) return { success: false, error: "找不到訂單" };
  if (order.payment_method !== "linepay") {
    return { success: false, error: "此訂單非 LINE Pay 付款，無法線上退款" };
  }
  if (order.payment_status !== "paid") {
    return { success: false, error: "此訂單尚未付款，無法退款" };
  }

  const transactionId = String(order.payment_id);
  if (!transactionId) return { success: false, error: "找不到交易 ID" };

  try {
    const refundBody = refundAmount > 0 ? { refundAmount } : null;
    // deno-lint-ignore no-explicit-any
    const refundRes: any = await requestLinePayAPI(
      "POST",
      `/v3/payments/${transactionId}/refund`,
      refundBody,
    );

    if (refundRes.returnCode === "0000") {
      await supabase.from("coffee_orders").update({
        payment_status: "refunded",
      }).eq("id", orderId);
      return {
        success: true,
        message: "退款成功",
        orderId,
        refundTransactionId: refundRes.info?.refundTransactionId,
      };
    } else {
      return {
        success: false,
        error: `退款失敗: ${refundRes.returnMessage || refundRes.returnCode}`,
      };
    }
  } catch (e) {
    return { success: false, error: "退款失敗: " + String(e) };
  }
}

export async function jkoPayResult(
  data: Record<string, unknown>,
  req: Request,
) {
  const transaction = getJkoCallbackTransaction(data);
  const callbackOrderId = String(data.orderId || "").trim();
  const payloadOrderId = getJkoOrderIdFromPayload(data, transaction);
  const orderId = payloadOrderId || callbackOrderId;

  if (!orderId) {
    return { valid: false, success: false, error: "缺少平台訂單編號" };
  }
  if (callbackOrderId && payloadOrderId && callbackOrderId !== payloadOrderId) {
    return { valid: false, success: false, error: "訂單編號驗證失敗" };
  }

  const auth = await extractAuth(req);
  const signatureVerified = await hasValidJkoPayCallbackSignature(
    orderId,
    data,
  );
  if (!signatureVerified && !auth?.isAdmin) {
    return { valid: false, success: false, error: "回呼簽章驗證失敗" };
  }

  const statusCode = getJkoStatusCodeFromPayload(data, transaction);
  const tradeNo = getJkoTradeNoFromPayload(data, transaction);

  if (statusCode === null) {
    return {
      valid: true,
      success: true,
      orderId,
      message: "已收到街口確認通知",
    };
  }

  const syncResult = await syncJkoPayOrderStatus({
    orderId,
    statusCode,
    tradeNo,
  });
  return {
    valid: syncResult.success,
    ...syncResult,
  };
}

export async function jkoPayInquiry(
  data: Record<string, unknown>,
  req: Request,
) {
  const auth = await requireAuth(req);
  const orderId = String(data.orderId || data.platformOrderId || "").trim();
  if (!orderId) return { success: false, error: "缺少訂單編號" };

  const { data: order, error: orderError } = await supabase.from(
    "coffee_orders",
  )
    .select("id, line_user_id, payment_method")
    .eq("id", orderId)
    .maybeSingle();
  if (orderError) return { success: false, error: orderError.message };
  if (!order) return { success: false, error: "找不到訂單" };
  if (String(order.payment_method || "") !== "jkopay") {
    return { success: false, error: "此訂單非使用街口支付" };
  }
  if (!auth.isAdmin && String(order.line_user_id || "") !== auth.userId) {
    return { success: false, error: "無權限查詢此訂單" };
  }

  try {
    const inquiryResponse = await requestJkoPayInquiry([orderId]);
    const resultCode = String(inquiryResponse.result || "").trim();
    if (resultCode !== "000") {
      return {
        success: false,
        error: `街口查詢失敗: ${
          String(inquiryResponse.message || "").trim() || resultCode
        }`,
      };
    }

    const resultObject = inquiryResponse.result_object &&
        typeof inquiryResponse.result_object === "object" &&
        !Array.isArray(inquiryResponse.result_object)
      ? inquiryResponse.result_object as Record<string, unknown>
      : {};
    const transactions = Array.isArray(resultObject.transactions)
      ? resultObject.transactions as Record<string, unknown>[]
      : [];
    const transaction = transactions.find((item) =>
      String(item?.platform_order_id || "").trim() === orderId
    ) || transactions[0];

    if (!transaction) {
      return {
        success: true,
        orderId,
        paymentStatus: "pending",
        message: "尚未取得街口交易資料",
        inquiry: inquiryResponse,
      };
    }

    const statusCode = parseJkoStatusCode(transaction.status);
    const tradeNo = String(transaction.tradeNo || transaction.trade_no || "")
      .trim();
    const syncResult = await syncJkoPayOrderStatus({
      orderId,
      statusCode,
      tradeNo,
    });

    return {
      success: syncResult.success,
      orderId,
      paymentStatus: syncResult.paymentStatus,
      statusCode: syncResult.statusCode,
      tradeNo: syncResult.tradeNo,
      inquiry: inquiryResponse,
      error: syncResult.error,
    };
  } catch (error) {
    return { success: false, error: `街口查詢失敗: ${String(error)}` };
  }
}

function generateRefundOrderId(orderId: string): string {
  const base = String(orderId || "").replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();
  const randomSuffix = crypto.randomUUID().replace(/-/g, "").slice(0, 12)
    .toUpperCase();
  return `R${base}${randomSuffix}`.slice(0, 60);
}

export async function jkoPayRefund(
  data: Record<string, unknown>,
  req: Request,
) {
  await requireAdmin(req);
  const orderId = String(data.orderId || "").trim();
  if (!orderId) return { success: false, error: "缺少訂單編號" };

  const { data: order, error: orderError } = await supabase.from(
    "coffee_orders",
  )
    .select("id, total, payment_method, payment_status")
    .eq("id", orderId)
    .maybeSingle();
  if (orderError) return { success: false, error: orderError.message };
  if (!order) return { success: false, error: "找不到訂單" };
  if (String(order.payment_method || "") !== "jkopay") {
    return { success: false, error: "此訂單非街口支付，無法線上退款" };
  }
  if (String(order.payment_status || "") !== "paid") {
    return { success: false, error: "此訂單尚未付款或已退款，無法退款" };
  }

  const totalAmount = Math.round(Number(order.total) || 0);
  if (totalAmount <= 0) {
    return { success: false, error: "訂單金額異常，無法退款" };
  }

  const requestedAmount = Number(data.refundAmount);
  const hasRefundAmount = Number.isFinite(requestedAmount) &&
    requestedAmount > 0;
  const refundAmount = hasRefundAmount
    ? Math.round(requestedAmount)
    : totalAmount;
  if (refundAmount <= 0 || refundAmount > totalAmount) {
    return { success: false, error: "退款金額不正確" };
  }

  const refundOrderId = String(data.refundOrderId || "").trim() ||
    generateRefundOrderId(orderId);

  try {
    const refundResponse = await requestJkoPayRefund({
      platformOrderId: orderId,
      refundOrderId,
      refundAmount,
    });
    const resultCode = String(refundResponse.result || "").trim();
    if (resultCode !== "000") {
      return {
        success: false,
        error: `街口退款失敗: ${
          String(refundResponse.message || "").trim() || resultCode
        }`,
        refundResponse,
      };
    }

    const { error: updateError } = await supabase.from("coffee_orders").update({
      payment_status: "refunded",
    }).eq("id", orderId);
    if (updateError) {
      return { success: false, error: updateError.message };
    }

    const resultObject = refundResponse.result_object &&
        typeof refundResponse.result_object === "object" &&
        !Array.isArray(refundResponse.result_object)
      ? refundResponse.result_object as Record<string, unknown>
      : {};
    return {
      success: true,
      message: "街口退款成功",
      orderId,
      refundOrderId,
      refundTradeNo: String(resultObject.refund_tradeNo || "").trim(),
      refundResponse,
    };
  } catch (error) {
    return { success: false, error: `街口退款失敗: ${String(error)}` };
  }
}

export async function updateTransferInfo(
  data: Record<string, unknown>,
  req: Request,
) {
  const auth = await requireAuth(req);
  const orderId = String(data.orderId || "");
  const last5 = String(data.last5 || "").trim();
  if (!orderId) return { success: false, error: "缺少訂單編號" };
  if (!last5 || last5.length !== 5 || !/^\d{5}$/.test(last5)) {
    return { success: false, error: "請輸入正確的5位數字帳號末碼" };
  }

  const { data: order } = await supabase.from("coffee_orders").select(
    "line_user_id, payment_method",
  ).eq("id", orderId).maybeSingle();
  if (!order) return { success: false, error: "找不到訂單" };
  if (order.line_user_id !== auth.userId) {
    return { success: false, error: "無權操作此訂單" };
  }
  if (order.payment_method !== "transfer") {
    return { success: false, error: "此訂單非線上轉帳付款" };
  }

  const { error } = await supabase.from("coffee_orders").update({
    transfer_account_last5: last5,
  }).eq("id", orderId);
  if (error) return { success: false, error: error.message };
  return { success: true, message: "匯款資訊已更新" };
}
