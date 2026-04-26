// @vitest-environment jsdom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import StorefrontCartDrawer from "./StorefrontCartDrawer.vue";
import StorefrontHomeDeliveryAddressForm from "./StorefrontHomeDeliveryAddressForm.vue";
import StorefrontLocalDeliveryAddressForm from "./StorefrontLocalDeliveryAddressForm.vue";
import StorefrontOrderHistoryCard from "./StorefrontOrderHistoryCard.vue";
import StorefrontProductGrid from "./StorefrontProductGrid.vue";
import type { OrderHistoryItem } from "./useStorefrontOrderHistory.ts";

describe("storefront Vue component mount coverage", () => {
  it("mounts product grid and emits spec quantity changes", async () => {
    const wrapper = mount(StorefrontProductGrid, {
      props: {
        categories: [{
          name: "測試分類",
          products: [{
            id: 101,
            name: "測試豆",
            description: "E2E smoke",
            roastLevel: "中焙",
            specs: [{ key: "quarter", label: "1/4磅", price: 220 }],
          }],
        }],
        specQtyMap: new Map<string, number>(),
      },
    });

    expect(wrapper.text()).toContain("測試豆");
    await wrapper.find(".spec-btn-add").trigger("click");

    expect(wrapper.emitted("change-spec-qty")?.[0]).toEqual([
      101,
      "quarter",
      1,
    ]);
  });

  it("mounts cart drawer and emits cart item actions", async () => {
    const wrapper = mount(StorefrontCartDrawer, {
      props: {
        isOpen: true,
        canSubmitOrder: true,
        submitOrderText: "送出訂單",
        cartItems: [{
          productId: 101,
          productName: "測試豆",
          specKey: "quarter",
          specLabel: "1/4磅",
          qty: 2,
          unitPrice: 220,
        }],
        discountedItemKeys: new Set(["101-quarter"]),
        cartSummary: {
          subtotal: 440,
          appliedPromos: [{ name: "測試優惠", amount: 20 }],
          totalDiscount: 20,
          discountedItemKeys: new Set(["101-quarter"]),
          afterDiscount: 420,
          totalAfterDiscount: 420,
          shippingFee: 0,
          finalTotal: 420,
          quoteAvailable: true,
        },
        showDiscountSection: true,
        totalPriceText: "$420",
      },
    });

    expect(wrapper.text()).toContain("適用優惠");
    const quantityButtons = wrapper.findAll(".quantity-btn");
    expect(quantityButtons).toHaveLength(2);
    await quantityButtons[1]!.trigger("click");
    await wrapper.find("#cart-submit-btn").trigger("click");

    expect(wrapper.emitted("change-cart-item-qty")?.[0]).toEqual([0, 1]);
    expect(wrapper.emitted("submit-order")).toHaveLength(1);
  });

  it("mounts local delivery address form and emits all editable fields", async () => {
    const wrapper = mount(StorefrontLocalDeliveryAddressForm, {
      props: {
        selectedDelivery: "delivery",
        localDeliveryAddress: {
          city: "",
          district: "",
          address: "",
          companyOrBuilding: "",
        },
        localDistrictOptions: ["東區"],
      },
    });

    expect(wrapper.text()).toContain("公司行號/社區大樓名稱");
    await wrapper.find("#delivery-city").setValue("新竹市");
    await wrapper.find("#delivery-district").setValue("東區");
    await wrapper.find("#delivery-detail-address").setValue("建中路 101 號");
    await wrapper.find("#delivery-company-or-building").setValue("幸福社區");

    expect(wrapper.emitted("update-local-delivery-address")).toEqual([
      ["city", "新竹市"],
      ["district", "東區"],
      ["address", "建中路 101 號"],
      ["companyOrBuilding", "幸福社區"],
    ]);
  });

  it("mounts home delivery address form and emits zipcode-driven selections", async () => {
    const wrapper = mount(StorefrontHomeDeliveryAddressForm, {
      props: {
        selectedDelivery: "home_delivery",
        homeDeliveryAddress: {
          city: "",
          district: "",
          zipcode: "100",
          address: "",
        },
        homeCountyOptions: ["台北市"],
        homeDistrictOptions: [{ name: "中正區", zipcode: "100" }],
      },
    });

    expect(wrapper.find(".zipcode").element).toHaveProperty("value", "100");
    await wrapper.find(".county").setValue("台北市");
    await wrapper.find(".district").setValue("中正區");
    await wrapper.find("#home-delivery-detail").setValue("忠孝西路 1 號");

    expect(wrapper.emitted("update-home-delivery-address")).toEqual([
      ["city", "台北市"],
      ["district", "中正區"],
      ["address", "忠孝西路 1 號"],
    ]);
  });

  it("mounts order history card and emits tracking copy action", async () => {
    const order: OrderHistoryItem = {
      orderId: "ORD001",
      statusLabel: "已出貨",
      deliveryMethodLabel: "全台宅配",
      locationText: "台北市中正區 忠孝西路 1 號",
      itemsText: "測試豆 x1",
      totalText: "$220",
      receiptInfo: null,
      showReceiptInfo: false,
      shippingProvider: "黑貓",
      trackingNumber: "TCAT123456",
      trackingUrl: "https://example.com/track",
      hasShippingInfo: true,
      paymentStatus: "paid",
      paymentLastCheckedAtText: "",
      paymentConfirmedAtText: "",
      paymentExpiresAtText: "",
      paymentDisplay: {
        paymentMethod: "linepay",
        paymentStatus: "paid",
        methodLabel: "LINE Pay",
        statusLabel: "已付款",
        paymentExpiresAtText: "",
        paymentConfirmedAtText: "",
        paymentLastCheckedAtText: "",
        showPaymentDeadline: false,
        badgeClass: "bg-green-50 text-green-700",
        showBadge: true,
        tone: "success",
        toneClass: "border-green-200 bg-green-50 text-green-900",
        guideTitle: "付款完成",
        guideDescription: "已完成付款",
        actionLabel: "",
        actionType: "",
        paymentUrl: "",
        canResumePayment: false,
        resumePaymentLabel: "",
      },
    };
    const wrapper = mount(StorefrontOrderHistoryCard, {
      props: { order },
    });

    expect(wrapper.text()).toContain("LINE Pay 已付款");
    await wrapper.find("[data-copy-tracking-number='true']").trigger("click");

    expect(wrapper.emitted("copy-tracking-number")?.[0]).toEqual([
      "TCAT123456",
    ]);
  });
});
