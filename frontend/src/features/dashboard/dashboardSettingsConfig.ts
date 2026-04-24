import type {
  DashboardDeliveryOption,
  DashboardPaymentOption,
  DashboardPaymentRouting,
} from "./dashboardSettingsShared.ts";

export const PAYMENT_METHOD_ORDER = ["cod", "linepay", "jkopay", "transfer"] as const;
export const SECTION_TITLE_ORDER = ["products", "delivery", "notes"] as const;

export type DashboardPaymentMethod = typeof PAYMENT_METHOD_ORDER[number];
export type DashboardSectionKey = typeof SECTION_TITLE_ORDER[number];
export type DashboardSettingsRecord = Record<string, unknown>;
export type DashboardPaymentOptionsMap = Record<
  DashboardPaymentMethod,
  DashboardPaymentOption
>;

export interface DashboardBrandingSettings {
  siteTitle: string;
  siteSubtitle: string;
  siteIconUrl: string;
}

export interface DashboardStorefrontSettings {
  announcementEnabled: boolean;
  announcement: string;
  autoOrderEmailEnabled: boolean;
  isOpen: boolean;
}

export interface DashboardSectionTitleSetting {
  title: string;
  color: string;
  size: string;
  bold: boolean;
  iconUrl: string;
}

export type DashboardSectionTitleSettingsMap = Record<
  DashboardSectionKey,
  DashboardSectionTitleSetting
>;

export interface DashboardSettingsConfigDeps {
  defaultDeliveryOptions: Record<string, DashboardDeliveryOption>;
  getDefaultIconUrl: (kind: string) => string;
  normalizeDeliveryOption: (
    item: DashboardSettingsRecord | DashboardDeliveryOption,
  ) => DashboardDeliveryOption;
  normalizeIconPath: (url: string) => string;
  normalizePaymentOption: (
    method: DashboardPaymentMethod,
    option?: DashboardSettingsRecord | DashboardPaymentOption,
  ) => DashboardPaymentOption;
  parseBooleanSetting: (value: unknown, defaultValue?: boolean) => boolean;
  sectionIconSettingKey: (section: DashboardSectionKey) => string;
}

export interface DashboardSettingsPersistedConfig {
  settings: Record<string, string>;
  linePaySandboxChecked: boolean;
}

interface DashboardSettingsStateSnapshot {
  brandingSettings: DashboardBrandingSettings;
  storefrontSettings: DashboardStorefrontSettings;
  sectionTitleSettings: DashboardSectionTitleSettingsMap;
  deliveryOptions: DashboardDeliveryOption[];
  paymentOptions: DashboardPaymentOptionsMap;
  linePaySandbox: boolean;
}

function asRecord(value: unknown): DashboardSettingsRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as DashboardSettingsRecord
    : {};
}

function parseJsonRecord(value: unknown): DashboardSettingsRecord {
  if (!String(value || "").trim()) return {};
  try {
    return asRecord(JSON.parse(String(value)));
  } catch {
    return {};
  }
}

function parseJsonArray(value: unknown): DashboardSettingsRecord[] {
  if (!String(value || "").trim()) return [];
  try {
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed) ? parsed.map(asRecord) : [];
  } catch {
    return [];
  }
}

function buildLegacyRoutingConfig(
  settings: DashboardSettingsRecord,
): Record<string, DashboardPaymentRouting> {
  const routingConfig = parseJsonRecord(settings.payment_routing_config);
  if (Object.keys(routingConfig).length) {
    return routingConfig as Record<string, DashboardPaymentRouting>;
  }

  const linePayEnabled = String(settings.linepay_enabled) === "true";
  const transferEnabled = String(settings.transfer_enabled) === "true";

  return {
    in_store: {
      cod: true,
      linepay: linePayEnabled,
      jkopay: linePayEnabled,
      transfer: transferEnabled,
    },
    delivery: {
      cod: true,
      linepay: linePayEnabled,
      jkopay: linePayEnabled,
      transfer: transferEnabled,
    },
    home_delivery: {
      cod: true,
      linepay: linePayEnabled,
      jkopay: linePayEnabled,
      transfer: transferEnabled,
    },
    seven_eleven: {
      cod: true,
      linepay: false,
      jkopay: false,
      transfer: false,
    },
    family_mart: {
      cod: true,
      linepay: false,
      jkopay: false,
      transfer: false,
    },
  };
}

