import { nextTick, ref } from "vue";

const PAYMENT_METHOD_ORDER = ["cod", "linepay", "jkopay", "transfer"];
const SECTION_TITLE_ORDER = ["products", "delivery", "notes"];

const rawSettings = ref({});
const deliveryOptions = ref([]);
const paymentOptions = ref({
  cod: { icon: "", icon_url: "", name: "", description: "" },
  linepay: { icon: "", icon_url: "", name: "", description: "" },
  jkopay: { icon: "", icon_url: "", name: "", description: "" },
  transfer: { icon: "", icon_url: "", name: "", description: "" },
});
const linePaySandbox = ref(true);
const brandingSettings = ref({
  siteTitle: "",
  siteSubtitle: "",
  siteEmoji: "",
  siteIconUrl: "",
});
const storefrontSettings = ref({
  announcementEnabled: false,
  announcement: "",
  autoOrderEmailEnabled: true,
  isOpen: true,
});
const sectionTitleSettings = ref({
  products: { title: "", color: "#268BD2", size: "text-lg", bold: true, iconUrl: "" },
  delivery: { title: "", color: "#268BD2", size: "text-lg", bold: true, iconUrl: "" },
  notes: { title: "", color: "#268BD2", size: "text-base", bold: true, iconUrl: "" },
});

let services = null;
let deliveryRoutingTableElement = null;
let deliverySortable = null;
let settingsLoadToken = 0;

function getServices() {
  if (!services) {
    throw new Error("Dashboard settings services 尚未初始化");
  }
  return services;
}

function buildPaymentOptionsView(rawPaymentOptions = {}) {
  const { normalizePaymentOption } = getServices();
  return PAYMENT_METHOD_ORDER.reduce((result, method) => {
    result[method] = normalizePaymentOption(method, rawPaymentOptions?.[method]);
    return result;
  }, {});
}

