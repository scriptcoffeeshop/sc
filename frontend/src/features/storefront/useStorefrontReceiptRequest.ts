import { ref } from "vue";

export interface StorefrontReceiptRequestEvent extends Event {
  detail?: {
    requested?: boolean;
  };
}

export function useStorefrontReceiptRequest() {
  const receiptRequested = ref(false);

  function handleReceiptRequestUpdated(event: Event) {
    const detail = (event as StorefrontReceiptRequestEvent).detail || {};
    receiptRequested.value = Boolean(detail.requested);
  }

  return {
    receiptRequested,
    handleReceiptRequestUpdated,
  };
}