export function createEmptyPaymentOptions(): DashboardPaymentOptionsMap {
  return {
    cod: { icon_url: "", name: "", description: "" },
    linepay: { icon_url: "", name: "", description: "" },
    jkopay: { icon_url: "", name: "", description: "" },
    transfer: { icon_url: "", name: "", description: "" },
  };
}

export function createDefaultBrandingSettings(): DashboardBrandingSettings {
  return {
    siteTitle: "",
    siteSubtitle: "",
    siteIconUrl: "",
  };
}

export function createDefaultStorefrontSettings(): DashboardStorefrontSettings {
  return {
    announcementEnabled: false,
    announcement: "",
    autoOrderEmailEnabled: true,
    isOpen: true,
  };
}

export function buildDefaultSectionTitleSettings(
  getDefaultIconUrl: (kind: string) => string,
): DashboardSectionTitleSettingsMap {
  return {
    products: {
      title: "咖啡豆選購",
      color: "#268BD2",
      size: "text-lg",
      bold: true,
      iconUrl: getDefaultIconUrl("products"),
    },
    delivery: {
      title: "配送方式",
      color: "#268BD2",
      size: "text-lg",
      bold: true,
      iconUrl: getDefaultIconUrl("delivery"),
    },
    notes: {
      title: "訂單備註",
      color: "#268BD2",
      size: "text-base",
      bold: true,
      iconUrl: getDefaultIconUrl("notes"),
    },
  };
}

export function buildPaymentOptionsView(
  rawPaymentOptions: DashboardSettingsRecord = {},
  deps: DashboardSettingsConfigDeps,
): DashboardPaymentOptionsMap {
  return PAYMENT_METHOD_ORDER.reduce<DashboardPaymentOptionsMap>(
    (result, method) => {
      result[method] = deps.normalizePaymentOption(
        method,
        asRecord(rawPaymentOptions[method]),
      );
      return result;
    },
    createEmptyPaymentOptions(),
  );
}

export function buildSectionTitleSettings(
  settings: DashboardSettingsRecord,
  deps: DashboardSettingsConfigDeps,
): DashboardSectionTitleSettingsMap {
  const defaults = buildDefaultSectionTitleSettings(deps.getDefaultIconUrl);
  return SECTION_TITLE_ORDER.reduce<DashboardSectionTitleSettingsMap>(
    (result, section) => {
      const fallback = defaults[section];
      result[section] = {
        title: String(settings[`${section}_section_title`] || ""),
        color: String(settings[`${section}_section_color`] || fallback.color),
        size: String(settings[`${section}_section_size`] || fallback.size),
        bold: String(settings[`${section}_section_bold`]) !== "false",
        iconUrl: deps.normalizeIconPath(
          String(
            settings[deps.sectionIconSettingKey(section)] || fallback.iconUrl,
          ),
        ),
      };
      return result;
    },
    buildDefaultSectionTitleSettings(deps.getDefaultIconUrl),
  );
}

export function migrateLegacyDeliveryConfig(
  settings: DashboardSettingsRecord,
  deps: DashboardSettingsConfigDeps,
): DashboardDeliveryOption[] {
  const deliveryConfig = parseJsonArray(settings.delivery_options_config);
  if (deliveryConfig.length) {
    return deliveryConfig.map((item) => deps.normalizeDeliveryOption(item));
  }

  const routingConfig = buildLegacyRoutingConfig(settings);
  return Object.values(deps.defaultDeliveryOptions).map((item) =>
    deps.normalizeDeliveryOption({
      ...item,
      payment: routingConfig[item.id] || {
        cod: true,
        linepay: false,
        jkopay: false,
        transfer: false,
      },
      fee: 0,
      free_threshold: 0,
    })
  );
}

export function createCustomDeliveryOption(
  timestamp: number,
  normalizeDeliveryOption: DashboardSettingsConfigDeps["normalizeDeliveryOption"],
): DashboardDeliveryOption {
  return normalizeDeliveryOption({
    id: `custom_${timestamp}`,
    name: "新物流方式",
    description: "設定敘述",
    enabled: true,
    fee: 0,
    free_threshold: 0,
    payment: { cod: true, linepay: false, jkopay: false, transfer: false },
  });
}

