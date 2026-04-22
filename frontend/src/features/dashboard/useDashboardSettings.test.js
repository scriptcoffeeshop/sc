import { beforeEach, describe, expect, it, vi } from "vitest";

function jsonResponse(payload) {
  return { json: async () => payload };
}

function createLocalStorageMock(initialEntries = {}) {
  const storage = new Map(Object.entries(initialEntries));
  return {
    getItem: vi.fn((key) => storage.has(key) ? storage.get(key) : null),
    setItem: vi.fn((key, value) => {
      storage.set(key, String(value));
    }),
    removeItem: vi.fn((key) => {
      storage.delete(key);
    }),
  };
}

function createSettingsServices(overrides = {}) {
  const defaultDeliveryOptions = {
    delivery: { id: "delivery", label: "宅配", name: "宅配", enabled: true },
    home_delivery: {
      id: "home_delivery",
      label: "全台宅配",
      name: "全台宅配",
      enabled: true,
    },
    in_store: { id: "in_store", label: "來店自取", name: "來店自取", enabled: true },
    seven_eleven: {
      id: "seven_eleven",
      label: "7-11 取件",
      name: "7-11 取件",
      enabled: true,
    },
    family_mart: {
      id: "family_mart",
      label: "全家取件",
      name: "全家取件",
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
    Sortable: null,
    Toast: { fire: vi.fn() },
    Swal: { fire: vi.fn() },
    defaultDeliveryOptions,
    normalizePaymentOption: (method, option = {}) => ({
      icon: String(option?.icon || ""),
      icon_url: normalizeIconPath(option?.icon_url || ""),
      name: String(option?.name || method),
      description: String(option?.description || ""),
    }),
    getDefaultIconUrl: (key) => `icons/${key}.png`,
    sectionIconSettingKey: (section) => `${section}_section_icon_url`,
    normalizeIconPath,
    normalizeDeliveryOption: (option = {}) => ({
      id: String(option.id || ""),
      label: String(option.label || option.name || ""),
      icon: String(option.icon || ""),
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
    parseBooleanSetting: (value, fallback = false) => {
      if (value === undefined || value === null || value === "") return fallback;
      return String(value) === "true";
    },
    linePaySandboxCacheKey: "coffee_linepay_sandbox",
    ...overrides,
  };
}

async function loadSettingsModule() {
  vi.resetModules();
  return await import("./useDashboardSettings.js");
}

describe("useDashboardSettings", () => {
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
          icon_url: "/icons/payment-linepay.png",
          description: "快速付款",
        },
      }),
      linepay_sandbox: "false",
      site_title: "Script Coffee",
      site_icon_url: "/icons/logo.png",
      announcement_enabled: "true",
      products_section_title: "咖啡豆選購",
      products_section_icon_url: "/icons/products-beans.png",
    });

    const dashboard = module.useDashboardSettings();
    expect(dashboard.linePaySandbox.value).toBe(false);
    expect(localStorage.setItem).toHaveBeenCalledWith(
      "coffee_linepay_sandbox",
      "false",
    );

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
    dashboard.sectionTitleSettings.value.products.title = " 咖啡豆 ";

    const settingsConfig = module.dashboardSettingsActions.buildSettingsConfig();
    expect(settingsConfig).toMatchObject({
      linePaySandboxChecked: false,
      settings: {
        linepay_sandbox: "false",
        site_title: "Script Coffee",
        products_section_title: "咖啡豆",
        site_icon_url: "icons/logo.png",
      },
    });

    expect(JSON.parse(settingsConfig.settings.payment_options_config)).toMatchObject({
      linepay: {
        name: "LINE Pay",
        icon_url: "icons/payment-linepay.png",
      },
    });
    expect(JSON.parse(settingsConfig.settings.delivery_options_config))
      .toHaveLength(5);
  });

  it("loads settings, saves round-trip payload, and refreshes dependent state", async () => {
    const module = await loadSettingsModule();
    const localStorage = createLocalStorageMock();
    vi.stubGlobal("localStorage", localStorage);

    let updatePayload = null;
    const authFetch = vi.fn(async (url, options = {}) => {
      if (String(url).includes("getSettings")) {
        return jsonResponse({
          success: true,
          settings: {
            site_title: "Script Coffee",
            site_subtitle: "咖啡豆",
            site_icon_emoji: ">_",
            site_icon_url: "/icons/logo.png",
            announcement_enabled: "true",
            announcement: "原始公告",
            order_confirmation_auto_email_enabled: "true",
            is_open: "true",
            linepay_sandbox: "true",
            delivery_options_config: JSON.stringify([{
              id: "delivery",
              label: "宅配",
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
    dashboard.linePaySandbox.value = false;

    await module.dashboardSettingsActions.saveSettings();

    expect(updatePayload).toMatchObject({
      userId: "admin-user",
      settings: {
        site_title: "Script Coffee",
        announcement: " 更新後公告 ",
        linepay_sandbox: "false",
      },
    });
    expect(Toast.fire).toHaveBeenCalledWith({
      icon: "success",
      title: "設定已儲存",
    });
    expect(applyDashboardBranding).toHaveBeenCalledTimes(2);
    expect(loadBankAccounts).toHaveBeenCalledTimes(2);
    expect(localStorage.setItem).toHaveBeenCalledWith(
      "coffee_linepay_sandbox",
      "false",
    );
  });

  it("falls back to cached sandbox state and manages custom delivery options", async () => {
    const module = await loadSettingsModule();
    const localStorage = createLocalStorageMock({
      coffee_linepay_sandbox: "false",
    });
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
    expect(dashboard.linePaySandbox.value).toBe(false);

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
