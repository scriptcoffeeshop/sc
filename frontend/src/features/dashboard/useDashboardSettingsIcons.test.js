import { ref } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";

async function loadSettingsIconsModule() {
  vi.resetModules();

  const dashboardSettingsState = {
    brandingSettings: ref({
      siteTitle: "Script Coffee",
      siteSubtitle: "咖啡豆 | 耳掛",
      siteEmoji: ">_",
      siteIconUrl: "",
    }),
    sectionTitleSettings: ref({
      products: {
        title: "咖啡豆選購",
        color: "#268BD2",
        size: "text-lg",
        bold: true,
        iconUrl: "",
      },
      delivery: {
        title: "配送方式",
        color: "#268BD2",
        size: "text-lg",
        bold: true,
        iconUrl: "",
      },
      notes: {
        title: "訂單備註",
        color: "#268BD2",
        size: "text-base",
        bold: true,
        iconUrl: "",
      },
    }),
    deliveryOptions: ref([
      { id: "delivery", name: "宅配", icon_url: "" },
      { id: "in_store", name: "來店自取", icon_url: "" },
    ]),
    paymentOptions: ref({
      cod: { icon_url: "" },
      linepay: { icon_url: "" },
      jkopay: { icon_url: "" },
      transfer: { icon_url: "" },
    }),
  };

  vi.doMock("./useDashboardSettings.ts", () => ({
    useDashboardSettings: () => dashboardSettingsState,
  }));
  vi.doMock("../../../../js/icons.js", () => ({
    getDefaultIconUrl: (key) => `icons/${key}.png`,
    getDeliveryIconFallbackKey: (deliveryId) => deliveryId || "delivery",
    getPaymentIconFallbackKey: (method) => method || "payment",
    normalizeIconPath: (url = "") => String(url || "")
      .replace("https://cdn.example/", "")
      .replace(/^\/+/, ""),
    resolveAssetUrl: (url = "") =>
      url ? `/assets/${String(url).replace(/^\/+/, "")}` : "",
  }));
  vi.doMock("../../../../js/dashboard/modules/settings-shared.js", () => ({
    sectionIconSettingKey: (section) => `${section}_section_icon_url`,
  }));

  const module = await import("./useDashboardSettingsIcons.ts");
  return { module, dashboardSettingsState };
}

describe("useDashboardSettingsIcons", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("uses preview overrides for section icons without mutating persisted settings", async () => {
    const { module } = await loadSettingsIconsModule();
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:products-icon"),
      revokeObjectURL: vi.fn(),
    });

    module.configureDashboardSettingsIconServices({
      Swal: { fire: vi.fn() },
      Toast: { fire: vi.fn() },
    });

    expect(
      module.dashboardSettingsIconActions.previewSectionIconFile(
        "products",
        { type: "image/png" },
      ),
    ).toBe(true);

    const dashboard = module.useDashboardSettingsIcons();
    expect(dashboard.getSectionIconPreviewUrl("products")).toBe("blob:products-icon");
    expect(dashboard.getPaymentPreviewUrl("linepay"))
      .toBe("icons/linepay.png");
  });

  it("applies icon library choices into site and payment settings", async () => {
    const { module, dashboardSettingsState } = await loadSettingsIconsModule();
    const Swal = { fire: vi.fn() };
    const Toast = { fire: vi.fn() };

    module.configureDashboardSettingsIconServices({
      Swal,
      Toast,
    });

    expect(
      module.dashboardSettingsIconActions.applyIconFromLibrary(
        "site",
        "brand",
        "https://cdn.example/uploads/site-logo.png",
      ),
    ).toBe(true);
    expect(dashboardSettingsState.brandingSettings.value.siteIconUrl)
      .toBe("uploads/site-logo.png");

    expect(
      module.dashboardSettingsIconActions.applyIconFromLibrary(
        "linepay",
        "linepay",
      ),
    ).toBe(true);
    expect(dashboardSettingsState.paymentOptions.value.linepay.icon_url)
      .toBe("icons/linepay.png");

    expect(
      module.dashboardSettingsIconActions.applyIconFromLibrary("unknown", "brand"),
    ).toBe(false);
    expect(Toast.fire).toHaveBeenCalledWith({
      icon: "success",
      title: "已套用到品牌 Icon",
    });
    expect(Toast.fire).toHaveBeenCalledWith({
      icon: "success",
      title: "已套用到linepay 付款 Icon",
    });
    expect(Swal.fire).toHaveBeenCalledWith(
      "錯誤",
      "請先選擇有效的套用目標",
      "error",
    );
  });
});
