import {
  buildCustomFieldsHtml,
  buildReceiptHtml,
  getEmailBranding,
  parseReceiptInfo,
  stripLegacyReceiptBlock,
  trimLineNotifyError,
} from "./order-shared.ts";
import {
  PROCESSING_PAYMENT_CUSTOMER_NOTIFICATION_MESSAGE,
  shouldSkipCustomerNotificationForPaymentStatus,
} from "./customer-notification-policy.ts";
import { requireAdmin } from "../utils/auth.ts";
import { VALID_ORDER_STATUSES } from "../utils/config.ts";
import { sendEmail } from "../utils/email.ts";
import {
  buildCancelledNotificationHtml,
  buildCompletedNotificationHtml,
  buildDeliveredNotificationHtml,
  buildFailedNotificationHtml,
  buildOrderConfirmationHtml,
  buildProcessingNotificationHtml,
  buildReadyNotificationHtml,
  buildShippingNotificationHtml,
} from "../utils/email-templates.ts";
import { asJsonRecord } from "../utils/json.ts";
import type { JsonRecord } from "../utils/json.ts";
import { buildOrderStatusLineFlexMessage } from "../utils/line-flex-template.ts";
import { pushLineFlexMessage } from "../utils/line-messaging.ts";
import { createLogger } from "../utils/logger.ts";
import { supabase } from "../utils/supabase.ts";
import { normalizeTrackingUrl } from "../utils/tracking.ts";

const logger = createLogger("order-admin");
const ORDER_STATUS_NOTIFICATION_SELECT =
  "id, status, status_note, line_user_id, line_name, phone, email, items, total, delivery_method, city, district, address, store_name, store_address, note, cancel_reason, custom_fields, receipt_info, payment_method, payment_status, payment_id, transfer_account_last5, shipping_provider, tracking_url, tracking_number";

type CustomerNotificationResult = {
  attempted: boolean;
  success: boolean;
  skipped: boolean;
  target: string;
  error: string;
};

type CustomerNotificationResults = {
  email: CustomerNotificationResult;
  line: CustomerNotificationResult;
};

function skippedNotification(reason: string): CustomerNotificationResult {
  return {
    attempted: false,
    success: false,
    skipped: true,
    target: "",
    error: reason,
  };
}

function sentNotification(target: string): CustomerNotificationResult {
  return {
    attempted: true,
    success: true,
    skipped: false,
    target,
    error: "",
  };
}

function failedNotification(
  target: string,
  error: unknown,
): CustomerNotificationResult {
  return {
    attempted: true,
    success: false,
    skipped: false,
    target,
    error: trimLineNotifyError(error),
  };
}

function summarizeCustomerNotifications(
  notifications: CustomerNotificationResults,
) {
  const results = [notifications.email, notifications.line];
  const attempts = results.filter((result) => result.attempted);
  const successes = attempts.filter((result) => result.success);
  const failures = attempts.filter((result) => !result.success);
  if (!attempts.length) {
    return "訂單狀態已更新（未發送通知：此訂單沒有可通知的 Email 或 LINE）";
  }
  if (failures.length) {
    return `訂單狀態已更新，通知部分失敗（成功 ${successes.length} / ${attempts.length}）`;
  }
  if (successes.length >= 2) return "訂單狀態已更新，Email 與 LINE 通知已發送";
  if (notifications.email.success) return "訂單狀態已更新，Email 通知已發送";
  if (notifications.line.success) return "訂單狀態已更新，LINE 通知已發送";
  return "訂單狀態已更新";
}

function resolveOrderEmailMode(
  modeInput: unknown,
  orderStatus: string,
):
  | "confirmation"
  | "processing"
  | "ready"
  | "shipping"
  | "delivered"
  | "completed"
  | "cancelled"
  | "failed" {
  const mode = String(modeInput || "").trim();
  if (
    mode === "confirmation" || mode === "processing" || mode === "shipping" ||
    mode === "ready" ||
    mode === "delivered" ||
    mode === "completed" || mode === "cancelled" || mode === "failed"
  ) {
    return mode;
  }
  if (orderStatus === "processing") return "processing";
  if (orderStatus === "ready") return "ready";
  if (orderStatus === "shipped") return "shipping";
  if (orderStatus === "delivered") return "delivered";
  if (orderStatus === "completed") return "completed";
  if (orderStatus === "cancelled") return "cancelled";
  if (orderStatus === "failed") return "failed";
  return "confirmation";
}

