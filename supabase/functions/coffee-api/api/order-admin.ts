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
  buildFailedNotificationHtml,
  buildOrderConfirmationHtml,
  buildProcessingNotificationHtml,
  buildShippingNotificationHtml,
  buildStatusUpdateNotificationHtml,
} from "../utils/email-templates.ts";
import { buildOrderStatusLineFlexMessage } from "../utils/line-flex-template.ts";
import { pushLineFlexMessage } from "../utils/line-messaging.ts";
import { supabase } from "../utils/supabase.ts";

function resolveOrderEmailMode(
  modeInput: unknown,
  orderStatus: string,
):
  | "confirmation"
  | "processing"
  | "shipping"
  | "completed"
  | "cancelled"
  | "failed" {
  const mode = String(modeInput || "").trim();
  if (
    mode === "confirmation" || mode === "processing" || mode === "shipping" ||
    mode === "completed" || mode === "cancelled" || mode === "failed"
  ) {
    return mode;
  }
  if (orderStatus === "processing") return "processing";
  if (orderStatus === "shipped") return "shipping";
  if (orderStatus === "completed") return "completed";
  if (orderStatus === "cancelled") return "cancelled";
  if (orderStatus === "failed") return "failed";
  return "confirmation";
}

const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: "待處理",
  processing: "處理中",
  shipped: "已出貨",
  completed: "已完成",
  failed: "已失敗",
  cancelled: "已取消",
};

interface NotificationChannelResult {
  attempted: boolean;
  sent: boolean;
  reason: string;
}

interface OrderStatusNotificationResult {
  email: NotificationChannelResult;
  line: NotificationChannelResult;
}

function createOrderStatusNotificationResult(): OrderStatusNotificationResult {
  return {
    email: { attempted: false, sent: false, reason: "" },
    line: { attempted: false, sent: false, reason: "" },
  };
}

function getOrderStatusLabel(status: string): string {
  return ORDER_STATUS_LABEL[status] || status;
}

function hasNotificationDeliveryFailure(
  notifications: OrderStatusNotificationResult,
): boolean {
  return Object.values(notifications).some((result) =>
    result.attempted && !result.sent
  );
}

function buildNotificationDeliveryError(
  notifications: OrderStatusNotificationResult,
): string {
  const failedChannels = Object.entries(notifications)
    .filter(([, result]) => result.attempted && !result.sent)
    .map(([channel, result]) => {
      const label = channel === "email" ? "Email" : "LINE";
      return result.reason ? `${label}：${result.reason}` : label;
    });
  return failedChannels.length
    ? `訂單狀態已更新，但通知發送失敗（${failedChannels.join("；")}）`
    : "訂單狀態已更新，但通知發送失敗";
}

