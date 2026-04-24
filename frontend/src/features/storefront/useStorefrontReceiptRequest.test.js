import { describe, expect, it } from "vitest";
import { useStorefrontReceiptRequest } from "./useStorefrontReceiptRequest.ts";

describe("useStorefrontReceiptRequest", () => {
  it("tracks receipt request visibility from saved preference events", () => {
    const receipt = useStorefrontReceiptRequest();

    receipt.handleReceiptRequestUpdated(
      new CustomEvent("coffee:receipt-request-updated", {
        detail: { requested: true },
      }),
    );
    expect(receipt.receiptRequested.value).toBe(true);

    receipt.handleReceiptRequestUpdated(
      new CustomEvent("coffee:receipt-request-updated", {
        detail: { requested: false },
      }),
    );
    expect(receipt.receiptRequested.value).toBe(false);
  });
});
