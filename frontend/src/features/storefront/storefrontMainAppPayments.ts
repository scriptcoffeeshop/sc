import { API_URL } from "../../lib/appConfig.ts";
import { state } from "../../lib/appState.ts";
import {
  getDeliveryIconFallbackKey,
  getPaymentIconFallbackKey,
  setIconElement,
} from "../../lib/icons.ts";
import { showError } from "../../lib/swalDialogs.ts";
import {
  cart,
  updateCartUI,
} from "./storefrontCartStore.ts";
import {
  renderDeliveryOptions,
  selectDelivery,
} from "./storefrontDeliveryActions.ts";
import { applyBranding, renderDynamicFields } from "./storefrontFormRenderer.ts";
import {
  normalizeStorefrontDeliveryConfig,
  type StorefrontDeliveryOption,
} from "./storefrontModels.ts";
import {
  setStorefrontAppSettings,
  setStorefrontDeliveryConfig,
  storefrontRuntime,
} from "./storefrontRuntime.ts";

type StorefrontMainAppPaymentsDeps = {
  getErrorMessage: (error: unknown, fallback?: string) => string;
  prefillUserFields: () => void;
  applySavedOrderFormPrefs: () => void;
};

type QuoteRequestItem = {
  productId: number;
  specKey: string;
  qty: number;
};

