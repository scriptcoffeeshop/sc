// ============================================
// storefrontMainApp.ts — 訂購頁初始化入口
// ============================================

import { loadCart, updateCartUI } from "./storefrontCartStore.ts";
import {
  checkStoreToken,
  loadDeliveryPrefs,
} from "./storefrontDeliveryActions.ts";
import {
  getModalFormControlValue,
} from "./storefrontModalFormControls.ts";
import { getStorefrontErrorMessage } from "./storefrontErrors.ts";
import {
  applySavedOrderFormPrefs,
  initReceiptRequestUi,
} from "./storefrontOrderActions.ts";
import { createStorefrontMainAppAuth } from "./storefrontMainAppAuth.ts";
import { createStorefrontMainAppPayments } from "./storefrontMainAppPayments.ts";
import { createStorefrontMainAppReturns } from "./storefrontMainAppReturns.ts";
import { registerStorefrontRuntime } from "./storefrontRuntime.ts";
import type { StorefrontDeliveryOption } from "./storefrontModels.ts";

let paymentActions: ReturnType<typeof createStorefrontMainAppPayments>;

const authActions = createStorefrontMainAppAuth({
  getFormControlValue: getModalFormControlValue,
  getErrorMessage: getStorefrontErrorMessage,
  updateFormState: () => paymentActions.updateFormState(),
});

paymentActions = createStorefrontMainAppPayments({
  getErrorMessage: getStorefrontErrorMessage,
  prefillUserFields: () => authActions.prefillUserFields(),
  applySavedOrderFormPrefs,
});

const returnActions = createStorefrontMainAppReturns({
  getErrorMessage: getStorefrontErrorMessage,
});

function syncDynamicFieldDefaults() {
  authActions.prefillUserFields();
}

registerStorefrontRuntime({
  selectPayment,
  updateCartUI,
  updateFormState,
  syncDynamicFieldDefaults,
  scheduleQuoteRefresh,
  refreshQuote,
  updatePaymentOptionsState,
});

let mainAppInitialized = false;

export async function initMainApp() {
  if (mainAppInitialized) return;
  mainAppInitialized = true;

  initReceiptRequestUi();

  const urlParams = new URLSearchParams(location.search);
  const code = urlParams.get("code");
  const stateParam = urlParams.get("state");
  const lpAction = urlParams.get("lpAction");
  const jkoOrderId = String(urlParams.get("jkoOrderId") || "").trim();

  if (lpAction) {
    history.replaceState({}, "", "main.html");
    await returnActions.handleLinePayCallback(lpAction, urlParams);
  }

  if (jkoOrderId) {
    history.replaceState({}, "", "main.html");
    await returnActions.handleJkoPayReturn(jkoOrderId);
  }

  if (code) {
    await authActions.handleLineCallback(code, stateParam);
  } else {
    authActions.checkLoginStatus();
  }

  await paymentActions.loadInitData();
  loadCart();
  loadDeliveryPrefs();
  applySavedOrderFormPrefs();
  paymentActions.updateFormState();

  const storeToken = urlParams.get("store_token");
  if (storeToken) {
    history.replaceState({}, "", "main.html");
    await checkStoreToken(storeToken);
  }
}

export async function showProfileModal() {
  return authActions.showProfileModal();
}

export function logoutCurrentUser() {
  return authActions.logoutCurrentUser();
}

export function startMainLogin() {
  return authActions.startMainLogin();
}

export function scheduleQuoteRefresh(options: { silent?: boolean } = {}) {
  return paymentActions.scheduleQuoteRefresh(options);
}

export async function refreshQuote(options: { silent?: boolean } = {}) {
  return paymentActions.refreshQuote(options);
}

export function updatePaymentOptionsState(
  deliveryConfig: StorefrontDeliveryOption[] = [],
) {
  return paymentActions.updatePaymentOptionsState(deliveryConfig);
}

export function updateFormState() {
  return paymentActions.updateFormState();
}

export function selectPayment(method: string, options: { skipQuote?: boolean } = {}) {
  return paymentActions.selectPayment(method, options);
}

export function selectBankAccount(id: string | number) {
  return paymentActions.selectBankAccount(id);
}
