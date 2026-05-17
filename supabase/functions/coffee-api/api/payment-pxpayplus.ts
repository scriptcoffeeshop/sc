import {
  normalizePaymentStatus,
  notifyJkoPayPaymentStatusChanged as notifyOnlinePayPaymentStatusChanged,
} from "./payment-shared.ts";
import { requireAdmin, requireAuth } from "../utils/auth.ts";
import { asJsonRecord, parseJsonArray } from "../utils/json.ts";
import type { JsonRecord } from "../utils/json.ts";
import { createLogger } from "../utils/logger.ts";
import {
  buildPxPayPlusOrderStatusSignPayload,
  buildPxPayPlusPaymentMetadataUpdates,
  buildPxPayPlusPaymentNotifySignPayload,
  hasValidPxPayPlusSignValue,
  type PxPayPlusTradeSnapshot,
  requestPxPayPlusCheckStatus,
  requestPxPayPlusRefund,
} from "../utils/pxpayplus.ts";
import { supabase } from "../utils/supabase.ts";

const logger = createLogger("payment-pxpayplus");

type PxPayPlusPayStatus = 0 | 1 | 2 | 3;

function getString(record: JsonRecord, ...keys: string[]): string {
  for (const key of keys) {
    const value = String(record[key] ?? "").trim();
    if (value) return value;
  }
  return "";
}

function getStringOrNumber(
  record: JsonRecord,
  ...keys: string[]
): string | number | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" || typeof value === "number") return value;
  }
  return undefined;
}

function getPxSignValue(req: Request): string {
  return String(
    req.headers.get("PX-SignValue") || req.headers.get("px-signvalue") || "",
  ).trim();
}

function getOrderStatusPathParams(req: Request): {
  transactionId: string;
  reqTime: string;
} {
  try {
    const parts = new URL(req.url).pathname.split("/").filter(Boolean);
    const markerIndex = parts.map((part) => part.toLowerCase()).lastIndexOf(
      "status",
    );
    if (markerIndex >= 0 && parts[markerIndex + 1] && parts[markerIndex + 2]) {
      return {
        transactionId: decodeURIComponent(parts[markerIndex + 1]),
        reqTime: decodeURIComponent(parts[markerIndex + 2]),
      };
    }
  } catch (_error) {
    // Ignore malformed callback URLs and let required parameter validation fail.
  }
  return { transactionId: "", reqTime: "" };
}

function jsonResponse(
  status: number,
  payload: JsonRecord,
): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json;charset=utf-8" },
  });
}

function mapPaymentStatusToPxPayStatus(
  paymentStatus: unknown,
  orderStatus: unknown,
): PxPayPlusPayStatus {
  const normalizedPaymentStatus = normalizePaymentStatus(paymentStatus);
  const normalizedOrderStatus = String(orderStatus || "").trim();
  if (["paid", "refunded"].includes(normalizedPaymentStatus)) return 1;
  if (
    ["cancelled", "expired", "failed"].includes(normalizedPaymentStatus) ||
    ["cancelled", "failed"].includes(normalizedOrderStatus)
  ) {
    return 2;
  }
  return 0;
}

async function findPxPayPlusOrderByTransactionId(
  transactionId: string,
): Promise<{ order: JsonRecord | null; error: string }> {
  const selectColumns =
    "id, total, status, line_user_id, payment_method, payment_status, payment_id, payment_expires_at, payment_confirmed_at, payment_last_checked_at, payment_provider_transaction_id, payment_provider_trade_no, payment_provider_status_code";
  const normalizedTransactionId = String(transactionId || "").trim();
  if (!normalizedTransactionId) return { order: null, error: "" };

  const { data: orderByProviderId, error: providerError } = await supabase.from(
    "coffee_orders",
  )
    .select(selectColumns)
    .eq("payment_provider_transaction_id", normalizedTransactionId)
    .maybeSingle();
  if (providerError) {
    return { order: null, error: providerError.message };
  }
  if (orderByProviderId) {
    return { order: asJsonRecord(orderByProviderId), error: "" };
  }

  const { data: orderByPaymentId, error: paymentIdError } = await supabase.from(
    "coffee_orders",
  )
    .select(selectColumns)
    .eq("payment_id", normalizedTransactionId)
    .maybeSingle();
  if (paymentIdError) {
    return { order: null, error: paymentIdError.message };
  }
  return {
    order: orderByPaymentId ? asJsonRecord(orderByPaymentId) : null,
    error: "",
  };
}

