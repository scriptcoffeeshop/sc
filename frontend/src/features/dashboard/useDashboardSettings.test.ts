import { beforeEach, describe, expect, it, vi } from "vitest";
import type { JsonRecord } from "../../lib/jsonUtils.ts";
import type {
  DashboardDeliveryOption,
  DashboardPaymentOption,
} from "./dashboardSettingsShared.ts";

interface SettingsServiceOverrides {
  [key: string]: unknown;
}

function jsonResponse(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    headers: { "content-type": "application/json" },
  });
}

function createLocalStorageMock(initialEntries: Record<string, string> = {}) {
  const storage = new Map(Object.entries(initialEntries));
  return {
    getItem: vi.fn((key: string) => storage.has(key) ? storage.get(key) : null),
    setItem: vi.fn((key: string, value: string) => {
      storage.set(key, String(value));
    }),
    removeItem: vi.fn((key: string) => {
      storage.delete(key);
    }),
  };
}

function createSettingsServices(overrides: SettingsServiceOverrides = {}) {
  const defaultDeliveryOptions: Record<string, DashboardDeliveryOption> = {
    delivery: {
      id: "delivery",
      icon_url: "icons/delivery.png",
      label: "宅配",
      name: "宅配",
      description: "宅配",
      enabled: true,
    },
    home_delivery: {
      id: "home_delivery",
      icon_url: "icons/home-delivery.png",
      label: "全台宅配",
      name: "全台宅配",
      description: "宅配到府",
      enabled: true,
    },
    in_store: {
      id: "in_store",
      icon_url: "icons/in-store.png",
      label: "來店自取",
      name: "來店自取",
      description: "門市自取",
      enabled: true,
    },
    seven_eleven: {
      id: "seven_eleven",
      icon_url: "icons/seven-eleven.png",
      label: "7-11 取件",
      name: "7-11 取件",
      description: "超商取件",
      enabled: true,
    },
    family_mart: {
      id: "family_mart",
      icon_url: "icons/family-mart.png",
      label: "全家取件",
      name: "全家取件",
      description: "超商取件",
      enabled: true,
    },
  };

  const normalizeIconPath = (url = "") => String(url || "").replace(/^\/+/, "");

  return {
    API_URL: "https://api.example",
    authFetch: vi.fn(),
    getAuthUserId: () => "admin-user",
    applyDashboardBranding: vi.fn(),
    loadBankAccounts: vi.fn(),
    Sortable: null as null,
    Toast: { fire: vi.fn() },
    Swal: { fire: vi.fn() },
    defaultDeliveryOptions,
    normalizePaymentOption: (
      method: string,
      option: Partial<DashboardPaymentOption> = {},
    ) => ({
      icon_url: normalizeIconPath(option?.icon_url || ""),
      name: String(option?.name || method),
      description: String(option?.description || ""),
    }),
    getDefaultIconUrl: (key: string) => `icons/${key}.png`,
    sectionIconSettingKey: (section: string) => `${section}_section_icon_url`,
    normalizeIconPath,
    normalizeDeliveryOption: (option: Partial<DashboardDeliveryOption> = {}) => ({
      id: String(option.id || ""),
      label: String(option.label || option.name || ""),
      icon_url: String(option.icon_url || ""),
      name: String(option.name || option.label || ""),
      description: String(option.description || ""),
      enabled: option.enabled !== false,
      fee: Number(option.fee || 0),
      free_threshold: Number(option.free_threshold || 0),
      payment: {
        cod: Boolean(option.payment?.cod),
        linepay: Boolean(option.payment?.linepay),
        jkopay: Boolean(option.payment?.jkopay),
        transfer: Boolean(option.payment?.transfer),
      },
    }),
    parseBooleanSetting: (value: unknown, fallback = false) => {
      if (value === undefined || value === null || value === "") return fallback;
      return String(value) === "true";
    },
    ...overrides,
  };
}

async function loadSettingsModule() {
  vi.resetModules();
  return await import("./useDashboardSettings.ts");
}

