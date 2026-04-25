import { beforeAll, describe, expect, it, vi } from "vitest";
import type { StorefrontDeliveryOption } from "./storefrontModels.ts";

type StorefrontDeliveryModule = typeof import("./useStorefrontDelivery.ts");

let normalizeStorefrontDeliveryConfig: StorefrontDeliveryModule[
  "normalizeStorefrontDeliveryConfig"
];
let useStorefrontDelivery: StorefrontDeliveryModule["useStorefrontDelivery"];

beforeAll(async () => {
  vi.stubGlobal("Swal", {
    mixin: vi.fn(() => ({ fire: vi.fn() })),
  });

  ({
    normalizeStorefrontDeliveryConfig,
    useStorefrontDelivery,
  } = await import("./useStorefrontDelivery.ts"));
});

describe("useStorefrontDelivery", () => {
  it("normalizes delivery config from legacy settings fallback", () => {
    expect(normalizeStorefrontDeliveryConfig({
      linepay_enabled: "true",
      transfer_enabled: "false",
    }).map((option: StorefrontDeliveryOption) => ({
      id: option.id,
      enabled: option.enabled,
      payment: option.payment,
    }))).toEqual([
      {
        id: "in_store",
        enabled: true,
        payment: { cod: true, linepay: true, jkopay: true, transfer: false },
      },
      {
        id: "delivery",
        enabled: true,
        payment: { cod: true, linepay: true, jkopay: true, transfer: false },
      },
      {
        id: "home_delivery",
        enabled: true,
        payment: { cod: true, linepay: true, jkopay: true, transfer: false },
      },
      {
        id: "seven_eleven",
        enabled: true,
        payment: { cod: true, linepay: false, jkopay: false, transfer: false },
      },
      {
        id: "family_mart",
        enabled: true,
        payment: { cod: true, linepay: false, jkopay: false, transfer: false },
      },
    ]);
  });

  it("syncs enabled delivery options and delegates delivery actions", () => {
    const deps = {
      getStorefrontUiSnapshot: vi.fn(() => ({
        deliveryConfig: [
          {
            id: "delivery",
            icon_url: "",
            label: "宅配",
            name: "宅配",
            description: "",
            enabled: true,
            payment: {
              cod: false,
              linepay: false,
              jkopay: false,
              transfer: false,
            },
          },
          {
            id: "family_mart",
            icon_url: "",
            label: "全家",
            name: "全家",
            description: "",
            enabled: false,
            payment: {
              cod: false,
              linepay: false,
              jkopay: false,
              transfer: false,
            },
          },
        ],
      })),
      selectDelivery: vi.fn(),
      openStoreMap: vi.fn(),
      clearSelectedStore: vi.fn(),
    };
    const delivery = useStorefrontDelivery(deps);

    delivery.syncDeliveryState();
    delivery.handleSelectDelivery("delivery");
    delivery.handleOpenStoreMap();
    delivery.handleClearSelectedStore();

    expect(delivery.deliveryOptions.value).toMatchObject([
      {
        id: "delivery",
        name: "宅配",
        enabled: true,
        label: "宅配",
        payment: { cod: false, linepay: false, jkopay: false, transfer: false },
      },
    ]);
    expect(deps.selectDelivery).toHaveBeenCalledWith("delivery");
    expect(deps.openStoreMap).toHaveBeenCalledTimes(1);
    expect(deps.clearSelectedStore).toHaveBeenCalledTimes(1);
  });

  it("tracks local delivery address and district options with Vue state", () => {
    const delivery = useStorefrontDelivery();

    delivery.updateLocalDeliveryAddress("city", "新竹市");
    expect(delivery.localDeliveryAddress.value).toMatchObject({
      city: "新竹市",
      district: "",
    });
    expect(delivery.localDistrictOptions.value).toEqual([
      "東區",
      "北區",
      "香山區",
    ]);

    delivery.updateLocalDeliveryAddress("district", "東區");
    delivery.updateLocalDeliveryAddress("address", "測試路 1 號");
    expect(delivery.localDeliveryAddress.value).toMatchObject({
      district: "東區",
      address: "測試路 1 號",
    });
  });

  it("tracks home delivery address and zipcode with Vue state", () => {
    const delivery = useStorefrontDelivery();

    delivery.updateHomeDeliveryAddress("city", "台北市");
    expect(delivery.homeDistrictOptions.value[0]).toEqual({
      name: "中正區",
      zipcode: "100",
    });

    delivery.updateHomeDeliveryAddress("district", "中正區");
    delivery.updateHomeDeliveryAddress("address", "忠孝西路 1 號");

    expect(delivery.homeDeliveryAddress.value).toMatchObject({
      city: "台北市",
      district: "中正區",
      zipcode: "100",
      address: "忠孝西路 1 號",
    });
  });

  it("resolves delivery icons through configured url or default icon", () => {
    const delivery = useStorefrontDelivery();

    const customIcon = delivery.resolveDeliveryIcon({
      id: "delivery",
      icon_url: "icons/custom.png",
    });
    const fallbackIcon = delivery.resolveDeliveryIcon({
      id: "custom",
    });

    expect(customIcon.url).toContain("icons/custom.png");
    expect(fallbackIcon.url).toContain("icons/delivery-truck.png");
  });
});
