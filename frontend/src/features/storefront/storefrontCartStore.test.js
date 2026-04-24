// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

async function loadCartStoreModule() {
  vi.resetModules();
  return await import("./storefrontCartStore.ts");
}

function mountCartShell() {
  document.body.innerHTML = `
    <span id="cart-badge" class="hidden"></span>
    <div id="cart-items" data-vue-managed="true"></div>
  `;
}

function installLocalStorageStub() {
  const store = new Map();
  vi.stubGlobal("localStorage", {
    getItem: vi.fn((key) => store.get(String(key)) ?? null),
    setItem: vi.fn((key, value) => {
      store.set(String(key), String(value));
    }),
    removeItem: vi.fn((key) => {
      store.delete(String(key));
    }),
    clear: vi.fn(() => {
      store.clear();
    }),
  });
}

describe("storefrontCartStore", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    installLocalStorageStub();
    mountCartShell();
  });

  it("falls back to an empty cart when saved cart JSON is corrupt", async () => {
    const cartStore = await loadCartStoreModule();
    localStorage.setItem("coffee_cart", "{not-json");

    expect(() => cartStore.loadCart()).not.toThrow();

    expect(cartStore.getCartSnapshot()).toEqual([]);
    expect(document.getElementById("cart-badge")?.classList.contains("hidden"))
      .toBe(true);
  });

  it("loads saved cart arrays and ignores non-array saved values", async () => {
    const cartStore = await loadCartStoreModule();
    localStorage.setItem(
      "coffee_cart",
      JSON.stringify([{ productId: 1, specKey: "half", qty: 2 }]),
    );

    cartStore.loadCart();
    expect(cartStore.getCartSnapshot()).toEqual([
      { productId: 1, specKey: "half", qty: 2 },
    ]);

    localStorage.setItem("coffee_cart", JSON.stringify({ productId: 1 }));
    cartStore.loadCart();
    expect(cartStore.getCartSnapshot()).toEqual([]);
  });
});
