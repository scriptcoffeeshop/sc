import { fulfillJson } from "./smoke-shared.ts";
import {
  applyOrderUpdate,
  asString,
  asStringArray,
  getRequestBody,
  type DashboardRouteContext,
} from "./smoke-dashboard-state.ts";

export async function handleDashboardOrdersRoutes(
  ctx: DashboardRouteContext,
): Promise<boolean> {
  const { action, options, request, route, state } = ctx;

  if (action === "getOrders") {
    await fulfillJson(route, {
      success: true,
      orders: state.orders,
    });
    return true;
  }

  if (action === "deleteOrder") {
    const body = getRequestBody(request);
    state.orders = state.orders.filter((order) =>
      String(order.orderId) !== asString(body.orderId)
    );
    await fulfillJson(route, { success: true });
    return true;
  }

  if (action === "updateOrderStatus") {
    const body = getRequestBody(request);
    state.orders = state.orders.map((order) =>
      String(order.orderId) === asString(body.orderId)
        ? applyOrderUpdate(order, body)
        : order
    );
    await fulfillJson(route, { success: true });
    return true;
  }

  if (action === "sendLineFlexMessage") {
    options.onSendLineFlexMessage?.(request);
    await fulfillJson(route, { success: true });
    return true;
  }

  if (action === "sendOrderEmail") {
    options.onSendOrderEmail?.(request);
    await fulfillJson(route, {
      success: true,
      message: "信件已發送",
    });
    return true;
  }

  if (action === "batchUpdateOrderStatus") {
    const body = getRequestBody(request);
    const targetIds = new Set(asStringArray(body.orderIds));
    state.orders = state.orders.map((order) =>
      targetIds.has(String(order.orderId))
        ? applyOrderUpdate(order, body)
        : order
    );
    await fulfillJson(route, { success: true, message: "批次更新完成" });
    return true;
  }

  if (action === "batchDeleteOrders") {
    const body = getRequestBody(request);
    const targetIds = new Set(asStringArray(body.orderIds));
    state.orders = state.orders.filter((order) =>
      !targetIds.has(String(order.orderId))
    );
    await fulfillJson(route, { success: true, message: "批次刪除完成" });
    return true;
  }

  if (action === "linePayRefund" || action === "jkoPayRefund") {
    const body = getRequestBody(request);
    state.orders = state.orders.map((order) =>
      String(order.orderId) === asString(body.orderId)
        ? { ...order, paymentStatus: "refunded" }
        : order
    );
    await fulfillJson(route, { success: true });
    return true;
  }

  return false;
}
