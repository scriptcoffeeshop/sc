import { nextTick, ref } from "vue";
import type {
  DashboardDeliveryOption,
} from "./dashboardSettingsShared.ts";
import {
  buildDefaultSectionTitleSettings,
  buildSettingsPersistedConfig,
  buildSettingsStateFromConfig,
  createCustomDeliveryOption,
  createDefaultBrandingSettings,
  createDefaultStorefrontSettings,
  createEmptyPaymentOptions,
  PAYMENT_METHOD_ORDER,
  type DashboardSectionTitleSettingsMap,
  type DashboardSettingsConfigDeps,
  type DashboardSettingsPersistedConfig,
  type DashboardSettingsRecord,
  type DashboardBrandingSettings,
  type DashboardStorefrontSettings,
  type DashboardPaymentOptionsMap,
} from "./dashboardSettingsConfig.ts";

interface DashboardToastLike {
  fire: (...args: unknown[]) => unknown;
}

interface DashboardSwalLike {
  fire: (...args: unknown[]) => unknown;
}

interface DashboardSortableInstance {
  destroy: () => void;
}

interface DashboardSortableOptions {
  animation: number;
  handle: string;
  ghostClass: string;
  onEnd: () => void;
}

interface DashboardSortableConstructor {
  new (
    element: HTMLElement,
    options: DashboardSortableOptions,
  ): DashboardSortableInstance;
  create?: (
    element: HTMLElement,
    options: DashboardSortableOptions,
  ) => DashboardSortableInstance;
}

interface DashboardSettingsServices extends DashboardSettingsConfigDeps {
  API_URL: string;
  authFetch: (input: string, init?: RequestInit) => Promise<Response>;
  getAuthUserId: () => string;
  Toast: DashboardToastLike;
  Swal: DashboardSwalLike;
  applyDashboardBranding?: (settings: DashboardSettingsRecord) => void;
  loadBankAccounts?: () => Promise<unknown> | unknown;
  linePaySandboxCacheKey: string;
  Sortable?: DashboardSortableConstructor | null;
}

const rawSettings = ref<DashboardSettingsRecord>({});
const deliveryOptions = ref<DashboardDeliveryOption[]>([]);
const paymentOptions = ref<DashboardPaymentOptionsMap>(createEmptyPaymentOptions());
const linePaySandbox = ref(true);
const brandingSettings = ref<DashboardBrandingSettings>(
  createDefaultBrandingSettings(),
);
const storefrontSettings = ref<DashboardStorefrontSettings>(
  createDefaultStorefrontSettings(),
);
const sectionTitleSettings = ref<DashboardSectionTitleSettingsMap>({
  products: {
    title: "",
    color: "#268BD2",
    size: "text-lg",
    bold: true,
    iconUrl: "",
  },
  delivery: {
    title: "",
    color: "#268BD2",
    size: "text-lg",
    bold: true,
    iconUrl: "",
  },
  notes: {
    title: "",
    color: "#268BD2",
    size: "text-base",
    bold: true,
    iconUrl: "",
  },
});

let services: DashboardSettingsServices | null = null;
let deliveryRoutingTableElement: HTMLElement | null = null;
let deliverySortable: DashboardSortableInstance | null = null;
let settingsLoadToken = 0;

function getServices(): DashboardSettingsServices {
  if (!services) {
    throw new Error("Dashboard settings services 尚未初始化");
  }
  return services;
}

function destroyDeliverySortable() {
  if (!deliverySortable) return;
  deliverySortable.destroy();
  deliverySortable = null;
}

function reorderDeliveryOptions(ids: string[]) {
  const itemsById = new Map(
    deliveryOptions.value.map((item) => [String(item.id || ""), item]),
  );
  const orderedItems = ids
    .map((id) => itemsById.get(String(id)))
    .filter((item): item is DashboardDeliveryOption => Boolean(item));
  const remainingItems = deliveryOptions.value.filter((item) =>
    !ids.includes(String(item.id || ""))
  );
  deliveryOptions.value = [...orderedItems, ...remainingItems];
}

