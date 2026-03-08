export function createOrdersActionHandlers(deps) {
  return {
    "reload-orders": () => deps.loadOrders(),
    "refund-linepay-order": (el) => {
      if (el.dataset.orderId) deps.linePayRefundOrder(el.dataset.orderId);
    },
    "confirm-transfer-payment": (el) => {
      if (el.dataset.orderId) deps.confirmTransferPayment(el.dataset.orderId);
    },
    "copy-tracking-number": (el) => {
      const trackingNumber = el.dataset.trackingNumber;
      if (!trackingNumber) return;
      navigator.clipboard.writeText(trackingNumber)
        .then(() => deps.Toast.fire({ icon: "success", title: "單號已複製" }))
        .catch(() => Swal.fire("錯誤", "複製失敗，請手動複製", "error"));
    },
    "delete-order": (el) => {
      if (el.dataset.orderId) deps.deleteOrderById(el.dataset.orderId);
    },
  };
}

export function createOrdersTabLoaders(deps) {
  return {
    orders: () => deps.loadOrders(),
  };
}
