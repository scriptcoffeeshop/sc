/** @vitest-environment jsdom */

import { describe, expect, it, vi } from "vitest";
import {
  emitStorefrontLocalDeliveryAddressUpdated,
  getStorefrontLocalDeliveryAddress,
  setStorefrontLocalDeliveryAddress,
} from "./storefrontDeliveryFormState.ts";

describe("storefrontDeliveryFormState", () => {
  it("stores local delivery address and emits Vue sync events", () => {
    const listener = vi.fn();
    window.addEventListener("coffee:local-delivery-address-updated", listener);

    setStorefrontLocalDeliveryAddress({
      city: "",
      district: "",
      address: "",
      companyOrBuilding: "",
    });
    emitStorefrontLocalDeliveryAddressUpdated({
      city: "新竹市",
      district: "東區",
      address: "測試路 1 號",
    });

    expect(getStorefrontLocalDeliveryAddress()).toEqual({
      city: "新竹市",
      district: "東區",
      address: "測試路 1 號",
      companyOrBuilding: "",
    });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].detail).toMatchObject({
      city: "新竹市",
      district: "東區",
      address: "測試路 1 號",
    });

    window.removeEventListener("coffee:local-delivery-address-updated", listener);
  });
});
