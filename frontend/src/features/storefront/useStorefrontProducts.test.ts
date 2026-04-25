import { describe, expect, it } from "vitest";
import {
  buildStorefrontProductsViewModel,
  useStorefrontProducts,
} from "./useStorefrontProducts.ts";

describe("useStorefrontProducts", () => {
  it("builds ordered product categories and keeps enabled specs", () => {
    expect(buildStorefrontProductsViewModel(
      [
        {
          id: 2,
          name: "濾掛組",
          category: "耳掛",
          price: 180,
          specs: JSON.stringify([{ key: "default", label: "單包", price: 180 }]),
        },
        {
          id: 1,
          name: "經典配方",
          category: "咖啡豆",
          price: 420,
          roastLevel: "中焙",
          specs: JSON.stringify([
            { key: "half", label: "半磅", price: 420, enabled: true },
            { key: "full", label: "一磅", price: 780, enabled: false },
          ]),
        },
      ],
      [{ name: "咖啡豆" }, { name: "耳掛" }],
    )).toEqual([
      {
        name: "咖啡豆",
        products: [{
          id: 1,
          name: "經典配方",
          description: "",
          roastLevel: "中焙",
          specs: [{ key: "half", label: "半磅", price: 420 }],
        }],
      },
      {
        name: "耳掛",
        products: [{
          id: 2,
          name: "濾掛組",
          description: "",
          roastLevel: "",
          specs: [{ key: "default", label: "單包", price: 180 }],
        }],
      },
    ]);
  });

  it("syncs product categories from snapshot state", () => {
    const products = useStorefrontProducts({
      getStorefrontUiSnapshot: () => ({
        products: [{
          id: 1,
          name: "測試豆",
          category: "咖啡豆",
          price: 420,
          specs: JSON.stringify([{ key: "half", label: "半磅", price: 420 }]),
        }],
        categories: [{ name: "咖啡豆" }],
      }),
    });

    products.refreshProductsState();

    expect(products.productsCategories.value).toEqual([
      {
        name: "咖啡豆",
        products: [{
          id: 1,
          name: "測試豆",
          description: "",
          roastLevel: "",
          specs: [{ key: "half", label: "半磅", price: 420 }],
        }],
      },
    ]);
  });

  it("syncs product categories from view model events", () => {
    const products = useStorefrontProducts();

    products.handleProductsUpdated(
      new CustomEvent("coffee:products-updated", {
        detail: {
          categories: [{
            name: "咖啡豆",
            products: [{
              id: 1,
              name: "測試豆",
              description: "",
              roastLevel: "",
              specs: [],
            }],
          }],
        },
      }),
    );

    expect(products.productsCategories.value).toEqual([
      {
        name: "咖啡豆",
        products: [{
          id: 1,
          name: "測試豆",
          description: "",
          roastLevel: "",
          specs: [],
        }],
      },
    ]);

    products.syncProductsViewModel({});
    expect(products.productsCategories.value).toEqual([]);
  });
});
