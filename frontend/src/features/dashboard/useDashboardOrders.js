import { computed, reactive, ref } from "vue";
import {
  formatOrderDateTimeText,
  normalizeReceiptInfo,
  normalizeTrackingUrl,
  orderMethodLabel,
  orderPayMethodLabel,
  orderPayStatusLabel,
  orderStatusLabel,
  orderStatusOptions,
} from "../../../../js/dashboard/modules/order-shared.js";

const orders = ref([]);
const selectedOrderIds = ref(new Set());
const pendingStatusByOrderId = ref({});

const filters = reactive({
  status: "all",
  paymentMethod: "all",
  paymentStatus: "all",
  deliveryMethod: "all",
  dateFrom: "",
  dateTo: "",
  minAmount: "",
  maxAmount: "",
});

const batchForm = reactive({
  status: "",
  paymentStatus: "__keep__",
});

let services = null;

function getServices() {
  if (!services) {
    throw new Error("Dashboard orders services 尚未初始化");
  }
  return services;
}

function parseDateBound(dateStr, isEnd = false) {
  if (!dateStr) return null;
  const parsed = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  if (isEnd) {
    parsed.setHours(23, 59, 59, 999);
  }
  return parsed;
}

function getTrackingLinkInfo(order) {
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

function getSelectedOrderIds() {
  const orderIds = new Set(orders.value.map((order) => order.orderId));
  return [...selectedOrderIds.value].filter((orderId) => orderIds.has(orderId));
}

function syncSelectedOrderIds() {
  selectedOrderIds.value = new Set(getSelectedOrderIds());
}

function syncPendingStatuses() {
  const nextPendingStatusByOrderId = {};
  for (const order of orders.value) {
    const nextStatus = pendingStatusByOrderId.value[order.orderId];
    if (nextStatus && nextStatus !== order.status) {
      nextPendingStatusByOrderId[order.orderId] = nextStatus;
    }
  }
  pendingStatusByOrderId.value = nextPendingStatusByOrderId;
}

const filteredOrders = computed(() => {
  const dateFrom = parseDateBound(filters.dateFrom);
  const dateTo = parseDateBound(filters.dateTo, true);
  const minAmount = filters.minAmount === "" ? null : Number(filters.minAmount);
  const maxAmount = filters.maxAmount === "" ? null : Number(filters.maxAmount);

  return orders.value.filter((order) => {
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
});

const selectedCount = computed(() => getSelectedOrderIds().length);

const allFilteredSelected = computed(() => {
  const filteredIds = filteredOrders.value.map((order) => order.orderId);
  if (!filteredIds.length) return false;
  return filteredIds.every((orderId) => selectedOrderIds.value.has(orderId));
});

const selectAllIndeterminate = computed(() => {
  const filteredIds = filteredOrders.value.map((order) => order.orderId);
  if (!filteredIds.length) return false;
  const selectedVisibleCount = filteredIds.filter((orderId) =>
    selectedOrderIds.value.has(orderId)
  ).length;
  return selectedVisibleCount > 0 && selectedVisibleCount < filteredIds.length;
});

const summaryText = computed(() => {
  const totalAmount = filteredOrders.value.reduce(
    (sum, order) => sum + (Number(order.total) || 0),
    0,
  );
  return `總訂單 ${orders.value.length} 筆｜篩選結果 ${
    filteredOrders.value.length
  } 筆｜金額合計 $${totalAmount.toLocaleString("zh-TW")}`;
});

const selectedCountText = computed(() => `已選 ${selectedCount.value} 筆`);

function buildOrderViewModel(order) {
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
  const addressInfo =
    (order.deliveryMethod === "delivery" || order.deliveryMethod === "home_delivery")
      ? `${order.city || ""}${order.district || ""} ${order.address || ""}`
      : `${order.storeName || ""}${order.storeId ? ` [${order.storeId}]` : ""}${
        order.storeAddress ? ` (${order.storeAddress})` : ""
      }`;
  const selectedStatus = pendingStatusByOrderId.value[order.orderId] ||
    order.status ||
    "";

  return {
    orderId: String(order.orderId || ""),
    timestampText: new Date(order.timestamp).toLocaleString("zh-TW"),
    deliveryMethod: order.deliveryMethod || "",
    deliveryLabel: orderMethodLabel[order.deliveryMethod] || order.deliveryMethod,
    status: order.status || "",
    statusLabel: orderStatusLabel[order.status] || order.status || "",
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
    isSelected: selectedOrderIds.value.has(order.orderId),
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
    showCancellationReason:
      String(order.status || "") === "cancelled" &&
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

const ordersView = computed(() => filteredOrders.value.map(buildOrderViewModel));

function orderStatusText(status) {
  return orderStatusLabel[status] || status;
}

function setPendingOrderStatus(orderId, status) {
  const nextPendingStatusByOrderId = { ...pendingStatusByOrderId.value };
  const currentStatus = orders.value.find((order) => order.orderId === orderId)
    ?.status || "";
  if (!status || status === currentStatus) {
    delete nextPendingStatusByOrderId[orderId];
  } else {
    nextPendingStatusByOrderId[orderId] = status;
  }
  pendingStatusByOrderId.value = nextPendingStatusByOrderId;
}

async function loadOrders() {
  try {
    const { API_URL, authFetch, getAuthUserId } = getServices();
    const response = await authFetch(
      `${API_URL}?action=getOrders&userId=${getAuthUserId()}&_=${Date.now()}`,
    );
    const data = await response.json();
    if (!data.success) return;
    orders.value = Array.isArray(data.orders) ? data.orders : [];
    syncSelectedOrderIds();
    syncPendingStatuses();
  } catch (error) {
    console.error(error);
  }
}

function renderOrders() {
  syncSelectedOrderIds();
  syncPendingStatuses();
  return filteredOrders.value;
}

async function deleteOrderById(orderId) {
  const { API_URL, Swal, Toast, authFetch, getAuthUserId } = getServices();
  const confirmation = await Swal.fire({
    title: "刪除訂單？",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#DC322F",
    confirmButtonText: "刪除",
    cancelButtonText: "取消",
  });
  if (!confirmation.isConfirmed) return;

  try {
    const response = await authFetch(`${API_URL}?action=deleteOrder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: getAuthUserId(), orderId }),
    });
    const data = await response.json();
    if (!data.success) return;
    const nextSelectedOrderIds = new Set(selectedOrderIds.value);
    nextSelectedOrderIds.delete(orderId);
    selectedOrderIds.value = nextSelectedOrderIds;
    Toast.fire({ icon: "success", title: "已刪除" });
    await loadOrders();
  } catch (error) {
    Swal.fire("錯誤", error?.message || "刪除失敗", "error");
  }
}

function toggleOrderSelection(orderId, checked) {
  const nextSelectedOrderIds = new Set(selectedOrderIds.value);
  if (checked) nextSelectedOrderIds.add(orderId);
  else nextSelectedOrderIds.delete(orderId);
  selectedOrderIds.value = nextSelectedOrderIds;
}

function toggleSelectAllOrders(checked) {
  const nextSelectedOrderIds = new Set(selectedOrderIds.value);
  filteredOrders.value.forEach((order) => {
    if (checked) nextSelectedOrderIds.add(order.orderId);
    else nextSelectedOrderIds.delete(order.orderId);
  });
  selectedOrderIds.value = nextSelectedOrderIds;
}

async function confirmOrderStatus(orderId) {
  const { changeOrderStatus } = getServices();
  const nextStatus = pendingStatusByOrderId.value[orderId];
  if (!nextStatus) return;
  await changeOrderStatus(orderId, nextStatus);
}

async function batchUpdateOrders() {
  const { API_URL, Swal, Toast, authFetch, getAuthUserId } = getServices();
  const orderIds = getSelectedOrderIds();
  if (!orderIds.length) {
    Swal.fire("提醒", "請先勾選至少一筆訂單", "warning");
    return;
  }

  if (!batchForm.status) {
    Swal.fire("提醒", "請先選擇批次狀態", "warning");
    return;
  }

  let trackingNumber;
  let shippingProvider;
  let trackingUrl;
  if (batchForm.status === "shipped") {
    const { value, isConfirmed } = await Swal.fire({
      title: "批次出貨設定",
      html: `
        <div class="text-left space-y-2">
          <label class="text-sm ui-text-strong block">共用物流單號（可選）</label>
          <input id="swal-batch-tracking-number" class="swal2-input" placeholder="請輸入物流單號">
          <label class="text-sm ui-text-strong block">共用物流商（可選）</label>
          <input id="swal-batch-shipping-provider" class="swal2-input" placeholder="例如：黑貓宅急便">
          <label class="text-sm ui-text-strong block">共用物流追蹤網址（可選）</label>
          <input id="swal-batch-tracking-url" class="swal2-input" placeholder="https://...">
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "確定",
      cancelButtonText: "取消",
      confirmButtonColor: "#268BD2",
      focusConfirm: false,
      preConfirm: () => {
        const trackingNumEl = document.getElementById(
          "swal-batch-tracking-number",
        );
        const providerEl = document.getElementById(
          "swal-batch-shipping-provider",
        );
        const urlEl = document.getElementById("swal-batch-tracking-url");
        const trackingNumberValue = String(trackingNumEl?.value || "").trim();
        const shippingProviderValue = String(providerEl?.value || "").trim();
        const trackingUrlValue = String(urlEl?.value || "").trim();
        if (trackingUrlValue && !/^https?:\/\//i.test(trackingUrlValue)) {
          Swal.showValidationMessage(
            "物流追蹤網址需以 http:// 或 https:// 開頭",
          );
          return false;
        }
        return {
          trackingNumber: trackingNumberValue,
          shippingProvider: shippingProviderValue,
          trackingUrl: trackingUrlValue,
        };
      },
    });
    if (!isConfirmed) return;
    trackingNumber = value?.trackingNumber || "";
    shippingProvider = value?.shippingProvider || "";
    trackingUrl = value?.trackingUrl || "";
  }

  const payload = {
    userId: getAuthUserId(),
    orderIds,
    status: batchForm.status,
  };
  if (batchForm.paymentStatus !== "__keep__") {
    payload.paymentStatus = batchForm.paymentStatus;
  }
  if (batchForm.status === "shipped") {
    payload.trackingNumber = trackingNumber;
    payload.shippingProvider = shippingProvider;
    payload.trackingUrl = trackingUrl;
  }

  try {
    const response = await authFetch(`${API_URL}?action=batchUpdateOrderStatus`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (data.success) {
      Toast.fire({ icon: "success", title: data.message || "批次更新完成" });
    } else {
      const message = data.error || "批次更新失敗";
      await Swal.fire("提醒", message, data.updatedCount ? "warning" : "error");
    }
    await loadOrders();
  } catch (error) {
    Swal.fire("錯誤", error?.message || "批次更新失敗", "error");
  }
}

async function batchDeleteOrders() {
  const { API_URL, Swal, Toast, authFetch, getAuthUserId } = getServices();
  const orderIds = getSelectedOrderIds();
  if (!orderIds.length) {
    Swal.fire("提醒", "請先勾選至少一筆訂單", "warning");
    return;
  }

  const confirmDelete = await Swal.fire({
    title: `確定刪除 ${orderIds.length} 筆訂單？`,
    text: "此動作無法復原",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#DC322F",
    confirmButtonText: "批次刪除",
    cancelButtonText: "取消",
  });
  if (!confirmDelete.isConfirmed) return;

  try {
    const response = await authFetch(`${API_URL}?action=batchDeleteOrders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: getAuthUserId(),
        orderIds,
      }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error || "批次刪除失敗");
    selectedOrderIds.value = new Set();
    Toast.fire({ icon: "success", title: data.message || "批次刪除完成" });
    await loadOrders();
  } catch (error) {
    Swal.fire("錯誤", error?.message || "批次刪除失敗", "error");
  }
}

function csvEscape(value) {
  const str = String(value ?? "").replace(/\r?\n/g, " | ");
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildOrdersCsv(orderList) {
  const header = [
    "訂單編號",
    "建立時間",
    "顧客",
    "電話",
    "Email",
    "配送方式",
    "訂單狀態",
    "付款方式",
    "付款狀態",
    "付款期限",
    "付款確認時間",
    "付款同步時間",
    "金流狀態碼",
    "金額",
    "物流商",
    "物流單號",
    "追蹤網址",
    "地址或門市",
    "訂單內容",
    "備註",
    "是否索取收據",
    "收據統一編號",
    "收據買受人",
    "收據地址",
    "收據壓印日期",
  ];
  const rows = orderList.map((order) => {
    const receiptInfo = normalizeReceiptInfo(order.receiptInfo);
    const addressInfo =
      (order.deliveryMethod === "delivery" ||
          order.deliveryMethod === "home_delivery")
        ? `${order.city || ""}${order.district || ""} ${order.address || ""}`.trim()
        : `${order.storeName || ""}${order.storeId ? ` [${order.storeId}]` : ""}${
          order.storeAddress ? ` (${order.storeAddress})` : ""
        }`.trim();
    return [
      order.orderId || "",
      order.timestamp || "",
      order.lineName || "",
      order.phone || "",
      order.email || "",
      orderMethodLabel[order.deliveryMethod] || order.deliveryMethod || "",
      orderStatusLabel[order.status] || order.status || "",
      orderPayMethodLabel[order.paymentMethod || "cod"] ||
      order.paymentMethod ||
      "",
      orderPayStatusLabel[order.paymentStatus || ""] ||
      order.paymentStatus ||
      "",
      order.paymentExpiresAt || "",
      order.paymentConfirmedAt || "",
      order.paymentLastCheckedAt || "",
      order.paymentProviderStatusCode || "",
      Number(order.total) || 0,
      order.shippingProvider || "",
      order.trackingNumber || "",
      order.trackingUrl || "",
      addressInfo,
      order.items || "",
      order.note || "",
      receiptInfo ? "是" : "否",
      receiptInfo?.taxId || "",
      receiptInfo?.buyer || "",
      receiptInfo?.address || "",
      receiptInfo ? (receiptInfo.needDateStamp ? "需要" : "不需要") : "",
    ];
  });
  return [header, ...rows].map((cols) => cols.map(csvEscape).join(",")).join(
    "\r\n",
  );
}

function triggerCsvDownload(fileName, csvText) {
  const blob = new Blob(["\uFEFF" + csvText], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function getCsvTimestamp() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  return `${y}${m}${d}-${h}${min}`;
}

function exportFilteredOrdersCsv() {
  const { Swal, Toast } = getServices();
  if (!filteredOrders.value.length) {
    Swal.fire("提醒", "目前沒有可匯出的訂單", "warning");
    return;
  }
  const csvText = buildOrdersCsv(filteredOrders.value);
  triggerCsvDownload(`orders-filtered-${getCsvTimestamp()}.csv`, csvText);
  Toast.fire({
    icon: "success",
    title: `已匯出 ${filteredOrders.value.length} 筆`,
  });
}

function exportSelectedOrdersCsv() {
  const { Swal, Toast } = getServices();
  const selectedIds = new Set(getSelectedOrderIds());
  const selectedOrders = orders.value.filter((order) =>
    selectedIds.has(order.orderId)
  );
  if (!selectedOrders.length) {
    Swal.fire("提醒", "請先勾選要匯出的訂單", "warning");
    return;
  }
  const csvText = buildOrdersCsv(selectedOrders);
  triggerCsvDownload(`orders-selected-${getCsvTimestamp()}.csv`, csvText);
  Toast.fire({
    icon: "success",
    title: `已匯出 ${selectedOrders.length} 筆`,
  });
}

export function configureDashboardOrdersServices(nextServices) {
  services = {
    ...services,
    ...nextServices,
  };
}

export function getDashboardOrders() {
  return orders.value;
}

export function useDashboardOrders() {
  return {
    filters,
    batchForm,
    ordersView,
    ordersStatusOptions: orderStatusOptions,
    summaryText,
    selectedCountText,
    allFilteredSelected,
    selectAllIndeterminate,
    orderStatusText,
  };
}

export const dashboardOrdersActions = {
  loadOrders,
  renderOrders,
  deleteOrderById,
  toggleOrderSelection,
  toggleSelectAllOrders,
  batchUpdateOrders,
  batchDeleteOrders,
  exportFilteredOrdersCsv,
  exportSelectedOrdersCsv,
  setPendingOrderStatus,
  confirmOrderStatus,
};