function buildDefaultSectionTitleSettings() {
  const { getDefaultIconUrl } = getServices();
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

function migrateLegacyDeliveryConfig(settings) {
  const { defaultDeliveryOptions } = getServices();
  const deliveryConfigStr = settings.delivery_options_config || "";
  let deliveryConfig = [];

  if (deliveryConfigStr) {
    try {
      deliveryConfig = JSON.parse(deliveryConfigStr);
    } catch (error) {
      console.error("Parsed delivery_options_config fails:", error);
    }
  }

  if (deliveryConfig.length) return deliveryConfig;

  const routingConfigStr = settings.payment_routing_config || "";
  let routingConfig = {};
  if (routingConfigStr) {
    try {
      routingConfig = JSON.parse(routingConfigStr);
    } catch {
    }
  } else {
    const linePayEnabled = String(settings.linepay_enabled) === "true";
    const transferEnabled = String(settings.transfer_enabled) === "true";
    routingConfig = {
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

  return Object.values(defaultDeliveryOptions).map((item) => ({
    ...item,
    payment: routingConfig[item.id] || {
      cod: true,
      linepay: false,
      jkopay: false,
      transfer: false,
    },
    fee: 0,
    free_threshold: 0,
  }));
}

function destroyDeliverySortable() {
  if (!deliverySortable) return;
  deliverySortable.destroy();
  deliverySortable = null;
}

function reorderDeliveryOptions(ids) {
  const currentItems = Array.isArray(deliveryOptions.value)
    ? deliveryOptions.value
    : [];
  const itemsById = new Map(
    currentItems.map((item) => [String(item.id || ""), item]),
  );
  const orderedItems = ids
    .map((id) => itemsById.get(String(id)))
    .filter(Boolean);
  const remainingItems = currentItems.filter((item) =>
    !ids.includes(String(item.id || ""))
  );
  deliveryOptions.value = [...orderedItems, ...remainingItems];
}

async function syncDeliverySortable() {
  const { Sortable } = getServices();
  destroyDeliverySortable();
  if (!deliveryRoutingTableElement?.querySelector?.("[data-delivery-id]")) return;

  const createOptions = {
    animation: 150,
    handle: ".cursor-move",
    ghostClass: "ui-bg-soft",
    onEnd: () => {
      const ids = Array.from(
        deliveryRoutingTableElement.querySelectorAll("[data-delivery-id]"),
      )
        .map((element) => String(element.dataset.deliveryId || "").trim())
        .filter(Boolean);
      reorderDeliveryOptions(ids);
    },
  };

  if (Sortable?.create) {
    deliverySortable = Sortable.create(deliveryRoutingTableElement, createOptions);
    return;
  }

  if (typeof Sortable === "function") {
    deliverySortable = new Sortable(deliveryRoutingTableElement, createOptions);
  }
}

async function queueDeliverySortableSync() {
  await nextTick();
  await syncDeliverySortable();
}

function registerDeliveryRoutingTableElement(element) {
  deliveryRoutingTableElement = element || null;
  if (!deliveryRoutingTableElement) {
    destroyDeliverySortable();
    return;
  }
  queueDeliverySortableSync();
}

function replaceSettingsConfig(settings = {}) {
  rawSettings.value = settings;
  const {
    getDefaultIconUrl,
    sectionIconSettingKey,
    normalizeIconPath,
    normalizeDeliveryOption,
    parseBooleanSetting,
    linePaySandboxCacheKey,
  } = getServices();
  const paymentOptionsStr = settings.payment_options_config || "";
  let parsedPaymentOptions = {};
  if (paymentOptionsStr) {
    try {
      parsedPaymentOptions = JSON.parse(paymentOptionsStr);
    } catch {
    }
  }

  brandingSettings.value = {
    siteTitle: String(settings.site_title || ""),
    siteSubtitle: String(settings.site_subtitle || ""),
    siteEmoji: String(settings.site_icon_emoji || ""),
    siteIconUrl: normalizeIconPath(settings.site_icon_url || ""),
  };
  storefrontSettings.value = {
    announcementEnabled: String(settings.announcement_enabled) === "true",
    announcement: String(settings.announcement || ""),
    autoOrderEmailEnabled: parseBooleanSetting(
      settings.order_confirmation_auto_email_enabled,
      true,
    ),
    isOpen: String(settings.is_open) !== "false",
  };
  const defaultSectionTitleSettings = buildDefaultSectionTitleSettings();
  sectionTitleSettings.value = SECTION_TITLE_ORDER.reduce((result, section) => {
    const defaults = defaultSectionTitleSettings[section];
    result[section] = {
      title: String(settings[`${section}_section_title`] || ""),
      color: String(settings[`${section}_section_color`] || defaults.color),
      size: String(settings[`${section}_section_size`] || defaults.size),
      bold: String(settings[`${section}_section_bold`]) !== "false",
      iconUrl: normalizeIconPath(
        settings[sectionIconSettingKey(section)] || defaults.iconUrl,
      ),
    };
    return result;
  }, {});
  paymentOptions.value = buildPaymentOptionsView(parsedPaymentOptions);
  deliveryOptions.value = migrateLegacyDeliveryConfig(settings).map((item) =>
    normalizeDeliveryOption(item)
  );

  const hasServerValue = Object.prototype.hasOwnProperty.call(
    settings,
    "linepay_sandbox",
  );
  if (hasServerValue) {
    linePaySandbox.value = parseBooleanSetting(settings.linepay_sandbox, true);
    globalThis.localStorage?.setItem(
      linePaySandboxCacheKey,
      String(linePaySandbox.value),
    );
  } else {
    const cachedSandbox = globalThis.localStorage?.getItem(linePaySandboxCacheKey);
    linePaySandbox.value = cachedSandbox === null
      ? true
      : parseBooleanSetting(cachedSandbox, true);
  }

  queueDeliverySortableSync();
}

function resetSectionTitle(section) {
  const defaults = buildDefaultSectionTitleSettings();
  if (!defaults[section]) return;
  sectionTitleSettings.value = {
    ...sectionTitleSettings.value,
    [section]: { ...defaults[section] },
  };
}

function addDeliveryOption() {
  const { normalizeDeliveryOption } = getServices();
  deliveryOptions.value = [
    ...deliveryOptions.value,
    normalizeDeliveryOption({
      id: `custom_${Date.now()}`,
      icon: "",
      name: "新物流方式",
      description: "設定敘述",
      enabled: true,
      fee: 0,
      free_threshold: 0,
      payment: { cod: true, linepay: false, jkopay: false, transfer: false },
    }),
  ];
  queueDeliverySortableSync();
}

function removeDeliveryOption(id) {
  deliveryOptions.value = deliveryOptions.value.filter((item) =>
    String(item.id || "") !== String(id || "")
  );
  queueDeliverySortableSync();
}

function buildSettingsConfig() {
  const {
    normalizeDeliveryOption,
    normalizePaymentOption,
    normalizeIconPath,
  } = getServices();
  const normalizedDeliveryOptions = deliveryOptions.value
    .map((item) => normalizeDeliveryOption(item))
    .filter((item) => item.name.trim());

  const normalizedPaymentOptions = PAYMENT_METHOD_ORDER.reduce((result, method) => {
    result[method] = normalizePaymentOption(method, paymentOptions.value?.[method]);
    return result;
  }, {});

  return {
    settings: {
      announcement_enabled: String(storefrontSettings.value.announcementEnabled),
      announcement: storefrontSettings.value.announcement,
      order_confirmation_auto_email_enabled: String(
        storefrontSettings.value.autoOrderEmailEnabled,
      ),
      is_open: String(storefrontSettings.value.isOpen),
      site_title: brandingSettings.value.siteTitle.trim(),
      site_subtitle: brandingSettings.value.siteSubtitle.trim(),
      site_icon_emoji: brandingSettings.value.siteEmoji.trim(),
      site_icon_url: normalizeIconPath(brandingSettings.value.siteIconUrl),
      products_section_title: sectionTitleSettings.value.products.title.trim(),
      products_section_color: sectionTitleSettings.value.products.color,
      products_section_size: sectionTitleSettings.value.products.size,
      products_section_bold: String(sectionTitleSettings.value.products.bold),
      products_section_icon_url: normalizeIconPath(
        sectionTitleSettings.value.products.iconUrl,
      ),
      delivery_section_title: sectionTitleSettings.value.delivery.title.trim(),
      delivery_section_color: sectionTitleSettings.value.delivery.color,
      delivery_section_size: sectionTitleSettings.value.delivery.size,
      delivery_section_bold: String(sectionTitleSettings.value.delivery.bold),
      delivery_section_icon_url: normalizeIconPath(
        sectionTitleSettings.value.delivery.iconUrl,
      ),
      notes_section_title: sectionTitleSettings.value.notes.title.trim(),
      notes_section_color: sectionTitleSettings.value.notes.color,
      notes_section_size: sectionTitleSettings.value.notes.size,
      notes_section_bold: String(sectionTitleSettings.value.notes.bold),
      notes_section_icon_url: normalizeIconPath(
        sectionTitleSettings.value.notes.iconUrl,
      ),
      linepay_sandbox: String(linePaySandbox.value),
      delivery_options_config: JSON.stringify(normalizedDeliveryOptions),
      payment_options_config: JSON.stringify(normalizedPaymentOptions),
    },
    linePaySandboxChecked: Boolean(linePaySandbox.value),
  };
}

async function loadSettings() {
  const {
    API_URL,
    authFetch,
    applyDashboardBranding,
    loadBankAccounts,
  } = getServices();
  const currentLoadToken = ++settingsLoadToken;
  try {
    const response = await authFetch(
      `${API_URL}?action=getSettings&_=${Date.now()}`,
    );
    const data = await response.json();
    if (currentLoadToken !== settingsLoadToken) return;
    if (!data.success) return;

    const settings = data.settings || {};
    applyDashboardBranding?.(settings);
    replaceSettingsConfig(settings);

    if (currentLoadToken !== settingsLoadToken) return;
    await loadBankAccounts?.();
  } catch (error) {
    console.error(error);
  }
}

async function saveSettings() {
  const {
    API_URL,
    authFetch,
    getAuthUserId,
    Toast,
    Swal,
    linePaySandboxCacheKey,
  } = getServices();
  try {
    const settingsConfig = buildSettingsConfig();
    const response = await authFetch(`${API_URL}?action=updateSettings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: getAuthUserId(),
        settings: settingsConfig.settings,
      }),
    });
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || "設定儲存失敗");
    }

    globalThis.localStorage?.setItem(
      linePaySandboxCacheKey,
      String(settingsConfig.linePaySandboxChecked),
    );
    Toast.fire({ icon: "success", title: "設定已儲存" });
    await loadSettings();
  } catch (error) {
    Swal.fire("錯誤", error.message, "error");
  }
}

export function configureDashboardSettingsServices(nextServices) {
  services = {
    ...services,
    ...nextServices,
  };
}

export function useDashboardSettings() {
  return {
    brandingSettings,
    storefrontSettings,
    sectionTitleSettings,
    deliveryOptions,
    paymentOptions,
    linePaySandbox,
    paymentMethodOrder: PAYMENT_METHOD_ORDER,
  };
}

export const dashboardSettingsActions = {
  registerDeliveryRoutingTableElement,
  replaceSettingsConfig,
  getRawSettings: () => rawSettings.value,
  loadSettings,
  saveSettings,
  resetSectionTitle,
  addDeliveryOption,
  removeDeliveryOption,
  buildSettingsConfig,
};
