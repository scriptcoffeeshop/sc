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
  orderStatusLabel: { pending: "待處理" },
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
});
