import { onBeforeUnmount, onMounted, watch, type Ref } from "vue";
import {
  createStorefrontBodyController,
  type StorefrontBodyController,
} from "./storefrontBodySideEffects.ts";
import {
  onStorefrontEvent,
  STOREFRONT_EVENTS,
} from "./storefrontEventBus.ts";
import { setStorefrontOrderFormState } from "./storefrontOrderFormState.ts";
import type { StorefrontCartUpdatedEvent } from "./useStorefrontCart.ts";
import type { StorefrontPolicyHintEvent } from "./useStorefrontPolicyAgreement.ts";

type StorefrontPageBridgeDeps = {
  isCartDrawerOpen: Ref<boolean>;
  policyAgreed: Ref<boolean>;
  policyCheckboxEl: Ref<HTMLInputElement | null>;
  syncCartSnapshot: () => void;
  syncCartFromEvent: (event: StorefrontCartUpdatedEvent) => void;
  refreshUiStateHandlers: Array<() => void>;
  handlePolicyHintUpdated: (event: Event) => void;
  handleReceiptRequestUpdated: (event: Event) => void;
  handleLoadErrorUpdated: (event: Event) => void;
  handleOrderFormStateUpdated: (event: Event) => void;
  handleDynamicFieldValuesUpdated: (event: Event) => void;
  handleSelectedStoreUpdated: () => void;
  handleLocalDeliveryAddressUpdated: (event: Event) => void;
  handleHomeDeliveryAddressUpdated: (event: Event) => void;
  initMainApp: () => Promise<unknown>;
};

export function useStorefrontPageBridge(deps: StorefrontPageBridgeDeps) {
  let unsubscribeStorefrontEvents: Array<() => void> = [];
  let storefrontBodyController: StorefrontBodyController | null = null;

  function syncStorefrontUiState() {
    deps.refreshUiStateHandlers.forEach((refresh) => refresh());
  }

  function handleCartUpdated(event: Event) {
    deps.syncCartFromEvent(event as StorefrontCartUpdatedEvent);
    syncStorefrontUiState();
  }

  function handlePolicyHintEvent(event: Event) {
    deps.handlePolicyHintUpdated(event);
    const detail = (event as StorefrontPolicyHintEvent).detail || {};
    if (detail.visible) deps.policyCheckboxEl.value?.focus();
  }

  watch(deps.isCartDrawerOpen, (open) => {
    storefrontBodyController?.setCartDrawerOpen(open);
  });
  watch(
    deps.policyAgreed,
    (value) => setStorefrontOrderFormState({ policyAgreed: value }),
    { flush: "sync", immediate: true },
  );

  onMounted(() => {
    storefrontBodyController = createStorefrontBodyController();
    storefrontBodyController.applyPageClass();
    storefrontBodyController.setCartDrawerOpen(deps.isCartDrawerOpen.value);

    unsubscribeStorefrontEvents = [
      onStorefrontEvent(STOREFRONT_EVENTS.cartUpdated, handleCartUpdated),
      onStorefrontEvent(
        STOREFRONT_EVENTS.selectedStoreUpdated,
        deps.handleSelectedStoreUpdated,
      ),
      onStorefrontEvent(
        STOREFRONT_EVENTS.policyAgreeHintUpdated,
        handlePolicyHintEvent,
      ),
      onStorefrontEvent(
        STOREFRONT_EVENTS.receiptRequestUpdated,
        deps.handleReceiptRequestUpdated,
      ),
      onStorefrontEvent(
        STOREFRONT_EVENTS.loadErrorUpdated,
        deps.handleLoadErrorUpdated,
      ),
      onStorefrontEvent(
        STOREFRONT_EVENTS.orderFormStateUpdated,
        deps.handleOrderFormStateUpdated,
      ),
      onStorefrontEvent(
        STOREFRONT_EVENTS.dynamicFieldValuesUpdated,
        deps.handleDynamicFieldValuesUpdated,
      ),
      onStorefrontEvent(
        STOREFRONT_EVENTS.localDeliveryAddressUpdated,
        deps.handleLocalDeliveryAddressUpdated,
      ),
      onStorefrontEvent(
        STOREFRONT_EVENTS.homeDeliveryAddressUpdated,
        deps.handleHomeDeliveryAddressUpdated,
      ),
    ];

    deps.syncCartSnapshot();

    void deps.initMainApp().then(() => {
      syncStorefrontUiState();
    });
  });

  onBeforeUnmount(() => {
    unsubscribeStorefrontEvents.forEach((unsubscribe) => unsubscribe());
    unsubscribeStorefrontEvents = [];
    storefrontBodyController?.restore();
    storefrontBodyController = null;
  });

  return { syncStorefrontUiState };
}
