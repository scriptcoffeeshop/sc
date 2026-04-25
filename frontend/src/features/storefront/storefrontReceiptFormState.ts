export interface StorefrontReceiptFormState {
  requested: boolean;
  buyer: string;
  taxId: string;
  address: string;
  needDateStamp: boolean;
}

export type StorefrontReceiptFormStatePatch =
  Partial<StorefrontReceiptFormState>;

const receiptFormState: StorefrontReceiptFormState = {
  requested: false,
  buyer: "",
  taxId: "",
  address: "",
  needDateStamp: false,
};

export function getStorefrontReceiptFormState(): StorefrontReceiptFormState {
  return { ...receiptFormState };
}

export function setStorefrontReceiptFormState(
  patch: StorefrontReceiptFormStatePatch,
): StorefrontReceiptFormState {
  if (Object.prototype.hasOwnProperty.call(patch, "requested")) {
    receiptFormState.requested = Boolean(patch.requested);
  }
  if (Object.prototype.hasOwnProperty.call(patch, "buyer")) {
    receiptFormState.buyer = String(patch.buyer || "");
  }
  if (Object.prototype.hasOwnProperty.call(patch, "taxId")) {
    receiptFormState.taxId = String(patch.taxId || "");
  }
  if (Object.prototype.hasOwnProperty.call(patch, "address")) {
    receiptFormState.address = String(patch.address || "");
  }
  if (Object.prototype.hasOwnProperty.call(patch, "needDateStamp")) {
    receiptFormState.needDateStamp = Boolean(patch.needDateStamp);
  }
  return getStorefrontReceiptFormState();
}

export function emitStorefrontReceiptFormStateUpdated(
  patch: StorefrontReceiptFormStatePatch,
) {
  const detail = setStorefrontReceiptFormState(patch);
  if (typeof window === "undefined") return detail;
  window.dispatchEvent(
    new CustomEvent("coffee:receipt-request-updated", { detail }),
  );
  return detail;
}
