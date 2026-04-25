import { describe, expect, it } from "vitest";
import {
  buildOrdersSummaryText,
  buildOrderViewModel,
  formatOrderSummaryAmount,
} from "./dashboardOrdersView.ts";

describe("dashboardOrdersView", () => {
  it("formats summary totals for dashboard order filters", () => {
    expect(formatOrderSummaryAmount(1234567)).toBe("1,234,567");
    expect(buildOrdersSummaryText(
      [{ total: 1000 }, { total: 2000 }, { total: 3000 }],
      [{ total: 2000 }, { total: 3000 }],
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
