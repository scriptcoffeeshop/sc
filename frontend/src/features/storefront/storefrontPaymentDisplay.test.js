import { describe, expect, it } from "vitest";
import {
  buildTransferOrderSuccessDialogOptions,
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

  it("escapes transfer success dialog order and bank account content", () => {
    const dialog = buildTransferOrderSuccessDialogOptions({
      orderId: "<img src=x onerror=alert(1)>",
      total: 702,
      bankAccount: {
        bankName: "測試銀行",
        bankCode: "999",
        accountNumber: "<script>alert(1)</script>",
        accountName: "測試戶名",
      },
    });

    expect(dialog.title).toBe("訂單已成立");
    expect(dialog.html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(dialog.html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(dialog.html).toContain("$702");
  });
});
