import { beforeEach, describe, expect, it, vi } from "vitest";

function jsonResponse(payload) {
  return { json: async () => payload };
}

async function loadProductsModule() {
  vi.resetModules();
  return await import("./useDashboardProducts.js");
}

describe("useDashboardProducts", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("groups products by dashboard category order and renders enabled specs", async () => {
    const module = await loadProductsModule();
    const categories = [
      { id: 1, name: "咖啡豆" },
      { id: 2, name: "耳掛" },
    ];
    const authFetch = vi.fn(async () =>
      jsonResponse({
        success: true,
        products: [
          {
            id: 20,
            category: "耳掛",
            name: "濾掛組",
            price: 45,
            enabled: false,
          },
          {
            id: 10,
            category: "咖啡豆",
            name: "測試豆",
            price: 220,
            enabled: true,
            specs: JSON.stringify([
              { key: "half", label: "半磅", price: 420, enabled: true },
              { key: "quarter", label: "1/4磅", price: 220, enabled: false },
            ]),
          },
        ],
      })
    );

    module.configureDashboardProductsServices({
      API_URL: "https://api.example",
      authFetch,
      getAuthUserId: () => "admin-user",
      getCategories: () => categories,
      ensureCategoriesLoaded: vi.fn(),
      Sortable: null,
      Swal: { fire: vi.fn() },
      Toast: { fire: vi.fn() },
    });

    await module.dashboardProductsActions.loadProducts();
    const dashboard = module.useDashboardProducts();

    expect(dashboard.productsGroupsView.value.map((group) => group.category))
      .toEqual(["咖啡豆", "耳掛"]);
    expect(dashboard.productsGroupsView.value[0].items[0]).toMatchObject({
      id: 10,
      name: "測試豆",
      statusLabel: "啟用",
      priceLines: [{ label: "半磅", price: 420, isSpec: true }],
    });
  });

  it("resets create modal form and clones specs when editing a product", async () => {
    const module = await loadProductsModule();
    const categories = [{ id: 1, name: "咖啡豆" }];
    const authFetch = vi.fn(async () =>
      jsonResponse({
        success: true,
        products: [{
          id: 10,
          category: "咖啡豆",
          name: "測試豆",
          description: "堅果調性",
          roastLevel: "中焙",
          enabled: true,
          specs: JSON.stringify([
            { key: "half", label: "半磅", price: 420, enabled: true },
          ]),
        }],
      })
    );

    module.configureDashboardProductsServices({
      API_URL: "https://api.example",
      authFetch,
      getAuthUserId: () => "admin-user",
      getCategories: () => categories,
      ensureCategoriesLoaded: vi.fn(),
      Sortable: null,
      Swal: { fire: vi.fn() },
      Toast: { fire: vi.fn() },
    });

    await module.dashboardProductsActions.loadProducts();
    const dashboard = module.useDashboardProducts();

    await module.dashboardProductsActions.showProductModal();
    expect(dashboard.isProductModalOpen.value).toBe(true);
    expect(dashboard.productModalTitle.value).toBe("新增商品");
    expect(dashboard.productForm.specs).toHaveLength(3);

    await module.dashboardProductsActions.editProduct(10);
    expect(dashboard.productModalTitle.value).toBe("編輯商品");
    expect(dashboard.productForm).toMatchObject({
      id: "10",
      category: "咖啡豆",
      name: "測試豆",
      roastLevel: "中焙",
      enabled: true,
    });
    expect(dashboard.productForm.specs).toEqual([
      { key: "half", label: "半磅", price: 420, enabled: true },
    ]);
  });
});