async function findPxPayPlusOrderByMerchantTradeNo(
  merTradeNo: string,
): Promise<{ order: JsonRecord | null; error: string }> {
  const normalizedMerTradeNo = String(merTradeNo || "").trim();
  if (!normalizedMerTradeNo) return { order: null, error: "" };

  const { data: order, error } = await supabase.from("coffee_orders")
    .select(
      "id, total, status, line_user_id, payment_method, payment_status, payment_id, payment_expires_at, payment_confirmed_at, payment_last_checked_at, payment_provider_transaction_id, payment_provider_trade_no, payment_provider_status_code",
    )
    .eq("id", normalizedMerTradeNo)
    .maybeSingle();
  if (error) return { order: null, error: error.message };
  return { order: order ? asJsonRecord(order) : null, error: "" };
}

function buildSnapshotFromResponse(
  response: JsonRecord,
): PxPayPlusTradeSnapshot {
  const tradeInfo = response.trade_info &&
      typeof response.trade_info === "object" &&
      !Array.isArray(response.trade_info)
    ? asJsonRecord(response.trade_info)
    : response;
  return {
    statusCode: getString(response, "status_code", "statusCode"),
    payStatus: getStringOrNumber(tradeInfo, "pay_status", "payStatus"),
    merTradeNo: getString(tradeInfo, "mer_trade_no", "merTradeNo"),
    transactionId: getString(tradeInfo, "transaction_id", "transactionId"),
    pxTradeNo: getString(tradeInfo, "px_trade_no", "pxTradeNo"),
    tradeTime: getString(tradeInfo, "trade_time", "tradeTime"),
    amount: getStringOrNumber(tradeInfo, "amount"),
    tradeAmount: getStringOrNumber(tradeInfo, "trade_amount", "tradeAmount"),
    discountAmount: getStringOrNumber(
      tradeInfo,
      "discount_amount",
      "discountAmount",
    ),
    invoCarrier: getString(tradeInfo, "invo_carrier", "invoCarrier"),
    providerPayload: response,
  };
}

function buildSnapshotFromPaymentNotify(
  data: JsonRecord,
): PxPayPlusTradeSnapshot {
  return {
    statusCode: "0000",
    payStatus: 1,
    merTradeNo: getString(data, "mer_trade_no", "merTradeNo"),
    transactionId: getString(data, "transaction_id", "transactionId"),
    pxTradeNo: getString(data, "px_trade_no", "pxTradeNo"),
    tradeTime: getString(data, "trade_time", "tradeTime"),
    amount: getStringOrNumber(data, "amount"),
    tradeAmount: getStringOrNumber(data, "trade_amount", "tradeAmount"),
    discountAmount: getStringOrNumber(
      data,
      "discount_amount",
      "discountAmount",
    ),
    invoCarrier: getString(data, "invo_carrier", "invoCarrier"),
    providerPayload: data,
  };
}

function generatePxPayPlusRefundMerTradeNo(orderId: string): string {
  const base = String(orderId || "").replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 17);
  const randomSuffix = crypto.randomUUID().replace(/-/g, "").slice(0, 12)
    .toUpperCase();
  return `R${base}${randomSuffix}`.slice(0, 30);
}

function normalizeRefundRecords(raw: unknown): JsonRecord[] {
  return parseJsonArray<unknown>(raw).map((item) => asJsonRecord(item)).filter((
    item,
  ) => Object.keys(item).length > 0);
}

function sumRefundRecordAmounts(records: JsonRecord[]): number {
  return records.reduce((sum, record) => {
    const statusCode = String(record.statusCode || record.status_code || "")
      .trim();
    if (statusCode && statusCode !== "0000") return sum;
    const amount = Math.round(Number(record.amount) || 0);
    return amount > 0 ? sum + amount : sum;
  }, 0);
}

