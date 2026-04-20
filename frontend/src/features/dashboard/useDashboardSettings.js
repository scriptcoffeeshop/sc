import { nextTick, ref } from "vue";

const PAYMENT_METHOD_ORDER = ["cod", "linepay", "jkopay", "transfer"];

const deliveryOptions = ref([]);
const paymentOptions = ref({
  cod: { icon: "", icon_url: "", name: "", description: "" },
  linepay: { icon: "", icon_url: "", name: "", description: "" },
  jkopay: { icon: "", icon_url: "", name: "", description: "" },
  transfer: { icon: "", icon_url: "", name: "", description: "" },
});
const linePaySandbox = ref(true);

let services = null;
let deliveryRoutingTableElement = null;
let deliverySortable = null;

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
  const {
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
  const { normalizeDeliveryOption, normalizePaymentOption } = getServices();
  const normalizedDeliveryOptions = deliveryOptions.value
    .map((item) => normalizeDeliveryOption(item))
    .filter((item) => item.name.trim());

  const normalizedPaymentOptions = PAYMENT_METHOD_ORDER.reduce((result, method) => {
    result[method] = normalizePaymentOption(method, paymentOptions.value?.[method]);
    return result;
  }, {});

  return {
    linePaySandboxChecked: Boolean(linePaySandbox.value),
    deliveryOptionsConfig: JSON.stringify(normalizedDeliveryOptions),
    paymentOptionsConfig: JSON.stringify(normalizedPaymentOptions),
  };
}

export function configureDashboardSettingsServices(nextServices) {
  services = {
    ...services,
    ...nextServices,
  };
}

export function useDashboardSettings() {
  return {
    deliveryOptions,
    paymentOptions,
    linePaySandbox,
    paymentMethodOrder: PAYMENT_METHOD_ORDER,
  };
}

export const dashboardSettingsActions = {
  registerDeliveryRoutingTableElement,
  replaceSettingsConfig,
  addDeliveryOption,
  removeDeliveryOption,
  buildSettingsConfig,
};
