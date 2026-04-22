import { ref } from "vue";
import {
  getDeliveryIconFallbackKey,
  getIconUrlFromConfig,
} from "../../../../js/icons.js";

interface StorefrontDeliveryOption {
  id?: string;
  icon?: string;
  enabled?: boolean;
}

interface StorefrontDeliverySnapshot {
  deliveryConfig?: StorefrontDeliveryOption[];
}

interface StorefrontDeliveryDeps {
  getStorefrontUiSnapshot?: () => StorefrontDeliverySnapshot;
  selectDelivery?: (method: string) => unknown;
  openStoreMap?: () => unknown;
  clearSelectedStore?: () => unknown;
}

function resolveDeliveryIcon(option: StorefrontDeliveryOption = {}) {
  const fallbackKey = getDeliveryIconFallbackKey(option?.id);
  const url = getIconUrlFromConfig(option, fallbackKey);
  return {
    url,
    fallbackText: url ? "" : String(option?.icon || "").trim(),
  };
}

export function useStorefrontDelivery(deps: StorefrontDeliveryDeps = {}) {
  const deliveryOptions = ref<StorefrontDeliveryOption[]>([]);

  function syncDeliveryState() {
    const snapshot = deps.getStorefrontUiSnapshot?.() || {};
    deliveryOptions.value = Array.isArray(snapshot.deliveryConfig)
      ? snapshot.deliveryConfig.filter((item) => item && item.enabled !== false)
      : [];
  }

  function handleSelectDelivery(method: string) {
    deps.selectDelivery?.(method);
    syncDeliveryState();
  }

  function handleOpenStoreMap() {
    void deps.openStoreMap?.();
  }

  function handleClearSelectedStore() {
    deps.clearSelectedStore?.();
  }

  return {
    deliveryOptions,
    resolveDeliveryIcon,
    syncDeliveryState,
    handleSelectDelivery,
    handleOpenStoreMap,
    handleClearSelectedStore,
  };
}
