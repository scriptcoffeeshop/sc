import { API_URL } from "../../lib/appConfig.ts";
import { state } from "../../lib/appState.ts";
import { selectDelivery } from "./storefrontDeliveryActions.ts";
import {
  normalizeDeliveryPaymentConfig,
  normalizeStorefrontDeliveryConfig,
  type StorefrontDeliveryOption,
} from "./storefrontModels.ts";
import { selectStorefrontBankAccount } from "./storefrontBankAccountsState.ts";
import { emitStorefrontEvent, STOREFRONT_EVENTS } from "./storefrontEventBus.ts";
import { createStorefrontQuoteManager } from "./storefrontQuoteManager.ts";
import {
  setStorefrontAvailablePaymentMethods,
  setStorefrontAppSettings,
  setStorefrontDeliveryConfig,
  type StorefrontPaymentAvailability,
  type StorefrontPaymentMethod,
} from "./storefrontRuntime.ts";

type StorefrontMainAppPaymentsDeps = {
  getErrorMessage: (error: unknown, fallback?: string) => string;
  prefillUserFields: () => void;
  applySavedOrderFormPrefs: () => void;
};

function dispatchStorefrontLoadError(errorText: string) {
  emitStorefrontEvent(STOREFRONT_EVENTS.loadErrorUpdated, { errorText });
}

const DEFAULT_PAYMENT_AVAILABILITY: StorefrontPaymentAvailability = {
  cod: true,
  linepay: false,
  jkopay: false,
  transfer: false,
};

function normalizeQuotePaymentAvailability(
  payment: Record<string, unknown> | null | undefined,
): StorefrontPaymentAvailability {
  return {
    cod: Boolean(payment?.cod),
    linepay: Boolean(payment?.linepay),
    jkopay: Boolean(payment?.jkopay),
    transfer: Boolean(payment?.transfer),
  };
}

export function resolveStorefrontPaymentAvailability(options: {
  selectedDelivery: string;
  selectedDeliveryOption?: StorefrontDeliveryOption;
  quote?: {
    deliveryMethod?: unknown;
    availablePaymentMethods?: Record<string, unknown>;
  } | null;
}): StorefrontPaymentAvailability {
  const quote = options.quote;
  const canUseQuote = quote &&
    quote.availablePaymentMethods &&
    (!options.selectedDelivery ||
      quote.deliveryMethod === options.selectedDelivery);

  if (canUseQuote) {
    return normalizeQuotePaymentAvailability(quote.availablePaymentMethods);
  }

  return normalizeDeliveryPaymentConfig(
    options.selectedDeliveryOption?.payment || DEFAULT_PAYMENT_AVAILABILITY,
  );
}

export function selectFirstAvailablePayment(
  availability: StorefrontPaymentAvailability,
): StorefrontPaymentMethod | "" {
  if (availability.cod) return "cod";
  if (availability.linepay) return "linepay";
  if (availability.jkopay) return "jkopay";
  if (availability.transfer) return "transfer";
  return "";
}

export function createStorefrontMainAppPayments(
  deps: StorefrontMainAppPaymentsDeps,
) {
  let currentDeliveryConfig: StorefrontDeliveryOption[] = [];
  const quoteManager = createStorefrontQuoteManager({
    getErrorMessage: deps.getErrorMessage,
    getCurrentDeliveryConfig: () => currentDeliveryConfig,
    updatePaymentOptionsState: (deliveryConfig) =>
      updatePaymentOptionsState(deliveryConfig),
  });

  async function loadInitData() {
    try {
      const response = await fetch(`${API_URL}?action=getInitData&_=${Date.now()}`);
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error);
      }

      state.products = (result.products || []).filter((product: { enabled?: boolean }) =>
        product.enabled
      );
      state.categories = result.categories || [];
      state.formFields = result.formFields || [];
      state.bankAccounts = result.bankAccounts || [];

      applySettings(result.settings || {});
      dispatchStorefrontLoadError("");

      if (state.currentUser) {
        deps.prefillUserFields();
        deps.applySavedOrderFormPrefs();
      }
    } catch (error) {
      dispatchStorefrontLoadError(
        `載入資料失敗: ${deps.getErrorMessage(error)}`,
      );
    }
  }

  function applySettings(settings: Record<string, unknown>) {
    state.isStoreOpen = String(settings.is_open) !== "false";
    updateFormState();

    setStorefrontAppSettings(settings);

    currentDeliveryConfig = normalizeStorefrontDeliveryConfig(settings);

    setStorefrontDeliveryConfig(currentDeliveryConfig);
    updatePaymentOptionsState(currentDeliveryConfig);
  }

  function updatePaymentOptionsState(deliveryConfig: StorefrontDeliveryOption[]) {
    if (!Array.isArray(deliveryConfig)) return;

    const activeDeliveryOptions = deliveryConfig.filter((option) =>
      option && option.enabled !== false
    );
    if (!activeDeliveryOptions.length) return;
    const firstDeliveryOption = activeDeliveryOptions[0];
    if (!firstDeliveryOption) return;

    if (
      !state.selectedDelivery ||
      !activeDeliveryOptions.find((option) => option.id === state.selectedDelivery)
    ) {
      state.selectedDelivery = firstDeliveryOption.id;
      selectDelivery(state.selectedDelivery, null, { skipQuote: true });
    }

    const selectedDeliveryOption = activeDeliveryOptions.find((option) =>
      option.id === state.selectedDelivery
    );
    const availabilityInput: Parameters<
      typeof resolveStorefrontPaymentAvailability
    >[0] = {
      selectedDelivery: state.selectedDelivery,
      quote: state.orderQuote,
    };
    if (selectedDeliveryOption) {
      availabilityInput.selectedDeliveryOption = selectedDeliveryOption;
    }
    const currentConfig = resolveStorefrontPaymentAvailability(availabilityInput);

    setStorefrontAvailablePaymentMethods(currentConfig);

    if (
      state.selectedPayment &&
      !currentConfig[state.selectedPayment as keyof typeof currentConfig]
    ) {
      const nextPayment = selectFirstAvailablePayment(currentConfig);
      if (nextPayment) {
        selectPayment(nextPayment, { skipQuote: true });
      } else {
        state.selectedPayment = "";
      }
      return;
    }

    if (!state.selectedPayment) {
      const nextPayment = selectFirstAvailablePayment(currentConfig);
      if (nextPayment) selectPayment(nextPayment, { skipQuote: true });
    }
  }

  function updateFormState() {
    // Submit button state is rendered by StorefrontCartDrawer via Vue state.
  }

  function selectPayment(method: string, options: { skipQuote?: boolean } = {}) {
    state.selectedPayment = method;
    if (method === "transfer") {
      const firstBankAccount = state.bankAccounts[0];
      if (firstBankAccount && !state.selectedBankAccountId) {
        selectStorefrontBankAccount(firstBankAccount.id);
      }
    }

    if (!options.skipQuote) {
      quoteManager.scheduleQuoteRefresh({ silent: true });
    }
  }

  return {
    applySettings,
    loadInitData,
    refreshQuote: quoteManager.refreshQuote,
    scheduleQuoteRefresh: quoteManager.scheduleQuoteRefresh,
    selectBankAccount: selectStorefrontBankAccount,
    selectPayment,
    updateFormState,
    updatePaymentOptionsState,
  };
}
