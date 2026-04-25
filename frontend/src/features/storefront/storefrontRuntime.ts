import type { DashboardSettingsRecord } from "../../types/settings";
import { asJsonRecord } from "../../lib/jsonUtils.ts";
import {
  normalizeStorefrontDeliveryOption,
  type StorefrontDeliveryOption,
} from "./storefrontModels.ts";

export type StorefrontQuoteRefreshOptions = { silent?: boolean };
export type StorefrontPaymentMethod = "cod" | "linepay" | "jkopay" | "transfer";
export type StorefrontPaymentAvailability = Record<StorefrontPaymentMethod, boolean>;

export type StorefrontQuoteRefreshResult = {
  success?: boolean;
  skipped?: boolean;
  error?: string;
  [key: string]: unknown;
};

type StorefrontRuntime = {
  appSettings: DashboardSettingsRecord | null;
  currentDeliveryConfig: StorefrontDeliveryOption[];
  availablePaymentMethods: StorefrontPaymentAvailability;
  selectPayment: ((
    method: string,
    options?: { skipQuote?: boolean },
  ) => unknown) | null;
  updateCartUI: (() => void) | null;
  updateFormState: (() => void) | null;
  syncDynamicFieldDefaults: (() => void) | null;
  scheduleQuoteRefresh: ((options?: StorefrontQuoteRefreshOptions) => void) | null;
  refreshQuote: ((
    options?: StorefrontQuoteRefreshOptions,
  ) => Promise<StorefrontQuoteRefreshResult>) | null;
  updatePaymentOptionsState: ((
    deliveryConfig: StorefrontDeliveryOption[],
  ) => void) | null;
};

type StorefrontRuntimeBindings = Partial<
  Omit<StorefrontRuntime, "appSettings" | "currentDeliveryConfig">
>;

export const storefrontRuntime: StorefrontRuntime = {
  appSettings: null,
  currentDeliveryConfig: [],
  availablePaymentMethods: {
    cod: true,
    linepay: false,
    jkopay: false,
    transfer: false,
  },
  selectPayment: null,
  updateCartUI: null,
  updateFormState: null,
  syncDynamicFieldDefaults: null,
  scheduleQuoteRefresh: null,
  refreshQuote: null,
  updatePaymentOptionsState: null,
};

export function registerStorefrontRuntime(bindings: StorefrontRuntimeBindings) {
  Object.assign(storefrontRuntime, bindings);
}

export function setStorefrontAppSettings(
  appSettings: DashboardSettingsRecord | null | undefined,
) {
  storefrontRuntime.appSettings = appSettings || null;
}

export function setStorefrontDeliveryConfig(deliveryConfig: unknown) {
  storefrontRuntime.currentDeliveryConfig = Array.isArray(deliveryConfig)
    ? deliveryConfig.map((option) =>
      normalizeStorefrontDeliveryOption(asJsonRecord(option))
    )
    : [];
}

export function setStorefrontAvailablePaymentMethods(
  availability: Partial<StorefrontPaymentAvailability> | null | undefined,
) {
  storefrontRuntime.availablePaymentMethods = {
    cod: Boolean(availability?.cod),
    linepay: Boolean(availability?.linepay),
    jkopay: Boolean(availability?.jkopay),
    transfer: Boolean(availability?.transfer),
  };
}
