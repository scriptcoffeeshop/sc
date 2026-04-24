import { beforeAll, describe, expect, it, vi } from "vitest";

let normalizeStorefrontDeliveryConfig;
let useStorefrontDelivery;

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
    }).map((option) => ({
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
          { id: "delivery", name: "宅配", enabled: true },
          { id: "family_mart", name: "全家", enabled: false },
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
