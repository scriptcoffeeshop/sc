import { state } from "../../lib/appState.ts";
import {
  storefrontRuntime,
  type StorefrontPaymentAvailability,
} from "./storefrontRuntime.ts";
import type { SessionUser } from "../../types/session";
import type {
  DashboardSettingsRecord,
  StorefrontCategorySnapshot,
} from "../../types/settings";
import type { Product } from "../../types/core";
import type { StorefrontDynamicField } from "../../types/storefront";
import type { StorefrontDeliveryOption } from "./storefrontModels.ts";
import {
  getStorefrontSelectedStore,
  type StorefrontSelectedStore,
} from "./storefrontSelectedStoreState.ts";

interface StorefrontBankAccount {
  id?: string | number;
  [key: string]: unknown;
}

export interface StorefrontUiSnapshot {
  products: Product[];
  categories: StorefrontCategorySnapshot[];
  formFields: StorefrontDynamicField[];
  currentUser: SessionUser | null;
  isStoreOpen: boolean;
  settings: DashboardSettingsRecord;
  deliveryConfig: StorefrontDeliveryOption[];
  selectedDelivery: string;
  selectedPayment: string;
  availablePaymentMethods: StorefrontPaymentAvailability;
  bankAccounts: StorefrontBankAccount[];
  selectedBankAccountId: string;
  selectedStore: StorefrontSelectedStore;
}

function cloneArrayItems<T extends object>(items: unknown): T[] {
  if (!Array.isArray(items)) return [];
  return items.map((item) =>
    item && typeof item === "object" ? { ...(item as T) } : item as T
  );
}

function getRuntimeSettings(): DashboardSettingsRecord {
  const runtimeSettings = storefrontRuntime.appSettings;
  if (
    runtimeSettings && typeof runtimeSettings === "object" &&
    !Array.isArray(runtimeSettings)
  ) {
    return { ...(runtimeSettings as DashboardSettingsRecord) };
  }
  return {};
}

function getRuntimeDeliveryConfig(): StorefrontDeliveryOption[] {
  if (
    Array.isArray(storefrontRuntime.currentDeliveryConfig) &&
    storefrontRuntime.currentDeliveryConfig.length
  ) {
    return cloneArrayItems<StorefrontDeliveryOption>(
      storefrontRuntime.currentDeliveryConfig,
    );
  }
  return [];
}

export function getStorefrontUiSnapshot(): StorefrontUiSnapshot {
  return {
    products: cloneArrayItems<Product>(state.products),
    categories: cloneArrayItems<StorefrontCategorySnapshot>(state.categories),
    formFields: cloneArrayItems<StorefrontDynamicField>(state.formFields),
    currentUser: state.currentUser ? { ...state.currentUser } : null,
    isStoreOpen: state.isStoreOpen !== false,
    settings: getRuntimeSettings(),
    deliveryConfig: getRuntimeDeliveryConfig(),
    selectedDelivery: String(state.selectedDelivery || ""),
    selectedPayment: String(state.selectedPayment || "cod"),
    availablePaymentMethods: { ...storefrontRuntime.availablePaymentMethods },
    bankAccounts: cloneArrayItems<StorefrontBankAccount>(state.bankAccounts),
    selectedBankAccountId: String(state.selectedBankAccountId || ""),
    selectedStore: getStorefrontSelectedStore(),
  };
}
