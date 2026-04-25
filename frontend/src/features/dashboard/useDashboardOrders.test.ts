// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

interface SwalVueOptions {
  html?: unknown;
  title?: string;
  didOpen?: (popup: HTMLElement) => void;
  willClose?: () => void;
  preConfirm?: () => unknown;
}

function jsonResponse(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    headers: { "content-type": "application/json" },
  });
}

async function loadOrdersModule() {
  vi.resetModules();
  return await import("./useDashboardOrders.ts");
}

function mountSwalVueContent(options: SwalVueOptions) {
  expect(options.html).toBeInstanceOf(HTMLElement);
  const popup = document.createElement("div");
  document.body.appendChild(popup);
  options.didOpen?.(popup);
  return popup;
}

function setControlValue(id: string, value: string) {
  const control = document.getElementById(id);
  expect(control).toBeInstanceOf(HTMLInputElement);
  const input = control as HTMLInputElement;
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("useDashboardOrders", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
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

  it("combines filters and updates bulk selection state boundaries", async () => {
    const module = await loadOrdersModule();
    const authFetch = vi.fn(async () =>
      jsonResponse({
        success: true,
        orders: [
          {
            orderId: "O-3001",
            timestamp: "2026-04-21T08:00:00.000Z",
            deliveryMethod: "delivery",
            status: "pending",
            paymentMethod: "linepay",
            paymentStatus: "pending",
            total: 320,
          },
          {
            orderId: "O-3002",
            timestamp: "2026-04-22T09:00:00.000Z",
            deliveryMethod: "in_store",
            status: "completed",
            paymentMethod: "cod",
            paymentStatus: "",
            total: 180,
          },
          {
            orderId: "O-3003",
            timestamp: "2026-04-21T12:30:00.000Z",
            deliveryMethod: "home_delivery",
            status: "failed",
            paymentMethod: "jkopay",
            paymentStatus: "expired",
            paymentExpiresAt: "2026-04-21T18:00:00.000Z",
            cancelReason: "付款逾期",
            trackingUrl: "https://tracking.example/orders/O-3003",
            total: 520,
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

    dashboard.filters.status = "pending";
    dashboard.filters.paymentMethod = "linepay";
    dashboard.filters.paymentStatus = "pending";
    dashboard.filters.deliveryMethod = "delivery";
    dashboard.filters.dateFrom = "2026-04-21";
    dashboard.filters.dateTo = "2026-04-21";
    dashboard.filters.minAmount = "300";
    dashboard.filters.maxAmount = "400";

    expect(dashboard.ordersView.value.map((order) => order.orderId)).toEqual([
      "O-3001",
    ]);

    module.dashboardOrdersActions.toggleSelectAllOrders(true);
    expect(dashboard.allFilteredSelected.value).toBe(true);
    expect(dashboard.selectAllIndeterminate.value).toBe(false);
    expect(dashboard.selectedCountText.value).toBe("已選 1 筆");

    dashboard.filters.status = "all";
    dashboard.filters.paymentMethod = "all";
    dashboard.filters.paymentStatus = "all";
    dashboard.filters.deliveryMethod = "all";
    dashboard.filters.dateFrom = "";
    dashboard.filters.dateTo = "";
    dashboard.filters.minAmount = "";
    dashboard.filters.maxAmount = "";

    const failedOrder = dashboard.ordersView.value.find((order) =>
      order.orderId === "O-3003"
    );
    expect(failedOrder).toMatchObject({
      showPaymentDeadline: true,
      showCancellationReason: true,
      trackingLinkLabel: "物流追蹤頁面",
    });
    expect(dashboard.allFilteredSelected.value).toBe(false);
    expect(dashboard.selectAllIndeterminate.value).toBe(true);
  });

  it("sends selected order ids and payment status during batch updates", async () => {
    const module = await loadOrdersModule();
    let batchPayload: Record<string, unknown> | null = null;
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

  it("blocks shipped batch updates when the tracking url is invalid", async () => {
    const module = await loadOrdersModule();
    const authFetch = vi.fn(async (url) => {
      if (String(url).includes("batchUpdateOrderStatus")) {
        throw new Error("batch update should not be called");
      }
      return jsonResponse({
        success: true,
        orders: [
          {
            orderId: "O-4001",
            timestamp: "2026-04-21T08:00:00.000Z",
            deliveryMethod: "delivery",
            status: "pending",
            paymentMethod: "jkopay",
            paymentStatus: "pending",
            total: 220,
          },
        ],
      });
    });
    const Swal = {
      fire: vi.fn(async (options) => {
        if (options?.title === "批次出貨設定") {
          const popup = mountSwalVueContent(options);
          setControlValue("swal-batch-tracking-number", "JP-123");
          setControlValue("swal-batch-shipping-provider", "黑貓宅急便");
          setControlValue("swal-batch-tracking-url", "ftp://invalid.example");
          const value = options.preConfirm?.();
          options.willClose?.();
          popup.remove();
          return value === false ? { isConfirmed: false } : { isConfirmed: true, value };
        }
        return {};
      }),
      showValidationMessage: vi.fn(),
    };

    module.configureDashboardOrdersServices({
      API_URL: "https://api.example",
      authFetch,
      getAuthUserId: () => "admin-user",
      Swal,
      Toast: { fire: vi.fn() },
    });

    await module.dashboardOrdersActions.loadOrders();
    const dashboard = module.useDashboardOrders();
    module.dashboardOrdersActions.toggleOrderSelection("O-4001", true);
    dashboard.batchForm.status = "shipped";

    await module.dashboardOrdersActions.batchUpdateOrders();

    expect(Swal.showValidationMessage).toHaveBeenCalledWith(
      "物流追蹤網址需以 http:// 或 https:// 開頭",
    );
    expect(authFetch).toHaveBeenCalledTimes(1);
  });

  it("includes shared shipping metadata when batch shipping orders", async () => {
    const module = await loadOrdersModule();
    let batchPayload: Record<string, unknown> | null = null;
    const authFetch = vi.fn(async (url, options = {}) => {
      if (String(url).includes("batchUpdateOrderStatus")) {
        batchPayload = JSON.parse(String(options.body || "{}"));
        return jsonResponse({ success: true, message: "批次更新完成" });
      }
      return jsonResponse({
        success: true,
        orders: [
          {
            orderId: "O-5001",
            timestamp: "2026-04-21T08:00:00.000Z",
            deliveryMethod: "delivery",
            status: "processing",
            paymentMethod: "linepay",
            paymentStatus: "paid",
            total: 420,
          },
        ],
      });
    });
    const Swal = {
      fire: vi.fn(async (options) => {
        if (options?.title === "批次出貨設定") {
          const popup = mountSwalVueContent(options);
          setControlValue("swal-batch-tracking-number", "JP-5001");
          setControlValue("swal-batch-shipping-provider", "黑貓宅急便");
          setControlValue(
            "swal-batch-tracking-url",
            "https://tracking.example/JP-5001",
          );
          const value = options.preConfirm?.();
          options.willClose?.();
          popup.remove();
          return { isConfirmed: true, value };
        }
        return {};
      }),
      showValidationMessage: vi.fn(),
    };

    module.configureDashboardOrdersServices({
      API_URL: "https://api.example",
      authFetch,
      getAuthUserId: () => "admin-user",
      Swal,
      Toast: { fire: vi.fn() },
    });

    await module.dashboardOrdersActions.loadOrders();
    const dashboard = module.useDashboardOrders();
    module.dashboardOrdersActions.toggleOrderSelection("O-5001", true);
    dashboard.batchForm.status = "shipped";

    await module.dashboardOrdersActions.batchUpdateOrders();

    expect(batchPayload).toMatchObject({
      userId: "admin-user",
      orderIds: ["O-5001"],
      status: "shipped",
      trackingNumber: "JP-5001",
      shippingProvider: "黑貓宅急便",
      trackingUrl: "https://tracking.example/JP-5001",
    });
    expect(batchPayload).not.toHaveProperty("paymentStatus");
  });
});
