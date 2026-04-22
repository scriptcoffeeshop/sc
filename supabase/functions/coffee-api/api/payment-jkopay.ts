import {
  EXPIRED_PAYMENT_CANCEL_REASON,
  getJkoCallbackTransaction,
  getJkoOrderIdFromPayload,
  getJkoStatusCodeFromPayload,
  getJkoTradeNoFromPayload,
  hasValidJkoPayCallbackSignature,
  isPaymentExpired,
  isTerminalJkoPaymentStatus,
  normalizePaymentStatus,
  notifyJkoPayPaymentStatusChanged,
} from "./payment-shared.ts";
import { extractAuth, requireAdmin, requireAuth } from "../utils/auth.ts";
import {
  mapJkoStatusCodeToPaymentStatus,
  parseJkoStatusCode,
  requestJkoPayInquiry,
  requestJkoPayRefund,
} from "../utils/jkopay.ts";
import { supabase } from "../utils/supabase.ts";

function normalizePaymentRedirectUrl(value: unknown): string {
  const raw = String(value || "").trim();
  if (!raw || !/^https?:\/\//i.test(raw)) return "";
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    return parsed.toString();
  } catch {
    return "";
  }
}

function resolveJkoPaymentRedirectUrl(
  transaction: Record<string, unknown> | undefined,
  storedValue: unknown,
): string {
  const candidates = [
    transaction?.payment_url,
    transaction?.paymentUrl,
    storedValue,
  ];

  for (const candidate of candidates) {
    const normalized = normalizePaymentRedirectUrl(candidate);
    if (normalized) return normalized;
  }

  return "";
}

