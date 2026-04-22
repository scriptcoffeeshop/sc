import {
  addToCart,
  getCartSnapshot,
  removeCartItem,
  toggleCart,
  updateCartItemQty,
  updateCartItemQtyByKeys,
} from "../../../../js/cart.js";
import { authFetch } from "../../../../js/auth.js";
import { API_URL } from "../../../../js/config.js";
import {
  clearSelectedStore,
  openStoreMap,
  selectDelivery,
} from "../../../../js/delivery.js";
import {
  getDefaultIconUrl,
  getDeliveryIconFallbackKey,
  getIconUrlFromConfig,
} from "../../../../js/icons.js";
import {
  getStorefrontUiSnapshot,
  initMainApp,
  logoutCurrentUser,
  selectBankAccount,
  selectPayment,
  showProfileModal,
  startMainLogin,
} from "../../../../js/main-app.js";
import {
  formatDateTimeText,
  getCustomerPaymentDisplay,
  submitOrder,
} from "../../../../js/orders.js";
import { state } from "../../../../js/state.js";
import { Toast } from "../../../../js/utils.js";

function resolveDeliveryIcon(option) {
  const fallbackKey = getDeliveryIconFallbackKey(option?.id);
  const url = getIconUrlFromConfig(option, fallbackKey);
  return {
    url,
    fallbackText: url ? "" : String(option?.icon || "").trim(),
  };
}

export function createStorefrontLegacyBridge(options = {}) {
  const runtimeWindow = options.window || globalThis.window;
  const runtimeNavigator = runtimeWindow?.navigator || globalThis.navigator;
  const runtimeSetTimeout = runtimeWindow?.setTimeout || globalThis.setTimeout;
  const swal = options.Swal || runtimeWindow?.Swal || globalThis.Swal;
  const toast = options.Toast || Toast;
  const writeClipboard = options.writeClipboard ||
    ((text) => runtimeNavigator?.clipboard?.writeText?.(text));

  return {
    selectedCheckIconUrl: getDefaultIconUrl("selected"),
    resolveDeliveryIcon,
    cartDeps: {
      cartApi: {
        addToCart,
        getCartSnapshot,
        removeCartItem,
        toggleCart,
        updateCartItemQty,
        updateCartItemQtyByKeys,
      },
      orderApi: { submitOrder },
    },
    orderHistoryDeps: {
      authFetch,
      apiUrl: API_URL,
      getCurrentUser: () => state.currentUser,
      Swal: swal,
      Toast: toast,
      writeClipboard,
      formatDateTimeText,
      getCustomerPaymentDisplay,
    },
    shellDeps: {
      document: options.document || globalThis.document,
      clipboard: options.clipboard || runtimeNavigator?.clipboard,
      setTimeout: options.setTimeout ||
        runtimeSetTimeout?.bind(runtimeWindow || globalThis),
      Swal: swal,
      Toast: toast,
      getStorefrontUiSnapshot,
      clearSelectedStore,
      selectDelivery,
      openStoreMap,
      selectPayment,
      selectBankAccount,
      startMainLogin,
      logoutCurrentUser,
      showProfileModal,
      showMyOrders: options.showMyOrders,
      closeOrderHistory: options.closeOrderHistory,
    },
    initMainApp,
  };
}
