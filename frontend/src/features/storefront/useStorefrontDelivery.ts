import { ref } from "vue";
import { districtData } from "../../lib/appConfig.ts";
import { TAIWAN_CITY_DATA } from "../../lib/taiwanCityData.js";
import {
  getDeliveryIconFallbackKey,
  getIconUrlFromConfig,
} from "../../lib/icons.ts";
import {
  normalizeStorefrontDeliveryConfig,
  normalizeStorefrontDeliveryOption,
} from "./storefrontModels.ts";
import type { DashboardSettingsRecord } from "../../types/settings";
import type { StorefrontSelectedStore } from "./storefrontSelectedStoreState";
import {
  getStorefrontLocalDeliveryAddress,
  getStorefrontHomeDeliveryAddress,
  setStorefrontLocalDeliveryAddress,
  setStorefrontHomeDeliveryAddress,
  type StorefrontHomeDeliveryAddress,
  type StorefrontLocalDeliveryAddress,
} from "./storefrontDeliveryFormState.ts";

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

export interface StorefrontHomeDistrictOption {
  name: string;
  zipcode: string;
}

interface StorefrontDeliverySnapshot {
  deliveryConfig?: StorefrontDeliveryOption[];
  settings?: DashboardSettingsRecord;
  selectedStore?: StorefrontSelectedStore;
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
  const localDeliveryAddress = ref<StorefrontLocalDeliveryAddress>(
    getStorefrontLocalDeliveryAddress(),
  );
  const localDistrictOptions = ref<string[]>([]);
  const homeDeliveryAddress = ref<StorefrontHomeDeliveryAddress>(
    getStorefrontHomeDeliveryAddress(),
  );
  const homeCountyOptions = ref<string[]>([...TAIWAN_CITY_DATA.counties]);
  const homeDistrictOptions = ref<StorefrontHomeDistrictOption[]>([]);
  const selectedStore = ref<StorefrontSelectedStore>({
    storeId: "",
    storeName: "",
    storeAddress: "",
  });

  function syncDeliveryState(snapshot: StorefrontDeliverySnapshot = {}) {
    const deliveryConfig = Array.isArray(snapshot.deliveryConfig) &&
        snapshot.deliveryConfig.length
      ? snapshot.deliveryConfig
      : normalizeStorefrontDeliveryConfig(snapshot.settings || {});
    deliveryOptions.value = deliveryConfig.map((option) =>
      normalizeStorefrontDeliveryOption(option)
    ).filter((item) => item && item.enabled !== false);
    selectedStore.value = snapshot.selectedStore || {
      storeId: "",
      storeName: "",
      storeAddress: "",
    };
    refreshLocalDistrictOptions();
    refreshHomeDistrictOptions();
  }

  function refreshLocalDistrictOptions() {
    const city = localDeliveryAddress.value.city;
    localDistrictOptions.value = Array.isArray(districtData[city])
      ? districtData[city]
      : [];
    if (
      localDeliveryAddress.value.district &&
      !localDistrictOptions.value.includes(localDeliveryAddress.value.district)
    ) {
      updateLocalDeliveryAddress("district", "");
    }
  }

  function updateLocalDeliveryAddress(
    field: keyof StorefrontLocalDeliveryAddress,
    value: string,
  ) {
    const patch: Partial<StorefrontLocalDeliveryAddress> = {
      [field]: String(value || ""),
    };
    if (field === "city") patch.district = "";
    localDeliveryAddress.value = setStorefrontLocalDeliveryAddress(patch);
    refreshLocalDistrictOptions();
  }

  function handleLocalDeliveryAddressUpdated(event: Event) {
    const detail = (event as CustomEvent<Partial<StorefrontLocalDeliveryAddress>>)
      .detail || {};
    localDeliveryAddress.value = setStorefrontLocalDeliveryAddress(detail);
    refreshLocalDistrictOptions();
  }

  function getHomeDistrictOptions(city: string): StorefrontHomeDistrictOption[] {
    const countyIndex = TAIWAN_CITY_DATA.counties.indexOf(city);
    if (countyIndex < 0) return [];
    const districtDataRow = TAIWAN_CITY_DATA.districts[countyIndex];
    if (!districtDataRow) return [];
    const [districts, zipcodes] = districtDataRow;
    return districts.map((district, index) => ({
      name: String(district || ""),
      zipcode: String(zipcodes[index] || ""),
    }));
  }

  function refreshHomeDistrictOptions() {
    homeDistrictOptions.value = getHomeDistrictOptions(
      homeDeliveryAddress.value.city,
    );
    if (
      homeDeliveryAddress.value.district &&
      !homeDistrictOptions.value.some((item) =>
        item.name === homeDeliveryAddress.value.district
      )
    ) {
      updateHomeDeliveryAddress("district", "");
    }
  }

  function updateHomeDeliveryAddress(
    field: keyof StorefrontHomeDeliveryAddress,
    value: string,
  ) {
    const patch: Partial<StorefrontHomeDeliveryAddress> = {
      [field]: String(value || ""),
    };
    if (field === "city") {
      patch.district = "";
      patch.zipcode = "";
    }
    if (field === "district") {
      const district = homeDistrictOptions.value.find((item) =>
        item.name === String(value || "")
      );
      patch.zipcode = district?.zipcode || "";
    }
    homeDeliveryAddress.value = setStorefrontHomeDeliveryAddress(patch);
    refreshHomeDistrictOptions();
  }

  function handleHomeDeliveryAddressUpdated(event: Event) {
    const detail = (event as CustomEvent<Partial<StorefrontHomeDeliveryAddress>>)
      .detail || {};
    homeDeliveryAddress.value = setStorefrontHomeDeliveryAddress(detail);
    refreshHomeDistrictOptions();
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
    localDeliveryAddress,
    localDistrictOptions,
    homeDeliveryAddress,
    homeCountyOptions,
    homeDistrictOptions,
    selectedStore,
    resolveDeliveryIcon,
    syncDeliveryState,
    refreshDeliveryState,
    handleSelectDelivery,
    handleOpenStoreMap,
    handleClearSelectedStore,
    updateLocalDeliveryAddress,
    handleLocalDeliveryAddressUpdated,
    updateHomeDeliveryAddress,
    handleHomeDeliveryAddressUpdated,
  };
}
