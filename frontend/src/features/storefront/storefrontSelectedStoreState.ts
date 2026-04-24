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
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("coffee:store-selected-updated", {
      detail: getStorefrontSelectedStore(),
    }),
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