async function syncDeliverySortable() {
  const { Sortable } = getServices();
  destroyDeliverySortable();

  const tableElement = deliveryRoutingTableElement;
  if (!tableElement?.querySelector?.("[data-delivery-id]")) return;

  const createOptions: DashboardSortableOptions = {
    animation: 150,
    handle: ".cursor-move",
    ghostClass: "ui-bg-soft",
    onEnd: () => {
      const ids = Array.from(
        tableElement.querySelectorAll<HTMLElement>("[data-delivery-id]"),
      )
        .map((element) => String(element.dataset.deliveryId || "").trim())
        .filter(Boolean);
      reorderDeliveryOptions(ids);
    },
  };

  if (Sortable?.create) {
    deliverySortable = Sortable.create(tableElement, createOptions);
    return;
  }

  if (typeof Sortable === "function") {
    deliverySortable = new Sortable(tableElement, createOptions);
  }
}

async function queueDeliverySortableSync() {
  await nextTick();
  await syncDeliverySortable();
}

function registerDeliveryRoutingTableElement(element: HTMLElement | null) {
  deliveryRoutingTableElement = element || null;
  if (!deliveryRoutingTableElement) {
    destroyDeliverySortable();
    return;
  }
  queueDeliverySortableSync();
}

function replaceSettingsConfig(settings: DashboardSettingsRecord = {}) {
  rawSettings.value = settings;
  const nextState = buildSettingsStateFromConfig(settings, getServices());
  brandingSettings.value = nextState.brandingSettings;
  storefrontSettings.value = nextState.storefrontSettings;
  sectionTitleSettings.value = nextState.sectionTitleSettings;
  paymentOptions.value = nextState.paymentOptions;
  deliveryOptions.value = nextState.deliveryOptions;

  const { parseBooleanSetting, linePaySandboxCacheKey } = getServices();
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

function resetSectionTitle(section: string) {
  const key = String(section || "").trim();
  const defaults = buildDefaultSectionTitleSettings(getServices().getDefaultIconUrl);
  if (!(key in defaults)) return;
  sectionTitleSettings.value = {
    ...sectionTitleSettings.value,
    [key]: { ...defaults[key as keyof typeof defaults] },
  };
}

function addDeliveryOption() {
  deliveryOptions.value = [
    ...deliveryOptions.value,
    createCustomDeliveryOption(Date.now(), getServices().normalizeDeliveryOption),
  ];
  queueDeliverySortableSync();
}

function removeDeliveryOption(id: string | number) {
  deliveryOptions.value = deliveryOptions.value.filter((item) =>
    String(item.id || "") !== String(id || "")
  );
  queueDeliverySortableSync();
}

function buildSettingsConfig(): DashboardSettingsPersistedConfig {
  return buildSettingsPersistedConfig(
    {
      brandingSettings: brandingSettings.value,
      storefrontSettings: storefrontSettings.value,
      sectionTitleSettings: sectionTitleSettings.value,
      deliveryOptions: deliveryOptions.value,
      paymentOptions: paymentOptions.value,
      linePaySandbox: linePaySandbox.value,
    },
    getServices(),
  );
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
    if (currentLoadToken !== settingsLoadToken || !data.success) return;

    const settings = (data.settings || {}) as DashboardSettingsRecord;
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
    const message = error instanceof Error ? error.message : String(error);
    Swal.fire("錯誤", message, "error");
  }
}

export function configureDashboardSettingsServices(
  nextServices: Partial<DashboardSettingsServices>,
) {
  services = {
    ...(services || {}),
    ...nextServices,
  } as DashboardSettingsServices;
}

export function useDashboardSettings() {
  return {
    brandingSettings,
    storefrontSettings,
    sectionTitleSettings,
    deliveryOptions,
    paymentOptions,
    linePaySandbox,
    paymentMethodOrder: [...PAYMENT_METHOD_ORDER],
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
