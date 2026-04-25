import { emitStorefrontEvent, STOREFRONT_EVENTS } from "./storefrontEventBus.ts";

export interface StorefrontOrderFormState {
  policyAgreed: boolean;
  orderNote: string;
  transferAccountLast5: string;
}

export type StorefrontOrderFormStatePatch = Partial<StorefrontOrderFormState>;

const orderFormState: StorefrontOrderFormState = {
  policyAgreed: false,
  orderNote: "",
  transferAccountLast5: "",
};

export function getStorefrontOrderFormState(): StorefrontOrderFormState {
  return { ...orderFormState };
}

export function setStorefrontOrderFormState(
  patch: StorefrontOrderFormStatePatch,
): StorefrontOrderFormStatePatch {
  const applied: StorefrontOrderFormStatePatch = {};

  if (Object.prototype.hasOwnProperty.call(patch, "policyAgreed")) {
    orderFormState.policyAgreed = Boolean(patch.policyAgreed);
    applied.policyAgreed = orderFormState.policyAgreed;
  }
  if (Object.prototype.hasOwnProperty.call(patch, "orderNote")) {
    orderFormState.orderNote = String(patch.orderNote || "");
    applied.orderNote = orderFormState.orderNote;
  }
  if (Object.prototype.hasOwnProperty.call(patch, "transferAccountLast5")) {
    orderFormState.transferAccountLast5 = String(
      patch.transferAccountLast5 || "",
    );
    applied.transferAccountLast5 = orderFormState.transferAccountLast5;
  }

  return applied;
}

export function emitStorefrontOrderFormStateUpdated(
  patch: StorefrontOrderFormStatePatch,
): void {
  const detail = setStorefrontOrderFormState(patch);
  emitStorefrontEvent(STOREFRONT_EVENTS.orderFormStateUpdated, detail);
}
