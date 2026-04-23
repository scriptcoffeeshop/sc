import { beforeAll, describe, expect, it, vi } from "vitest";

let buildOrderHistoryItem;
let useStorefrontOrderHistory;

beforeAll(async () => {
  vi.stubGlobal("Swal", {
    mixin: vi.fn(() => ({ fire: vi.fn() })),
  });
  vi.stubGlobal("window", {
    ENV: {
      API_URL: "https://api.example/coffee",
    },
    location: {
      origin: "https://app.example",
      pathname: "/main.html",
      href: "https://app.example/main.html",
    },
  });

  ({ buildOrderHistoryItem, useStorefrontOrderHistory } = await import(
    "./useStorefrontOrderHistory.ts"
  ));
});

function createSuccessResponse(payload) {
  return {
    json: vi.fn(async () => payload),
  };
}

function createPaymentDisplay(order) {
  const paymentMethod = String(order?.paymentMethod || "cod");
  const paymentStatus = String(order?.paymentStatus || "");
  const resumePaymentLabel = paymentMethod === "jkopay"
    ? "前往街口付款"
    : paymentMethod === "linepay"
    ? "前往 LINE Pay 付款"
    : "";
  const isResumable = ["linepay", "jkopay"].includes(paymentMethod) &&
    ["pending", "processing"].includes(paymentStatus) &&
    Boolean(order?.paymentUrl);
  const guideDescription = paymentStatus === "processing"
    ? `付款結果正在同步中；若您尚未完成付款，也可以點下方「${resumePaymentLabel}」繼續。`
    : `這筆訂單尚未完成 ${
      paymentMethod === "linepay" ? "LINE Pay" : "街口支付"
    }，請點下方「${resumePaymentLabel}」繼續；付款後狀態會自動同步。`
      .replace("完成 街口支付", "完成街口支付")
      .replace("完成 LINE Pay", "完成 LINE Pay");

  return {
    paymentMethod,
    paymentStatus,
    methodLabel: paymentMethod,
    statusLabel: paymentStatus,
    paymentExpiresAtText: "",
    paymentConfirmedAtText: "",
    paymentLastCheckedAtText: "",
    showPaymentDeadline: false,
    badgeClass: "",
    showBadge: true,
    tone: paymentStatus === "processing" ? "info" : "warning",
    guideTitle: "",
    guideDescription,
    actionLabel: "",
    actionType: "",
    paymentUrl: String(order?.paymentUrl || ""),
    canResumePayment: isResumable,
    resumePaymentLabel: isResumable ? resumePaymentLabel : "",
  };
}

function createOrderHistoryDeps(overrides = {}) {
  return {
    Swal: { fire: vi.fn(async () => ({ isConfirmed: false })) },
    Toast: { fire: vi.fn() },
    getCurrentUser: () => ({ userId: "user-1" }),
    writeClipboard: vi.fn(async () => undefined),
    getCustomerPaymentDisplay: vi.fn(createPaymentDisplay),
    formatDateTimeText: vi.fn((value) => String(value || "")),
    ...overrides,
  };
}