async function persistPxPayPlusSnapshot(
  order: JsonRecord,
  snapshot: PxPayPlusTradeSnapshot,
): Promise<{
  success: boolean;
  orderId: string;
  paymentStatus: string;
  previousPaymentStatus: string;
  statusChanged: boolean;
  paymentConfirmedAt: string;
  paymentLastCheckedAt: string;
  error?: string;
}> {
  const orderId = String(order.id || "").trim();
  const previousPaymentStatus = normalizePaymentStatus(order.payment_status);
  const updates = buildPxPayPlusPaymentMetadataUpdates(snapshot);
  const nextPaymentStatus = normalizePaymentStatus(
    updates.payment_status,
    previousPaymentStatus,
  );

  if (
    previousPaymentStatus === "paid" && nextPaymentStatus !== "paid"
  ) {
    updates.payment_status = "paid";
    delete updates.payment_confirmed_at;
  }

  if (
    nextPaymentStatus === "paid" &&
    String(order.payment_confirmed_at || "").trim()
  ) {
    delete updates.payment_confirmed_at;
  }

  if (previousPaymentStatus === "refunded") {
    updates.payment_status = "refunded";
    delete updates.payment_confirmed_at;
  }

  const statusChanged = String(updates.payment_status || "") !==
    previousPaymentStatus;
  const paymentConfirmedAt =
    String(updates.payment_confirmed_at || "").trim() ||
    String(order.payment_confirmed_at || "").trim();
  const paymentLastCheckedAt = String(updates.payment_last_checked_at || "")
    .trim() || String(order.payment_last_checked_at || "").trim();
  const { error } = await supabase.from("coffee_orders").update(updates).eq(
    "id",
    orderId,
  );
  if (error) {
    return {
      success: false,
      orderId,
      paymentStatus: previousPaymentStatus,
      previousPaymentStatus,
      statusChanged: false,
      paymentConfirmedAt: String(order.payment_confirmed_at || "").trim(),
      paymentLastCheckedAt: String(order.payment_last_checked_at || "").trim(),
      error: error.message,
    };
  }

  return {
    success: true,
    orderId,
    paymentStatus: String(updates.payment_status || nextPaymentStatus),
    previousPaymentStatus,
    statusChanged,
    paymentConfirmedAt,
    paymentLastCheckedAt,
  };
}

export async function pxPayPlusOrderStatus(
  data: JsonRecord,
  req: Request,
): Promise<JsonRecord | Response> {
  const pathParams = getOrderStatusPathParams(req);
  const transactionId = getString(data, "transaction_id", "transactionId") ||
    pathParams.transactionId;
  const reqTime = getString(data, "req_time", "reqTime") || pathParams.reqTime;
  if (!transactionId || !reqTime) {
    return jsonResponse(400, { success: false, error: "缺少全支付查詢參數" });
  }

  const signaturePayload = buildPxPayPlusOrderStatusSignPayload({
    transactionId,
    reqTime,
  });
  const signatureVerified = await hasValidPxPayPlusSignValue(
    signaturePayload,
    getPxSignValue(req),
  );
  if (!signatureVerified) {
    return jsonResponse(401, { success: false, error: "全支付簽章驗證失敗" });
  }

  const { order, error } = await findPxPayPlusOrderByTransactionId(
    transactionId,
  );
  if (error) return jsonResponse(500, { success: false, error });
  if (!order || String(order.payment_method || "") !== "pxpayplus") {
    return { mer_trade_no: "", transaction_id: transactionId, pay_status: 3 };
  }

  return {
    mer_trade_no: String(order.id || "").trim(),
    transaction_id: transactionId,
    pay_status: mapPaymentStatusToPxPayStatus(
      order.payment_status,
      order.status,
    ),
  };
}

export async function pxPayPlusPaymentNotify(
  data: JsonRecord,
  req: Request,
): Promise<Response> {
  const merTradeNo = getString(data, "mer_trade_no", "merTradeNo");
  const transactionId = getString(data, "transaction_id", "transactionId");
  const pxTradeNo = getString(data, "px_trade_no", "pxTradeNo");
  const reqTime = getString(data, "req_time", "reqTime");
  if (!merTradeNo || !transactionId || !pxTradeNo || !reqTime) {
    return jsonResponse(400, { success: false, error: "缺少全支付通知參數" });
  }

  const signaturePayload = buildPxPayPlusPaymentNotifySignPayload({
    merTradeNo,
    transactionId,
    pxTradeNo,
    reqTime,
  });
  const signatureVerified = await hasValidPxPayPlusSignValue(
    signaturePayload,
    getPxSignValue(req),
  );
  if (!signatureVerified) {
    return jsonResponse(401, { success: false, error: "全支付簽章驗證失敗" });
  }

  const { order, error } = await findPxPayPlusOrderByMerchantTradeNo(
    merTradeNo,
  );
  if (error) return jsonResponse(500, { success: false, error });
  if (!order) {
    return jsonResponse(404, { success: false, error: "找不到訂單" });
  }
  if (String(order.payment_method || "") !== "pxpayplus") {
    return jsonResponse(409, { success: false, error: "此訂單非全支付付款" });
  }

  const expectedAmount = Math.round(Number(order.total) || 0);
  const receivedAmount = Math.round(Number(data.amount) || 0);
  if (expectedAmount > 0 && receivedAmount !== expectedAmount) {
    logger.warn("PxPayPlus notify amount mismatch", {
      orderId: merTradeNo,
      expectedAmount,
      receivedAmount,
    });
    return jsonResponse(422, { success: false, error: "全支付通知金額不一致" });
  }

  const syncResult = await persistPxPayPlusSnapshot(
    order,
    buildSnapshotFromPaymentNotify(data),
  );
  if (!syncResult.success) {
    return jsonResponse(500, {
      success: false,
      error: syncResult.error || "全支付付款狀態更新失敗",
    });
  }

  if (syncResult.statusChanged || syncResult.paymentStatus === "paid") {
    await notifyOnlinePayPaymentStatusChanged(
      merTradeNo,
      syncResult.paymentStatus,
      {
        force: syncResult.statusChanged,
      },
    );
  }

  return new Response(null, { status: 200 });
}

