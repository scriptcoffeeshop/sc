import { getDashboardErrorMessage } from "./dashboardErrors.ts";
import { openDashboardOrderReasonDialog } from "./dashboardOrderReasonDialog.ts";
import { openDashboardShippingInfoDialog } from "./dashboardShippingInfoDialog.ts";
import type {
  DashboardAuthFetch,
  DashboardOrderRecord,
  DashboardSwal,
  DashboardToast,
} from "./dashboardOrderTypes.ts";

type OrderStatusControllerDeps = {
  API_URL: string;
  authFetch: DashboardAuthFetch;
  getAuthUserId: () => string;
  getOrders: () => DashboardOrderRecord[];
  loadOrders: () => Promise<unknown> | unknown;
  previewOrderStatusNotification?: (
    order: DashboardOrderRecord,
    status: string,
  ) => Promise<unknown> | unknown;
  Toast: DashboardToast;
  Swal: DashboardSwal;
  esc: (value: unknown) => string;
  orderStatusLabel: Record<string, string>;
};

export function createOrderStatusController(deps: OrderStatusControllerDeps) {
  function getOrders() {
    return Array.isArray(deps.getOrders?.()) ? deps.getOrders() : [];
  }

  async function changeOrderStatus(orderId: string, status: string) {
    try {
      const targetOrder = getOrders().find((order) => order.orderId === orderId) ||
        ({ orderId, timestamp: "" } as DashboardOrderRecord);
      const currentStatus = targetOrder.status || "";
      const newStatusLabel = deps.orderStatusLabel[status] || status;

      let trackingNumber = "";
      let shippingProvider = "";
      let trackingUrl = "";
      let cancelReason = "";
      if (status === "shipped") {
        const { value: shippingInfo, isConfirmed } = await openDashboardShippingInfoDialog({
          Swal: deps.Swal,
          title: "設定已出貨",
          confirmButtonText: "確定出貨",
          initialValues: {
            trackingNumber: String(targetOrder.trackingNumber || ""),
            shippingProvider: String(targetOrder.shippingProvider || ""),
            trackingUrl: String(targetOrder.trackingUrl || ""),
          },
        });
        if (!isConfirmed) {
          deps.loadOrders();
          return;
        }
        const shippingInfoRecord = shippingInfo && typeof shippingInfo === "object"
          ? shippingInfo
          : {};
        trackingNumber = String(shippingInfoRecord.trackingNumber || "");
        shippingProvider = String(shippingInfoRecord.shippingProvider || "");
        trackingUrl = String(shippingInfoRecord.trackingUrl || "");
      } else if (status === "cancelled" || status === "failed") {
        const reasonLabel = status === "failed" ? "失敗原因" : "取消原因";
        const title = status === "failed" ? "設定失敗訂單" : "設定已取消";
        const confirmButtonText = status === "failed" ? "確認失敗" : "確認取消";
        const placeholder = status === "failed"
          ? "請輸入失敗原因，例如：付款逾時未完成"
          : "請輸入取消原因，例如：付款逾時未完成";
        const { value: cancelInfo, isConfirmed } = await openDashboardOrderReasonDialog({
          Swal: deps.Swal,
          title,
          label: reasonLabel,
          placeholder,
          confirmButtonText,
          initialReason: String(targetOrder.cancelReason || "").trim(),
        });
        if (!isConfirmed) {
          deps.loadOrders();
          return;
        }
        cancelReason = String(cancelInfo?.cancelReason || "").trim();
      } else {
        const confirmation = await deps.Swal.fire({
          title: "確認變更訂單狀態",
          html: `訂單 <b>#${deps.esc(orderId)}</b><br>
          <span class="ui-text-muted">${
            deps.esc(deps.orderStatusLabel[currentStatus] || currentStatus)
          }</span>
          → <span class="ui-text-warning font-bold">${
            deps.esc(newStatusLabel)
          }</span>`,
          icon: "question",
          showCancelButton: true,
          confirmButtonText: "確認變更",
          cancelButtonText: "取消",
          confirmButtonColor: "#268BD2",
        });
        if (!confirmation.isConfirmed) {
          deps.loadOrders();
          return;
        }
      }

      const payload: Record<string, unknown> = {
        userId: deps.getAuthUserId(),
        orderId,
        status,
      };
      if (status === "shipped") {
        payload.trackingNumber = trackingNumber;
        payload.shippingProvider = shippingProvider;
        payload.trackingUrl = trackingUrl;
      } else if (status === "cancelled" || status === "failed") {
        payload.cancelReason = cancelReason;
      } else {
        payload.cancelReason = "";
      }

      const response = await deps.authFetch(`${deps.API_URL}?action=updateOrderStatus`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || "更新訂單狀態失敗");

      deps.Toast.fire({ icon: "success", title: "狀態已更新" });

      const flexOrder: DashboardOrderRecord = {
        ...targetOrder,
        orderId,
        timestamp: targetOrder.timestamp || "",
        status,
      };
      if (status === "shipped") {
        flexOrder.trackingNumber = trackingNumber || "";
        flexOrder.shippingProvider = shippingProvider || "";
        flexOrder.trackingUrl = trackingUrl || "";
      } else if (status === "cancelled" || status === "failed") {
        flexOrder.cancelReason = cancelReason;
      } else {
        flexOrder.cancelReason = "";
      }

      await deps.loadOrders();
      if (deps.previewOrderStatusNotification) {
        await deps.previewOrderStatusNotification(flexOrder, status);
      }
    } catch (error) {
      deps.Swal.fire("錯誤", getDashboardErrorMessage(error, "更新訂單狀態失敗"), "error");
    }
  }

  async function refundOnlinePayOrder(orderId: string, paymentMethod = "linepay") {
    const normalizedMethod = String(paymentMethod || "").trim().toLowerCase();
    const isJkoPay = normalizedMethod === "jkopay";
    const action = isJkoPay ? "jkoPayRefund" : "linePayRefund";
    const title = isJkoPay ? "街口支付退款" : "LINE Pay 退款";

    const confirmation = await deps.Swal.fire({
      title,
      text: `確定要對訂單 #${orderId} 進行退款嗎？`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#6C71C4",
      confirmButtonText: "確認退款",
      cancelButtonText: "取消",
    });
    if (!confirmation.isConfirmed) return;

    deps.Swal.fire({
      title: `${isJkoPay ? "街口" : "LINE Pay"} 退款處理中...`,
      allowOutsideClick: false,
      didOpen: () => deps.Swal.showLoading(),
    });
    try {
      const response = await deps.authFetch(`${deps.API_URL}?action=${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: deps.getAuthUserId(), orderId }),
      });
      const result = await response.json();
      if (!result.success) {
        deps.Swal.fire("退款失敗", result.error, "error");
        return;
      }
      deps.Toast.fire({ icon: "success", title: "退款成功" });
      await deps.loadOrders();
    } catch (error) {
      deps.Swal.fire("錯誤", getDashboardErrorMessage(error, "退款失敗"), "error");
    }
  }

  async function confirmTransferPayment(orderId: string) {
    const confirmation = await deps.Swal.fire({
      title: "確認收款",
      text: `確認已收到訂單 #${orderId} 的匯款？`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "確認已收款",
      cancelButtonText: "取消",
    });
    if (!confirmation.isConfirmed) return;

    try {
      const response = await deps.authFetch(`${deps.API_URL}?action=updateOrderStatus`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: deps.getAuthUserId(),
          orderId,
          status: "processing",
          paymentStatus: "paid",
        }),
      });
      const result = await response.json();
      if (!result.success) {
        deps.Swal.fire("錯誤", result.error, "error");
        return;
      }
      deps.Toast.fire({ icon: "success", title: "已確認收款" });
      await deps.loadOrders();
    } catch (error) {
      deps.Swal.fire("錯誤", getDashboardErrorMessage(error, "確認收款失敗"), "error");
    }
  }

  return {
    changeOrderStatus,
    refundOnlinePayOrder,
    confirmTransferPayment,
  };
}
