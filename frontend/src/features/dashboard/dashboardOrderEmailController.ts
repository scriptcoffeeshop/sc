import type { DashboardOrderNotificationDeps } from "./dashboardOrderNotificationTypes";
import { getDashboardErrorMessage } from "./dashboardErrors.ts";

export function createOrderEmailController(
  deps: DashboardOrderNotificationDeps,
) {
  function getOrders() {
    return Array.isArray(deps.getOrders?.()) ? deps.getOrders() : [];
  }

  async function sendOrderEmailByOrderId(orderId: string) {
    const targetOrder = getOrders().find((order) => order.orderId === orderId);
    if (!targetOrder) {
      deps.Swal.fire("錯誤", "找不到訂單資料，請先重整列表", "error");
      return;
    }
    const targetEmail = String(targetOrder.email || "").trim();
    if (!targetEmail) {
      deps.Swal.fire("提醒", "此訂單沒有 Email，無法發送信件", "warning");
      return;
    }

    const status = String(targetOrder.status || "pending");
    const statusLabel = deps.orderStatusLabel[status] || status;
    const emailTypeLabel = status === "shipped"
      ? "出貨通知"
      : status === "processing"
      ? "處理中通知"
      : status === "completed"
      ? "完成通知"
      : status === "failed"
      ? "失敗通知"
      : status === "cancelled"
      ? "取消通知"
      : "成立確認信";

    const confirm = await deps.Swal.fire({
      title: "確認發送信件",
      html: `訂單 <b>#${deps.esc(orderId)}</b><br>
      將寄送「<b>${deps.esc(emailTypeLabel)}</b>」到<br>
      <span class="ui-text-highlight">${deps.esc(targetEmail)}</span><br>
      <span class="text-xs ui-text-subtle">（目前狀態：${deps.esc(statusLabel)}）</span>`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "發送信件",
      cancelButtonText: "取消",
      confirmButtonColor: "#268BD2",
    });
    if (!confirm.isConfirmed) return;

    try {
      const response = await deps.authFetch(`${deps.API_URL}?action=sendOrderEmail`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: deps.getAuthUserId(),
          orderId,
        }),
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(String(result.error || "信件發送失敗"));
      }
      deps.Toast.fire({ icon: "success", title: result.message || "信件已發送" });
    } catch (error) {
      deps.Swal.fire("錯誤", getDashboardErrorMessage(error, "信件發送失敗"), "error");
    }
  }

  return {
    sendOrderEmailByOrderId,
  };
}
