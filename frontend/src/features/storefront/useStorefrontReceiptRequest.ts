import { ref } from "vue";
import {
  getStorefrontReceiptFormState,
  setStorefrontReceiptFormState,
  type StorefrontReceiptFormStatePatch,
} from "./storefrontReceiptFormState.ts";

export interface StorefrontReceiptRequestEvent extends Event {
  detail?: StorefrontReceiptFormStatePatch;
}

export function useStorefrontReceiptRequest() {
  const receiptState = getStorefrontReceiptFormState();
  const receiptRequested = ref(receiptState.requested);
  const receiptBuyer = ref(receiptState.buyer);
  const receiptTaxId = ref(receiptState.taxId);
  const receiptAddress = ref(receiptState.address);
  const receiptNeedDateStamp = ref(receiptState.needDateStamp);

  function syncRefs(patch: StorefrontReceiptFormStatePatch = {}) {
    const next = setStorefrontReceiptFormState(patch);
    receiptRequested.value = next.requested;
    receiptBuyer.value = next.buyer;
    receiptTaxId.value = next.taxId;
    receiptAddress.value = next.address;
    receiptNeedDateStamp.value = next.needDateStamp;
  }

  function updateReceiptRequested(requested: boolean) {
    syncRefs({ requested });
  }

  function updateReceiptBuyer(value: string) {
    syncRefs({ buyer: value });
  }

  function updateReceiptTaxId(value: string) {
    syncRefs({ taxId: value });
  }

  function updateReceiptAddress(value: string) {
    syncRefs({ address: value });
  }

  function updateReceiptNeedDateStamp(needDateStamp: boolean) {
    syncRefs({ needDateStamp });
  }

  function handleReceiptRequestUpdated(event: Event) {
    const detail = (event as StorefrontReceiptRequestEvent).detail || {};
    syncRefs(detail);
  }

  return {
    receiptRequested,
    receiptBuyer,
    receiptTaxId,
    receiptAddress,
    receiptNeedDateStamp,
    updateReceiptRequested,
    updateReceiptBuyer,
    updateReceiptTaxId,
    updateReceiptAddress,
    updateReceiptNeedDateStamp,
    handleReceiptRequestUpdated,
  };
}
