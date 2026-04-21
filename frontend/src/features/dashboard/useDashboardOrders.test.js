import { beforeEach, describe, expect, it, vi } from "vitest";

function jsonResponse(payload) {
  return { json: async () => payload };
}

async function loadOrdersModule() {
  vi.resetModules();
  return await import("./useDashboardOrders.js");
}

describe("useDashboardOrders", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("filters orders and exposes pending status changes in the view model", async () => {
    const module = await loadOrdersModule();
    const authFetch = vi.fn(async () =>
      jsonResponse({
        success: true,
        orders: [
          {
            orderId: "O-1001",
            timestamp: "2026-04-21T08:00:00.000Z",
            deliveryMethod: "delivery",
            status: "pending",
            paymentMethod: "jkopay",
            paymentStatus: "pending",
            paymentExpiresAt: "2026-04-21T10:00:00.000Z",
            total: 220,
            city: "新竹市",
            district: "東區",
            address: "測試路 1 號",
          },
          {
            orderId: "O-1002",
            timestamp: "2026-04-21T09:00:00.000Z",
            deliveryMethod: "in_store",
            status: "completed",
            paymentMethod: "cod",
            paymentStatus: "",
            total: 180,
          },
        ],
      })
    );

    module.configureDashboardOrdersServices({
      API_URL: "https://api.example",
      authFetch,
      getAuthUserId: () => "admin-user",
      Swal: { fire: vi.fn() },
      Toast: { fire: vi.fn() },
    });

    await module.dashboardOrdersActions.loadOrders();
    const dashboard = module.useDashboardOrders();

    expect(dashboard.summaryText.value).toContain("總訂單 2 筆");
    expect(dashboard.ordersView.value[0]).toMatchObject({
      orderId: "O-1001",
      statusLabel: "待處理",
      paymentMethodLabel: "街口支付",
      showPaymentDeadline: true,
    });

    dashboard.filters.status = "pending";
    dashboard.filters.paymentMethod = "jkopay";
    expect(dashboard.ordersView.value).toHaveLength(1);

    module.dashboardOrdersActions.setPendingOrderStatus("O-1001", "shipped");
    expect(dashboard.ordersView.value[0]).toMatchObject({
      selectedStatus: "shipped",
      showConfirmStatusButton: true,
    });
  });

  it("sends selected order ids and payment status during batch updates", async () => {
    const module = await loadOrdersModule();
    let batchPayload = null;
    const orders = [
      {
        orderId: "O-2001",
        timestamp: "2026-04-21T08:00:00.000Z",
        deliveryMethod: "delivery",
        status: "pending",
        paymentMethod: "linepay",
        paymentStatus: "pending",
        total: 220,
      },
      {
        orderId: "O-2002",
        timestamp: "2026-04-21T09:00:00.000Z",
        deliveryMethod: "delivery",
        status: "pending",
        paymentMethod: "jkopay",
        paymentStatus: "pending",
        total: 260,
      },
    ];
    const authFetch = vi.fn(async (url, options = {}) => {
      if (String(url).includes("batchUpdateOrderStatus")) {
        batchPayload = JSON.parse(String(options.body || "{}"));
        return jsonResponse({ success: true, message: "批次更新完成" });
      }
      return jsonResponse({ success: true, orders });
    });

    module.configureDashboardOrdersServices({
      API_URL: "https://api.example",
      authFetch,
      getAuthUserId: () => "admin-user",
      Swal: { fire: vi.fn() },
      Toast: { fire: vi.fn() },
    });

    await module.dashboardOrdersActions.loadOrders();
    const dashboard = module.useDashboardOrders();
    module.dashboardOrdersActions.toggleOrderSelection("O-2001", true);
    module.dashboardOrdersActions.toggleOrderSelection("O-2002", true);
    dashboard.batchForm.status = "processing";
    dashboard.batchForm.paymentStatus = "paid";

    await module.dashboardOrdersActions.batchUpdateOrders();

    expect(batchPayload).toMatchObject({
      userId: "admin-user",
      orderIds: ["O-2001", "O-2002"],
      status: "processing",
      paymentStatus: "paid",
    });
  });
});
