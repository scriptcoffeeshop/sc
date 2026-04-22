import { state } from "../../../../js/state.js";
import type { SessionUser } from "../../types/session";
import type { DashboardSettingsRecord } from "../../types/settings";
import type { Product } from "../../types/core";

interface StorefrontCategoryRecord {
  name?: string;
  [key: string]: unknown;
}

interface StorefrontFormField {
  id?: number | string;
  field_key?: string;
  field_type?: string;
  label?: string;
  placeholder?: string;
  options?: string;
  required?: boolean;
  enabled?: boolean;
  delivery_visibility?: string | null;
  [key: string]: unknown;
}

interface StorefrontDeliveryOption {
  id?: string;
  [key: string]: unknown;
}

interface StorefrontBankAccount {
  id?: string | number;
  [key: string]: unknown;
}

export interface StorefrontUiSnapshot {
  products: Product[];
  categories: StorefrontCategoryRecord[];
  formFields: StorefrontFormField[];
  currentUser: SessionUser | null;
  settings: DashboardSettingsRecord;
  deliveryConfig: StorefrontDeliveryOption[];
  selectedDelivery: string;
  selectedPayment: string;
  bankAccounts: StorefrontBankAccount[];
  selectedBankAccountId: string;
}

function cloneArrayItems<T extends Record<string, unknown>>(items: unknown): T[] {
  if (!Array.isArray(items)) return [];
  return items.map((item) =>
    item && typeof item === "object" ? { ...(item as T) } : item as T
  );
}

function readWindowValue<T>(key: string, fallback: T): T {
  const runtimeWindow = globalThis.window as (Window & Record<string, unknown>) |
    undefined;
  const value = runtimeWindow?.[key] ?? (globalThis as Record<string, unknown>)[key];
  return (value ?? fallback) as T;
}

export function getStorefrontUiSnapshot(): StorefrontUiSnapshot {
  return {
    products: cloneArrayItems<Product>(state.products),
    categories: cloneArrayItems<StorefrontCategoryRecord>(state.categories),
    formFields: cloneArrayItems<StorefrontFormField>(state.formFields),
    currentUser: state.currentUser ? { ...state.currentUser } : null,
    settings: {
      ...readWindowValue<DashboardSettingsRecord>("appSettings", {}),
    },
    deliveryConfig: cloneArrayItems<StorefrontDeliveryOption>(
      readWindowValue("currentDeliveryConfig", []),
    ),
    selectedDelivery: String(state.selectedDelivery || ""),
    selectedPayment: String(state.selectedPayment || "cod"),
    bankAccounts: cloneArrayItems<StorefrontBankAccount>(state.bankAccounts),
    selectedBankAccountId: String(state.selectedBankAccountId || ""),
  };
}
