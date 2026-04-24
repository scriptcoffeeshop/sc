export const storefrontRuntime = {
  appSettings: null,
  currentDeliveryConfig: [],
  selectPayment: null,
  updateCartUI: null,
  updateFormState: null,
  syncDynamicFieldDefaults: null,
  scheduleQuoteRefresh: null,
  refreshQuote: null,
  updatePaymentOptionsState: null,
};

export function registerStorefrontRuntime(bindings) {
  Object.assign(storefrontRuntime, bindings);
}

export function setStorefrontAppSettings(appSettings) {
  storefrontRuntime.appSettings = appSettings || null;
}

export function setStorefrontDeliveryConfig(deliveryConfig) {
  storefrontRuntime.currentDeliveryConfig = Array.isArray(deliveryConfig)
    ? deliveryConfig
    : [];
}