describe("useStorefrontOrderHistory", () => {
  it("opens my orders, loads transformed cards, and exposes resume actions", async () => {
    const authFetch = vi.fn(async (url) => {
      if (String(url).includes("action=getMyOrders")) {
        return createSuccessResponse({
          success: true,
          orders: [
            {
              orderId: "LINEPAY-001",
              deliveryMethod: "delivery",
              status: "pending",
              city: "新竹市",
              address: "測試路 1 號",
              items: "測試豆 x1",
              total: 220,
              paymentMethod: "linepay",
              paymentStatus: "pending",
              paymentUrl: "https://pay.example/linepay/LINEPAY-001",
            },
            {
              orderId: "JKO-001",
              deliveryMethod: "home_delivery",
              status: "shipped",
              city: "新竹市",
              address: "測試路 2 號",
              items: "街口測試豆 x1",
              total: 240,
              paymentMethod: "jkopay",
              paymentStatus: "processing",
              paymentUrl: "https://pay.example/jko/JKO-001",
              paymentLastCheckedAt: "2026-04-21T01:20:00.000Z",
              shippingProvider: "黑貓宅急便",
              trackingNumber: "AB123456789",
            },
          ],
        });
      }
      throw new Error(`unexpected url: ${url}`);
    });
    const Swal = { fire: vi.fn(async () => ({ isConfirmed: false })) };

    const history = useStorefrontOrderHistory(createOrderHistoryDeps({
      authFetch,
      Swal,
    }));

    await history.openOrderHistory();

    expect(history.isOrderHistoryOpen.value).toBe(true);
    expect(history.orderHistoryState.value).toBe("ready");
    expect(history.ordersView.value).toHaveLength(2);
    expect(history.ordersView.value[0]).toMatchObject({
      orderId: "LINEPAY-001",
      deliveryMethodLabel: "宅配",
      locationText: "新竹市測試路 1 號",
    });
    expect(history.ordersView.value[0].paymentDisplay).toMatchObject({
      canResumePayment: true,
      guideDescription:
        "這筆訂單尚未完成 LINE Pay，請點下方「前往 LINE Pay 付款」繼續；付款後狀態會自動同步。",
      resumePaymentLabel: "前往 LINE Pay 付款",
    });
    expect(history.ordersView.value[1].paymentDisplay).toMatchObject({
      canResumePayment: true,
      guideDescription:
        "付款結果正在同步中；若您尚未完成付款，也可以點下方「前往街口付款」繼續。",
      resumePaymentLabel: "前往街口付款",
    });
    expect(history.ordersView.value[1].paymentDisplay.actionType).toBe("");
    expect(history.ordersView.value[1].paymentDisplay.actionLabel).toBe("");
    expect(history.ordersView.value[0].paymentDisplay.guideDescription)
      .not.toContain("我的訂單");
    expect(history.ordersView.value[1].paymentDisplay.guideDescription)
      .not.toContain("我的訂單");
    expect(history.ordersView.value[1].trackingUrl).toContain("postserv.post.gov.tw");
    expect(Swal.fire).not.toHaveBeenCalled();
  });

  it("hides宅配 tracking links before shipment is confirmed", () => {
    const pendingHomeDelivery = buildOrderHistoryItem({
      orderId: "HOME-PENDING-001",
      deliveryMethod: "home_delivery",
      status: "pending",
      city: "基隆市",
      address: "123",
      items: "測試豆 x1",
      total: 220,
      paymentMethod: "transfer",
      paymentStatus: "pending",
    }, createOrderHistoryDeps());

    const shippedHomeDelivery = buildOrderHistoryItem({
      orderId: "HOME-SHIPPED-001",
      deliveryMethod: "home_delivery",
      status: "shipped",
      city: "基隆市",
      address: "123",
      items: "測試豆 x1",
      total: 220,
      paymentMethod: "transfer",
      paymentStatus: "paid",
    }, createOrderHistoryDeps());

    expect(pendingHomeDelivery.trackingUrl).toBe("");
    expect(pendingHomeDelivery.hasShippingInfo).toBe(false);
    expect(shippedHomeDelivery.trackingUrl).toContain("postserv.post.gov.tw");
    expect(shippedHomeDelivery.hasShippingInfo).toBe(true);
  });

  it("shows login prompt when user opens my orders without authentication", async () => {
    const Swal = { fire: vi.fn(async () => ({ isConfirmed: false })) };
    const history = useStorefrontOrderHistory(createOrderHistoryDeps({
      authFetch: vi.fn(),
      Swal,
      getCurrentUser: () => null,
    }));

    await history.openOrderHistory();

    expect(history.isOrderHistoryOpen.value).toBe(false);
    expect(Swal.fire).toHaveBeenCalledWith("請先登入", "", "info");
  });

  it("copies tracking numbers into the clipboard and shows toast feedback", async () => {
    const writeClipboard = vi.fn(async () => undefined);
    const Toast = { fire: vi.fn() };
    const history = useStorefrontOrderHistory(createOrderHistoryDeps({
      authFetch: vi.fn(),
      Swal: { fire: vi.fn(async () => ({ isConfirmed: false })) },
      Toast,
      getCurrentUser: () => ({ userId: "user-1" }),
      writeClipboard,
    }));

    await history.copyTrackingNumber(" AB123456789 ");

    expect(writeClipboard).toHaveBeenCalledWith("AB123456789");
    expect(Toast.fire).toHaveBeenCalledWith({
      icon: "success",
      title: "單號已複製",
    });
  });
});
