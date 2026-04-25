import { describe, expect, it, vi } from "vitest";
import {
  useStorefrontCart,
  type StorefrontCartItem,
} from "./useStorefrontCart.ts";
import type { StorefrontUiSnapshot } from "./storefrontUiSnapshot.ts";

function createCartApi(snapshot: StorefrontCartItem[] = []) {
  return {
    addToCart: vi.fn(),
    getCartSnapshot: vi.fn(() => snapshot),
    removeCartItem: vi.fn(),
    updateCartItemQty: vi.fn(),
    updateCartItemQtyByKeys: vi.fn(),
  };
}

describe("useStorefrontCart", () => {
  it("syncs cart update events into summary, badges, and quantity maps", () => {
    const cartApi = createCartApi([
      {
        productId: 10,
        specKey: "half",
        productName: "測試豆",
        qty: 2,
        unitPrice: 420,
      },
    ]);
    const cart = useStorefrontCart({ cartApi });

    cart.syncCartSnapshot();
    expect(cart.cartItemCount.value).toBe(2);
    expect(cart.cartQtyMap.value.get("10-half")).toBe(2);

    cart.handleCartUpdated({
      detail: {
        items: [
          {
            productId: 10,
            specKey: "half",
            productName: "測試豆",
            qty: 2,
            unitPrice: 420,
          },
        ],
        selectedDelivery: "delivery",
        deliveryName: "宅配",
        shippingConfig: { fee: 120, freeThreshold: 1000 },
        summary: {
          appliedPromos: [{ name: "任選二件", discount: 50 }],
          totalDiscount: 50,
          discountedItemKeys: ["10-half"],
          totalAfterDiscount: 790,
          shippingFee: 120,
          finalTotal: 910,
          quoteAvailable: true,
        },
      },
    });

    expect(cart.totalPriceText.value).toBe("$910");
    expect(cart.discountedItemKeySet.value.has("10-half")).toBe(true);
    expect(cart.showShippingBadge.value).toBe(true);
    expect(cart.showShippingNotice.value).toBe(true);
    expect(cart.shippingNoticeTitle.value).toBe("未達 宅配免運門檻");
    expect(cart.showDiscountSection.value).toBe(true);
    expect(cart.shippingDiff.value).toBe(210);
    expect(cart.freeShippingThresholdText.value).toBe(" (滿$1000)");
  });

  it("delegates quantity, remove, drawer, and submit actions", () => {
    const cartApi = createCartApi();
    const orderApi = { submitOrder: vi.fn() };
    const cart = useStorefrontCart({ cartApi, orderApi });

    cart.changeSpecQty(10, "half", 1);
    expect(cartApi.addToCart).toHaveBeenCalledWith(10, "half");

    cart.handleCartUpdated({
      detail: {
        items: [{ productId: 10, specKey: "half", qty: 1 }],
      },
    });
    cart.changeSpecQty(10, "half", -1);
    expect(cartApi.updateCartItemQtyByKeys).toHaveBeenCalledWith(
      10,
      "half",
      -1,
    );

    cart.changeCartItemQty(0, 1);
    expect(cartApi.updateCartItemQty).toHaveBeenCalledWith(0, 1);

    cart.removeCartIndex(0);
    expect(cartApi.removeCartItem).toHaveBeenCalledWith(0);

    cart.toggleCartDrawer();
    expect(cart.isCartDrawerOpen.value).toBe(true);

    cart.submitOrderFromCart();
    expect(cart.isCartDrawerOpen.value).toBe(true);
    expect(orderApi.submitOrder).toHaveBeenCalledTimes(1);
  });

  it("derives cart submit state from login, store status, and item count", () => {
    let snapshot: Partial<StorefrontUiSnapshot> = {
      currentUser: null,
      isStoreOpen: true,
    };
    const cart = useStorefrontCart({
      getStorefrontUiSnapshot: () => snapshot,
    });

    cart.handleCartUpdated({
      detail: {
        items: [{ productId: 10, specKey: "half", qty: 1 }],
      },
    });
    cart.refreshCartSubmitState();
    expect(cart.canSubmitOrder.value).toBe(true);
    expect(cart.submitOrderText.value).toBe("請先登入後再送出訂單");

    snapshot = {
      currentUser: { userId: "line-1" },
      isStoreOpen: false,
    };
    cart.handleCartUpdated({
      detail: {
        items: [{ productId: 10, specKey: "half", qty: 1 }],
      },
    });
    expect(cart.canSubmitOrder.value).toBe(false);
    expect(cart.submitOrderText.value).toBe("目前休息中，暫停接單");

    snapshot = {
      currentUser: { userId: "line-1" },
      isStoreOpen: true,
    };
    cart.refreshCartSubmitState();
    expect(cart.canSubmitOrder.value).toBe(true);
    expect(cart.submitOrderText.value).toBe("確認送出訂單");
  });

  it("closes the cart drawer only after the customer is logged in", () => {
    let snapshot: Partial<StorefrontUiSnapshot> = {
      currentUser: null,
      isStoreOpen: true,
    };
    const orderApi = { submitOrder: vi.fn() };
    const cart = useStorefrontCart({
      orderApi,
      getStorefrontUiSnapshot: () => snapshot,
    });
    cart.handleCartUpdated({
      detail: { items: [{ productId: 10, specKey: "", qty: 1 }] },
    });
    cart.toggleCartDrawer();

    cart.submitOrderFromCart();
    expect(cart.isCartDrawerOpen.value).toBe(true);

    snapshot = { currentUser: { userId: "line-1" }, isStoreOpen: true };
    cart.refreshCartSubmitState();
    cart.submitOrderFromCart();
    expect(cart.isCartDrawerOpen.value).toBe(false);
    expect(orderApi.submitOrder).toHaveBeenCalledTimes(2);
  });

  it("handles zero-quantity boundaries and flat shipping rules", () => {
    const cartApi = createCartApi();
    const cart = useStorefrontCart({ cartApi });

    cart.changeSpecQty(10, "half", -1);
    expect(cartApi.addToCart).not.toHaveBeenCalled();
    expect(cartApi.updateCartItemQtyByKeys).toHaveBeenCalledWith(
      10,
      "half",
      -1,
    );

    cart.handleCartUpdated({
      detail: {
        items: [{ productId: 10, specKey: "half", qty: 0 }],
        selectedDelivery: "delivery",
        deliveryName: "宅配",
        shippingConfig: { fee: 60, freeThreshold: 0 },
        summary: {
          appliedPromos: [],
          totalDiscount: 0,
          discountedItemKeys: [],
          totalAfterDiscount: 0,
          shippingFee: 60,
          finalTotal: 60,
          quoteAvailable: true,
        },
      },
    });

    expect(cart.cartItemCount.value).toBe(0);
    expect(cart.showShippingBadge.value).toBe(true);
    expect(cart.isFreeShipping.value).toBe(false);
    expect(cart.showShippingNotice.value).toBe(true);
    expect(cart.shippingNoticeTitle.value).toBe("宅配運費");
    expect(cart.freeShippingThresholdText.value).toBe("");
  });

  it("supports stacked promotions alongside free shipping", () => {
    const cartApi = createCartApi();
    const cart = useStorefrontCart({ cartApi });

    cart.handleCartUpdated({
      detail: {
        items: [
          { productId: 10, specKey: "half", qty: 1, unitPrice: 420 },
          { productId: 11, specKey: "full", qty: 2, unitPrice: 390 },
        ],
        selectedDelivery: "delivery",
        deliveryName: "宅配",
        shippingConfig: { fee: 120, freeThreshold: 1000 },
        summary: {
          appliedPromos: [
            { name: "任選兩件折 $50", discount: 50 },
            { name: "滿千免運", discount: 120 },
          ],
          totalDiscount: 170,
          discountedItemKeys: ["10-half", "11-full"],
          totalAfterDiscount: 1200,
          shippingFee: 0,
          finalTotal: 1200,
          quoteAvailable: true,
        },
      },
    });

    expect(cart.discountedItemKeySet.value.has("10-half")).toBe(true);
    expect(cart.discountedItemKeySet.value.has("11-full")).toBe(true);
    expect(cart.showDiscountSection.value).toBe(true);
    expect(cart.isFreeShipping.value).toBe(true);
    expect(cart.showShippingNotice.value).toBe(false);
    expect(cart.shippingDiff.value).toBe(0);
    expect(cart.totalPriceText.value).toBe("$1200");
  });
});
