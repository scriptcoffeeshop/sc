/**
 * @vitest-environment jsdom
 */

import { describe, expect, it } from "vitest";
import {
  createTotalPriceContent,
  renderCartItemsList,
  renderDiscountSection,
  renderShippingNoticePanel,
} from "./storefrontCartUi.ts";

function createSummary(overrides = {}) {
  return {
    subtotal: 900,
    appliedPromos: [],
    totalDiscount: 0,
    discountedItemKeys: new Set(),
    afterDiscount: 900,
    totalAfterDiscount: 900,
    shippingFee: 0,
    finalTotal: 900,
    quoteAvailable: true,
    ...overrides,
  };
}

function createShippingState(overrides = {}) {
  return {
    configuredFee: 80,
    freeThreshold: 1000,
    shippingFee: 80,
    hasFreeThreshold: true,
    hasShippingRule: true,
    showBadge: true,
    isFreeShipping: false,
    showNotice: true,
    ...overrides,
  };
}

describe("storefrontCartUi", () => {
  it("renders cart rows with action datasets and text-only product content", () => {
    const container = document.createElement("div");

    renderCartItemsList(
      container,
      [
        {
          productId: 10,
          productName: "<img src=x onerror=alert(1)>測試豆",
          specKey: "half",
          specLabel: "半磅",
          qty: 2,
          unitPrice: 420,
        },
      ],
      createSummary({ discountedItemKeys: new Set(["10-half"]) }),
    );

    expect(container.textContent).toContain("<img src=x onerror=alert(1)>測試豆");
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("[data-action='cart-item-qty']").dataset.idx)
      .toBe("0");
    expect(container.querySelector("[data-action='remove-cart-item']").dataset.idx)
      .toBe("0");
    expect(container.textContent).toContain("適用優惠");
    expect(container.textContent).toContain("$840");
  });

  it("renders total badges, shipping notice, and discount section consistently", () => {
    const total = createTotalPriceContent(
      createSummary({
        totalDiscount: 100,
        shippingFee: 80,
        finalTotal: 880,
      }),
      createShippingState(),
    );

    expect(total.textContent).toContain("折 -$100");
    expect(total.textContent).toContain("運費 $80");
    expect(total.textContent).toContain("應付總額: $880");

    const shippingNotice = document.createElement("div");
    renderShippingNoticePanel(
      shippingNotice,
      createShippingState(),
      "宅配",
      createSummary({ totalAfterDiscount: 900, shippingFee: 80 }),
    );

    expect(shippingNotice.classList.contains("hidden")).toBe(false);
    expect(shippingNotice.textContent).toContain("未達 宅配免運門檻");
    expect(shippingNotice.textContent).toContain("還差 $100 即可免運");

    const discountSection = document.createElement("div");
    renderDiscountSection(
      discountSection,
      createSummary({
        appliedPromos: [{ name: "任選兩件", amount: 100 }],
        totalDiscount: 100,
      }),
      createShippingState({
        shippingFee: 0,
        isFreeShipping: true,
        showNotice: false,
      }),
      "宅配",
    );

    expect(discountSection.classList.contains("hidden")).toBe(false);
    expect(discountSection.textContent).toContain("任選兩件");
    expect(discountSection.textContent).toContain("宅配免運 (滿$1000)");
  });

  it("hides shipping and discount panels when there is nothing to show", () => {
    const shippingNotice = document.createElement("div");
    shippingNotice.textContent = "stale";
    renderShippingNoticePanel(
      shippingNotice,
      createShippingState({ showNotice: false }),
      "宅配",
      createSummary(),
    );

    expect(shippingNotice.classList.contains("hidden")).toBe(true);
    expect(shippingNotice.textContent).toBe("");

    const discountSection = document.createElement("div");
    discountSection.textContent = "stale";
    renderDiscountSection(
      discountSection,
      createSummary(),
      createShippingState({ isFreeShipping: false }),
      "宅配",
    );

    expect(discountSection.classList.contains("hidden")).toBe(true);
    expect(discountSection.textContent).toBe("");
  });
});
