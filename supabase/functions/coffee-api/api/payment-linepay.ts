import {
  buildExpiredOnlinePaymentUpdates,
  expireOnlinePaymentOrderIfNeeded,
  hasValidLinePayCallbackSignature,
  notifyAdminPaymentFailure,
  notifyLinePayPaymentStatusChanged,
} from "./payment-shared.ts";
import { extractAuth, requireAdmin } from "../utils/auth.ts";
import { requestLinePayAPI } from "../utils/linepay.ts";
import type { JsonRecord } from "../utils/json.ts";
import { supabase } from "../utils/supabase.ts";

interface LinePayApiResponse {
  returnCode?: string;
  returnMessage?: string;
  info?: JsonRecord;
}

interface LinePayRefundResponse extends LinePayApiResponse {
  info?: {
    refundTransactionId?: string;
  };
}

export async function linePayConfirm(data: JsonRecord) {
  const transactionId = String(data.transactionId || "");
  const orderId = String(data.orderId || "");

  if (!transactionId || !orderId) {
    return { success: false, error: "缺少必要參數" };
  }

  const { data: order, error: oErr } = await supabase.from("coffee_orders")
    .select(
      "id, total, payment_id, payment_status, payment_method, payment_expires_at, status, cancel_reason, created_at",
    )
    .eq("id", orderId)
    .maybeSingle();

  if (oErr || !order) return { success: false, error: "找不到訂單資料" };
  const expiredOrderResult = await expireOnlinePaymentOrderIfNeeded(order);
  const activeOrder = expiredOrderResult.order || order;
  if (String(activeOrder.payment_status || "") === "expired") {
    return {
      success: false,
      error: "付款期限已過，訂單已自動設為失敗",
      orderId,
    };
  }
  if (activeOrder.payment_status === "paid") {
    return { success: true, message: "此訂單已完成付款", orderId };
  }
  if (activeOrder.payment_method !== "linepay") {
    return { success: false, error: "此訂單非使用 LINE Pay 付款" };
  }

  if (String(activeOrder.payment_id) !== transactionId) {
    return { success: false, error: "交易 ID 不匹配，存疑請求" };
  }

  try {
    const confirmRes = await requestLinePayAPI<LinePayApiResponse>(
      "POST",
      `/v3/payments/${transactionId}/confirm`,
      {
        amount: activeOrder.total,
        currency: "TWD",
      },
    );

    if (confirmRes.returnCode === "0000") {
      const nowIso = new Date().toISOString();
      const { error: updateError } = await supabase.from("coffee_orders")
        .update({
          payment_status: "paid",
          payment_confirmed_at: nowIso,
          payment_last_checked_at: nowIso,
        })
        .eq("id", orderId);
      if (updateError) {
        return { success: false, error: updateError.message, orderId };
      }
      await notifyLinePayPaymentStatusChanged(orderId, "paid");
      return { success: true, message: "付款已確認", orderId };
    }

    if (String(confirmRes.returnCode || "").trim() === "1180") {
      const updates =
        buildExpiredOnlinePaymentUpdates(activeOrder, new Date(), {
          force: true,
        }) || {
          payment_status: "expired",
          payment_last_checked_at: new Date().toISOString(),
        };
      await supabase.from("coffee_orders").update(updates).eq("id", orderId);
      await notifyAdminPaymentFailure({
        orderId,
        paymentMethod: "linepay",
        phase: "confirm",
        reason: "LINE Pay 付款期限已過",
        providerStatusCode: "1180",
      });
      return {
        success: false,
        error: "付款期限已過，訂單已自動設為失敗",
        orderId,
      };
    }

    const failureReason = `付款確認失敗: ${
      confirmRes.returnMessage || confirmRes.returnCode
    }`;
    await supabase.from("coffee_orders").update({
      payment_status: "failed",
      payment_last_checked_at: new Date().toISOString(),
    })
      .eq("id", orderId);
    await notifyAdminPaymentFailure({
      orderId,
      paymentMethod: "linepay",
      phase: "confirm",
      reason: failureReason,
      providerStatusCode: String(confirmRes.returnCode || "").trim(),
    });
    return {
      success: false,
      error: failureReason,
      orderId,
    };
  } catch (e) {
    return {
      success: false,
      error: "LINE Pay 確認 API 調用失敗: " + String(e),
      orderId,
    };
  }
}

export async function linePayCancel(
  data: JsonRecord,
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
    const hasSignature = Boolean(
      String(data.sig || data.signature || "").trim(),
    );
    return {
      success: false,
      error: hasSignature ? "回呼簽章驗證失敗" : "請先登入",
    };
  }

  const { data: order, error: orderErr } = await supabase.from("coffee_orders")
    .select(
      "payment_status, line_user_id, payment_method, payment_expires_at, status, cancel_reason, id, created_at",
    )
    .eq("id", orderId)
    .maybeSingle();
  if (orderErr) return { success: false, error: orderErr.message };
  if (order && String(order.payment_method || "") !== "linepay") {
    return { success: false, error: "此訂單非使用 LINE Pay 付款" };
  }
  const expiredOrderResult = await expireOnlinePaymentOrderIfNeeded(order);
  const activeOrder = expiredOrderResult.order || order;
  if (activeOrder && String(activeOrder.payment_status || "") === "expired") {
    return {
      success: true,
      message: "付款已逾期，訂單已自動設為失敗",
      orderId,
    };
  }

  let statusChanged = false;
  if (activeOrder && activeOrder.payment_status === "pending") {
    const canCancelByAuth = Boolean(
      auth && (activeOrder.line_user_id === auth.userId || auth.isAdmin),
    );
    if (!signatureVerified && !canCancelByAuth) {
      return { success: false, error: "無權限取消此訂單" };
    }
    const { error: updateError } = await supabase.from("coffee_orders").update({
      payment_status: "cancelled",
      payment_last_checked_at: new Date().toISOString(),
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
  data: JsonRecord,
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
    const refundRes = await requestLinePayAPI<LinePayRefundResponse>(
      "POST",
      `/v3/payments/${transactionId}/refund`,
      refundBody,
    );

    if (refundRes.returnCode === "0000") {
      await supabase.from("coffee_orders").update({
        payment_status: "refunded",
        payment_last_checked_at: new Date().toISOString(),
      }).eq("id", orderId);
      return {
        success: true,
        message: "退款成功",
        orderId,
        refundTransactionId: refundRes.info?.refundTransactionId,
      };
    }

    return {
      success: false,
      error: `退款失敗: ${refundRes.returnMessage || refundRes.returnCode}`,
    };
  } catch (e) {
    return { success: false, error: "退款失敗: " + String(e) };
  }
}
