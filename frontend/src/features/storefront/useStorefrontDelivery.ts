import { ref } from "vue";
import {
  getDeliveryIconFallbackKey,
  getIconUrlFromConfig,
} from "../../lib/icons.ts";
import {
  normalizeStorefrontDeliveryConfig,
  normalizeStorefrontDeliveryOption,
} from "./storefrontModels.ts";
import type { DashboardSettingsRecord } from "../../types/settings";

interface StorefrontDeliveryPaymentConfig {
  cod?: boolean;
  linepay?: boolean;
  jkopay?: boolean;
  transfer?: boolean;
}

export interface StorefrontDeliveryOption {
  id?: string;
  icon_url?: string;
  iconUrl?: string;
  label?: string;
  name?: string;
  description?: string;
  enabled?: boolean;
  payment?: StorefrontDeliveryPaymentConfig;
  [key: string]: unknown;
}

interface StorefrontDeliverySnapshot {
  deliveryConfig?: StorefrontDeliveryOption[];
  settings?: DashboardSettingsRecord;
}

interface StorefrontDeliveryDeps {
  getStorefrontUiSnapshot?: () => StorefrontDeliverySnapshot;
  selectDelivery?: (method: string) => unknown;
  openStoreMap?: () => unknown;
  clearSelectedStore?: () => unknown;
}

function resolveDeliveryIcon(option: StorefrontDeliveryOption = {}) {
  const fallbackKey = getDeliveryIconFallbackKey(option?.id);
  return {
    url: getIconUrlFromConfig(option, fallbackKey),
  };
}

export { normalizeStorefrontDeliveryConfig };

export function useStorefrontDelivery(deps: StorefrontDeliveryDeps = {}) {
  const deliveryOptions = ref<StorefrontDeliveryOption[]>([]);

  function syncDeliveryState(snapshot: StorefrontDeliverySnapshot = {}) {
    const deliveryConfig = Array.isArray(snapshot.deliveryConfig) &&
        snapshot.deliveryConfig.length
      ? snapshot.deliveryConfig
      : normalizeStorefrontDeliveryConfig(snapshot.settings || {});
    deliveryOptions.value = deliveryConfig.map((option) =>
      normalizeStorefrontDeliveryOption(option)
    ).filter((item) => item && item.enabled !== false);
  }

  function handleSelectDelivery(method: string) {
    deps.selectDelivery?.(method);
    syncDeliveryState(deps.getStorefrontUiSnapshot?.() || {});
  }

  function handleOpenStoreMap() {
    void deps.openStoreMap?.();
  }

  function handleClearSelectedStore() {
    deps.clearSelectedStore?.();
  }

  function refreshDeliveryState() {
    syncDeliveryState(deps.getStorefrontUiSnapshot?.() || {});
  }

  return {
    deliveryOptions,
    resolveDeliveryIcon,
    syncDeliveryState,
    refreshDeliveryState,
    handleSelectDelivery,
    handleOpenStoreMap,
    handleClearSelectedStore,
  };
}
