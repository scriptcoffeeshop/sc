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

  it("syncs receipt field values into submit state", () => {
    const receipt = useStorefrontReceiptRequest();

    receipt.updateReceiptRequested(true);
    receipt.updateReceiptTaxId("12345678");
    receipt.updateReceiptBuyer("測試公司");
    receipt.updateReceiptAddress("新竹市");
    receipt.updateReceiptNeedDateStamp(true);

    expect(receipt.receiptRequested.value).toBe(true);
    expect(receipt.receiptTaxId.value).toBe("12345678");
    expect(receipt.receiptBuyer.value).toBe("測試公司");
    expect(receipt.receiptAddress.value).toBe("新竹市");
    expect(receipt.receiptNeedDateStamp.value).toBe(true);
  });
});