async function syncJkoPayOrderStatus(params: {
  orderId: string;
  statusCode: number | null;
  tradeNo: string;
  preferProcessingForPending?: boolean;
}): Promise<{
  success: boolean;
  orderId: string;
  paymentStatus: string;
  previousPaymentStatus: string;
  statusChanged: boolean;
  statusCode: number | null;
  tradeNo: string;
  paymentExpiresAt?: string;
  paymentConfirmedAt?: string;
  paymentLastCheckedAt?: string;
  message?: string;
  error?: string;
}> {
  const {
    orderId,
    statusCode,
    tradeNo,
    preferProcessingForPending = false,
  } = params;
  const now = new Date();
  const nowIso = now.toISOString();

  const { data: order, error: orderError } = await supabase.from(
    "coffee_orders",
  )
    .select(
      "id, payment_method, payment_status, payment_id, payment_expires_at, payment_confirmed_at, payment_last_checked_at, payment_provider_status_code, status, cancel_reason",
    )
    .eq("id", orderId)
    .maybeSingle();
  if (orderError) {
    return {
      success: false,
      orderId,
      paymentStatus: "pending",
      previousPaymentStatus: "pending",
      statusChanged: false,
      statusCode,
      tradeNo,
      paymentExpiresAt: "",
      paymentConfirmedAt: "",
      paymentLastCheckedAt: "",
      error: orderError.message,
    };
  }
  if (!order) {
    return {
      success: false,
      orderId,
      paymentStatus: "pending",
      previousPaymentStatus: "pending",
      statusChanged: false,
      statusCode,
      tradeNo,
      paymentExpiresAt: "",
      paymentConfirmedAt: "",
      paymentLastCheckedAt: "",
      error: "找不到訂單",
    };
  }
  if (String(order.payment_method || "") !== "jkopay") {
    return {
      success: false,
      orderId,
      paymentStatus: String(order.payment_status || "pending"),
      previousPaymentStatus: normalizePaymentStatus(order.payment_status),
      statusChanged: false,
      statusCode,
      tradeNo,
      paymentExpiresAt: String(order.payment_expires_at || ""),
      paymentConfirmedAt: String(order.payment_confirmed_at || ""),
      paymentLastCheckedAt: String(order.payment_last_checked_at || ""),
      error: "此訂單非使用街口支付",
    };
  }

  const currentPaymentStatus = normalizePaymentStatus(order.payment_status);
  const terminalStatus = new Set([
    "paid",
    "failed",
    "cancelled",
    "expired",
    "refunded",
  ]);
  const mappedPaymentStatus = mapJkoStatusCodeToPaymentStatus(statusCode);
  const paymentExpired = isPaymentExpired(order.payment_expires_at, now);

  let nextPaymentStatus = currentPaymentStatus;
  if (terminalStatus.has(currentPaymentStatus)) {
    nextPaymentStatus = currentPaymentStatus;
  } else if (mappedPaymentStatus === "paid") {
    nextPaymentStatus = currentPaymentStatus === "refunded"
      ? "refunded"
      : "paid";
  } else if (mappedPaymentStatus === "failed") {
    nextPaymentStatus = (currentPaymentStatus === "paid" ||
        currentPaymentStatus === "refunded")
      ? currentPaymentStatus
      : "failed";
  } else if (paymentExpired) {
    nextPaymentStatus = "expired";
  } else if (
    preferProcessingForPending || mappedPaymentStatus === "processing"
  ) {
    nextPaymentStatus = "processing";
  } else if (currentPaymentStatus === "processing") {
    nextPaymentStatus = "processing";
  } else {
    nextPaymentStatus = "pending";
  }
  const statusChanged = nextPaymentStatus !==
    String(order.payment_status || "");

  const updates: Record<string, unknown> = {};
  if (statusChanged) {
    updates.payment_status = nextPaymentStatus;
  }
  if (tradeNo && tradeNo !== String(order.payment_id || "")) {
    updates.payment_id = tradeNo;
  }
  if (statusCode !== null) {
    const nextProviderStatusCode = String(statusCode);
    if (
      nextProviderStatusCode !==
        String(order.payment_provider_status_code || "")
    ) {
      updates.payment_provider_status_code = nextProviderStatusCode;
    }
  }
  updates.payment_last_checked_at = nowIso;
  if (
    nextPaymentStatus === "paid" && !String(order.payment_confirmed_at || "")
      .trim()
  ) {
    updates.payment_confirmed_at = nowIso;
  }
  if (
    nextPaymentStatus === "expired" &&
    String(order.status || "pending").trim() === "pending"
  ) {
    updates.status = "cancelled";
    updates.cancel_reason = EXPIRED_PAYMENT_CANCEL_REASON;
  }

  if (Object.keys(updates).length > 0) {
    const { error: updateError } = await supabase.from("coffee_orders").update(
      updates,
    ).eq("id", orderId);
    if (updateError) {
      return {
        success: false,
        orderId,
        paymentStatus: nextPaymentStatus,
        previousPaymentStatus: currentPaymentStatus,
        statusChanged: false,
        statusCode,
        tradeNo,
        paymentExpiresAt: String(order.payment_expires_at || ""),
        paymentConfirmedAt: String(order.payment_confirmed_at || ""),
        paymentLastCheckedAt: nowIso,
        error: updateError.message,
      };
    }
  }

  const paymentConfirmedAt = nextPaymentStatus === "paid" &&
      !String(order.payment_confirmed_at || "").trim()
    ? nowIso
    : String(order.payment_confirmed_at || "");

  return {
    success: true,
    orderId,
    paymentStatus: nextPaymentStatus,
    previousPaymentStatus: currentPaymentStatus,
    statusChanged,
    statusCode,
    tradeNo,
    paymentExpiresAt: String(order.payment_expires_at || ""),
    paymentConfirmedAt,
    paymentLastCheckedAt: nowIso,
    message: "街口付款狀態已同步",
  };
}

