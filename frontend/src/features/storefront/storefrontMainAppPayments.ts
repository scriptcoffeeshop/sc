import { API_URL } from "../../lib/appConfig.ts";
import { state } from "../../lib/appState.ts";
import { cart } from "./storefrontCartStore.ts";
import { selectDelivery } from "./storefrontDeliveryActions.ts";
import { applyBranding } from "./storefrontFormRenderer.ts";
import {
  normalizeStorefrontDeliveryConfig,
  type StorefrontDeliveryOption,
} from "./storefrontModels.ts";
import { selectStorefrontBankAccount } from "./storefrontBankAccountsState.ts";
import { createStorefrontQuoteManager } from "./storefrontQuoteManager.ts";
import {
  setStorefrontAvailablePaymentMethods,
  setStorefrontAppSettings,
  setStorefrontDeliveryConfig,
} from "./storefrontRuntime.ts";

type StorefrontMainAppPaymentsDeps = {
  getErrorMessage: (error: unknown, fallback?: string) => string;
  prefillUserFields: () => void;
  applySavedOrderFormPrefs: () => void;
};

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
      applyBranding(result.settings || {});

      if (state.currentUser) {
        deps.prefillUserFields();
        deps.applySavedOrderFormPrefs();
      }
    } catch (error) {
      const productsContainer = document.getElementById("products-container");
      if (productsContainer) {
        const message = document.createElement("p");
        message.className = "p-8 text-center text-red-600";
        message.append(`載入資料失敗: ${deps.getErrorMessage(error)}`);
        message.appendChild(document.createElement("br"));

        const retryButton = document.createElement("button");
        retryButton.type = "button";
        retryButton.dataset.reloadPage = "true";
        retryButton.className = "mt-3 btn-primary";
        retryButton.textContent = "重試";
        retryButton.addEventListener("click", () => location.reload());
        message.appendChild(retryButton);
        productsContainer.replaceChildren(message);
      }
    }
  }

  function applySettings(settings: Record<string, unknown>) {
    if (String(settings.announcement_enabled) === "true" && settings.announcement) {
      const announcementEl = document.getElementById("announcement-text");
      if (announcementEl) {
        const normalizedAnnouncement = String(settings.announcement || "").replace(
          /\\n/g,
          "\n",
        );
        announcementEl.textContent = normalizedAnnouncement;
      }
      document.getElementById("announcement-banner")?.classList.remove("hidden");
    }

    if (String(settings.is_open) === "false") {
      state.isStoreOpen = false;
      updateFormState();
      const totalPrice = document.getElementById("total-price");
      if (totalPrice) totalPrice.textContent = "目前休息中，暫停接單";
    }

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

    if (
      !state.selectedDelivery ||
      !activeDeliveryOptions.find((option) => option.id === state.selectedDelivery)
    ) {
      state.selectedDelivery = activeDeliveryOptions[0].id;
      selectDelivery(state.selectedDelivery, null, { skipQuote: true });
    }

    const fallbackConfigOpt = activeDeliveryOptions.find((option) =>
      option.id === state.selectedDelivery
    );
    const fallbackConfig = fallbackConfigOpt?.payment || {
      cod: true,
      linepay: false,
      jkopay: false,
      transfer: false,
    };
    const hasJkoPayInFallback = Object.prototype.hasOwnProperty.call(
      fallbackConfig,
      "jkopay",
    );
    const inferredFallbackJkoPay = hasJkoPayInFallback
      ? !!fallbackConfig.jkopay
      : !!fallbackConfig.linepay;
    const quote = state.orderQuote;
    const canUseQuote = quote &&
      quote.availablePaymentMethods &&
      (!state.selectedDelivery || quote.deliveryMethod === state.selectedDelivery);

    const currentConfig = canUseQuote
      ? {
        cod: !!quote.availablePaymentMethods?.cod,
        linepay: !!quote.availablePaymentMethods?.linepay,
        jkopay: !!quote.availablePaymentMethods?.jkopay,
        transfer: !!quote.availablePaymentMethods?.transfer,
      }
      : {
        cod: !!fallbackConfig.cod,
        linepay: !!fallbackConfig.linepay,
        jkopay: inferredFallbackJkoPay,
        transfer: !!fallbackConfig.transfer,
      };

    setStorefrontAvailablePaymentMethods(currentConfig);

    if (
      state.selectedPayment &&
      !currentConfig[state.selectedPayment as keyof typeof currentConfig]
    ) {
      if (currentConfig.cod) selectPayment("cod", { skipQuote: true });
      else if (currentConfig.linepay) {
        selectPayment("linepay", { skipQuote: true });
      } else if (currentConfig.jkopay) {
        selectPayment("jkopay", { skipQuote: true });
      } else if (currentConfig.transfer) {
        selectPayment("transfer", { skipQuote: true });
      } else {
        state.selectedPayment = "";
      }
      return;
    }

    if (!state.selectedPayment) {
      if (currentConfig.cod) selectPayment("cod", { skipQuote: true });
      else if (currentConfig.linepay) {
        selectPayment("linepay", { skipQuote: true });
      } else if (currentConfig.jkopay) {
        selectPayment("jkopay", { skipQuote: true });
      } else if (currentConfig.transfer) {
        selectPayment("transfer", { skipQuote: true });
      }
    }
  }

  function updateFormState() {
    const loggedIn = !!state.currentUser;
    const open = state.isStoreOpen;
    const submitBtn = document.getElementById("submit-btn");
    if (submitBtn instanceof HTMLButtonElement) {
      submitBtn.disabled = !loggedIn || !open;
    }

    const cartSubmitBtn = document.getElementById("cart-submit-btn");
    if (cartSubmitBtn instanceof HTMLButtonElement) {
      const hasItems = cart.length > 0;
      cartSubmitBtn.disabled = !loggedIn || !open || !hasItems;
      if (!loggedIn) {
        cartSubmitBtn.textContent = "請先登入後再送出訂單";
      } else if (!open) {
        cartSubmitBtn.textContent = "目前休息中，暫停接單";
      } else if (!hasItems) {
        cartSubmitBtn.textContent = "購物車是空的";
      } else {
        cartSubmitBtn.textContent = "確認送出訂單";
      }
    }
  }

  function selectPayment(method: string, options: { skipQuote?: boolean } = {}) {
    state.selectedPayment = method;
    if (method === "transfer") {
      if (state.bankAccounts.length > 0 && !state.selectedBankAccountId) {
        selectStorefrontBankAccount(state.bankAccounts[0].id);
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
