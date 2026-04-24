/** @vitest-environment jsdom */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { state } from "../../lib/appState.ts";
import { storefrontRuntime } from "./storefrontRuntime.ts";
import {
  getStorefrontOrderFormState,
  setStorefrontOrderFormState,
} from "./storefrontOrderFormState.ts";
import {
  applySavedOrderFormPrefs,
  initReceiptRequestUi,
} from "./storefrontOrderReceiptPrefs.ts";

function renderReceiptInputs() {
  document.body.innerHTML = `
    <input id="receipt-request" type="checkbox">
    <input id="receipt-tax-id">
    <input id="receipt-buyer">
    <input id="receipt-address">
    <input id="receipt-date-stamp" type="checkbox">
  `;
}

describe("storefrontOrderReceiptPrefs", () => {
  beforeEach(() => {
    renderReceiptInputs();
    state.currentUser = null;
    state.selectedPayment = "cod";
    setStorefrontOrderFormState({ transferAccountLast5: "" });
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

    expect(document.getElementById("receipt-request").checked).toBe(true);
    expect(document.getElementById("receipt-tax-id").value).toBe("12345678");
    expect(document.getElementById("receipt-buyer").value).toBe("測試公司");
    expect(document.getElementById("receipt-address").value).toBe("新竹市");
    expect(document.getElementById("receipt-date-stamp").checked).toBe(true);
    expect(getStorefrontOrderFormState().transferAccountLast5).toBe("12345");
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].detail).toEqual({ requested: true });
    expect(storefrontRuntime.selectPayment).toHaveBeenCalledWith("transfer", {
      skipQuote: true,
    });

    window.removeEventListener("coffee:receipt-request-updated", listener);
  });

  it("syncs initial receipt checkbox state without binding DOM class toggles", () => {
    const listener = vi.fn();
    window.addEventListener("coffee:receipt-request-updated", listener);
    document.getElementById("receipt-request").checked = true;

    initReceiptRequestUi();

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].detail).toEqual({ requested: true });

    window.removeEventListener("coffee:receipt-request-updated", listener);
  });
});
