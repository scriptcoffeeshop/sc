export function createOrdersActionHandlers(deps) {
  function getCheckedFromElement(el) {
    return el instanceof HTMLInputElement ? el.checked : false;
  }

  return {
    "reload-orders": () => deps.loadOrders(),
    "refund-linepay-order": (el) => {
      if (el.dataset.orderId) deps.linePayRefundOrder(el.dataset.orderId);
    },
    "confirm-transfer-payment": (el) => {
      if (el.dataset.orderId) deps.confirmTransferPayment(el.dataset.orderId);
    },
    "change-order-status": (el) => {
      if (el.dataset.orderId) {
        deps.changeOrderStatus(el.dataset.orderId, el.value);
      }
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
    "toggle-order-selection": (el) => {
      if (el.dataset.orderId) {
        deps.toggleOrderSelection(
          el.dataset.orderId,
          getCheckedFromElement(el),
        );
      }
    },
    "toggle-select-all-orders": (el) => {
      deps.toggleSelectAllOrders(getCheckedFromElement(el));
    },
    "batch-update-orders": () => deps.batchUpdateOrders(),
    "batch-delete-orders": () => deps.batchDeleteOrders(),
    "export-orders-csv": () => deps.exportFilteredOrdersCsv(),
    "export-selected-orders-csv": () => deps.exportSelectedOrdersCsv(),
  };
}

export function createOrdersTabLoaders(deps) {
  return {
    orders: () => deps.loadOrders(),
  };
}
