/** @vitest-environment jsdom */

import { describe, expect, it, vi } from "vitest";
import {
  emitStorefrontReceiptFormStateUpdated,
  getStorefrontReceiptFormState,
  setStorefrontReceiptFormState,
} from "./storefrontReceiptFormState.ts";

describe("storefrontReceiptFormState", () => {
  it("stores receipt form values and emits Vue sync events", () => {
    const listener = vi.fn();
    window.addEventListener("coffee:receipt-request-updated", listener);

    setStorefrontReceiptFormState({
      requested: false,
      buyer: "",
      taxId: "",
      address: "",
      needDateStamp: false,
    });
    emitStorefrontReceiptFormStateUpdated({
      requested: true,
      buyer: "測試公司",
      taxId: "12345678",
      address: "新竹市",
      needDateStamp: true,
    });

    expect(getStorefrontReceiptFormState()).toEqual({
      requested: true,
      buyer: "測試公司",
      taxId: "12345678",
      address: "新竹市",
      needDateStamp: true,
    });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0]![0].detail).toMatchObject({
      requested: true,
      taxId: "12345678",
    });

    window.removeEventListener("coffee:receipt-request-updated", listener);
  });
});
