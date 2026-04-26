export const STOREFRONT_EVENTS = {
  cartUpdated: "coffee:cart-updated",
  selectedStoreUpdated: "coffee:store-selected-updated",
  policyAgreeHintUpdated: "coffee:policy-agree-hint-updated",
  receiptRequestUpdated: "coffee:receipt-request-updated",
  loadErrorUpdated: "coffee:storefront-load-error-updated",
  orderFormStateUpdated: "coffee:order-form-state-updated",
  dynamicFieldValuesUpdated: "coffee:dynamic-field-values-updated",
  localDeliveryAddressUpdated: "coffee:local-delivery-address-updated",
  homeDeliveryAddressUpdated: "coffee:home-delivery-address-updated",
} as const;

export type StorefrontEventName =
  typeof STOREFRONT_EVENTS[keyof typeof STOREFRONT_EVENTS];

export function emitStorefrontEvent<TDetail>(
  eventName: StorefrontEventName,
  detail: TDetail,
): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(eventName, { detail }));
}

export function onStorefrontEvent(
  eventName: StorefrontEventName,
  listener: EventListener,
): () => void {
  if (typeof window === "undefined") {
    return () => {
      // SSR/test fallback unsubscribe has nothing to detach.
    };
  }
  window.addEventListener(eventName, listener);
  return () => window.removeEventListener(eventName, listener);
}
