function getFormControlValue(id: string): string {
  const element = document.getElementById(id);
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  ) {
    return element.value.trim();
  }
  return "";
}

export function createOrderStatusController(deps) {
  function getOrders() {
    return Array.isArray(deps.getOrders?.()) ? deps.getOrders() : [];
  }

  async function changeOrderStatus(orderId, status) {
    try {
      const targetOrder = getOrders().find((order) => order.orderId === orderId) ||
        {};
      const currentStatus = targetOrder.status || "";
      const newStatusLabel = deps.orderStatusLabel[status] || status;

      let trackingNumber;
      let shippingProvider;
      let trackingUrl;
      let cancelReason = "";
      if (status === "shipped") {
        const { value: shippingInfo, isConfirmed } = await deps.Swal.fire({
          title: "設定已出貨",
          html: `
          <div class="text-left space-y-2">
            <label class="text-sm ui-text-strong block">物流單號（可選）</label>
            <input id="swal-tracking-number" class="swal2-input" placeholder="請輸入物流單號" value="${
            deps.esc(targetOrder.trackingNumber || "")
          }">
            <label class="text-sm ui-text-strong block">物流商（可選）</label>
            <input id="swal-shipping-provider" class="swal2-input" placeholder="例如：黑貓宅急便" value="${
            deps.esc(targetOrder.shippingProvider || "")
          }">
            <label class="text-sm ui-text-strong block">物流追蹤網址（可選）</label>
            <input id="swal-tracking-url" class="swal2-input" placeholder="https://..." value="${
            deps.esc(targetOrder.trackingUrl || "")
          }">
          </div>
        `,
          showCancelButton: true,
          confirmButtonText: "確定出貨",
          cancelButtonText: "取消",
          confirmButtonColor: "#268BD2",
          focusConfirm: false,
          preConfirm: () => {
            const trackingNumberValue = getFormControlValue(
              "swal-tracking-number",
            );
            const shippingProviderValue = getFormControlValue(
              "swal-shipping-provider",
            );
            const trackingUrlValue = getFormControlValue("swal-tracking-url");
            if (
              trackingUrlValue &&
              !/^https?:\/\//i.test(trackingUrlValue)
            ) {
              deps.Swal.showValidationMessage(
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
        if (!isConfirmed) {
          deps.loadOrders();
          return;
        }
        trackingNumber = shippingInfo?.trackingNumber || "";
        shippingProvider = shippingInfo?.shippingProvider || "";
        trackingUrl = shippingInfo?.trackingUrl || "";
      } else if (status === "cancelled" || status === "failed") {
        const reasonLabel = status === "failed" ? "失敗原因" : "取消原因";
        const title = status === "failed" ? "設定失敗訂單" : "設定已取消";
        const confirmButtonText = status === "failed" ? "確認失敗" : "確認取消";
        const placeholder = status === "failed"
          ? "請輸入失敗原因，例如：付款逾時未完成"
          : "請輸入取消原因，例如：付款逾時未完成";
        const { value: cancelInfo, isConfirmed } = await deps.Swal.fire({
          title,
          html: `
          <div class="text-left space-y-2">
            <label class="text-sm ui-text-strong block">${reasonLabel}（選填）</label>
            <textarea id="swal-cancel-reason" class="swal2-textarea" placeholder="${placeholder}">${
            deps.esc(String(targetOrder.cancelReason || "").trim())
          }</textarea>
          </div>
        `,
          showCancelButton: true,
          confirmButtonText,
          cancelButtonText: "取消",
          confirmButtonColor: "#DC322F",
          focusConfirm: false,
          preConfirm: () => {
            const reasonValue = getFormControlValue("swal-cancel-reason");
            return { cancelReason: reasonValue };
          },
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

      const payload: Record<string, any> = {
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
      if (!result.success) throw new Error(result.error);

      deps.Toast.fire({ icon: "success", title: "狀態已更新" });

      const flexOrder = {
        ...targetOrder,
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
      deps.Swal.fire("錯誤", error.message, "error");
    }
  }

  async function refundOnlinePayOrder(orderId, paymentMethod = "linepay") {
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
      deps.Swal.fire("錯誤", error.message, "error");
    }
  }

  async function confirmTransferPayment(orderId) {
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
      deps.Swal.fire("錯誤", error.message, "error");
    }
  }

  return {
    changeOrderStatus,
    refundOnlinePayOrder,
    confirmTransferPayment,
  };
}