export function buildSettingsPersistedConfig(
  state: DashboardSettingsStateSnapshot,
  deps: DashboardSettingsConfigDeps,
): DashboardSettingsPersistedConfig {
  const normalizedDeliveryOptions = state.deliveryOptions
    .map((item) => deps.normalizeDeliveryOption(item))
    .filter((item) => item.name.trim());

  const normalizedPaymentOptions = PAYMENT_METHOD_ORDER.reduce<
    DashboardPaymentOptionsMap
  >((result, method) => {
    result[method] = deps.normalizePaymentOption(
      method,
      state.paymentOptions[method],
    );
    return result;
  }, createEmptyPaymentOptions());

  return {
    settings: {
      announcement_enabled: String(state.storefrontSettings.announcementEnabled),
      announcement: state.storefrontSettings.announcement,
      order_confirmation_auto_email_enabled: String(
        state.storefrontSettings.autoOrderEmailEnabled,
      ),
      is_open: String(state.storefrontSettings.isOpen),
      site_title: state.brandingSettings.siteTitle.trim(),
      site_subtitle: state.brandingSettings.siteSubtitle.trim(),
      site_icon_url: deps.normalizeIconPath(state.brandingSettings.siteIconUrl),
      products_section_title: state.sectionTitleSettings.products.title.trim(),
      products_section_color: state.sectionTitleSettings.products.color,
      products_section_size: state.sectionTitleSettings.products.size,
      products_section_bold: String(state.sectionTitleSettings.products.bold),
      products_section_icon_url: deps.normalizeIconPath(
        state.sectionTitleSettings.products.iconUrl,
      ),
      delivery_section_title: state.sectionTitleSettings.delivery.title.trim(),
      delivery_section_color: state.sectionTitleSettings.delivery.color,
      delivery_section_size: state.sectionTitleSettings.delivery.size,
      delivery_section_bold: String(state.sectionTitleSettings.delivery.bold),
      delivery_section_icon_url: deps.normalizeIconPath(
        state.sectionTitleSettings.delivery.iconUrl,
      ),
      notes_section_title: state.sectionTitleSettings.notes.title.trim(),
      notes_section_color: state.sectionTitleSettings.notes.color,
      notes_section_size: state.sectionTitleSettings.notes.size,
      notes_section_bold: String(state.sectionTitleSettings.notes.bold),
      notes_section_icon_url: deps.normalizeIconPath(
        state.sectionTitleSettings.notes.iconUrl,
      ),
      linepay_sandbox: String(state.linePaySandbox),
      delivery_options_config: JSON.stringify(normalizedDeliveryOptions),
      payment_options_config: JSON.stringify(normalizedPaymentOptions),
    },
    linePaySandboxChecked: state.linePaySandbox,
  };
}

export function buildSettingsStateFromConfig(
  settings: DashboardSettingsRecord,
  deps: DashboardSettingsConfigDeps,
): Pick<
  DashboardSettingsStateSnapshot,
  | "brandingSettings"
  | "storefrontSettings"
  | "sectionTitleSettings"
  | "paymentOptions"
  | "deliveryOptions"
> {
  const parsedPaymentOptions = parseJsonRecord(settings.payment_options_config);

  return {
    brandingSettings: {
      siteTitle: String(settings.site_title || ""),
      siteSubtitle: String(settings.site_subtitle || ""),
      siteIconUrl: deps.normalizeIconPath(String(settings.site_icon_url || "")),
    },
    storefrontSettings: {
      announcementEnabled: String(settings.announcement_enabled) === "true",
      announcement: String(settings.announcement || ""),
      autoOrderEmailEnabled: deps.parseBooleanSetting(
        settings.order_confirmation_auto_email_enabled,
        true,
      ),
      isOpen: String(settings.is_open) !== "false",
    },
    sectionTitleSettings: buildSectionTitleSettings(settings, deps),
    paymentOptions: buildPaymentOptionsView(parsedPaymentOptions, deps),
    deliveryOptions: migrateLegacyDeliveryConfig(settings, deps),
  };
}