export async function pxPayPlusInquiry(
  data: JsonRecord,
  req: Request,
) {
  const auth = await requireAuth(req);
  const orderId = getString(data, "orderId", "mer_trade_no", "merTradeNo");
  if (!orderId) return { success: false, error: "缺少訂單編號" };

  const { data: order, error: orderError } = await supabase.from(
    "coffee_orders",
  )
    .select(
      "id, line_user_id, total, payment_method, payment_status, payment_id, payment_expires_at, payment_confirmed_at, payment_last_checked_at, payment_provider_transaction_id, payment_provider_trade_no, payment_provider_status_code",
    )
    .eq("id", orderId)
    .maybeSingle();
  if (orderError) return { success: false, error: orderError.message };
  if (!order) return { success: false, error: "找不到訂單" };
  if (String(order.payment_method || "") !== "pxpayplus") {
    return { success: false, error: "此訂單非使用全支付" };
  }
  if (!auth.isAdmin && String(order.line_user_id || "") !== auth.userId) {
    return { success: false, error: "無權限查詢此訂單" };
  }

  const transactionId = String(
    order.payment_provider_transaction_id || order.payment_id || "",
  ).trim();
  if (!transactionId) return { success: false, error: "缺少全支付交易序號" };

  try {
    const inquiryResponse = await requestPxPayPlusCheckStatus(transactionId);
    const snapshot = buildSnapshotFromResponse(inquiryResponse);
    const statusCode = String(snapshot.statusCode || "").trim();
    if (statusCode && statusCode !== "0000") {
      return {
        success: false,
        orderId,
        statusCode,
        error: `全支付查詢失敗: ${
          String(inquiryResponse.status_message || "").trim() || statusCode
        }`,
        inquiry: inquiryResponse,
      };
    }
    if (
      snapshot.payStatus === undefined || snapshot.payStatus === null ||
      String(snapshot.payStatus).trim() === ""
    ) {
      return {
        success: false,
        orderId,
        statusCode,
        error: "全支付查詢回應缺少付款狀態",
        inquiry: inquiryResponse,
      };
    }

    const syncResult = await persistPxPayPlusSnapshot(
      asJsonRecord(order),
      snapshot,
    );
    if (syncResult.success) {
      if (syncResult.statusChanged || syncResult.paymentStatus === "paid") {
        await notifyOnlinePayPaymentStatusChanged(
          orderId,
          syncResult.paymentStatus,
          {
            force: syncResult.statusChanged,
          },
        );
      }
    }

    return {
      success: syncResult.success,
      orderId,
      paymentStatus: syncResult.paymentStatus,
      previousPaymentStatus: syncResult.previousPaymentStatus,
      statusChanged: syncResult.statusChanged,
      statusCode,
      transactionId: snapshot.transactionId || transactionId,
      pxTradeNo: snapshot.pxTradeNo || "",
      paymentExpiresAt: String(order.payment_expires_at || "").trim(),
      paymentConfirmedAt: syncResult.paymentConfirmedAt,
      paymentLastCheckedAt: syncResult.paymentLastCheckedAt,
      inquiry: inquiryResponse,
      error: syncResult.error,
    };
  } catch (error) {
    return { success: false, error: `全支付查詢失敗: ${String(error)}` };
  }
}

