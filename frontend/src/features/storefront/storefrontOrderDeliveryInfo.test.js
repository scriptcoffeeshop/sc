import { describe, expect, it } from "vitest";
import { setStorefrontLocalDeliveryAddress } from "./storefrontDeliveryFormState.ts";
import { collectSubmitDeliveryInfo } from "./storefrontOrderDeliveryInfo.ts";

describe("collectSubmitDeliveryInfo", () => {
  it("collects local delivery address from Vue state", () => {
    setStorefrontLocalDeliveryAddress({
      city: "新竹市",
      district: "東區",
      address: "測試路 1 號",
      companyOrBuilding: "",
    });

    expect(collectSubmitDeliveryInfo("delivery")).toEqual({
      deliveryInfo: {
        city: "新竹市",
        district: "東區",
        address: "測試路 1 號",
        companyOrBuilding: "",
      },
      error: "",
    });
  });

  it("validates missing local delivery address from Vue state", () => {
    setStorefrontLocalDeliveryAddress({
      city: "",
      district: "",
      address: "",
      companyOrBuilding: "",
    });

    expect(collectSubmitDeliveryInfo("delivery")).toEqual({
      deliveryInfo: null,
      error: "請選擇縣市",
    });
  });
});
