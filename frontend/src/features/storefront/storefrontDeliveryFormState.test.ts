/** @vitest-environment jsdom */

import { describe, expect, it, vi } from "vitest";
import {
  emitStorefrontHomeDeliveryAddressUpdated,
  emitStorefrontLocalDeliveryAddressUpdated,
  getStorefrontHomeDeliveryAddress,
  getStorefrontLocalDeliveryAddress,
  setStorefrontHomeDeliveryAddress,
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
    expect(listener.mock.calls[0]![0].detail).toMatchObject({
      city: "新竹市",
      district: "東區",
      address: "測試路 1 號",
    });

    window.removeEventListener("coffee:local-delivery-address-updated", listener);
  });

  it("stores home delivery address and emits Vue sync events", () => {
    const listener = vi.fn();
    window.addEventListener("coffee:home-delivery-address-updated", listener);

    setStorefrontHomeDeliveryAddress({
      city: "",
      district: "",
      zipcode: "",
      address: "",
    });
    emitStorefrontHomeDeliveryAddressUpdated({
      city: "台北市",
      district: "中正區",
      zipcode: "100",
      address: "忠孝西路 1 號",
    });

    expect(getStorefrontHomeDeliveryAddress()).toEqual({
      city: "台北市",
      district: "中正區",
      zipcode: "100",
      address: "忠孝西路 1 號",
    });
    expect(listener).toHaveBeenCalledTimes(1);

    window.removeEventListener("coffee:home-delivery-address-updated", listener);
  });
});
