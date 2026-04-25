/** @vitest-environment jsdom */

import { beforeEach, describe, expect, it } from "vitest";
import {
  buildTransferOrderSuccessDialogOptions,
  buildPaymentLaunchDialogOptions,
  buildPaymentStatusDialogOptions,
  getCustomerPaymentDisplay,
} from "./storefrontPaymentDisplay.ts";

function mountDialog(dialog) {
  const popup = document.createElement("div");
  document.body.appendChild(popup);
  dialog.didOpen?.(popup);
}

describe("storefrontPaymentDisplay", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

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
    mountDialog(dialog);

    expect(dialog.icon).toBe("success");
    expect(dialog.title).toBe("街口支付已退款");
    expect(dialog.html).toBeInstanceOf(HTMLElement);
    expect(document.body.innerHTML).toContain(
      "&lt;script&gt;alert(1)&lt;/script&gt;",
    );
    expect(document.body.querySelector("script")).toBeNull();
    expect(dialog.paymentLaunchUrl).toBeUndefined();
  });

  it("renders launch dialog details through the Vue summary component", () => {
    const dialog = buildPaymentLaunchDialogOptions({
      orderId: "C123",
      paymentMethod: "linepay",
      paymentExpiresAt: "2026-04-25T12:00:00+08:00",
      total: 702,
    });
    mountDialog(dialog);

    expect(dialog.title).toBe("前往LINE Pay");
    expect(dialog.html).toBeInstanceOf(HTMLElement);
    expect(document.body.textContent).toContain("訂單編號");
    expect(document.body.textContent).toContain("C123");
    expect(document.body.textContent).toContain("$702");
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
    mountDialog(dialog);

    expect(dialog.title).toBe("訂單已成立");
    expect(dialog.html).toBeInstanceOf(HTMLElement);
    expect(document.body.innerHTML).toContain(
      "&lt;img src=x onerror=alert(1)&gt;",
    );
    expect(document.body.innerHTML).toContain(
      "&lt;script&gt;alert(1)&lt;/script&gt;",
    );
    expect(document.body.textContent).toContain("$702");
    expect(document.body.querySelector("script")).toBeNull();
  });
});
