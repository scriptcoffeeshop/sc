import { API_URL } from "../../lib/appConfig.ts";
import { state } from "../../lib/appState.ts";
import { showError } from "../../lib/swalDialogs.ts";
import { cart, updateCartUI } from "./storefrontCartStore.ts";
import type { StorefrontDeliveryOption } from "./storefrontModels.ts";

type QuoteRequestItem = {
  productId: number;
  specKey: string;
  qty: number;
};

type StorefrontQuoteManagerDeps = {
  getErrorMessage: (error: unknown, fallback?: string) => string;
  getCurrentDeliveryConfig: () => StorefrontDeliveryOption[];
  updatePaymentOptionsState: (deliveryConfig: StorefrontDeliveryOption[]) => void;
};

export function createStorefrontQuoteManager(
  deps: StorefrontQuoteManagerDeps,
) {
  let quoteRefreshTimer: ReturnType<typeof setTimeout> | null = null;
  let latestQuoteRequestId = 0;

  function getQuoteRequestItems(): QuoteRequestItem[] {
    return cart.map((item) => ({
      productId: Number(item.productId),
      specKey: String(item.specKey || ""),
      qty: Math.max(1, Number(item.qty) || 1),
    }));
  }

  function syncQuoteDependentUi() {
    deps.updatePaymentOptionsState(deps.getCurrentDeliveryConfig());
    updateCartUI();
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
      syncQuoteDependentUi();
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
        syncQuoteDependentUi();
        return result;
      }

      state.orderQuote = result.quote;
      state.quoteError = "";
      syncQuoteDependentUi();
      return result;
    } catch (error) {
      if (requestId !== latestQuoteRequestId) {
        return { success: false, error: String(error) };
      }
      state.orderQuote = null;
      state.quoteError = deps.getErrorMessage(error, "計價請求失敗");
      if (!silent) showError("錯誤", state.quoteError);
      syncQuoteDependentUi();
      return { success: false, error: state.quoteError };
    }
  }

  return {
    refreshQuote,
    scheduleQuoteRefresh,
  };
}
