import { describe, expect, it } from "vitest";
import { buildOrderFlexBodyPayload } from "./dashboardOrderFlexBody.ts";
import type { DashboardOrderNotificationDeps } from "./dashboardOrderNotificationTypes.ts";

const deps: DashboardOrderNotificationDeps = {
  API_URL: "https://api.example",
  authFetch: async () => ({ json: async () => ({ success: true }) }),
  getAuthUserId: () => "admin-user",
  Toast: { fire: () => undefined },
  Swal: { fire: async () => ({}) },
  esc: (value) => String(value || ""),
  orderStatusLabel: { delivered: "已配達", pending: "待處理" },
  orderMethodLabel: { delivery: "配送到府" },
  orderPayMethodLabel: { cod: "貨到付款" },
  orderPayStatusLabel: {},
  normalizeReceiptInfo: () => null,
  normalizeTrackingUrl: (value) => String(value || ""),
};

describe("buildOrderFlexBodyPayload", () => {
  it("includes customer-entered contact data in dashboard LINE Flex body", () => {
    const body = buildOrderFlexBodyPayload({
      deps,
      newStatus: "pending",
      order: {
        orderId: "O-CONTACT-1",
        timestamp: "2026-04-26T00:00:00.000Z",
        deliveryMethod: "delivery",
        status: "pending",
        paymentMethod: "cod",
        lineName: "小明",
        phone: "0912345678",
        email: "buyer@example.com",
        city: "新竹市",
        district: "東區",
        address: "測試路 1 號",
        items: "測試豆 x1",
        total: 220,
      },
    });

    const payloadText = JSON.stringify(body.bodyContents);
    expect(payloadText).toContain("顧客");
    expect(payloadText).toContain("小明");
    expect(payloadText).toContain("0912345678");
    expect(payloadText).toContain("buyer@example.com");
  });

  it("keeps the tracking CTA when a shipped order has a tracking URL only", () => {
    const body = buildOrderFlexBodyPayload({
      deps,
      newStatus: "shipped",
      order: {
        orderId: "O-SHIPPED-1",
        timestamp: "2026-04-26T00:00:00.000Z",
        deliveryMethod: "delivery",
        status: "shipped",
        paymentMethod: "cod",
        city: "新竹市",
        district: "東區",
        address: "測試路 1 號",
        items: "測試豆 x1",
        total: 220,
        trackingUrl: "https://postserv.post.gov.tw/pstmail/main_mail.html",
      },
    });

    expect(body.trackingLinkUrl).toBe(
      "https://postserv.post.gov.tw/pstmail/main_mail.html",
    );
    expect(body.hasTrackingLinkCta).toBe(true);
  });

  it("uses the delivery-method default tracking URL for shipped orders with a tracking number", () => {
    const body = buildOrderFlexBodyPayload({
      deps,
      newStatus: "shipped",
      order: {
        orderId: "O-SHIPPED-2",
        timestamp: "2026-04-26T00:00:00.000Z",
        deliveryMethod: "family_mart",
        status: "shipped",
        paymentMethod: "cod",
        storeName: "全家測試店",
        items: "測試豆 x1",
        total: 220,
        trackingNumber: "FM-123",
      },
    });

    expect(body.trackingLinkUrl).toBe(
      "https://fmec.famiport.com.tw/FP_Entrance/QueryBox",
    );
    expect(body.hasTrackingLinkCta).toBe(true);
  });

  it("uses the delivered status label in dashboard LINE Flex body", () => {
    const body = buildOrderFlexBodyPayload({
      deps,
      newStatus: "delivered",
      order: {
        orderId: "O-DELIVERED-1",
        timestamp: "2026-04-27T08:00:00.000Z",
        deliveryMethod: "delivery",
        status: "delivered",
        paymentMethod: "cod",
        city: "新竹市",
        district: "東區",
        address: "測試路 1 號",
        items: "測試豆 x1",
        total: 220,
      },
    });

    expect(JSON.stringify(body.bodyContents)).toContain("已配達");
    expect(body.statusLabel).toBe("已配達");
  });
});
