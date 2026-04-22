import { describe, expect, it } from "vitest";
import { useStorefrontProducts } from "./useStorefrontProducts.ts";

describe("useStorefrontProducts", () => {
  it("syncs product categories from view model events", () => {
    const products = useStorefrontProducts();

    products.handleProductsUpdated({
      detail: {
        categories: [{ name: "咖啡豆", products: [{ id: 1, name: "測試豆" }] }],
      },
    });

    expect(products.productsCategories.value).toEqual([
      { name: "咖啡豆", products: [{ id: 1, name: "測試豆" }] },
    ]);

    products.syncProductsViewModel({});
    expect(products.productsCategories.value).toEqual([]);
  });
});
