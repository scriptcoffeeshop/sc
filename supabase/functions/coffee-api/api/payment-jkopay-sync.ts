import {
  EXPIRED_PAYMENT_FAILURE_REASON,
  isPaymentExpired,
  normalizePaymentStatus,
} from "./payment-expiry.ts";
import { mapJkoStatusCodeToPaymentStatus } from "../utils/jkopay.ts";
import type { JsonRecord } from "../utils/json.ts";
import { supabase } from "../utils/supabase.ts";

export interface JkoPayOrderSyncParams {
  orderId: string;
  statusCode: number | null;
  tradeNo: string;
  preferProcessingForPending?: boolean;
}

export interface JkoPayOrderSyncResult {
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
}

function buildJkoSyncFailure(
  params: JkoPayOrderSyncParams,
  error: string,
  order: JsonRecord | null = null,
): JkoPayOrderSyncResult {
  return {
    success: false,
    orderId: params.orderId,
    paymentStatus: order
      ? String(order.payment_status || "pending")
      : "pending",
    previousPaymentStatus: order
      ? normalizePaymentStatus(order.payment_status)
      : "pending",
    statusChanged: false,
    statusCode: params.statusCode,
    tradeNo: params.tradeNo,
    paymentExpiresAt: String(order?.payment_expires_at || ""),
    paymentConfirmedAt: String(order?.payment_confirmed_at || ""),
    paymentLastCheckedAt: String(order?.payment_last_checked_at || ""),
    error,
  };
}

export async function syncJkoPayOrderStatus(
  params: JkoPayOrderSyncParams,
): Promise<JkoPayOrderSyncResult> {
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
  if (orderError) return buildJkoSyncFailure(params, orderError.message);
  if (!order) return buildJkoSyncFailure(params, "找不到訂單");
  if (String(order.payment_method || "") !== "jkopay") {
    return buildJkoSyncFailure(params, "此訂單非使用街口支付", order);
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

  const updates: JsonRecord = {};
  if (statusChanged) updates.payment_status = nextPaymentStatus;
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
    updates.status = "failed";
    updates.cancel_reason = EXPIRED_PAYMENT_FAILURE_REASON;
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
