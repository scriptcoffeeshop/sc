/** @vitest-environment jsdom */

import { describe, expect, it, vi } from "vitest";
import {
  clearStorefrontSelectedStore,
  getStorefrontSelectedStore,
  setStorefrontSelectedStore,
} from "./storefrontSelectedStoreState.ts";

describe("storefrontSelectedStoreState", () => {
  it("stores selected convenience store data and emits updates", () => {
    const listener = vi.fn();
    window.addEventListener("coffee:store-selected-updated", listener);

    setStorefrontSelectedStore({
      storeId: 123,
      storeName: "竹科門市",
      storeAddress: "新竹市",
    });

    expect(getStorefrontSelectedStore()).toEqual({
      storeId: "123",
      storeName: "竹科門市",
      storeAddress: "新竹市",
    });
    expect(listener).toHaveBeenCalledTimes(1);

    clearStorefrontSelectedStore();
    expect(getStorefrontSelectedStore()).toEqual({
      storeId: "",
      storeName: "",
      storeAddress: "",
    });
    expect(listener).toHaveBeenCalledTimes(2);

    window.removeEventListener("coffee:store-selected-updated", listener);
  });
});
