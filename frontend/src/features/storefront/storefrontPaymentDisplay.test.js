import { describe, expect, it } from "vitest";
import {
  buildPaymentStatusDialogOptions,
  getCustomerPaymentDisplay,
} from "./storefrontPaymentDisplay.ts";

describe("storefrontPaymentDisplay", () => {
  it("uses order-history copy for resumable online payments", () => {
    const display = getCustomerPaymentDisplay(
      {
        paymentMethod: "linepay",
        paymentStatus: "pending",
        paymentUrl: "https://pay.example/checkout",
      },
      { context: "orderHistory" },
    );

    expect(display.canResumePayment).toBe(true);
    expect(display.resumePaymentLabel).toBe("前往 LINE Pay 付款");
    expect(display.guideDescription).toContain("請點下方");
    expect(display.guideDescription).not.toContain("可到「我的訂單」");
  });

  it("keeps status dialog links sanitized and status-specific", () => {
    const dialog = buildPaymentStatusDialogOptions({
      orderId: "<script>alert(1)</script>",
      paymentMethod: "jkopay",
      paymentStatus: "refunded",
      paymentUrl: "javascript:alert(1)",
    });

    expect(dialog.icon).toBe("success");
    expect(dialog.title).toBe("街口支付已退款");
    expect(dialog.html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(dialog.paymentLaunchUrl).toBeUndefined();
  });
});
