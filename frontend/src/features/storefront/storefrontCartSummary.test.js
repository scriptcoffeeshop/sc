import { describe, expect, it } from "vitest";
import {
  calcCartSummaryFromState,
  getDeliveryMeta,
  getShippingDisplayState,
  isQuoteAlignedWithCart,
} from "./storefrontCartSummary.ts";

describe("storefrontCartSummary", () => {
  it("uses quote totals when quote matches cart and delivery", () => {
    const items = [
      { productId: 10, specKey: "half", qty: 2, unitPrice: 420 },
      { productId: 11, specKey: "full", qty: 1, unitPrice: 390 },
    ];
    const quote = {
      items: [
        { productId: 10, specKey: "half", qty: 2 },
        { productId: 11, specKey: "full", qty: 1 },
      ],
      deliveryMethod: "delivery",
      subtotal: 1230,
      totalDiscount: 120,
      afterDiscount: 1110,
      shippingFee: 80,
      total: 1190,
      appliedPromos: [{ name: "滿件折扣", amount: 120 }],
      discountedItemKeys: ["10-half"],
    };

    expect(isQuoteAlignedWithCart(quote, items, "delivery")).toBe(true);

    expect(calcCartSummaryFromState(items, quote, "delivery")).toEqual({
      subtotal: 1230,
      appliedPromos: [{ name: "滿件折扣", amount: 120 }],
      totalDiscount: 120,
      discountedItemKeys: new Set(["10-half"]),
      afterDiscount: 1110,
      totalAfterDiscount: 1110,
      shippingFee: 80,
      finalTotal: 1190,
      quoteAvailable: true,
    });
  });

  it("falls back to subtotal when quote drifts from cart or delivery", () => {
    const items = [
      { productId: 10, specKey: "half", qty: 2, unitPrice: 420 },
    ];
    const quote = {
      items: [{ productId: 10, specKey: "half", qty: 1 }],
      deliveryMethod: "pickup",
      totalDiscount: 999,
      total: 1,
    };

    expect(isQuoteAlignedWithCart(quote, items, "delivery")).toBe(false);
    expect(calcCartSummaryFromState(items, quote, "delivery")).toEqual({
      subtotal: 840,
      appliedPromos: [],
      totalDiscount: 0,
      discountedItemKeys: new Set(),
      afterDiscount: 840,
      totalAfterDiscount: 840,
      shippingFee: 0,
      finalTotal: 840,
      quoteAvailable: false,
    });
  });

  it("derives shipping badge and delivery metadata from config", () => {
    const summary = {
      shippingFee: 0,
      quoteAvailable: true,
      totalAfterDiscount: 1200,
    };
    const shippingConfig = {
      fee: 80,
      freeThreshold: 1000,
    };

    expect(
      getShippingDisplayState(summary, shippingConfig, "delivery"),
    ).toEqual({
      configuredFee: 80,
      freeThreshold: 1000,
      shippingFee: 0,
      hasFreeThreshold: true,
      hasShippingRule: true,
      showBadge: true,
      isFreeShipping: true,
      showNotice: false,
    });

    expect(
      getDeliveryMeta(
        "delivery",
        JSON.stringify([
          { id: "pickup", name: "門市自取" },
          { id: "delivery", name: "黑貓宅配" },
        ]),
      ),
    ).toEqual({
      selectedDelivery: "delivery",
      deliveryName: "黑貓宅配",
    });
  });
});
