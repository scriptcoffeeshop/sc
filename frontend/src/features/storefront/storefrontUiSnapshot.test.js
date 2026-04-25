import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { state } from "../../lib/appState.ts";
import {
  setStorefrontAppSettings,
  setStorefrontDeliveryConfig,
} from "./storefrontRuntime.ts";
import { getStorefrontUiSnapshot } from "./storefrontUiSnapshot.ts";

describe("getStorefrontUiSnapshot", () => {
  beforeEach(() => {
    state.products = [];
    state.categories = [];
    state.formFields = [];
    state.currentUser = null;
    state.selectedDelivery = "";
    state.selectedPayment = "cod";
    state.bankAccounts = [];
    state.selectedBankAccountId = "";
    setStorefrontAppSettings(null);
    setStorefrontDeliveryConfig([]);
  });

  afterEach(() => {
    delete globalThis.appSettings;
    delete globalThis.currentDeliveryConfig;
  });

  it("reads delivery labels from storefront runtime settings/config", () => {
    const deliveryOptions = [
      {
        id: "delivery",
        name: "後台配送名稱",
        description: "後台配送說明",
        enabled: true,
      },
    ];
    setStorefrontAppSettings({
      delivery_options_config: JSON.stringify(deliveryOptions),
    });
    setStorefrontDeliveryConfig(deliveryOptions);

    const snapshot = getStorefrontUiSnapshot();

    expect(snapshot.settings.delivery_options_config).toBe(
      JSON.stringify(deliveryOptions),
    );
    expect(snapshot.deliveryConfig).toEqual([
      {
        id: "delivery",
        name: "後台配送名稱",
        label: "後台配送名稱",
        description: "後台配送說明",
        icon_url: "",
        enabled: true,
        payment: {
          cod: false,
          linepay: false,
          jkopay: false,
          transfer: false,
        },
      },
    ]);
  });

  it("ignores legacy global settings and reads only runtime state", () => {
    globalThis.appSettings = { site_title: "legacy title" };
    globalThis.currentDeliveryConfig = [{ id: "legacy_delivery" }];

    const snapshot = getStorefrontUiSnapshot();

    expect(snapshot.settings).toEqual({});
    expect(snapshot.deliveryConfig).toEqual([]);
  });
});
