import type { Ref } from "vue";
import type { DashboardOrderRecord } from "./dashboardOrderTypes.ts";

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
  pendingStatusNoteByOrderId?: Ref<Record<string, string>>,
) {
  const nextPendingStatusByOrderId: Record<string, string> = {};
  const nextPendingStatusNoteByOrderId: Record<string, string> = {};
  for (const order of orders.value) {
    const nextStatus = pendingStatusByOrderId.value[order.orderId];
    if (nextStatus && nextStatus !== order.status) {
      nextPendingStatusByOrderId[order.orderId] = nextStatus;
      if (pendingStatusNoteByOrderId) {
        nextPendingStatusNoteByOrderId[order.orderId] =
          pendingStatusNoteByOrderId.value[order.orderId] || "";
      }
    }
  }
  pendingStatusByOrderId.value = nextPendingStatusByOrderId;
  if (pendingStatusNoteByOrderId) {
    pendingStatusNoteByOrderId.value = nextPendingStatusNoteByOrderId;
  }
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
  pendingStatusNoteByOrderId: Ref<Record<string, string>>,
  orderId: string,
  status: string,
) {
  const nextPendingStatusByOrderId = { ...pendingStatusByOrderId.value };
  const nextPendingStatusNoteByOrderId = { ...pendingStatusNoteByOrderId.value };
  const currentStatus = orders.value.find((order) => order.orderId === orderId)
    ?.status || "";
  if (!status || status === currentStatus) {
    delete nextPendingStatusByOrderId[orderId];
    delete nextPendingStatusNoteByOrderId[orderId];
  } else {
    nextPendingStatusByOrderId[orderId] = status;
    if (!(orderId in nextPendingStatusNoteByOrderId)) {
      const currentStatusNote = orders.value.find((order) =>
        order.orderId === orderId
      )?.statusNote || "";
      nextPendingStatusNoteByOrderId[orderId] = String(currentStatusNote || "");
    }
  }
  pendingStatusByOrderId.value = nextPendingStatusByOrderId;
  pendingStatusNoteByOrderId.value = nextPendingStatusNoteByOrderId;
}

export function setPendingOrderStatusNote(
  pendingStatusNoteByOrderId: Ref<Record<string, string>>,
  orderId: string,
  statusNote: string,
) {
  pendingStatusNoteByOrderId.value = {
    ...pendingStatusNoteByOrderId.value,
    [orderId]: statusNote,
  };
}
