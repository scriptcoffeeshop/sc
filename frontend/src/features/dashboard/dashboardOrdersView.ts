import {
  formatOrderDateTimeText,
  normalizeReceiptInfo,
  normalizeTrackingUrl,
  orderMethodLabel,
  orderPayMethodLabel,
  orderPayStatusLabel,
  orderStatusLabel,
} from "./orderShared.ts";
import type {
  DashboardOrderFilters,
  DashboardOrderRecord,
} from "./dashboardOrderTypes.ts";

export function getFormControlValue(id: string) {
  const element = document.getElementById(id) as
    | HTMLInputElement
    | HTMLSelectElement
    | HTMLTextAreaElement
    | null;
  return String(element?.value || "").trim();
}

function parseDateBound(dateStr: string, isEnd = false) {
  if (!dateStr) return null;
  const parsed = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  if (isEnd) {
    parsed.setHours(23, 59, 59, 999);
  }
  return parsed;
}

function getTrackingLinkInfo(order: DashboardOrderRecord) {
  const customTrackingUrl = normalizeTrackingUrl(order.trackingUrl || "");
  if (customTrackingUrl) {
    return {
      url: customTrackingUrl,
      label: "物流追蹤頁面",
    };
  }
  if (!order.trackingNumber) return null;
  if (order.deliveryMethod === "seven_eleven") {
    return {
      url: "https://eservice.7-11.com.tw/e-tracking/search.aspx",
      label: "7-11貨態查詢",
    };
  }
  if (order.deliveryMethod === "family_mart") {
    return {
      url: "https://fmec.famiport.com.tw/FP_Entrance/QueryBox",
      label: "全家貨態查詢",
    };
  }
  if (
    order.deliveryMethod === "delivery" ||
      order.deliveryMethod === "home_delivery"
  ) {
    return {
      url: "https://postserv.post.gov.tw/pstmail/main_mail.html?targetTxn=EB500100",
      label: "中華郵政查詢",
    };
  }
  return null;
}

export function buildOrderAddressInfo(order: DashboardOrderRecord) {
  return (
      order.deliveryMethod === "delivery" ||
      order.deliveryMethod === "home_delivery"
    )
    ? `${order.city || ""}${order.district || ""} ${order.address || ""}`.trim()
    : `${order.storeName || ""}${order.storeId ? ` [${order.storeId}]` : ""}${
      order.storeAddress ? ` (${order.storeAddress})` : ""
    }`.trim();
}

export function filterDashboardOrders(
  orderList: DashboardOrderRecord[],
  filters: DashboardOrderFilters,
) {
  const dateFrom = parseDateBound(filters.dateFrom);
  const dateTo = parseDateBound(filters.dateTo, true);
  const minAmount = filters.minAmount === "" ? null : Number(filters.minAmount);
  const maxAmount = filters.maxAmount === "" ? null : Number(filters.maxAmount);

  return orderList.filter((order) => {
    if (filters.status !== "all" && order.status !== filters.status) {
      return false;
    }

    const paymentMethod = order.paymentMethod || "cod";
    if (
      filters.paymentMethod !== "all" &&
      paymentMethod !== filters.paymentMethod
    ) {
      return false;
    }

    const paymentStatus = String(order.paymentStatus || "");
    if (filters.paymentStatus !== "all") {
      if (filters.paymentStatus === "empty" && paymentStatus !== "") {
        return false;
      }
      if (
        filters.paymentStatus !== "empty" &&
        paymentStatus !== filters.paymentStatus
      ) {
        return false;
      }
    }

    if (
      filters.deliveryMethod !== "all" &&
      order.deliveryMethod !== filters.deliveryMethod
    ) {
      return false;
    }

  const timestamp = new Date(order.timestamp);
    if (dateFrom && timestamp < dateFrom) return false;
    if (dateTo && timestamp > dateTo) return false;

    const total = Number(order.total) || 0;
    if (minAmount !== null && !Number.isNaN(minAmount) && total < minAmount) {
      return false;
    }
    if (maxAmount !== null && !Number.isNaN(maxAmount) && total > maxAmount) {
      return false;
    }

    return true;
  });
}

export function buildOrdersSummaryText(
  orderList: DashboardOrderRecord[],
  filteredOrders: DashboardOrderRecord[],
) {
  const totalAmount = filteredOrders.reduce(
    (sum, order) => sum + (Number(order.total) || 0),
    0,
  );
  return `總訂單 ${orderList.length} 筆｜篩選結果 ${
    filteredOrders.length
  } 筆｜金額合計 $${totalAmount.toLocaleString("zh-TW")}`;
}