async function loadOrderStatusNotificationData(orderId: string) {
  const { data: orderData, error } = await supabase.from("coffee_orders")
    .select(ORDER_STATUS_NOTIFICATION_SELECT)
    .eq("id", orderId)
    .maybeSingle();
  if (error) {
    logger.error("Failed to load order for status notification", {
      orderId,
      error: error.message,
    });
    return { orderData: null, error: error.message };
  }
  if (!orderData) {
    return { orderData: null, error: "找不到訂單" };
  }
  return { orderData: asJsonRecord(orderData), error: "" };
}

async function sendOrderStatusEmailNotification(
  orderId: string,
  req: Request,
): Promise<CustomerNotificationResult> {
  const result = asJsonRecord(await sendOrderEmail({ orderId }, req));
  if (result.success) {
    return sentNotification(String(result.to || ""));
  }

  const error = String(result.error || "Email 通知失敗");
  const skipped = error.includes("未填寫 Email") ||
    error.includes(PROCESSING_PAYMENT_CUSTOMER_NOTIFICATION_MESSAGE);
  if (skipped) return skippedNotification(error);

  logger.error("Failed to send order status email notification", {
    orderId,
    error,
  });
  return failedNotification("", error);
}

async function sendOrderStatusLineNotification(
  orderData: JsonRecord,
): Promise<CustomerNotificationResult> {
  if (
    shouldSkipCustomerNotificationForPaymentStatus(orderData.payment_status)
  ) {
    return skippedNotification(
      `${PROCESSING_PAYMENT_CUSTOMER_NOTIFICATION_MESSAGE}（LINE Flex）`,
    );
  }

  const orderId = String(orderData.id || "").trim();
  const lineUserId = String(orderData.line_user_id || "").trim();
  if (!lineUserId) {
    return skippedNotification("此訂單缺少 LINE 使用者 ID，無法發送訊息");
  }

  const receiptInfo = parseReceiptInfo(orderData.receipt_info);
  const { siteTitle } = await getEmailBranding();
  const flexMessage = buildOrderStatusLineFlexMessage({
    orderId,
    siteTitle,
    status: String(orderData.status || "pending"),
    deliveryMethod: String(orderData.delivery_method || ""),
    city: String(orderData.city || ""),
    district: String(orderData.district || ""),
    address: String(orderData.address || ""),
    storeName: String(orderData.store_name || ""),
    storeAddress: String(orderData.store_address || ""),
    lineName: String(orderData.line_name || ""),
    phone: String(orderData.phone || ""),
    email: String(orderData.email || ""),
    paymentMethod: String(orderData.payment_method || "cod"),
    paymentStatus: String(orderData.payment_status || ""),
    total: Number(orderData.total) || 0,
    items: stripLegacyReceiptBlock(orderData.items, receiptInfo),
    note: String(orderData.note || ""),
    statusNote: String(orderData.status_note || ""),
    receiptInfo,
    shippingProvider: String(orderData.shipping_provider || ""),
    trackingUrl: String(orderData.tracking_url || ""),
    trackingNumber: String(orderData.tracking_number || ""),
  });

  const result = await pushLineFlexMessage(lineUserId, flexMessage);
  if (result.success) return sentNotification(lineUserId);

  logger.error("Failed to send order status LINE notification", {
    orderId,
    target: lineUserId,
    error: result.error,
  });
  return failedNotification(lineUserId, result.error);
}

async function sendOrderStatusCustomerNotifications(
  orderId: string,
  req: Request,
): Promise<CustomerNotificationResults> {
  const { orderData, error } = await loadOrderStatusNotificationData(orderId);
  if (!orderData) {
    const skipped = skippedNotification(error || "找不到訂單");
    return { email: skipped, line: skipped };
  }

  const [email, line] = await Promise.all([
    sendOrderStatusEmailNotification(orderId, req),
    sendOrderStatusLineNotification(orderData),
  ]);
  return { email, line };
}

