import { describe, expect, it, vi } from "vitest";
import { useStorefrontCart } from "./useStorefrontCart.ts";

function createCartApi(snapshot = []) {
  return {
    addToCart: vi.fn(),
    getCartSnapshot: vi.fn(() => snapshot),
    removeCartItem: vi.fn(),
    toggleCart: vi.fn(),
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
    expect(cartApi.toggleCart).toHaveBeenCalledTimes(1);

    cart.submitOrderFromCart();
    expect(cartApi.toggleCart).toHaveBeenCalledTimes(2);
    expect(orderApi.submitOrder).toHaveBeenCalledTimes(1);
  });
});