async function sendOrderStatusNotifications(
  orderData: Record<string, unknown>,
  newStatus: string,
  updates: Record<string, unknown>,
): Promise<OrderStatusNotificationResult> {
  const notifications = createOrderStatusNotificationResult();
  const mergedOrder: Record<string, unknown> = {
    ...orderData,
    status: newStatus,
    cancel_reason: updates.cancel_reason ?? orderData.cancel_reason,
    payment_status: updates.payment_status ?? orderData.payment_status,
    tracking_number: updates.tracking_number ?? orderData.tracking_number,
    shipping_provider: updates.shipping_provider ?? orderData.shipping_provider,
    tracking_url: updates.tracking_url ?? orderData.tracking_url,
  };

  if (
    shouldSkipCustomerNotificationForPaymentStatus(mergedOrder.payment_status)
  ) {
    const reason = PROCESSING_PAYMENT_CUSTOMER_NOTIFICATION_MESSAGE;
    notifications.email.reason = reason;
    notifications.line.reason = reason;
    return notifications;
  }

  const { siteTitle, siteLogoUrl } = await getEmailBranding();
  const orderId = String(mergedOrder.id || "").trim();
  const lineName = String(mergedOrder.line_name || "").trim() || "顧客";
  const statusLabel = getOrderStatusLabel(newStatus);
  const note = String(mergedOrder.note || "");

  const emailTo = String(mergedOrder.email || "").trim();
  if (emailTo) {
    notifications.email.attempted = true;
    let subject = "";
    let htmlContent = "";

    if (newStatus === "shipped") {
      subject = `[${siteTitle}] 訂單編號 ${orderId} 已出貨通知`;
      htmlContent = buildShippingNotificationHtml({
        orderId,
        siteTitle,
        logoUrl: siteLogoUrl,
        lineName,
        deliveryMethod: String(mergedOrder.delivery_method || ""),
        city: String(mergedOrder.city || ""),
        district: String(mergedOrder.district || ""),
        address: String(mergedOrder.address || ""),
        storeName: String(mergedOrder.store_name || ""),
        storeAddress: String(mergedOrder.store_address || ""),
        paymentMethod: String(mergedOrder.payment_method || "cod"),
        paymentStatus: String(mergedOrder.payment_status || ""),
        trackingNumber: String(mergedOrder.tracking_number || ""),
        shippingProvider: String(mergedOrder.shipping_provider || ""),
        trackingUrl: String(mergedOrder.tracking_url || ""),
        note,
      });
    } else if (newStatus === "processing") {
      subject = `[${siteTitle}] 訂單編號 ${orderId} 處理中通知`;
      htmlContent = buildProcessingNotificationHtml({
        orderId,
        siteTitle,
        logoUrl: siteLogoUrl,
        lineName,
        deliveryMethod: String(mergedOrder.delivery_method || ""),
        city: String(mergedOrder.city || ""),
        district: String(mergedOrder.district || ""),
        address: String(mergedOrder.address || ""),
        storeName: String(mergedOrder.store_name || ""),
        storeAddress: String(mergedOrder.store_address || ""),
        paymentMethod: String(mergedOrder.payment_method || "cod"),
        paymentStatus: String(mergedOrder.payment_status || ""),
        note,
      });
    } else if (newStatus === "completed") {
      subject = `[${siteTitle}] 訂單編號 ${orderId} 已完成通知`;
      htmlContent = buildCompletedNotificationHtml({
        orderId,
        siteTitle,
        logoUrl: siteLogoUrl,
        lineName,
        note,
      });
    } else if (newStatus === "cancelled") {
      subject = `[${siteTitle}] 訂單編號 ${orderId} 已取消通知`;
      htmlContent = buildCancelledNotificationHtml({
        orderId,
        siteTitle,
        logoUrl: siteLogoUrl,
        lineName,
        cancelReason: String(mergedOrder.cancel_reason || ""),
        note,
      });
    } else if (newStatus === "failed") {
      subject = `[${siteTitle}] 訂單編號 ${orderId} 已失敗通知`;
      htmlContent = buildFailedNotificationHtml({
        orderId,
        siteTitle,
        logoUrl: siteLogoUrl,
        lineName,
        failureReason: String(mergedOrder.cancel_reason || ""),
        note,
      });
    } else {
      subject = `[${siteTitle}] 訂單編號 ${orderId} 狀態更新：${statusLabel}`;
      htmlContent = buildStatusUpdateNotificationHtml({
        orderId,
        siteTitle,
        logoUrl: siteLogoUrl,
        lineName,
        statusLabel,
      });
    }

    const emailResult = await sendEmail(emailTo, subject, htmlContent);
    if (emailResult.success) {
      notifications.email.sent = true;
    } else {
      notifications.email.reason = emailResult.error || "信件發送失敗";
    }
  } else {
    notifications.email.reason = "此訂單未填寫 Email";
  }

  const lineTo = String(mergedOrder.line_user_id || "").trim();
  if (lineTo) {
    notifications.line.attempted = true;
    const lineResult = await pushLineFlexMessage(
      lineTo,
      buildOrderStatusLineFlexMessage({
        orderId,
        siteTitle,
        status: newStatus,
        deliveryMethod: String(mergedOrder.delivery_method || ""),
        city: String(mergedOrder.city || ""),
        district: String(mergedOrder.district || ""),
        address: String(mergedOrder.address || ""),
        storeName: String(mergedOrder.store_name || ""),
        storeAddress: String(mergedOrder.store_address || ""),
        paymentMethod: String(mergedOrder.payment_method || "cod"),
        paymentStatus: String(mergedOrder.payment_status || ""),
        total: Number(mergedOrder.total) || 0,
        items: String(mergedOrder.items || ""),
        note,
        receiptInfo: mergedOrder.receipt_info,
        shippingProvider: String(mergedOrder.shipping_provider || ""),
        trackingUrl: String(mergedOrder.tracking_url || ""),
        trackingNumber: String(mergedOrder.tracking_number || ""),
      }),
    );
    if (lineResult.success) {
      notifications.line.sent = true;
    } else {
      notifications.line.reason = trimLineNotifyError(lineResult.error) ||
        "LINE 訊息發送失敗";
    }
  } else {
    notifications.line.reason = "此訂單缺少 LINE 使用者 ID";
  }

  return notifications;
}

