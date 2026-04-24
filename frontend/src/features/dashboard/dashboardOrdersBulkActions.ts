import { getFormControlValue } from "./dashboardOrdersView.ts";
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

export function createDashboardOrdersBulkActions(
  options: CreateDashboardOrdersBulkActionsOptions,
) {
  function getErrorMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message || fallback : fallback;
  }

  function asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value)
      ? value as Record<string, unknown>
      : {};
  }

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

    let trackingNumber;
    let shippingProvider;
    let trackingUrl;
    if (options.batchForm.status === "shipped") {
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
          const trackingNumberValue = getFormControlValue(
            "swal-batch-tracking-number",
          );
          const shippingProviderValue = getFormControlValue(
            "swal-batch-shipping-provider",
          );
          const trackingUrlValue = getFormControlValue("swal-batch-tracking-url");
          if (trackingUrlValue && !/^https?:\/\//i.test(trackingUrlValue)) {
            Swal.showValidationMessage?.(
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
      const shippingInfo = asRecord(value);
      trackingNumber = String(shippingInfo.trackingNumber || "");
      shippingProvider = String(shippingInfo.shippingProvider || "");
      trackingUrl = String(shippingInfo.trackingUrl || "");
    }

    const payload: Record<string, unknown> = {
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
      Swal.fire("錯誤", getErrorMessage(error, "批次更新失敗"), "error");
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
      Swal.fire("錯誤", getErrorMessage(error, "批次刪除失敗"), "error");
    }
  }

  return {
    batchDeleteOrders,
    batchUpdateOrders,
  };
}
