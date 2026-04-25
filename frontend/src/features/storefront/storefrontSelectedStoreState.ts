import { emitStorefrontEvent, STOREFRONT_EVENTS } from "./storefrontEventBus.ts";

export interface StorefrontSelectedStore {
  storeId: string;
  storeName: string;
  storeAddress: string;
}

const emptySelectedStore: StorefrontSelectedStore = {
  storeId: "",
  storeName: "",
  storeAddress: "",
};

let selectedStore: StorefrontSelectedStore = { ...emptySelectedStore };

function emitSelectedStoreUpdated() {
  emitStorefrontEvent(
    STOREFRONT_EVENTS.selectedStoreUpdated,
    getStorefrontSelectedStore(),
  );
}

export function getStorefrontSelectedStore(): StorefrontSelectedStore {
  return { ...selectedStore };
}

export function setStorefrontSelectedStore(data: {
  storeId?: unknown;
  storeName?: unknown;
  storeAddress?: unknown;
}) {
  selectedStore = {
    storeId: String(data.storeId || ""),
    storeName: String(data.storeName || ""),
    storeAddress: String(data.storeAddress || ""),
  };
  emitSelectedStoreUpdated();
}

export function clearStorefrontSelectedStore() {
  selectedStore = { ...emptySelectedStore };
  emitSelectedStoreUpdated();
}