function generateRefundOrderId(orderId: string): string {
  const base = String(orderId || "").replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();
  const randomSuffix = crypto.randomUUID().replace(/-/g, "").slice(0, 12)
    .toUpperCase();
  return `R${base}${randomSuffix}`.slice(0, 60);
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
    const syncResult = await syncJkoPayOrderStatus({
      orderId,
      statusCode: null,
      tradeNo,
      preferProcessingForPending: true,
    });
    if (syncResult.success) {
      if (syncResult.statusChanged) {
        await notifyJkoPayPaymentStatusChanged(
          orderId,
          syncResult.paymentStatus,
          {
            force: true,
          },
        );
      } else if (isTerminalJkoPaymentStatus(syncResult.paymentStatus)) {
        await notifyJkoPayPaymentStatusChanged(
          orderId,
          syncResult.paymentStatus,
        );
      }
    }
    return {
      valid: syncResult.success,
      ...syncResult,
      message: syncResult.success
        ? "已收到街口確認通知，等待付款結果同步"
        : syncResult.error || "街口付款狀態同步失敗",
    };
  }

  const syncResult = await syncJkoPayOrderStatus({
    orderId,
    statusCode,
    tradeNo,
  });
  if (syncResult.success) {
    if (syncResult.statusChanged) {
      await notifyJkoPayPaymentStatusChanged(
        orderId,
        syncResult.paymentStatus,
        {
          force: true,
        },
      );
    } else if (isTerminalJkoPaymentStatus(syncResult.paymentStatus)) {
      await notifyJkoPayPaymentStatusChanged(orderId, syncResult.paymentStatus);
    }
  }
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
    .select("id, line_user_id, payment_method, payment_redirect_url")
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
    const paymentUrl = resolveJkoPaymentRedirectUrl(
      transaction,
      order.payment_redirect_url,
    );

    if (!transaction) {
      const syncResult = await syncJkoPayOrderStatus({
        orderId,
        statusCode: null,
        tradeNo: "",
        preferProcessingForPending: true,
      });
      if (syncResult.success) {
        if (syncResult.statusChanged) {
          await notifyJkoPayPaymentStatusChanged(
            orderId,
            syncResult.paymentStatus,
            { force: true },
          );
        } else if (isTerminalJkoPaymentStatus(syncResult.paymentStatus)) {
          await notifyJkoPayPaymentStatusChanged(
            orderId,
            syncResult.paymentStatus,
          );
        }
      }
      return {
        success: syncResult.success,
        orderId,
        paymentStatus: syncResult.paymentStatus,
        paymentExpiresAt: syncResult.paymentExpiresAt,
        paymentConfirmedAt: syncResult.paymentConfirmedAt,
        paymentLastCheckedAt: syncResult.paymentLastCheckedAt,
        paymentUrl,
        message: "尚未取得街口交易資料",
        inquiry: inquiryResponse,
        error: syncResult.error,
      };
    }

    const statusCode = parseJkoStatusCode(transaction.status);
    const tradeNo = String(transaction.tradeNo || transaction.trade_no || "")
      .trim();
    const syncResult = await syncJkoPayOrderStatus({
      orderId,
      statusCode,
      tradeNo,
      preferProcessingForPending: true,
    });
    if (syncResult.success) {
      if (
        paymentUrl &&
        paymentUrl !== String(order.payment_redirect_url || "").trim()
      ) {
        const { error: persistRedirectError } = await supabase.from(
          "coffee_orders",
        ).update({
          payment_redirect_url: paymentUrl,
        }).eq("id", orderId);
        if (persistRedirectError) {
          console.warn(
            `[jkopay] failed to persist payment redirect url: ${orderId} (${persistRedirectError.message})`,
          );
        }
      }
      if (syncResult.statusChanged) {
        await notifyJkoPayPaymentStatusChanged(
          orderId,
          syncResult.paymentStatus,
          {
            force: true,
          },
        );
      } else if (isTerminalJkoPaymentStatus(syncResult.paymentStatus)) {
        await notifyJkoPayPaymentStatusChanged(
          orderId,
          syncResult.paymentStatus,
        );
      }
    }

    return {
      success: syncResult.success,
      orderId,
      paymentStatus: syncResult.paymentStatus,
      statusCode: syncResult.statusCode,
      tradeNo: syncResult.tradeNo,
      paymentExpiresAt: syncResult.paymentExpiresAt,
      paymentConfirmedAt: syncResult.paymentConfirmedAt,
      paymentLastCheckedAt: syncResult.paymentLastCheckedAt,
      paymentUrl,
      inquiry: inquiryResponse,
      error: syncResult.error,
    };
  } catch (error) {
    return { success: false, error: `街口查詢失敗: ${String(error)}` };
  }
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
      payment_last_checked_at: new Date().toISOString(),
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
