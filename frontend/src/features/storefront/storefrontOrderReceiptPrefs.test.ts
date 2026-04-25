/** @vitest-environment jsdom */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { state } from "../../lib/appState.ts";
import { storefrontRuntime } from "./storefrontRuntime.ts";
import {
  getStorefrontOrderFormState,
  setStorefrontOrderFormState,
} from "./storefrontOrderFormState.ts";
import {
  getStorefrontReceiptFormState,
  setStorefrontReceiptFormState,
} from "./storefrontReceiptFormState.ts";
import {
  applySavedOrderFormPrefs,
  initReceiptRequestUi,
} from "./storefrontOrderReceiptPrefs.ts";

describe("storefrontOrderReceiptPrefs", () => {
  beforeEach(() => {
    state.currentUser = null;
    state.selectedPayment = "cod";
    setStorefrontOrderFormState({ transferAccountLast5: "" });
    setStorefrontReceiptFormState({
      requested: false,
      buyer: "",
      taxId: "",
      address: "",
      needDateStamp: false,
    });
    storefrontRuntime.availablePaymentMethods = {
      cod: false,
      linepay: false,
      jkopay: false,
      transfer: true,
    };
    storefrontRuntime.selectPayment = vi.fn();
  });

  it("applies saved receipt values and notifies Vue state", () => {
    const listener = vi.fn();
    window.addEventListener("coffee:receipt-request-updated", listener);
    state.currentUser = {
      userId: "user-1",
      defaultReceiptInfo: JSON.stringify({
        buyer: "測試公司",
        taxId: "12345678",
        address: "新竹市",
        needDateStamp: true,
      }),
      defaultPaymentMethod: "transfer",
      defaultTransferAccountLast5: "12345",
    };

    applySavedOrderFormPrefs();

    expect(getStorefrontReceiptFormState()).toEqual({
      requested: true,
      buyer: "測試公司",
      taxId: "12345678",
      address: "新竹市",
      needDateStamp: true,
    });
    expect(getStorefrontOrderFormState().transferAccountLast5).toBe("12345");
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0]![0].detail).toMatchObject({
      requested: true,
      taxId: "12345678",
    });
    expect(storefrontRuntime.selectPayment).toHaveBeenCalledWith("transfer", {
      skipQuote: true,
    });

    window.removeEventListener("coffee:receipt-request-updated", listener);
  });

  it("syncs initial receipt checkbox state without binding DOM class toggles", () => {
    const listener = vi.fn();
    window.addEventListener("coffee:receipt-request-updated", listener);
    setStorefrontReceiptFormState({ requested: true });

    initReceiptRequestUi();

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0]![0].detail).toMatchObject({
      requested: true,
    });

    window.removeEventListener("coffee:receipt-request-updated", listener);
  });
});
