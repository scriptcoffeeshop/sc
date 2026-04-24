// ============================================
// storefrontMainApp.ts — 訂購頁初始化入口
// ============================================

import { loadCart, updateCartUI } from "./storefrontCartStore.ts";
import {
  checkStoreToken,
  loadDeliveryPrefs,
  updateDistricts,
} from "./storefrontDeliveryActions.ts";
import {
  getFormControlValue,
  getInputElement,
} from "./storefrontDeliveryDom.ts";
import {
  applySavedOrderFormPrefs,
  initReceiptRequestUi,
} from "./storefrontOrderActions.ts";
import { createStorefrontMainAppAuth } from "./storefrontMainAppAuth.ts";
import { createStorefrontMainAppPayments } from "./storefrontMainAppPayments.ts";
import { createStorefrontMainAppReturns } from "./storefrontMainAppReturns.ts";
import { registerStorefrontRuntime } from "./storefrontRuntime.ts";
import type { StorefrontDeliveryOption } from "./storefrontModels.ts";

function getErrorMessage(error: unknown, fallback = "發生未知錯誤") {
  if (error instanceof Error) return error.message || fallback;
  return String(error || fallback);
}

let paymentActions: ReturnType<typeof createStorefrontMainAppPayments>;

const authActions = createStorefrontMainAppAuth({
  getInputElement,
  getFormControlValue,
  getErrorMessage,
  updateFormState: () => paymentActions.updateFormState(),
});

paymentActions = createStorefrontMainAppPayments({
  getErrorMessage,
  prefillUserFields: () => authActions.prefillUserFields(),
  applySavedOrderFormPrefs,
});

const returnActions = createStorefrontMainAppReturns({
  getErrorMessage,
});

function initMainDomBindings() {
  const deliveryCity = document.getElementById("delivery-city");
  if (deliveryCity) {
    deliveryCity.addEventListener("change", updateDistricts);
  }
}

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

function canInitMainApp() {
  return Boolean(
    document.getElementById("products-container") &&
      document.getElementById("cart-drawer"),
  );
}

export async function initMainApp() {
  if (mainAppInitialized || !canInitMainApp()) return;
  mainAppInitialized = true;

  initMainDomBindings();
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

function autoInitMainAppFallback() {
  initMainApp().catch((error) => {
    console.error("initMainApp fallback failed:", error);
  });
}

if (typeof window !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoInitMainAppFallback, {
      once: true,
    });
  } else {
    autoInitMainAppFallback();
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