export async function updateOrderStatus(
  data: Record<string, unknown>,
  req: Request,
) {
  await requireAdmin(req);

  const orderId = String(data.orderId || "").trim();
  if (!orderId) return { success: false, error: "缺少訂單編號" };

  const newStatus = String(data.status);
  if (!VALID_ORDER_STATUSES.includes(newStatus)) {
    return {
      success: false,
      error: "無效的訂單狀態，允許值：" + VALID_ORDER_STATUSES.join(", "),
    };
  }

  const updates: Record<string, unknown> = { status: newStatus };
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
    updates.tracking_url = String(data.trackingUrl);
  }

  const { data: orderData, error: getOrderError } = await supabase.from(
    "coffee_orders",
  ).select(
    "id, status, line_name, email, line_user_id, items, total, delivery_method, city, district, address, store_name, store_address, note, cancel_reason, receipt_info, payment_method, payment_status, tracking_number, shipping_provider, tracking_url",
  ).eq("id", orderId).maybeSingle();
  if (getOrderError) return { success: false, error: getOrderError.message };
  if (!orderData) return { success: false, error: "找不到訂單" };

  const previousStatus = String(orderData.status || "");
  const statusChanged = previousStatus !== newStatus;

  const { error } = await supabase.from("coffee_orders").update(updates).eq(
    "id",
    orderId,
  );
  if (error) return { success: false, error: error.message };

  if (!statusChanged) {
    return {
      success: true,
      message: "訂單狀態已更新（狀態未變更，未發送通知）",
      orderId,
      statusChanged: false,
      notifications: createOrderStatusNotificationResult(),
    };
  }

  const notifications = await sendOrderStatusNotifications(
    orderData as Record<string, unknown>,
    newStatus,
    updates,
  );
  if (hasNotificationDeliveryFailure(notifications)) {
    return {
      success: false,
      error: buildNotificationDeliveryError(notifications),
      orderId,
      statusUpdated: true,
      statusChanged: true,
      notifications,
    };
  }

  return {
    success: true,
    message: "訂單狀態已更新，已處理 Email 與 LINE 通知",
    orderId,
    statusChanged: true,
    notifications,
  };
}