export async function pxPayPlusRefund(
  data: JsonRecord,
  req: Request,
) {
  await requireAdmin(req);
  const orderId = getString(data, "orderId", "mer_trade_no", "merTradeNo");
  if (!orderId) return { success: false, error: "缺少訂單編號" };

  const { data: order, error: orderError } = await supabase.from(
    "coffee_orders",
  )
    .select(
      "id, total, payment_trade_amount, payment_method, payment_status, payment_provider_trade_no, payment_provider_trade_time, payment_refund_records",
    )
    .eq("id", orderId)
    .maybeSingle();
  if (orderError) return { success: false, error: orderError.message };
  if (!order) return { success: false, error: "找不到訂單" };
  if (String(order.payment_method || "") !== "pxpayplus") {
    return { success: false, error: "此訂單非全支付，無法線上退款" };
  }
  if (String(order.payment_status || "") !== "paid") {
    return { success: false, error: "此訂單尚未付款或已退款，無法退款" };
  }

  const paidAmount = Math.round(Number(order.payment_trade_amount) || 0) ||
    Math.round(Number(order.total) || 0);
  if (paidAmount <= 0) {
    return { success: false, error: "訂單可退款金額異常，無法退款" };
  }

  const refundRecords = normalizeRefundRecords(order.payment_refund_records);
  const alreadyRefundedAmount = sumRefundRecordAmounts(refundRecords);
  const remainingAmount = Math.max(0, paidAmount - alreadyRefundedAmount);
  if (remainingAmount <= 0) {
    return { success: false, error: "此訂單已退款，無法再次退款" };
  }

  const requestedAmount = Number(data.refundAmount);
  const hasRefundAmount = Number.isFinite(requestedAmount) &&
    requestedAmount > 0;
  const refundAmount = hasRefundAmount
    ? Math.round(requestedAmount)
    : remainingAmount;
  if (refundAmount <= 0 || refundAmount > remainingAmount) {
    return { success: false, error: "退款金額不正確" };
  }

  const pxTradeNo = String(order.payment_provider_trade_no || "").trim();
  const tradeTime = String(order.payment_provider_trade_time || "").trim();
  if (!pxTradeNo || !tradeTime) {
    return { success: false, error: "缺少全支付退款必要交易資料" };
  }

  const refundMerTradeNo = getString(
    data,
    "refundMerTradeNo",
    "refund_mer_trade_no",
    "refundOrderId",
  ) || generatePxPayPlusRefundMerTradeNo(orderId);

  try {
    const refundResponse = await requestPxPayPlusRefund({
      merTradeNo: orderId,
      pxTradeNo,
      tradeTime,
      refundMerTradeNo,
      amount: refundAmount,
      remark1: getString(data, "remark1"),
      remark2: getString(data, "remark2"),
      remark3: getString(data, "remark3"),
    });
    const statusCode = String(refundResponse.status_code || "").trim();
    const statusMessage = String(refundResponse.status_message || "").trim();
    if (statusCode !== "0000") {
      return {
        success: false,
        orderId,
        statusCode,
        error: `全支付退款失敗: ${statusMessage || statusCode || "未知錯誤"}`,
        refundResponse,
      };
    }

    const nowIso = new Date().toISOString();
    const nextRefundRecords = [
      ...refundRecords,
      {
        provider: "pxpayplus",
        refundMerTradeNo,
        amount: refundAmount,
        statusCode,
        statusMessage,
        refundedAt: nowIso,
        response: refundResponse,
      },
    ];
    const nextRefundedAmount = alreadyRefundedAmount + refundAmount;
    const paymentStatus = nextRefundedAmount >= paidAmount
      ? "refunded"
      : "paid";
    const { error: updateError } = await supabase.from("coffee_orders").update({
      payment_status: paymentStatus,
      payment_last_checked_at: nowIso,
      payment_refund_records: nextRefundRecords,
    }).eq("id", orderId);
    if (updateError) {
      return { success: false, orderId, error: updateError.message };
    }

    return {
      success: true,
      message: paymentStatus === "refunded"
        ? "全支付退款成功"
        : "全支付部分退款成功",
      orderId,
      refundMerTradeNo,
      refundAmount,
      refundedAmount: nextRefundedAmount,
      remainingAmount: Math.max(0, paidAmount - nextRefundedAmount),
      paymentStatus,
      refundResponse,
    };
  } catch (error) {
    return {
      success: false,
      orderId,
      error: `全支付退款失敗: ${String(error)}`,
    };
  }
}
