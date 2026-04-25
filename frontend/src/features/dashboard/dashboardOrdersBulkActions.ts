import { getDashboardErrorMessage } from "./dashboardErrors.ts";
import { openDashboardShippingInfoDialog } from "./dashboardShippingInfoDialog.ts";
import type { DashboardOrderServices } from "./dashboardOrderTypes.ts";

type CreateDashboardOrdersBulkActionsOptions = {
  batchForm: {
    status: string;
    paymentStatus: string;
  };
  getSelectedOrderIds: () => string[];
  getServices: () => DashboardOrderServices;
  loadOrders: () => Promise<void>;
  resetSelection: () => void;
};

interface BatchUpdateOrderPayload {
  userId: string;
  orderIds: string[];
  status: string;
  paymentStatus?: string;
  trackingNumber?: string;
  shippingProvider?: string;
  trackingUrl?: string;
}

export function createDashboardOrdersBulkActions(
  options: CreateDashboardOrdersBulkActionsOptions,
) {
  async function batchUpdateOrders() {
    const { API_URL, Swal, Toast, authFetch, getAuthUserId } = options
      .getServices();
    const orderIds = options.getSelectedOrderIds();
    if (!orderIds.length) {
      Swal.fire("提醒", "請先勾選至少一筆訂單", "warning");
      return;
    }

    if (!options.batchForm.status) {
      Swal.fire("提醒", "請先選擇批次狀態", "warning");
      return;
    }

    let trackingNumber = "";
    let shippingProvider = "";
    let trackingUrl = "";
    if (options.batchForm.status === "shipped") {
      const { value, isConfirmed } = await openDashboardShippingInfoDialog({
        Swal,
        title: "批次出貨設定",
        confirmButtonText: "確定",
        idPrefix: "swal-batch",
        shared: true,
      });
      if (!isConfirmed) return;
      const shippingInfo = value && typeof value === "object" ? value : {};
      trackingNumber = String(shippingInfo.trackingNumber || "");
      shippingProvider = String(shippingInfo.shippingProvider || "");
      trackingUrl = String(shippingInfo.trackingUrl || "");
    }

    const payload: BatchUpdateOrderPayload = {
      userId: getAuthUserId(),
      orderIds,
      status: options.batchForm.status,
    };
    if (options.batchForm.paymentStatus !== "__keep__") {
      payload.paymentStatus = options.batchForm.paymentStatus;
    }
    if (options.batchForm.status === "shipped") {
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
        Toast.fire({
          icon: "success",
          title: String(data.message || "批次更新完成"),
        });
      } else {
        const message = String(data.error || "批次更新失敗");
        await Swal.fire(
          "提醒",
          message,
          data.updatedCount ? "warning" : "error",
        );
      }
      await options.loadOrders();
    } catch (error) {
      Swal.fire("錯誤", getDashboardErrorMessage(error, "批次更新失敗"), "error");
    }
  }

  async function batchDeleteOrders() {
    const { API_URL, Swal, Toast, authFetch, getAuthUserId } = options
      .getServices();
    const orderIds = options.getSelectedOrderIds();
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
      if (!data.success) throw new Error(String(data.error || "批次刪除失敗"));
      options.resetSelection();
      Toast.fire({
        icon: "success",
        title: String(data.message || "批次刪除完成"),
      });
      await options.loadOrders();
    } catch (error) {
      Swal.fire("錯誤", getDashboardErrorMessage(error, "批次刪除失敗"), "error");
    }
  }

  return {
    batchDeleteOrders,
    batchUpdateOrders,
  };
}
