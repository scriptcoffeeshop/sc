import { computed, ref, type ComputedRef, type Ref } from "vue";
import type {
  CustomerPaymentDisplay,
  Order,
  ReceiptInfo,
  SessionUser,
} from "../../types/index";
import { getStorefrontErrorMessage } from "./storefrontErrors.ts";
import {
  formatDateTimeText,
  getCustomerPaymentDisplay,
  getPaymentToneClasses,
} from "./storefrontPaymentDisplay.ts";
import {
  getDefaultTrackingUrl,
  normalizeTrackingUrl,
} from "../../lib/trackingUrls.ts";

export interface OrderHistoryItem {
  orderId: string;
  statusLabel: string;
  deliveryMethodLabel: string;
  locationText: string;
  itemsText: string;
  totalText: string;
  receiptInfo: ReceiptInfo | null;
  showReceiptInfo: boolean;
  shippingProvider: string;
  trackingNumber: string;
  trackingUrl: string;
  hasShippingInfo: boolean;
  paymentDisplay: CustomerPaymentDisplay & { toneClass: string };
  paymentStatus: string;
  paymentLastCheckedAtText: string;
  paymentConfirmedAtText: string;
  paymentExpiresAtText: string;
}

interface OrderHistoryResponse {
  success?: boolean;
  orders?: Order[];
}

interface OrderHistoryToast {
  fire: (...args: unknown[]) => unknown;
}

interface OrderHistorySwal {
  fire: (...args: unknown[]) => Promise<unknown> | unknown;
}

interface OrderHistoryDeps {
  authFetch?: (
    input: RequestInfo | URL,
    init?: RequestInit,
  ) => Promise<{ json: () => Promise<unknown> }>;
  Swal?: OrderHistorySwal;
  Toast?: OrderHistoryToast;
  apiUrl?: string;
  getCurrentUser?: () => SessionUser | null;
  writeClipboard?: (text: string) => Promise<unknown> | unknown;
  getCustomerPaymentDisplay?: (
    order: Order,
    options: { context: "orderHistory" },
  ) => CustomerPaymentDisplay;
  formatDateTimeText?: (value: unknown) => string;
}

interface OrderHistoryState {
  isOrderHistoryOpen: Ref<boolean>;
  isLoadingOrderHistory: Ref<boolean>;
  orderHistoryError: Ref<string>;
  orderHistoryState: ComputedRef<"loading" | "error" | "empty" | "ready">;
  ordersView: ComputedRef<OrderHistoryItem[]>;
  openOrderHistory: () => Promise<void>;
  closeOrderHistory: () => void;
  loadMyOrders: () => Promise<void>;
  copyTrackingNumber: (trackingNumber: string) => Promise<void>;
}

const ORDER_STATUS_TEXT: Record<string, string> = {
  pending: "待處理",
  processing: "處理中",
  shipped: "已出貨",
  completed: "已完成",
  failed: "已失敗",
  cancelled: "已取消",
};

const DELIVERY_METHOD_TEXT: Record<string, string> = {
  delivery: "宅配",
  home_delivery: "全台宅配",
  seven_eleven: "7-11 取件",
  family_mart: "全家取件",
  in_store: "來店取貨",
};

function canShowTrackingUrl(order: Pick<Order, "deliveryMethod" | "status">) {
  const deliveryMethod = String(order.deliveryMethod || "").trim();
  if (deliveryMethod !== "delivery" && deliveryMethod !== "home_delivery") {
    return true;
  }

  const status = String(order.status || "").trim().toLowerCase();
  return status === "shipped" || status === "completed";
}

function normalizeReceiptInfo(raw: unknown): ReceiptInfo | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;

  const record = raw as Partial<ReceiptInfo>;
  const buyer = String(record.buyer || "").trim();
  const taxId = String(record.taxId || "").trim();
  const address = String(record.address || "").trim();
  const needDateStamp = Boolean(record.needDateStamp);
  if (taxId && !/^\d{8}$/.test(taxId)) return null;
  return { buyer, taxId, address, needDateStamp };
}