describe("useDashboardSettings", () => {
  const legacyIconKey = "icon";

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("migrates legacy delivery routing and builds normalized settings payload", async () => {
    const module = await loadSettingsModule();
    const localStorage = createLocalStorageMock();
    vi.stubGlobal("localStorage", localStorage);

    module.configureDashboardSettingsServices(createSettingsServices());
    module.dashboardSettingsActions.replaceSettingsConfig({
      linepay_enabled: "true",
      transfer_enabled: "false",
      payment_routing_config: JSON.stringify({
        delivery: {
          cod: true,
          linepay: true,
          jkopay: true,
          transfer: false,
        },
      }),
      payment_options_config: JSON.stringify({
        linepay: {
          name: "LINE Pay",
          [legacyIconKey]: "LP",
          icon_url: "/icons/payment-linepay.png",
          description: "快速付款",
        },
      }),
      site_title: "Script Coffee",
      dashboard_title: "團購後台",
      site_icon_url: "/icons/logo.png",
      announcement_enabled: "true",
      products_section_title: "咖啡豆選購",
      products_section_icon_url: "/icons/products-beans.png",
    });

    const dashboard = module.useDashboardSettings();
    expect(dashboard.dashboardUiSettings.value.dashboardTitle).toBe("團購後台");

    expect(dashboard.deliveryOptions.value.find((item) => item.id === "delivery"))
      .toMatchObject({
        payment: {
          cod: true,
          linepay: true,
          jkopay: true,
          transfer: false,
        },
      });
    expect(dashboard.deliveryOptions.value.find((item) =>
      item.id === "seven_eleven"
    )).toMatchObject({
      payment: {
        cod: true,
        linepay: false,
        jkopay: false,
        transfer: false,
      },
    });

    dashboard.brandingSettings.value.siteTitle = " Script Coffee ";
    dashboard.dashboardUiSettings.value.dashboardTitle = " 團購後台 ";
    dashboard.sectionTitleSettings.value.products.title = " 咖啡豆 ";

    const settingsConfig = module.dashboardSettingsActions.buildSettingsConfig();
    expect(settingsConfig).toMatchObject({
      settings: {
        site_title: "Script Coffee",
        dashboard_title: "團購後台",
        products_section_title: "咖啡豆",
        site_icon_url: "icons/logo.png",
      },
    });
    expect(settingsConfig.settings).not.toHaveProperty("site_icon_emoji");
    expect(settingsConfig.settings).not.toHaveProperty("linepay_sandbox");

    const paymentConfig = JSON.parse(
      String(settingsConfig.settings["payment_options_config"]),
    );
    expect(paymentConfig).toMatchObject({
      linepay: {
        name: "LINE Pay",
        icon_url: "icons/payment-linepay.png",
      },
    });
    expect(paymentConfig.linepay).not.toHaveProperty("icon");
    const deliveryConfig = JSON.parse(
      String(settingsConfig.settings["delivery_options_config"]),
    );
    expect(deliveryConfig).toHaveLength(5);
    expect(deliveryConfig[0]).not.toHaveProperty("icon");
  });

  it("loads settings, saves round-trip payload, and refreshes dependent state", async () => {
    const module = await loadSettingsModule();
    const localStorage = createLocalStorageMock();
    vi.stubGlobal("localStorage", localStorage);

    let updatePayload: JsonRecord | null = null;
    const authFetch = vi.fn(async (url, options = {}) => {
      if (String(url).includes("getSettings")) {
        return jsonResponse({
          success: true,
          settings: {
            site_title: "Script Coffee",
            dashboard_title: "咖啡訂購後台",
            site_subtitle: "咖啡豆",
            site_icon_url: "/icons/logo.png",
            announcement_enabled: "true",
            announcement: "原始公告",
            order_confirmation_auto_email_enabled: "true",
            is_open: "true",
            delivery_options_config: JSON.stringify([{
              id: "delivery",
              label: "宅配",
              [legacyIconKey]: "D",
              name: "宅配",
              fee: 100,
              free_threshold: 1200,
              payment: {
                cod: true,
                linepay: true,
                jkopay: false,
                transfer: true,
              },
            }]),
            payment_options_config: JSON.stringify({
              cod: { name: "貨到付款", icon_url: "icons/payment-cash.png" },
              linepay: { name: "LINE Pay", icon_url: "icons/payment-linepay.png" },
              jkopay: { name: "街口支付", icon_url: "icons/payment-jkopay.png" },
              transfer: { name: "線上轉帳", icon_url: "icons/payment-bank.png" },
            }),
          },
        });
      }
      if (String(url).includes("updateSettings")) {
        updatePayload = JSON.parse(String(options.body || "{}"));
        return jsonResponse({ success: true });
      }
      throw new Error(`unexpected url: ${url}`);
    });
    const applyDashboardBranding = vi.fn();
    const loadBankAccounts = vi.fn();
    const Toast = { fire: vi.fn() };
    const Swal = { fire: vi.fn() };

    module.configureDashboardSettingsServices(createSettingsServices({
      authFetch,
      applyDashboardBranding,
      loadBankAccounts,
      Toast,
      Swal,
    }));

    await module.dashboardSettingsActions.loadSettings();
    const dashboard = module.useDashboardSettings();
    dashboard.storefrontSettings.value.announcement = " 更新後公告 ";
    dashboard.brandingSettings.value.siteTitle = " Script Coffee ";
    dashboard.dashboardUiSettings.value.dashboardTitle = "團購後台";

    await module.dashboardSettingsActions.saveSettings();

    expect(updatePayload).toMatchObject({
      userId: "admin-user",
      settings: {
        site_title: "Script Coffee",
        dashboard_title: "團購後台",
        announcement: " 更新後公告 ",
      },
    });
    expect(updatePayload?.["settings"]).not.toHaveProperty("linepay_sandbox");
    expect(Toast.fire).toHaveBeenCalledWith({
      icon: "success",
      title: "設定已儲存",
    });
    expect(applyDashboardBranding).toHaveBeenCalledTimes(2);
    expect(loadBankAccounts).toHaveBeenCalledTimes(2);
  });

  it("manages custom delivery options", async () => {
    const module = await loadSettingsModule();
    const localStorage = createLocalStorageMock();
    vi.stubGlobal("localStorage", localStorage);
    vi.spyOn(Date, "now").mockReturnValue(1_762_000_000_000);

    module.configureDashboardSettingsServices(createSettingsServices());
    module.dashboardSettingsActions.replaceSettingsConfig({
      site_title: "Script Coffee",
      delivery_options_config: JSON.stringify([
        {
          id: "delivery",
          label: "宅配",
          name: "宅配",
          enabled: true,
          fee: 100,
          free_threshold: 1200,
          payment: {
            cod: true,
            linepay: true,
            jkopay: false,
            transfer: true,
          },
        },
      ]),
      payment_options_config: "{}",
    });

    const dashboard = module.useDashboardSettings();

    module.dashboardSettingsActions.addDeliveryOption();
    expect(
      dashboard.deliveryOptions.value.find((item) =>
        item.id === "custom_1762000000000"
      ),
    ).toMatchObject({
      name: "新物流方式",
      description: "設定敘述",
      fee: 0,
      free_threshold: 0,
      payment: {
        cod: true,
        linepay: false,
        jkopay: false,
        transfer: false,
      },
    });

    module.dashboardSettingsActions.removeDeliveryOption("delivery");
    expect(dashboard.deliveryOptions.value.map((item) => item.id)).toEqual([
      "custom_1762000000000",
    ]);

    module.dashboardSettingsActions.resetSectionTitle("products");
    expect(dashboard.sectionTitleSettings.value.products).toMatchObject({
      title: "咖啡豆選購",
      iconUrl: "icons/products.png",
    });
  });
});
