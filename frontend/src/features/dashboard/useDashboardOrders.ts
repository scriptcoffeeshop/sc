import { computed, reactive, ref } from "vue";
import { createDashboardOrdersBulkActions } from "./dashboardOrdersBulkActions.ts";
import {
  buildOrdersCsv,
  getCsvTimestamp,
  triggerCsvDownload,
} from "./dashboardOrdersExport.ts";
import {
  getSelectedOrderIds,
  setPendingOrderStatus,
  syncPendingStatuses,
  syncSelectedOrderIds,
  toggleOrderSelection,
  toggleSelectAllOrders,
} from "./dashboardOrdersSelection.ts";
import {
  buildOrderViewModel,
  buildOrdersSummaryText,
  filterDashboardOrders,
} from "./dashboardOrdersView.ts";
import type {
  DashboardOrderRecord,
  DashboardOrderServices,
} from "./dashboardOrderTypes.ts";
import { orderStatusLabel, orderStatusOptions } from "./orderShared.ts";

const orders = ref<DashboardOrderRecord[]>([]);
const selectedOrderIds = ref<Set<string>>(new Set());
const pendingStatusByOrderId = ref<Record<string, string>>({});

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

let services: DashboardOrderServices | null = null;

function getServices(): DashboardOrderServices {
  if (!services) {
    throw new Error("Dashboard orders services 尚未初始化");
  }
  return services;
}

const filteredOrders = computed(() =>
  filterDashboardOrders(orders.value, filters)
);

const selectedCount = computed(() =>
  getSelectedOrderIds(orders.value, selectedOrderIds.value).length
);

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

const summaryText = computed(() =>
  buildOrdersSummaryText(orders.value, filteredOrders.value)
);

const selectedCountText = computed(() => `已選 ${selectedCount.value} 筆`);

const ordersView = computed(() =>
  filteredOrders.value.map((order) =>
    buildOrderViewModel(
      order,
      pendingStatusByOrderId.value[order.orderId] || "",
      selectedOrderIds.value.has(order.orderId),
    )
  )
);

function orderStatusText(status: string) {
  return orderStatusLabel[status] || status;
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
    syncSelectedOrderIds(orders, selectedOrderIds);
    syncPendingStatuses(orders, pendingStatusByOrderId);
  } catch (error) {
    console.error(error);
  }
}

async function deleteOrderById(orderId: string) {
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
    const message = error instanceof Error ? error.message || "刪除失敗" : "刪除失敗";
    Swal.fire("錯誤", message, "error");
  }
}

async function confirmOrderStatus(orderId: string) {
  const { changeOrderStatus } = getServices();
  const nextStatus = pendingStatusByOrderId.value[orderId];
  if (!nextStatus || !changeOrderStatus) return;
  await changeOrderStatus(orderId, nextStatus);
}

const { batchUpdateOrders, batchDeleteOrders } = createDashboardOrdersBulkActions({
  batchForm,
  getSelectedOrderIds: () => getSelectedOrderIds(orders.value, selectedOrderIds.value),
  getServices,
  loadOrders,
  resetSelection: () => {
    selectedOrderIds.value = new Set<string>();
  },
});

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
  const selectedIds = new Set(
    getSelectedOrderIds(orders.value, selectedOrderIds.value),
  );
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

function copyTrackingNumber(trackingNumber: string) {
  const { Swal, Toast } = getServices();
  const normalizedTrackingNumber = String(trackingNumber || "").trim();
  if (!normalizedTrackingNumber) return;

  navigator.clipboard.writeText(normalizedTrackingNumber)
    .then(() => Toast.fire({ icon: "success", title: "單號已複製" }))
    .catch(() => Swal.fire("錯誤", "複製失敗，請手動複製", "error"));
}

function showFlexHistory() {
  getServices().showFlexHistory?.();
}

function sendOrderFlexByOrderId(orderId: string) {
  return getServices().sendOrderFlexByOrderId?.(orderId);
}

function sendOrderEmailByOrderId(orderId: string) {
  return getServices().sendOrderEmailByOrderId?.(orderId);
}

function refundOnlinePayOrder(orderId: string, paymentMethod: string) {
  return getServices().refundOnlinePayOrder?.(orderId, paymentMethod);
}

function confirmTransferPayment(orderId: string) {
  return getServices().confirmTransferPayment?.(orderId);
}

export function configureDashboardOrdersServices(nextServices: DashboardOrderServices) {
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
  deleteOrderById,
  toggleOrderSelection: (orderId: string, checked: boolean) =>
    toggleOrderSelection(selectedOrderIds, orderId, checked),
  toggleSelectAllOrders: (checked: boolean) =>
    toggleSelectAllOrders(
      selectedOrderIds,
      filteredOrders.value.map((order) => order.orderId),
      checked,
    ),
  batchUpdateOrders,
  batchDeleteOrders,
  exportFilteredOrdersCsv,
  exportSelectedOrdersCsv,
  setPendingOrderStatus: (orderId: string, status: string) =>
    setPendingOrderStatus(orders, pendingStatusByOrderId, orderId, status),
  confirmOrderStatus,
  copyTrackingNumber,
  showFlexHistory,
  sendOrderFlexByOrderId,
  sendOrderEmailByOrderId,
  refundOnlinePayOrder,
  confirmTransferPayment,
};
