// @vitest-environment jsdom

import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import DashboardFormFieldDialogForm, {
  type DashboardFormFieldDialogExpose,
} from "./DashboardFormFieldDialogForm.vue";
import DashboardOrderCard from "./DashboardOrderCard.vue";
import DashboardPromotionModal from "./DashboardPromotionModal.vue";
import DashboardShippingInfoForm, {
  type DashboardShippingInfoFormExpose,
} from "./DashboardShippingInfoForm.vue";
import { buildOrderViewModel } from "./dashboardOrdersView.ts";
import { dashboardOrdersActions } from "./useDashboardOrders.ts";
import {
  configureDashboardPromotionsServices,
  dashboardPromotionsActions,
} from "./useDashboardPromotions.ts";

describe("dashboard Vue component mount coverage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    dashboardPromotionsActions.closePromotionModal();
  });

  it("mounts DashboardOrderCard and forwards high-interaction actions", async () => {
    const toggleSelection = vi.spyOn(
      dashboardOrdersActions,
      "toggleOrderSelection",
    );
    const setPendingStatus = vi.spyOn(
      dashboardOrdersActions,
      "setPendingOrderStatus",
    );
    const confirmStatus = vi.spyOn(dashboardOrdersActions, "confirmOrderStatus")
      .mockResolvedValue(undefined);
    const order = buildOrderViewModel({
      orderId: "ORD-DASH-1",
      timestamp: "2026-04-26T05:00:00.000Z",
      deliveryMethod: "delivery",
      status: "pending",
      paymentMethod: "transfer",
      paymentStatus: "pending",
      lineUserId: "line-user",
      lineName: "測試客戶",
      phone: "0912000000",
      email: "customer@example.com",
      city: "新竹市",
      district: "東區",
      address: "建中路 101 號",
      transferAccountLast5: "12345",
      paymentId: "013-111122223333",
      items: "測試豆 x1",
      total: 220,
    }, "processing", false);

    const wrapper = mount(DashboardOrderCard, {
      props: { order },
    });

    expect(wrapper.text()).toContain("#ORD-DASH-1");
    await wrapper.find("input[type='checkbox']").setValue(true);
    await wrapper.find(".order-card__status-select").setValue("processing");
    await wrapper.find(".confirm-status-btn").trigger("click");

    expect(toggleSelection).toHaveBeenCalledWith("ORD-DASH-1", true);
    expect(setPendingStatus).toHaveBeenCalledWith("ORD-DASH-1", "processing");
    expect(confirmStatus).toHaveBeenCalledWith("ORD-DASH-1");
  });

  it("mounts DashboardPromotionModal and updates promotion form controls", async () => {
    configureDashboardPromotionsServices({
      API_URL: "https://mock.example/functions/v1/coffee-api",
      authFetch: vi.fn(async () => ({ json: async () => ({ success: true }) })),
      getAuthUserId: () => "admin-user",
      getProducts: () => [{
        id: 201,
        category: "測試分類",
        name: "後台測試商品",
        price: 180,
        specs: JSON.stringify([{
          key: "single",
          label: "單包",
          price: 180,
        }]),
      }],
      Swal: { fire: vi.fn(async () => ({ isConfirmed: true })) },
      Toast: { fire: vi.fn() },
    });
    await dashboardPromotionsActions.showPromotionModal();

    const wrapper = mount(DashboardPromotionModal);

    expect(wrapper.text()).toContain("新增活動");
    expect(wrapper.text()).toContain("後台測試商品");
    await wrapper.find("#prm-name").setValue("任選測試優惠");
    await wrapper.find("#prm-min-qty").setValue("3");
    await wrapper.find(".promo-product-cb").setValue(true);

    expect(wrapper.text()).toContain("已選 1 / 1 個品項");
    expect(wrapper.find<HTMLInputElement>("#prm-name").element.value).toBe(
      "任選測試優惠",
    );
    expect(wrapper.find<HTMLInputElement>("#prm-min-qty").element.value).toBe(
      "3",
    );
  });

  it("mounts DashboardFormFieldDialogForm and exposes validated values", async () => {
    const wrapper = mount(DashboardFormFieldDialogForm, {
      props: {
        mode: "add",
        deliveryOptions: [
          { id: "delivery", label: "配送到府" },
          { id: "in_store", label: "來店自取" },
        ],
      },
    });

    await wrapper.find("#swal-fk").setValue("receipt_type");
    await wrapper.find("#swal-fl").setValue("收據類型");
    await wrapper.find("#swal-ft").setValue("select");
    await wrapper.find("#swal-fp").setValue("請選擇");
    await wrapper.find("#swal-fo").setValue("二聯式,三聯式");
    await wrapper.find("#swal-fr").setValue(true);
    const visibilityChecks = wrapper.findAll(".dv-cb");
    expect(visibilityChecks).toHaveLength(2);
    await visibilityChecks[1]!.setValue(false);

    const exposed = wrapper.vm as unknown as DashboardFormFieldDialogExpose;

    expect(exposed.getValues()).toEqual({
      fieldKey: "receipt_type",
      label: "收據類型",
      fieldType: "select",
      placeholder: "請選擇",
      options: JSON.stringify(["二聯式", "三聯式"]),
      required: true,
      deliveryVisibility: JSON.stringify({
        delivery: true,
        in_store: false,
      }),
    });
  });

  it("mounts DashboardShippingInfoForm with preset and custom tracking providers", async () => {
    const wrapper = mount(DashboardShippingInfoForm, {
      props: {
        initialValues: {
          trackingNumber: "JP-7001",
        },
      },
    });
    const exposed = wrapper.vm as unknown as DashboardShippingInfoFormExpose;

    await wrapper.find("#swal-shipping-provider-preset").setValue(
      "seven_eleven",
    );

    expect(exposed.getValues()).toEqual({
      trackingNumber: "JP-7001",
      shippingProvider: "7-11",
      trackingUrl: "https://eservice.7-11.com.tw/e-tracking/search.aspx",
    });
    expect(
      wrapper.find<HTMLInputElement>("#swal-tracking-url").element.disabled,
    ).toBe(true);

    await wrapper.find("#swal-shipping-provider-preset").setValue("other");
    await wrapper.find("#swal-shipping-provider").setValue("黑貓宅急便");
    await wrapper.find("#swal-tracking-url").setValue(
      "https://tracking.example/JP-7001",
    );

    expect(exposed.getValues()).toEqual({
      trackingNumber: "JP-7001",
      shippingProvider: "黑貓宅急便",
      trackingUrl: "https://tracking.example/JP-7001",
    });
  });

  it("mounts DashboardShippingInfoForm with legacy preset provider labels", () => {
    const wrapper = mount(DashboardShippingInfoForm, {
      props: {
        initialValues: {
          trackingNumber: "FM-7001",
          shippingProvider: "全家貨態查詢",
          trackingUrl: "https://fmec.famiport.com.tw/FP_Entrance/QueryBox",
        },
      },
    });
    const exposed = wrapper.vm as unknown as DashboardShippingInfoFormExpose;

    expect(
      wrapper.find<HTMLSelectElement>("#swal-shipping-provider-preset").element
        .value,
    ).toBe("family_mart");
    expect(exposed.getValues()).toEqual({
      trackingNumber: "FM-7001",
      shippingProvider: "全家",
      trackingUrl: "https://fmec.famiport.com.tw/FP_Entrance/QueryBox",
    });
  });
});
