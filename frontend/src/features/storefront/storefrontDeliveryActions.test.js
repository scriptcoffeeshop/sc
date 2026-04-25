/** @vitest-environment jsdom */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { state } from "../../lib/appState.ts";
import { setStorefrontSelectedStore } from "./storefrontSelectedStoreState.ts";
import {
  getStorefrontHomeDeliveryAddress,
  getStorefrontLocalDeliveryAddress,
  setStorefrontHomeDeliveryAddress,
  setStorefrontLocalDeliveryAddress,
} from "./storefrontDeliveryFormState.ts";
import {
  checkStoreToken,
  loadDeliveryPrefs,
} from "./storefrontDeliveryActions.ts";

vi.mock("../../lib/swal.ts", () => ({
  default: {
    fire: vi.fn(),
    close: vi.fn(),
    showLoading: vi.fn(),
  },
}));

vi.mock("../../lib/sharedUtils.ts", () => ({
  Toast: {
    fire: vi.fn(),
  },
}));

describe("storefrontDeliveryActions", () => {
  const localStorageItems = new Map();

  beforeEach(() => {
    vi.restoreAllMocks();
    localStorageItems.clear();
    vi.stubGlobal("localStorage", {
      getItem: vi.fn((key) =>
        localStorageItems.has(key) ? localStorageItems.get(key) : null
      ),
      setItem: vi.fn((key, value) =>
        localStorageItems.set(key, String(value))
      ),
      removeItem: vi.fn((key) => localStorageItems.delete(key)),
    });
    state.currentUser = null;
    state.selectedDelivery = "";
    setStorefrontSelectedStore({});
    setStorefrontLocalDeliveryAddress({
      city: "",
      district: "",
      address: "",
      companyOrBuilding: "",
    });
    setStorefrontHomeDeliveryAddress({
      city: "",
      district: "",
      zipcode: "",
      address: "",
    });
  });

  it("applies store token delivery method without clicking DOM delivery cards", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      json: async () => ({
        success: true,
        found: true,
        logisticsSubType: "FAMIC2C",
        storeId: "001",
        storeName: "全家測試",
        storeAddress: "台北市",
      }),
    })));

    await checkStoreToken("token-1");

    expect(state.selectedDelivery).toBe("family_mart");
  });

  it("loads delivery preferences into Vue address state", () => {
    state.currentUser = {
      userId: "user-1",
      defaultDeliveryMethod: "home_delivery",
      defaultCity: "台北市",
      defaultDistrict: "100 中正區",
      defaultAddress: "忠孝西路 1 號",
    };

    loadDeliveryPrefs();

    expect(state.selectedDelivery).toBe("home_delivery");
    expect(getStorefrontHomeDeliveryAddress()).toEqual({
      city: "台北市",
      district: "中正區",
      zipcode: "100",
      address: "忠孝西路 1 號",
    });
  });

  it("loads local delivery preferences into Vue address state", () => {
    localStorageItems.set("coffee_delivery_prefs", JSON.stringify({
      method: "delivery",
      city: "新竹市",
      district: "東區",
      address: "測試路 1 號",
      companyOrBuilding: "測試大樓",
    }));

    loadDeliveryPrefs();

    expect(state.selectedDelivery).toBe("delivery");
    expect(getStorefrontLocalDeliveryAddress()).toEqual({
      city: "新竹市",
      district: "東區",
      address: "測試路 1 號",
      companyOrBuilding: "測試大樓",
    });
  });
});
