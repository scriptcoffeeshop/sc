import { ref, watch } from "vue";
import {
  getStorefrontOrderFormState,
  setStorefrontOrderFormState,
  type StorefrontOrderFormStatePatch,
} from "./storefrontOrderFormState.ts";

export interface StorefrontOrderFormStateEvent extends Event {
  detail?: StorefrontOrderFormStatePatch;
}

export function useStorefrontOrderFormState() {
  const snapshot = getStorefrontOrderFormState();
  const orderNote = ref(snapshot.orderNote);
  const transferAccountLast5 = ref(snapshot.transferAccountLast5);

  function updateTransferAccountLast5(value: string) {
    transferAccountLast5.value = value;
  }

  function handleOrderFormStateUpdated(event: Event) {
    const detail = (event as StorefrontOrderFormStateEvent).detail || {};
    if (Object.prototype.hasOwnProperty.call(detail, "orderNote")) {
      orderNote.value = String(detail.orderNote || "");
    }
    if (Object.prototype.hasOwnProperty.call(detail, "transferAccountLast5")) {
      transferAccountLast5.value = String(detail.transferAccountLast5 || "");
    }
  }

  watch(
    orderNote,
    (value) => setStorefrontOrderFormState({ orderNote: value }),
    { flush: "sync" },
  );
  watch(
    transferAccountLast5,
    (value) => setStorefrontOrderFormState({ transferAccountLast5: value }),
    { flush: "sync" },
  );

  return {
    orderNote,
    transferAccountLast5,
    updateTransferAccountLast5,
    handleOrderFormStateUpdated,
  };
}
