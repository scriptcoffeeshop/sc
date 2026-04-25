import { describe, expect, it } from "vitest";
import {
  buildOrdersSummaryText,
  buildOrderViewModel,
  formatOrderSummaryAmount,
} from "./dashboardOrdersView.ts";
import type { DashboardOrderRecord } from "./dashboardOrderTypes.ts";

function orderWithTotal(total: number): DashboardOrderRecord {
  return {
    orderId: `O-${total}`,
    timestamp: "2026-04-25T00:00:00.000Z",
    total,
  };
}

describe("dashboardOrdersView", () => {
  it("formats summary totals for dashboard order filters", () => {
    expect(formatOrderSummaryAmount(1234567)).toBe("1,234,567");
    expect(buildOrdersSummaryText(
      [orderWithTotal(1000), orderWithTotal(2000), orderWithTotal(3000)],
      [orderWithTotal(2000), orderWithTotal(3000)],
    )).toBe("總訂單 3 筆｜篩選結果 2 筆｜金額合計 $5,000");
  });

  it("falls back to empty timestamp text for invalid order dates", () => {
    expect(buildOrderViewModel(
      {
        orderId: "O-1",
        status: "pending",
        timestamp: "not-a-date",
        deliveryMethod: "delivery",
        paymentMethod: "cod",
      },
      "",
      false,
    ).timestampText).toBe("");
  });
});