export async function updateOrderStatus(
  data: JsonRecord,
  req: Request,
) {
  await requireAdmin(req);

  const newStatus = String(data.status);
  if (!VALID_ORDER_STATUSES.includes(newStatus)) {
    return {
      success: false,
      error: "無效的訂單狀態，允許值：" + VALID_ORDER_STATUSES.join(", "),
    };
  }

  const updates: JsonRecord = {
    status: newStatus,
    status_note: String(data.statusNote || "").trim(),
  };
  const cancelReason = String(data.cancelReason || "").trim();
  if (newStatus === "cancelled" || newStatus === "failed") {
    updates.cancel_reason = cancelReason;
  } else {
    updates.cancel_reason = "";
  }
  if (data.paymentStatus !== undefined) {
    const paymentStatus = String(data.paymentStatus).trim();
    updates.payment_status = paymentStatus;
    updates.payment_last_checked_at = new Date().toISOString();
    if (paymentStatus === "paid") {
      updates.payment_confirmed_at = new Date().toISOString();
    }
  }
  if (data.trackingNumber !== undefined) {
    updates.tracking_number = String(data.trackingNumber);
  }
  if (data.shippingProvider !== undefined) {
    updates.shipping_provider = String(data.shippingProvider);
  }
  if (data.trackingUrl !== undefined) {
    updates.tracking_url = normalizeTrackingUrl(data.trackingUrl);
  }

  const { error } = await supabase.from("coffee_orders").update(updates).eq(
    "id",
    data.orderId,
  );
  if (error) return { success: false, error: error.message };

  const orderId = String(data.orderId || "").trim();
  const customerNotifications = await sendOrderStatusCustomerNotifications(
    orderId,
    req,
  );

  return {
    success: true,
    message: summarizeCustomerNotifications(customerNotifications),
    customerNotifications,
  };
}

export async function sendOrderEmail(
  data: JsonRecord,
  req: Request,
) {
  await requireAdmin(req);

  const orderId = String(data.orderId || "").trim();
  if (!orderId) return { success: false, error: "缺少訂單編號" };

  const { data: orderData, error } = await supabase.from("coffee_orders")
    .select(
      "id, status, status_note, line_name, phone, email, items, total, delivery_method, city, district, address, store_name, store_address, note, cancel_reason, custom_fields, receipt_info, payment_method, payment_status, payment_id, transfer_account_last5, shipping_provider, tracking_url, tracking_number",
    )
    .eq("id", orderId)
    .maybeSingle();
  if (error) return { success: false, error: error.message };
  if (!orderData) return { success: false, error: "找不到訂單" };

  const to = String(orderData.email || "").trim();
  if (!to) return { success: false, error: "此訂單未填寫 Email，無法發送" };
  if (
    shouldSkipCustomerNotificationForPaymentStatus(orderData.payment_status)
  ) {
    return {
      success: false,
      error: `${PROCESSING_PAYMENT_CUSTOMER_NOTIFICATION_MESSAGE}（Email）`,
    };
  }

  const { siteTitle, siteLogoUrl } = await getEmailBranding();
  const orderStatus = String(orderData.status || "pending");
  const mode = resolveOrderEmailMode(data.mode, orderStatus);
  const lineName = String(orderData.line_name || "").trim() || "顧客";
  const receiptInfo = parseReceiptInfo(orderData.receipt_info);
  const customFieldsHtml = await buildCustomFieldsHtml(
    orderData.custom_fields,
  );
  const receiptHtml = buildReceiptHtml(receiptInfo);
  const commonOrderEmailDetails = {
    orderId,
    siteTitle,
    logoUrl: siteLogoUrl,
    lineName,
    phone: String(orderData.phone || ""),
    deliveryMethod: String(orderData.delivery_method || ""),
    city: String(orderData.city || ""),
    district: String(orderData.district || ""),
    address: String(orderData.address || ""),
    storeName: String(orderData.store_name || ""),
    storeAddress: String(orderData.store_address || ""),
    paymentMethod: String(orderData.payment_method || "cod"),
    paymentStatus: String(orderData.payment_status || ""),
    note: String(orderData.note || ""),
    statusNote: String(orderData.status_note || ""),
    ordersText: stripLegacyReceiptBlock(orderData.items, receiptInfo),
    total: Number(orderData.total) || 0,
    customFieldsHtml,
    receiptHtml,
  };

  let subject = "";
  let htmlContent = "";

  if (mode === "shipping") {
    htmlContent = buildShippingNotificationHtml({
      ...commonOrderEmailDetails,
      trackingNumber: String(orderData.tracking_number || ""),
      shippingProvider: String(orderData.shipping_provider || ""),
      trackingUrl: String(orderData.tracking_url || ""),
    });
    subject = `[${siteTitle}] 訂單編號 ${orderId} 已出貨通知`;
  } else if (mode === "processing") {
    htmlContent = buildProcessingNotificationHtml({
      ...commonOrderEmailDetails,
    });
    subject = `[${siteTitle}] 訂單編號 ${orderId} 處理中通知`;
  } else if (mode === "ready") {
    htmlContent = buildReadyNotificationHtml({
      ...commonOrderEmailDetails,
    });
    subject = `[${siteTitle}] 訂單編號 ${orderId} 已備妥通知`;
  } else if (mode === "completed") {
    htmlContent = buildCompletedNotificationHtml({
      ...commonOrderEmailDetails,
    });
    subject = `[${siteTitle}] 訂單編號 ${orderId} 已完成通知`;
  } else if (mode === "delivered") {
    htmlContent = buildDeliveredNotificationHtml({
      ...commonOrderEmailDetails,
    });
    subject = `[${siteTitle}] 訂單編號 ${orderId} 已配達通知`;
  } else if (mode === "cancelled") {
    htmlContent = buildCancelledNotificationHtml({
      ...commonOrderEmailDetails,
      cancelReason: String(orderData.cancel_reason || ""),
    });
    subject = `[${siteTitle}] 訂單編號 ${orderId} 已取消通知`;
  } else if (mode === "failed") {
    htmlContent = buildFailedNotificationHtml({
      ...commonOrderEmailDetails,
      failureReason: String(orderData.cancel_reason || ""),
    });
    subject = `[${siteTitle}] 訂單編號 ${orderId} 已失敗通知`;
  } else {
    htmlContent = buildOrderConfirmationHtml({
      ...commonOrderEmailDetails,
      transferTargetAccount: String(orderData.payment_id || ""),
      transferAccountLast5: String(orderData.transfer_account_last5 || ""),
    });
    subject = `[${siteTitle}] 訂單編號 ${orderId} 成立確認信`;
  }

  const emailResult = await sendEmail(to, subject, htmlContent);
  if (!emailResult.success) {
    return { success: false, error: emailResult.error || "信件發送失敗" };
  }

  const modeLabel = mode === "shipping"
    ? "出貨通知"
    : mode === "processing"
    ? "處理中通知"
    : mode === "ready"
    ? "備妥通知"
    : mode === "delivered"
    ? "配達通知"
    : mode === "completed"
    ? "完成通知"
    : mode === "failed"
    ? "失敗通知"
    : mode === "cancelled"
    ? "取消通知"
    : "成立確認信";

  return {
    success: true,
    message: `信件已發送（${modeLabel}）`,
    orderId,
    mode,
    to,
  };
}