export function createStorefrontMainAppPayments(
  deps: StorefrontMainAppPaymentsDeps,
) {
  let currentDeliveryConfig: StorefrontDeliveryOption[] = [];
  let quoteRefreshTimer: ReturnType<typeof setTimeout> | null = null;
  let latestQuoteRequestId = 0;

  function getQuoteRequestItems(): QuoteRequestItem[] {
    return cart.map((item) => ({
      productId: Number(item.productId),
      specKey: String(item.specKey || ""),
      qty: Math.max(1, Number(item.qty) || 1),
    }));
  }

  function scheduleQuoteRefresh(options: { silent?: boolean } = {}) {
    if (quoteRefreshTimer) clearTimeout(quoteRefreshTimer);
    quoteRefreshTimer = setTimeout(() => {
      void refreshQuote(options);
    }, 120);
  }

  async function refreshQuote(options: { silent?: boolean } = {}) {
    const silent = options.silent !== false;
    const items = getQuoteRequestItems();

    if (!items.length) {
      state.orderQuote = null;
      state.quoteError = "";
      updatePaymentOptionsState(storefrontRuntime.currentDeliveryConfig || []);
      updateCartUI();
      return { success: true, skipped: true };
    }

    const requestId = ++latestQuoteRequestId;
    const payload: { items: QuoteRequestItem[]; deliveryMethod?: string } = {
      items,
    };
    if (state.selectedDelivery) {
      payload.deliveryMethod = state.selectedDelivery;
    }

    try {
      const response = await fetch(`${API_URL}?action=quoteOrder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (requestId !== latestQuoteRequestId) return result;
      if (!result.success || !result.quote) {
        state.orderQuote = null;
        state.quoteError = result.error || "計價失敗";
        if (!silent) showError("錯誤", state.quoteError);
        updatePaymentOptionsState(storefrontRuntime.currentDeliveryConfig || []);
        updateCartUI();
        return result;
      }

      state.orderQuote = result.quote;
      state.quoteError = "";
      updatePaymentOptionsState(storefrontRuntime.currentDeliveryConfig || []);
      updateCartUI();
      return result;
    } catch (error) {
      if (requestId !== latestQuoteRequestId) {
        return { success: false, error: String(error) };
      }
      state.orderQuote = null;
      state.quoteError = deps.getErrorMessage(error, "計價請求失敗");
      if (!silent) showError("錯誤", state.quoteError);
      updatePaymentOptionsState(storefrontRuntime.currentDeliveryConfig || []);
      updateCartUI();
      return { success: false, error: state.quoteError };
    }
  }

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
      renderDynamicFields(
        state.formFields,
        document.getElementById("dynamic-fields-container"),
        state.selectedDelivery,
      );
      renderBankAccounts();

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

    const paymentOptionsStr = String(settings.payment_options_config || "");
    let paymentOptions: Record<string, Record<string, unknown>> = {};
    if (paymentOptionsStr) {
      try {
        paymentOptions = JSON.parse(paymentOptionsStr);
      } catch {}
    }

    const paymentOptionsElement = document.getElementById("payment-options");
    if (paymentOptionsElement?.dataset?.vueManaged !== "true") {
      ["cod", "linepay", "jkopay", "transfer"].forEach((method) => {
        const option = paymentOptions[method];
        if (!option) return;
        const iconEl = document.getElementById(`po-${method}-icon-display`);
        const nameEl = document.getElementById(`po-${method}-name-display`);
        const descEl = document.getElementById(`po-${method}-desc-display`);
        if (iconEl) {
          setIconElement(
            iconEl,
            {
              icon_url: option.icon_url || option.iconUrl,
              icon: option.icon,
            },
            getPaymentIconFallbackKey(method),
            `${method} 圖示`,
          );
        }
        if (nameEl && option.name) nameEl.textContent = String(option.name);
        if (descEl && option.description) {
          descEl.textContent = String(option.description);
        }
      });
    }

    currentDeliveryConfig = normalizeStorefrontDeliveryConfig(settings).map((item) => {
      const legacyItem = item as StorefrontDeliveryOption & {
        iconUrl?: unknown;
      };
      return {
        ...item,
        icon_url: String(item.icon_url || legacyItem.iconUrl || ""),
        iconFallbackKey: getDeliveryIconFallbackKey(item.id),
      };
    });

    setStorefrontDeliveryConfig(currentDeliveryConfig);
    renderDeliveryOptions(currentDeliveryConfig);
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

    const codOpt = document.getElementById("cod-option");
    const lpOpt = document.getElementById("linepay-option");
    const jkoOpt = document.getElementById("jkopay-option");
    const trOpt = document.getElementById("transfer-option");

    codOpt?.classList.toggle("hidden", !currentConfig.cod);
    lpOpt?.classList.toggle("hidden", !currentConfig.linepay);
    jkoOpt?.classList.toggle("hidden", !currentConfig.jkopay);
    trOpt?.classList.toggle("hidden", !currentConfig.transfer);

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
        document.querySelectorAll(".payment-option").forEach((element) =>
          element.classList.remove("active")
        );
        document.getElementById("transfer-info-section")?.classList.add("hidden");
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
    document.querySelectorAll(".payment-option").forEach((element) =>
      element.classList.remove("active")
    );

    const activeBtn = document.querySelector(
      `.payment-option[data-method="${method}"]`,
    );
    activeBtn?.classList.add("active");

    const transferSection = document.getElementById("transfer-info-section");
    if (method === "transfer") {
      transferSection?.classList.remove("hidden");
      if (state.bankAccounts.length > 0 && !state.selectedBankAccountId) {
        selectBankAccount(state.bankAccounts[0].id);
      }
    } else {
      transferSection?.classList.add("hidden");
    }

    if (!options.skipQuote) {
      scheduleQuoteRefresh({ silent: true });
    }
  }

  function selectBankAccount(id: string | number) {
    const hasAccounts = Array.isArray(state.bankAccounts) &&
      state.bankAccounts.length > 0;
    if (!hasAccounts) {
      state.selectedBankAccountId = "";
      renderBankAccounts();
      return;
    }

    const selected = state.bankAccounts.find((account) =>
      String(account.id) === String(id)
    );
    state.selectedBankAccountId = selected
      ? selected.id
      : state.bankAccounts[0].id;
    renderBankAccounts();
  }

  function renderBankAccounts() {
    const container = document.getElementById("bank-accounts-list");
    if (!container || container.dataset?.vueManaged === "true") return;

    if (!Array.isArray(state.bankAccounts) || state.bankAccounts.length === 0) {
      state.selectedBankAccountId = "";
      container.replaceChildren();
      return;
    }

    const selectedExists = state.bankAccounts.some((account) =>
      String(account.id) === String(state.selectedBankAccountId)
    );
    if (!selectedExists) {
      state.selectedBankAccountId = state.bankAccounts[0].id;
    }

    const fragment = document.createDocumentFragment();
    state.bankAccounts.forEach((account) => {
      const isSelected = state.selectedBankAccountId == account.id;
      const borderClass = isSelected
        ? "border-primary ring-2 ring-primary bg-orange-50"
        : "border-[#d1dce5] bg-white";

      const card = document.createElement("div");
      card.className =
        `p-3 rounded-lg mb-2 relative cursor-pointer font-sans transition-all border ${borderClass}`;
      card.dataset.bankCard = "true";
      card.dataset.bankId = String(account.id);

      const topRow = document.createElement("div");
      topRow.className = "flex items-center gap-3 mb-1";

      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "bank_account_selection";
      radio.value = String(account.id);
      radio.className = "w-4 h-4 text-primary";
      radio.checked = Boolean(isSelected);

      const bankLabel = document.createElement("div");
      bankLabel.className = "font-semibold text-gray-800";
      bankLabel.textContent =
        `${String(account.bankName || "")} (${String(account.bankCode || "")})`;

      topRow.append(radio, bankLabel);

      const accountRow = document.createElement("div");
      accountRow.className = "flex items-center gap-2 mt-1 pl-7";

      const accountNumber = document.createElement("span");
      accountNumber.className = "text-lg font-mono font-medium";
      accountNumber.style.color = "var(--primary)";
      accountNumber.textContent = String(account.accountNumber || "");

      const copyButton = document.createElement("button");
      copyButton.type = "button";
      copyButton.dataset.copyAccount = "true";
      copyButton.dataset.account = String(account.accountNumber || "");
      copyButton.className =
        "text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-1 rounded transition-colors";
      copyButton.title = "複製帳號";
      copyButton.textContent = "複製";

      accountRow.append(accountNumber, copyButton);
      card.append(topRow, accountRow);

      if (account.accountName) {
        const accountName = document.createElement("div");
        accountName.className = "text-sm text-gray-500 mt-1 pl-7";
        accountName.textContent = `戶名: ${String(account.accountName)}`;
        card.appendChild(accountName);
      }

      fragment.appendChild(card);
    });

    container.replaceChildren(fragment);

    container.querySelectorAll("[data-bank-card]").forEach((card) => {
      if (!(card instanceof HTMLElement)) return;
      card.addEventListener("click", () => {
        selectBankAccount(card.dataset.bankId || "");
      });
    });

    container.querySelectorAll('input[name="bank_account_selection"]').forEach(
      (radio) => {
        if (!(radio instanceof HTMLInputElement)) return;
        radio.addEventListener("click", (event) => {
          event.stopPropagation();
          selectBankAccount(radio.value);
        });
      },
    );

    container.querySelectorAll("[data-copy-account]").forEach((button) => {
      if (!(button instanceof HTMLElement)) return;
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        copyTransferAccount(button, button.dataset.account || "");
      });
    });
  }

  function copyTransferAccount(button: HTMLElement, account: string) {
    if (navigator.clipboard && globalThis.isSecureContext) {
      navigator.clipboard.writeText(account).then(() => {
        showCopySuccess(button);
      }).catch((error) => {
        console.error("複製失敗:", error);
        fallbackCopyTextToClipboard(account, button);
      });
      return;
    }

    fallbackCopyTextToClipboard(account, button);
  }

  function fallbackCopyTextToClipboard(text: string, button: HTMLElement) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      if (document.execCommand("copy")) {
        showCopySuccess(button);
      }
    } catch (error) {
      console.error("Fallback 複製失敗:", error);
    }
    document.body.removeChild(textArea);
  }

  function showCopySuccess(button: HTMLElement) {
    const originalText = button.textContent;
    button.textContent = "已複製";
    button.classList.add("bg-green-100", "text-green-700");
    setTimeout(() => {
      button.textContent = originalText;
      button.classList.remove("bg-green-100", "text-green-700");
    }, 2000);
  }

  return {
    applySettings,
    loadInitData,
    refreshQuote,
    scheduleQuoteRefresh,
    selectBankAccount,
    selectPayment,
    updateFormState,
    updatePaymentOptionsState,
  };
}
