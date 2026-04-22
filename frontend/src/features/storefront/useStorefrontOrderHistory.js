import { computed, ref } from "vue";
import { state } from "../../../../js/state.js";
import { API_URL } from "../../../../js/config.js";
import { authFetch } from "../../../../js/auth.js";
import { Toast } from "../../../../js/utils.js";
import {
  formatDateTimeText,
  getCustomerPaymentDisplay,
} from "../../../../js/orders.js";

const ORDER_STATUS_TEXT = {
  pending: "待處理",
  processing: "處理中",
  shipped: "已出貨",
  completed: "已完成",
  failed: "已失敗",
  cancelled: "已取消",
};

const DELIVERY_METHOD_TEXT = {
  delivery: "宅配",
  home_delivery: "全台宅配",
  seven_eleven: "7-11 取件",
  family_mart: "全家取件",
  in_store: "來店取貨",
};

function normalizeTrackingUrl(url) {
  const raw = String(url || "").trim();
  if (!raw || !/^https?:\/\//i.test(raw)) return "";
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    return parsed.toString();
  } catch {
    return "";
  }
}

function getDefaultTrackingUrl(deliveryMethod) {
  if (deliveryMethod === "seven_eleven") {
    return "https://eservice.7-11.com.tw/e-tracking/search.aspx";
  }
  if (deliveryMethod === "family_mart") {
    return "https://fmec.famiport.com.tw/FP_Entrance/QueryBox";
  }
  if (deliveryMethod === "delivery" || deliveryMethod === "home_delivery") {
    return "https://postserv.post.gov.tw/pstmail/main_mail.html?targetTxn=EB500100";
  }
  return "";
}

function normalizeReceiptInfo(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const buyer = String(raw.buyer || "").trim();
  const taxId = String(raw.taxId || "").trim();
  const address = String(raw.address || "").trim();
  const needDateStamp = Boolean(raw.needDateStamp);
  if (taxId && !/^\d{8}$/.test(taxId)) return null;
  return { buyer, taxId, address, needDateStamp };
}

function getPaymentToneClasses(tone) {
  if (tone === "success") return "border-green-200 bg-green-50 text-green-900";
  if (tone === "info") return "border-sky-200 bg-sky-50 text-sky-900";
  if (tone === "warning") return "border-amber-200 bg-amber-50 text-amber-900";
  if (tone === "danger") return "border-rose-200 bg-rose-50 text-rose-900";
  return "border-slate-200 bg-slate-50 text-slate-900";
}

function buildOrderHistoryItem(order) {
  const paymentStatus = String(order.paymentStatus || "").trim();
  const paymentDisplay = getCustomerPaymentDisplay(order, {
    context: "orderHistory",
  });
  const receiptInfo = normalizeReceiptInfo(order.receiptInfo);
  const customTrackingUrl = normalizeTrackingUrl(order.trackingUrl || "");
  const defaultTrackingUrl = getDefaultTrackingUrl(order.deliveryMethod);
  const trackingUrl = customTrackingUrl || defaultTrackingUrl;
  const locationText = order.storeName
    ? String(order.storeName)
    : order.city
    ? `${String(order.city)}${String(order.address || "")}`
    : "";

  return {
    orderId: String(order.orderId || ""),
    statusLabel: ORDER_STATUS_TEXT[order.status] || String(order.status || ""),
    deliveryMethodLabel: DELIVERY_METHOD_TEXT[order.deliveryMethod] ||
      String(order.deliveryMethod || ""),
    locationText,
    itemsText: String(order.items || ""),
    totalText: `$${String(order.total ?? 0)}`,
    receiptInfo,
    showReceiptInfo: Boolean(receiptInfo),
    shippingProvider: String(order.shippingProvider || "").trim(),
    trackingNumber: String(order.trackingNumber || "").trim(),
    trackingUrl,
    hasShippingInfo: Boolean(
      String(order.shippingProvider || "").trim() ||
      String(order.trackingNumber || "").trim() ||
      trackingUrl,
    ),
    paymentDisplay: {
      ...paymentDisplay,
      toneClass: getPaymentToneClasses(paymentDisplay.tone),
    },
    paymentStatus,
    paymentLastCheckedAtText: formatDateTimeText(order.paymentLastCheckedAt),
    paymentConfirmedAtText: formatDateTimeText(order.paymentConfirmedAt),
    paymentExpiresAtText: formatDateTimeText(order.paymentExpiresAt),
  };
}

export function useStorefrontOrderHistory(deps = {}) {
  const authFetchFn = deps.authFetch || authFetch;
  const swal = deps.Swal || Swal;
  const toast = deps.Toast || Toast;
  const apiUrl = deps.apiUrl || API_URL;
  const getCurrentUser = deps.getCurrentUser || (() => state.currentUser);
  const writeClipboard = deps.writeClipboard || ((text) =>
    navigator.clipboard.writeText(text));

  const isOrderHistoryOpen = ref(false);
  const isLoadingOrderHistory = ref(false);
  const orderHistoryError = ref("");
  const rawOrders = ref([]);

  const ordersView = computed(() => rawOrders.value.map(buildOrderHistoryItem));

  const orderHistoryState = computed(() => {
    if (isLoadingOrderHistory.value) return "loading";
    if (orderHistoryError.value) return "error";
    if (!ordersView.value.length) return "empty";
    return "ready";
  });

  async function loadMyOrders() {
    isLoadingOrderHistory.value = true;
    orderHistoryError.value = "";
    try {
      const response = await authFetchFn(
        `${apiUrl}?action=getMyOrders&_=${Date.now()}`,
      );
      const result = await response.json();
      if (!result.success || !Array.isArray(result.orders) || !result.orders.length) {
        rawOrders.value = [];
        return;
      }
      rawOrders.value = result.orders;
    } catch (error) {
      rawOrders.value = [];
      orderHistoryError.value = error?.message || "訂單載入失敗";
    } finally {
      isLoadingOrderHistory.value = false;
    }
  }

  async function openOrderHistory() {
    if (!getCurrentUser()) {
      await swal.fire("請先登入", "", "info");
      return;
    }
    isOrderHistoryOpen.value = true;
    await loadMyOrders();
  }

  function closeOrderHistory() {
    isOrderHistoryOpen.value = false;
  }

  async function copyTrackingNumber(trackingNumber) {
    const normalizedTrackingNumber = String(trackingNumber || "").trim();
    if (!normalizedTrackingNumber) return;
    try {
      await writeClipboard(normalizedTrackingNumber);
      toast.fire({ icon: "success", title: "單號已複製" });
    } catch {
      await swal.fire("錯誤", "複製失敗，請手動複製", "error");
    }
  }

  return {
    isOrderHistoryOpen,
    isLoadingOrderHistory,
    orderHistoryError,
    orderHistoryState,
    ordersView,
    openOrderHistory,
    closeOrderHistory,
    loadMyOrders,
    copyTrackingNumber,
  };
}