export function buildOrderHistoryItem(
  order: Order,
  deps: Pick<
    OrderHistoryDeps,
    "getCustomerPaymentDisplay" | "formatDateTimeText"
  > = {},
): OrderHistoryItem {
  const paymentStatus = String(order.paymentStatus || "").trim();
  const resolvePaymentDisplay = deps.getCustomerPaymentDisplay ||
    getCustomerPaymentDisplay;
  const resolveDateTimeText = deps.formatDateTimeText || formatDateTimeText;
  const paymentDisplay = resolvePaymentDisplay(order, {
    context: "orderHistory",
  });
  const receiptInfo = normalizeReceiptInfo(order.receiptInfo);
  const shouldShowTrackingUrl = canShowTrackingUrl(order);
  const customTrackingUrl = shouldShowTrackingUrl
    ? normalizeTrackingUrl(order.trackingUrl || "")
    : "";
  const defaultTrackingUrl = shouldShowTrackingUrl
    ? getDefaultTrackingUrl(order.deliveryMethod)
    : "";
  const trackingUrl = customTrackingUrl || defaultTrackingUrl;
  const locationText = order.storeName
    ? String(order.storeName)
    : order.city
    ? `${String(order.city)}${String(order.address || "")}`
    : "";

  return {
    orderId: String(order.orderId || ""),
    statusLabel: ORDER_STATUS_TEXT[order.status as string] ||
      String(order.status || ""),
    deliveryMethodLabel: DELIVERY_METHOD_TEXT[order.deliveryMethod as string] ||
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
    paymentLastCheckedAtText: resolveDateTimeText(order.paymentLastCheckedAt),
    paymentConfirmedAtText: resolveDateTimeText(order.paymentConfirmedAt),
    paymentExpiresAtText: resolveDateTimeText(order.paymentExpiresAt),
  };
}

export function useStorefrontOrderHistory(
  deps: OrderHistoryDeps = {},
): OrderHistoryState {
  const authFetchFn = deps.authFetch || globalThis.fetch?.bind(globalThis);
  const swal = deps.Swal || globalThis.Swal || { fire: async () => undefined };
  const toast = deps.Toast || { fire: () => undefined };
  const apiUrl = deps.apiUrl || "";
  const getCurrentUser = deps.getCurrentUser || (() => null);
  const writeClipboard = deps.writeClipboard || ((text: string) =>
    globalThis.navigator?.clipboard?.writeText?.(text));
  const resolvePaymentDisplay = deps.getCustomerPaymentDisplay ||
    getCustomerPaymentDisplay;
  const resolveDateTimeText = deps.formatDateTimeText || formatDateTimeText;

  const isOrderHistoryOpen = ref(false);
  const isLoadingOrderHistory = ref(false);
  const orderHistoryError = ref("");
  const rawOrders = ref<Order[]>([]);

  const ordersView = computed(() =>
    rawOrders.value.map((order) =>
      buildOrderHistoryItem(order, {
        getCustomerPaymentDisplay: resolvePaymentDisplay,
        formatDateTimeText: resolveDateTimeText,
      })
    )
  );

  const orderHistoryState = computed(() => {
    if (isLoadingOrderHistory.value) return "loading" as const;
    if (orderHistoryError.value) return "error" as const;
    if (!ordersView.value.length) return "empty" as const;
    return "ready" as const;
  });

  async function loadMyOrders() {
    isLoadingOrderHistory.value = true;
    orderHistoryError.value = "";
    try {
      if (!authFetchFn) throw new Error("訂單查詢尚未初始化");
      const response = await authFetchFn(
        `${apiUrl}?action=getMyOrders&_=${Date.now()}`,
      );
      const result = await response.json() as OrderHistoryResponse;
      if (
        !result.success || !Array.isArray(result.orders) ||
        !result.orders.length
      ) {
        rawOrders.value = [];
        return;
      }
      rawOrders.value = result.orders;
    } catch (error) {
      rawOrders.value = [];
      orderHistoryError.value = getStorefrontErrorMessage(error, "訂單載入失敗");
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

  async function copyTrackingNumber(trackingNumber: string) {
    const normalizedTrackingNumber = String(trackingNumber || "").trim();
    if (!normalizedTrackingNumber) return;
    try {
      await writeClipboard(normalizedTrackingNumber);
      toast.fire({ icon: "success", title: "單號已複製" });
    } catch (_error) {
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
