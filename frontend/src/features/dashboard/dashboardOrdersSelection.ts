import type { Ref } from "vue";

type DashboardOrderRecord = Record<string, any>;

export function getSelectedOrderIds(
  orderList: DashboardOrderRecord[],
  selectedOrderIds: Set<string>,
) {
  const orderIds = new Set(orderList.map((order) => order.orderId));
  return [...selectedOrderIds].filter((orderId) => orderIds.has(orderId));
}

export function syncSelectedOrderIds(
  orders: Ref<DashboardOrderRecord[]>,
  selectedOrderIds: Ref<Set<string>>,
) {
  selectedOrderIds.value = new Set(
    getSelectedOrderIds(orders.value, selectedOrderIds.value),
  );
}

export function syncPendingStatuses(
  orders: Ref<DashboardOrderRecord[]>,
  pendingStatusByOrderId: Ref<Record<string, string>>,
) {
  const nextPendingStatusByOrderId: Record<string, string> = {};
  for (const order of orders.value) {
    const nextStatus = pendingStatusByOrderId.value[order.orderId];
    if (nextStatus && nextStatus !== order.status) {
      nextPendingStatusByOrderId[order.orderId] = nextStatus;
    }
  }
  pendingStatusByOrderId.value = nextPendingStatusByOrderId;
}

export function toggleOrderSelection(
  selectedOrderIds: Ref<Set<string>>,
  orderId: string,
  checked: boolean,
) {
  const nextSelectedOrderIds = new Set(selectedOrderIds.value);
  if (checked) nextSelectedOrderIds.add(orderId);
  else nextSelectedOrderIds.delete(orderId);
  selectedOrderIds.value = nextSelectedOrderIds;
}

export function toggleSelectAllOrders(
  selectedOrderIds: Ref<Set<string>>,
  visibleOrderIds: string[],
  checked: boolean,
) {
  const nextSelectedOrderIds = new Set(selectedOrderIds.value);
  visibleOrderIds.forEach((orderId) => {
    if (checked) nextSelectedOrderIds.add(orderId);
    else nextSelectedOrderIds.delete(orderId);
  });
  selectedOrderIds.value = nextSelectedOrderIds;
}

export function setPendingOrderStatus(
  orders: Ref<DashboardOrderRecord[]>,
  pendingStatusByOrderId: Ref<Record<string, string>>,
  orderId: string,
  status: string,
) {
  const nextPendingStatusByOrderId = { ...pendingStatusByOrderId.value };
  const currentStatus = orders.value.find((order) => order.orderId === orderId)
    ?.status || "";
  if (!status || status === currentStatus) {
    delete nextPendingStatusByOrderId[orderId];
  } else {
    nextPendingStatusByOrderId[orderId] = status;
  }
  pendingStatusByOrderId.value = nextPendingStatusByOrderId;
}
