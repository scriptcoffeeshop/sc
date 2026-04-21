import { beforeEach, describe, expect, it, vi } from "vitest";

function jsonResponse(payload) {
  return { json: async () => payload };
}

async function loadPromotionsModule() {
  vi.resetModules();
  return await import("./useDashboardPromotions.js");
}

describe("useDashboardPromotions", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders promotion status and discount labels", async () => {
    const module = await loadPromotionsModule();
    const authFetch = vi.fn(async () =>
      jsonResponse({
        success: true,
        promotions: [
          {
            id: 1,
            name: "任選二件",
            minQuantity: 2,
            discountType: "percent",
            discountValue: 9,
            enabled: true,
          },
          {
            id: 2,
            name: "折價活動",
            minQuantity: 3,
            discountType: "amount",
            discountValue: 50,
            enabled: false,
          },
        ],
      })
    );

    module.configureDashboardPromotionsServices({
      API_URL: "https://api.example",
      authFetch,
      getAuthUserId: () => "admin-user",
      getProducts: () => [],
      ensureProductsLoaded: vi.fn(),
      Sortable: null,
      Swal: { fire: vi.fn() },
      Toast: { fire: vi.fn() },
    });

    await module.dashboardPromotionsActions.loadPromotions();
    const dashboard = module.useDashboardPromotions();

    expect(dashboard.promotionsView.value).toEqual([
      {
        id: 1,
        name: "任選二件",
        conditionText: "任選 2 件",
        discountText: "9 折",
        enabled: true,
        statusLabel: "啟用",
        statusClass: "ui-text-success",
      },
      {
        id: 2,
        name: "折價活動",
        conditionText: "任選 3 件",
        discountText: "折 $50",
        enabled: false,
        statusLabel: "未啟用",
        statusClass: "ui-text-muted",
      },
    ]);
  });

  it("builds product spec target options and toggles selected targets", async () => {
    const module = await loadPromotionsModule();
    const products = [
      {
        id: 10,
        category: "咖啡豆",
        name: "測試豆",
        specs: JSON.stringify([
          { key: "quarter", label: "1/4磅", price: 220 },
          { key: "half", label: "半磅", price: 420 },
        ]),
      },
      {
        id: 20,
        category: "耳掛",
        name: "濾掛組",
        price: 45,
      },
    ];
    const authFetch = vi.fn(async () =>
      jsonResponse({
        success: true,
        promotions: [{
          id: 1,
          name: "任選二件",
          type: "bundle",
          minQuantity: 2,
          discountType: "percent",
          discountValue: 9,
          enabled: true,
          targetItems: [{ productId: 10, specKey: "half" }],
        }],
      })
    );

    module.configureDashboardPromotionsServices({
      API_URL: "https://api.example",
      authFetch,
      getAuthUserId: () => "admin-user",
      getProducts: () => products,
      ensureProductsLoaded: vi.fn(),
      Sortable: null,
      Swal: { fire: vi.fn() },
      Toast: { fire: vi.fn() },
    });

    await module.dashboardPromotionsActions.loadPromotions();
    const dashboard = module.useDashboardPromotions();

    expect(dashboard.promotionProductGroups.value[0]).toMatchObject({
      productId: 10,
      category: "咖啡豆",
      name: "測試豆",
      options: [
        { productId: 10, specKey: "quarter", label: "1/4磅", price: 220 },
        { productId: 10, specKey: "half", label: "半磅", price: 420 },
      ],
    });

    await module.dashboardPromotionsActions.editPromotion(1);
    expect(dashboard.isPromotionTargetSelected(10, "half")).toBe(true);
    dashboard.togglePromotionTarget(10, "half", false);
    expect(dashboard.isPromotionTargetSelected(10, "half")).toBe(false);
    dashboard.togglePromotionTarget(20, "", true);
    expect(dashboard.promotionForm.targetItems).toEqual([
      { productId: 20, specKey: "" },
    ]);
  });
});