export async function sendOrderEmail(
  data: Record<string, unknown>,
  req: Request,
) {
  await requireAdmin(req);

  const orderId = String(data.orderId || "").trim();
  if (!orderId) return { success: false, error: "缺少訂單編號" };

  const { data: orderData, error } = await supabase.from("coffee_orders")
    .select(
      "id, status, line_name, phone, email, items, total, delivery_method, city, district, address, store_name, store_address, note, cancel_reason, custom_fields, receipt_info, payment_method, payment_status, payment_id, transfer_account_last5, shipping_provider, tracking_url, tracking_number",
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

  let subject = "";
  let htmlContent = "";

  if (mode === "shipping") {
    htmlContent = buildShippingNotificationHtml({
      orderId,
      siteTitle,
      logoUrl: siteLogoUrl,
      lineName,
      deliveryMethod: String(orderData.delivery_method || ""),
      city: String(orderData.city || ""),
      district: String(orderData.district || ""),
      address: String(orderData.address || ""),
      storeName: String(orderData.store_name || ""),
      storeAddress: String(orderData.store_address || ""),
      paymentMethod: String(orderData.payment_method || "cod"),
      paymentStatus: String(orderData.payment_status || ""),
      trackingNumber: String(orderData.tracking_number || ""),
      shippingProvider: String(orderData.shipping_provider || ""),
      trackingUrl: String(orderData.tracking_url || ""),
      note: String(orderData.note || ""),
    });
    subject = `[${siteTitle}] 訂單編號 ${orderId} 已出貨通知`;
  } else if (mode === "processing") {
    htmlContent = buildProcessingNotificationHtml({
      orderId,
      siteTitle,
      logoUrl: siteLogoUrl,
      lineName,
      deliveryMethod: String(orderData.delivery_method || ""),
      city: String(orderData.city || ""),
      district: String(orderData.district || ""),
      address: String(orderData.address || ""),
      storeName: String(orderData.store_name || ""),
      storeAddress: String(orderData.store_address || ""),
      paymentMethod: String(orderData.payment_method || "cod"),
      paymentStatus: String(orderData.payment_status || ""),
      note: String(orderData.note || ""),
    });
    subject = `[${siteTitle}] 訂單編號 ${orderId} 處理中通知`;
  } else if (mode === "completed") {
    htmlContent = buildCompletedNotificationHtml({
      orderId,
      siteTitle,
      logoUrl: siteLogoUrl,
      lineName,
      note: String(orderData.note || ""),
    });
    subject = `[${siteTitle}] 訂單編號 ${orderId} 已完成通知`;
  } else if (mode === "cancelled") {
    htmlContent = buildCancelledNotificationHtml({
      orderId,
      siteTitle,
      logoUrl: siteLogoUrl,
      lineName,
      cancelReason: String(orderData.cancel_reason || ""),
      note: String(orderData.note || ""),
    });
    subject = `[${siteTitle}] 訂單編號 ${orderId} 已取消通知`;
  } else if (mode === "failed") {
    htmlContent = buildFailedNotificationHtml({
      orderId,
      siteTitle,
      logoUrl: siteLogoUrl,
      lineName,
      failureReason: String(orderData.cancel_reason || ""),
      note: String(orderData.note || ""),
    });
    subject = `[${siteTitle}] 訂單編號 ${orderId} 已失敗通知`;
  } else {
    const receiptInfo = parseReceiptInfo(orderData.receipt_info);
    const customFieldsHtml = await buildCustomFieldsHtml(
      orderData.custom_fields,
    );
    htmlContent = buildOrderConfirmationHtml({
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
      transferTargetAccount: String(orderData.payment_id || ""),
      transferAccountLast5: String(orderData.transfer_account_last5 || ""),
      note: String(orderData.note || ""),
      ordersText: stripLegacyReceiptBlock(orderData.items, receiptInfo),
      total: Number(orderData.total) || 0,
      customFieldsHtml,
      receiptHtml: buildReceiptHtml(receiptInfo),
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

export async function deleteOrder(data: Record<string, unknown>, req: Request) {
  await requireAdmin(req);
  const { error } = await supabase.from("coffee_orders").delete().eq(
    "id",
    data.orderId,
  );
  if (error) return { success: false, error: error.message };
  return { success: true, message: "訂單已刪除" };
}

export async function batchUpdateOrderStatus(
  data: Record<string, unknown>,
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
  const notificationFailedOrderIds: string[] = [];
  const status = String(data.status || "");
  const payload: Record<string, unknown> = { status };
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

  for (const orderId of orderIds) {
    const result = await updateOrderStatus({ ...payload, orderId }, req);
    const resultRecord = result as Record<string, unknown>;
    if (!resultRecord?.success && resultRecord?.statusUpdated) {
      notificationFailedOrderIds.push(orderId);
    } else if (!resultRecord?.success) {
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
  if (notificationFailedOrderIds.length > 0) {
    return {
      success: false,
      error:
        `已更新 ${updatedCount} 筆訂單狀態，但 ${notificationFailedOrderIds.length} 筆通知發送失敗`,
      updatedCount,
      notificationFailedOrderIds,
    };
  }

  return {
    success: true,
    message: `已更新 ${updatedCount} 筆訂單狀態`,
    updatedCount,
  };
}

export async function batchDeleteOrders(
  data: Record<string, unknown>,
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
