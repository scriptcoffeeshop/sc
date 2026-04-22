import { describe, expect, it, vi } from "vitest";
import { useStorefrontDelivery } from "./useStorefrontDelivery.ts";

describe("useStorefrontDelivery", () => {
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

    expect(delivery.deliveryOptions.value).toEqual([
      { id: "delivery", name: "宅配", enabled: true },
    ]);
    expect(deps.selectDelivery).toHaveBeenCalledWith("delivery");
    expect(deps.openStoreMap).toHaveBeenCalledTimes(1);
    expect(deps.clearSelectedStore).toHaveBeenCalledTimes(1);
  });

  it("resolves delivery icons through configured url or fallback text", () => {
    const delivery = useStorefrontDelivery();

    const customIcon = delivery.resolveDeliveryIcon({
      id: "delivery",
      icon_url: "icons/custom.png",
    });
    const fallbackIcon = delivery.resolveDeliveryIcon({
      id: "custom",
      icon: "🚚",
    });

    expect(customIcon.url).toContain("icons/custom.png");
    expect(customIcon.fallbackText).toBe("");
    expect(fallbackIcon.url).toContain("icons/delivery-truck.png");
    expect(fallbackIcon.fallbackText).toBe("");
  });
});
