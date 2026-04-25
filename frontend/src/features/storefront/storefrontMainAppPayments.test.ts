/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createStorefrontMainAppPayments,
  resolveStorefrontPaymentAvailability,
  selectFirstAvailablePayment,
} from "./storefrontMainAppPayments.ts";

describe("createStorefrontMainAppPayments", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reports init load errors through Vue state events", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      json: async () => ({ success: false, error: "API boom" }),
    })));
    const listener = vi.fn();
    window.addEventListener("coffee:storefront-load-error-updated", listener);

    const payments = createStorefrontMainAppPayments({
      getErrorMessage: (error) =>
        error instanceof Error ? error.message : String(error || ""),
      prefillUserFields: vi.fn(),
      applySavedOrderFormPrefs: vi.fn(),
    });

    await payments.loadInitData();

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0]![0].detail).toEqual({
      errorText: "載入資料失敗: API boom",
    });

    window.removeEventListener("coffee:storefront-load-error-updated", listener);
  });

  it("infers storefront payment availability from delivery config when quote is stale", () => {
    expect(resolveStorefrontPaymentAvailability({
      selectedDelivery: "delivery",
      selectedDeliveryOption: {
        id: "delivery",
        icon_url: "icons/delivery.png",
        label: "配送到府",
        name: "配送到府",
        description: "配送",
        enabled: true,
        payment: { cod: false, linepay: true, jkopay: true, transfer: true },
      },
      quote: {
        deliveryMethod: "seven_eleven",
        availablePaymentMethods: {
          cod: true,
          linepay: false,
          jkopay: false,
          transfer: false,
        },
      },
    })).toEqual({
      cod: false,
      linepay: true,
      jkopay: true,
      transfer: true,
    });
  });

  it("uses matching quote availability before delivery config", () => {
    expect(resolveStorefrontPaymentAvailability({
      selectedDelivery: "delivery",
      selectedDeliveryOption: {
        id: "delivery",
        icon_url: "icons/delivery.png",
        label: "配送到府",
        name: "配送到府",
        description: "配送",
        enabled: true,
        payment: { cod: true, linepay: true, jkopay: true, transfer: true },
      },
      quote: {
        deliveryMethod: "delivery",
        availablePaymentMethods: {
          cod: false,
          linepay: false,
          jkopay: true,
          transfer: false,
        },
      },
    })).toEqual({
      cod: false,
      linepay: false,
      jkopay: true,
      transfer: false,
    });
  });

  it("selects the first available payment in storefront priority order", () => {
    expect(selectFirstAvailablePayment({
      cod: false,
      linepay: false,
      jkopay: true,
      transfer: true,
    })).toBe("jkopay");
    expect(selectFirstAvailablePayment({
      cod: false,
      linepay: false,
      jkopay: false,
      transfer: false,
    })).toBe("");
  });
});
