import { describe, expect, it } from "vitest";
import {
  setStorefrontHomeDeliveryAddress,
  setStorefrontLocalDeliveryAddress,
} from "./storefrontDeliveryFormState.ts";
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

  it("collects home delivery address from Vue state", () => {
    setStorefrontHomeDeliveryAddress({
      city: "台北市",
      district: "中正區",
      zipcode: "100",
      address: "忠孝西路 1 號",
    });

    expect(collectSubmitDeliveryInfo("home_delivery")).toEqual({
      deliveryInfo: {
        city: "台北市",
        district: "100 中正區",
        address: "忠孝西路 1 號",
      },
      error: "",
    });
  });
});
