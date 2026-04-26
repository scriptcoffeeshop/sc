import { beforeEach, describe, expect, it } from "vitest";
import {
  setStorefrontHomeDeliveryAddress,
  setStorefrontLocalDeliveryAddress,
} from "./storefrontDeliveryFormState.ts";
import {
  buildSubmitDeliveryInfo,
  collectSubmitDeliveryInfo,
} from "./storefrontOrderDeliveryInfo.ts";
import {
  clearStorefrontSelectedStore,
  setStorefrontSelectedStore,
} from "./storefrontSelectedStoreState.ts";

describe("collectSubmitDeliveryInfo", () => {
  beforeEach(() => {
    clearStorefrontSelectedStore();
  });

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

  it("appends local delivery company or building text before submit", () => {
    expect(buildSubmitDeliveryInfo("delivery", {
      city: "新竹市",
      district: "東區",
      address: "測試路 1 號",
      companyOrBuilding: "幸福社區 A 棟",
    })).toEqual({
      city: "新竹市",
      district: "東區",
      address: "測試路 1 號（公司行號/社區大樓：幸福社區 A 棟）",
      companyOrBuilding: "幸福社區 A 棟",
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

  it("collects store pickup selection from Vue state", () => {
    setStorefrontSelectedStore({
      storeId: "001",
      storeName: "全家測試店",
      storeAddress: "台北市測試路 1 號",
    });

    expect(collectSubmitDeliveryInfo("family_mart")).toEqual({
      deliveryInfo: {
        storeName: "全家測試店",
        storeAddress: "台北市測試路 1 號",
        storeId: "001",
      },
      error: "",
    });
  });

  it("validates missing store pickup selection from Vue state", () => {
    expect(collectSubmitDeliveryInfo("seven_eleven")).toEqual({
      deliveryInfo: null,
      error: "請填寫取貨門市名稱",
    });
  });
});