export function buildOrderViewModel(
  order: DashboardOrderRecord,
  pendingStatus: string,
  isSelected: boolean,
) {
  const paymentMethod = order.paymentMethod || "cod";
  const paymentStatus = String(order.paymentStatus || "").trim();
  const paymentExpiresAtText = formatOrderDateTimeText(order.paymentExpiresAt);
  const paymentLastCheckedAtText = formatOrderDateTimeText(
    order.paymentLastCheckedAt,
  );
  const paymentProviderStatusCode = String(order.paymentProviderStatusCode || "")
    .trim();
  const showPaymentDeadline = paymentMethod !== "cod" &&
    Boolean(paymentExpiresAtText) &&
    ["pending", "processing", "expired"].includes(paymentStatus);
  const showPaymentMeta = paymentMethod !== "cod" && (
    showPaymentDeadline ||
    Boolean(paymentLastCheckedAtText) ||
    Boolean(paymentProviderStatusCode)
  );
  const trackingLink = getTrackingLinkInfo(order);
  const receiptInfo = normalizeReceiptInfo(order.receiptInfo);
  const addressInfo = buildOrderAddressInfo(order);
  const selectedStatus = pendingStatus || order.status || "";

  return {
    orderId: String(order.orderId || ""),
    timestampText: new Date(order.timestamp).toLocaleString("zh-TW"),
    deliveryMethod: order.deliveryMethod || "",
    deliveryLabel: orderMethodLabel[order.deliveryMethod || ""] ||
      order.deliveryMethod ||
      "",
    status: order.status || "",
    statusLabel: orderStatusLabel[order.status || ""] || order.status || "",
    selectedStatus,
    showConfirmStatusButton: Boolean(selectedStatus) && selectedStatus !== order.status,
    paymentMethod,
    paymentStatus,
    paymentMethodLabel: orderPayMethodLabel[paymentMethod] || paymentMethod,
    paymentStatusLabel: orderPayStatusLabel[paymentStatus] || paymentStatus,
    payBadgeClass: paymentStatus === "paid"
      ? "bg-green-50 text-green-700"
      : paymentStatus === "processing"
      ? "bg-blue-50 text-blue-700"
      : paymentStatus === "pending"
      ? "bg-yellow-50 text-yellow-700"
      : paymentStatus === "failed" || paymentStatus === "cancelled" ||
          paymentStatus === "expired"
      ? "bg-red-50 text-red-700"
      : paymentStatus === "refunded"
      ? "bg-purple-50 text-purple-700"
      : "ui-bg-soft ui-text-strong",
    paymentExpiresAtText,
    paymentLastCheckedAtText,
    paymentProviderStatusCode,
    showPaymentDeadline,
    showPaymentMeta,
    isSelected,
    lineUserId: order.lineUserId || "",
    lineName: order.lineName || "",
    phone: order.phone || "",
    email: order.email || "",
    addressInfo,
    transferAccountLast5: order.transferAccountLast5 || "",
    paymentId: order.paymentId || "",
    showTransferInfo: paymentMethod === "transfer",
    shippingProvider: order.shippingProvider || "",
    trackingNumber: order.trackingNumber || "",
    trackingLinkUrl: trackingLink?.url || "",
    trackingLinkLabel: trackingLink?.label || "",
    hasShippingInfo: Boolean(
      order.trackingNumber || order.shippingProvider || trackingLink,
    ),
    items: order.items || "",
    note: order.note || "",
    cancelReason: String(order.cancelReason || "").trim(),
    statusReasonLabel: String(order.status || "") === "failed"
      ? "失敗原因"
      : "取消原因",
    showCancellationReason:
      ["cancelled", "failed"].includes(String(order.status || "")) &&
      Boolean(String(order.cancelReason || "").trim()),
    receiptInfo,
    showReceiptInfo: Boolean(receiptInfo),
    total: Number(order.total) || 0,
    showSendLineButton: Boolean(order.lineUserId),
    showSendEmailButton: Boolean(order.email),
    showRefundButton:
      (paymentMethod === "linepay" || paymentMethod === "jkopay") &&
      paymentStatus === "paid",
    refundButtonText: paymentMethod === "jkopay" ? "街口退款" : "LINE退款",
    showConfirmTransferButton:
      paymentMethod === "transfer" && paymentStatus === "pending",
  };
}