export async function deleteOrder(data: JsonRecord, req: Request) {
  await requireAdmin(req);
  const { error } = await supabase.from("coffee_orders").delete().eq(
    "id",
    data.orderId,
  );
  if (error) return { success: false, error: error.message };
  return { success: true, message: "訂單已刪除" };
}

export async function batchUpdateOrderStatus(
  data: JsonRecord,
  req: Request,
) {
  await requireAdmin(req);
  const orderIdsRaw = Array.isArray(data.orderIds) ? data.orderIds : [];
  const orderIds = [...new Set(orderIdsRaw.map((id) => String(id).trim()))]
    .filter((id) => id.length > 0);
  if (!orderIds.length) {
    return { success: false, error: "請至少選擇一筆訂單" };
  }

  const failedOrderIds: string[] = [];
  const status = String(data.status || "");
  const payload: JsonRecord = { status };
  if (data.paymentStatus !== undefined) {
    payload.paymentStatus = String(data.paymentStatus);
  }
  if (data.trackingNumber !== undefined) {
    payload.trackingNumber = String(data.trackingNumber);
  }
  if (data.shippingProvider !== undefined) {
    payload.shippingProvider = String(data.shippingProvider);
  }
  if (data.trackingUrl !== undefined) {
    payload.trackingUrl = String(data.trackingUrl);
  }
  if (data.statusNote !== undefined) {
    payload.statusNote = String(data.statusNote);
  }

  for (const orderId of orderIds) {
    const result = await updateOrderStatus({ ...payload, orderId }, req);
    if (!asJsonRecord(result).success) {
      failedOrderIds.push(orderId);
    }
  }

  const updatedCount = orderIds.length - failedOrderIds.length;
  if (failedOrderIds.length > 0) {
    return {
      success: false,
      error: `部分訂單更新失敗（成功 ${updatedCount} / ${orderIds.length}）`,
      updatedCount,
      failedOrderIds,
    };
  }

  return {
    success: true,
    message: `已更新 ${updatedCount} 筆訂單狀態`,
    updatedCount,
  };
}

export async function batchDeleteOrders(
  data: JsonRecord,
  req: Request,
) {
  await requireAdmin(req);
  const orderIdsRaw = Array.isArray(data.orderIds) ? data.orderIds : [];
  const orderIds = [...new Set(orderIdsRaw.map((id) => String(id).trim()))]
    .filter((id) => id.length > 0);
  if (!orderIds.length) {
    return { success: false, error: "請至少選擇一筆訂單" };
  }

  const { error } = await supabase.from("coffee_orders").delete().in(
    "id",
    orderIds,
  );
  if (error) return { success: false, error: error.message };
  return {
    success: true,
    message: `已刪除 ${orderIds.length} 筆訂單`,
    deletedCount: orderIds.length,
  };
}
