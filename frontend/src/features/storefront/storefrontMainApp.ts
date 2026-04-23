// ============================================
// storefrontMainApp.ts — 訂購頁初始化入口
// ============================================

import { API_URL, LINE_REDIRECT } from "../../../../js/config.js";
import { escapeHtml, isValidEmail } from "../../../../js/utils.js";
import { loginWithLine } from "../../../../js/auth.js";
import { state } from "../../../../js/state.js";
import {
  cart,
  loadCart,
  updateCartUI,
} from "./storefrontCartStore.ts";
import {
  checkStoreToken,
  loadDeliveryPrefs,
  renderDeliveryOptions,
  selectDelivery,
  updateDistricts,
} from "./storefrontDeliveryActions.ts";
import {
  applySavedOrderFormPrefs,
  buildPaymentStatusDialogOptions,
  initReceiptRequestUi,
} from "./storefrontOrderActions.ts";
import {
  applyBranding,
  renderDynamicFields,
} from "./storefrontFormRenderer.ts";
import { authFetch } from "../../../../js/auth.js";
import {
  getDeliveryIconFallbackKey,
  getPaymentIconFallbackKey,
  setIconElement,
} from "../../lib/icons.ts";
import { normalizeStorefrontDeliveryConfig } from "./storefrontModels.ts";
import {
  registerStorefrontRuntime,
  setStorefrontAppSettings,
  setStorefrontDeliveryConfig,
  storefrontRuntime,
} from "./storefrontRuntime.ts";

let currentDeliveryConfig = [];
function initMainDomBindings() {
  const deliveryCity = document.getElementById("delivery-city");
  if (deliveryCity) {
    deliveryCity.addEventListener("change", updateDistricts);
  }
}

function rerenderFormFields() {
  renderDynamicFields(
    state.formFields,
    document.getElementById("dynamic-fields-container"),
    state.selectedDelivery,
  );
  prefillUserFields();
}

// ============ 保留必要的 window 掛載 ============
// 以下函式保留掛載，避免舊快取版本或外部調用造成功能中斷。
registerStorefrontRuntime({
  selectPayment,
  updateCartUI,
  updateFormState,
  rerenderFormFields,
  scheduleQuoteRefresh,
  refreshQuote,
  updatePaymentOptionsState,
});
window.selectPayment = selectPayment;
window.updateCartUI = updateCartUI;
window.updateFormState = updateFormState;
window.rerenderFormFields = rerenderFormFields;
window.updateDistricts = updateDistricts;
window.scheduleQuoteRefresh = scheduleQuoteRefresh;
window.refreshQuote = refreshQuote;
window.updatePaymentOptionsState = updatePaymentOptionsState;

// ============ 初始化 ============
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

  // LINE Pay 回調處理
  const lpAction = urlParams.get("lpAction");
  if (lpAction) {
    history.replaceState({}, "", "main.html");
    await handleLinePayCallback(lpAction, urlParams);
  }

  // 街口支付回跳處理
  const jkoOrderId = String(urlParams.get("jkoOrderId") || "").trim();
  if (jkoOrderId) {
    history.replaceState({}, "", "main.html");
    await handleJkoPayReturn(jkoOrderId);
  }

  if (code) {
    await handleLineCallback(code, stateParam);
  } else {
    checkLoginStatus();
  }
  await loadInitData();
  loadCart();
  // 初始化資料與配送選項渲染完成後，再次套用偏好，避免重新登入後無法自動帶入
  loadDeliveryPrefs();
  applySavedOrderFormPrefs();
  updateFormState();

  const storeToken = urlParams.get("store_token");
  if (storeToken) {
    history.replaceState({}, "", "main.html");
    await checkStoreToken(storeToken);
  }
}

// 由 Vue Page 元件在 onMounted 時顯式呼叫 initMainApp()
// 同時保留 legacy HTML 直載入時的自動初始化 fallback。
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

// ============ LINE Login 回呼 ============
async function handleLineCallback(code, stateParam) {
  const saved = localStorage.getItem("coffee_line_state");
  localStorage.removeItem("coffee_line_state");
  if (!saved || stateParam !== saved) {
    Swal.fire("驗證失敗", "請重新登入", "error");
    history.replaceState({}, "", "main.html");
    return;
  }
  Swal.fire({
    title: "登入中...",
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });
  try {
    const res = await fetch(
      `${API_URL}?action=customerLineLogin`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          redirectUri: LINE_REDIRECT.main,
        }),
      },
    );
    const result = await res.json();
    history.replaceState({}, "", "main.html");
    if (result.success) {
      state.currentUser = result.user;
      localStorage.setItem("coffee_user", JSON.stringify(state.currentUser));
      if (result.token) {
        localStorage.setItem("coffee_jwt", result.token);
      }
      showUserInfo();
      Swal.close();
    } else throw new Error(result.error || "登入失敗");
  } catch (e) {
    Swal.fire("登入失敗", e.message, "error");
  }
}

function checkLoginStatus() {
  const saved = localStorage.getItem("coffee_user");
  const token = localStorage.getItem("coffee_jwt");
  if (saved && token) {
    try {
      state.currentUser = JSON.parse(saved);
      showUserInfo();
    } catch {
      localStorage.removeItem("coffee_user");
      localStorage.removeItem("coffee_jwt");
    }
  } else {
    localStorage.removeItem("coffee_user");
    localStorage.removeItem("coffee_jwt");
  }
}

function showUserInfo() {
  document.getElementById("login-prompt").classList.add("hidden");
  document.getElementById("user-info").classList.remove("hidden");
  document.getElementById("user-display-name").textContent =
    state.currentUser.displayName || state.currentUser.display_name;
  document.getElementById("user-avatar").src = state.currentUser.pictureUrl ||
    state.currentUser.picture_url || "https://via.placeholder.com/48";
  document.getElementById("line-name").value = state.currentUser.displayName ||
    state.currentUser.display_name;
  // 回填所有動態表單欄位
  prefillUserFields();
  applySavedOrderFormPrefs();
  updateFormState();
  setTimeout(() => {
    loadDeliveryPrefs();
    applySavedOrderFormPrefs();
  }, 100);
}

/** 將使用者儲存的資料回填到動態表單欄位 */
function prefillUserFields() {
  if (!state.currentUser) return;
  const u = state.currentUser;
  // phone / email
  const phoneEl = document.getElementById("field-phone");
  const emailEl = document.getElementById("field-email");
  if (phoneEl && u.phone) phoneEl.value = u.phone;
  if (emailEl && u.email) emailEl.value = u.email;
  // 自訂欄位
  let customDefaults = {};
  if (u.defaultCustomFields) {
    try {
      customDefaults = typeof u.defaultCustomFields === "string"
        ? JSON.parse(u.defaultCustomFields)
        : u.defaultCustomFields;
    } catch {}
  }
  for (const [key, val] of Object.entries(customDefaults)) {
    const el = document.getElementById(`field-${key}`);
    if (el && val) el.value = val;
  }
}

/** 顯示會員資料編輯彈窗 */
export async function showProfileModal() {
  if (!state.currentUser) return;
  const u = state.currentUser;

  // 取得動態表單欄位設定
  const fields = (state.formFields || []).filter((f) =>
    f.enabled && f.field_type !== "section_title"
  );

  // 準備現有預設值
  let customDefaults = {};
  if (u.defaultCustomFields) {
    try {
      customDefaults = typeof u.defaultCustomFields === "string"
        ? JSON.parse(u.defaultCustomFields)
        : u.defaultCustomFields;
    } catch {}
  }

  // 產生 HTML 表單
  let fieldsHtml = "";
  for (const f of fields) {
    const key = f.field_key;
    let currentVal = "";
    if (key === "phone") currentVal = u.phone || "";
    else if (key === "email") currentVal = u.email || "";
    else currentVal = customDefaults[key] || "";

    const escapedVal = escapeHtml(currentVal);
    const escapedLabel = escapeHtml(f.label);
    const escapedPlaceholder = escapeHtml(f.placeholder || "");

    if (f.field_type === "select") {
      let opts = [];
      try {
        opts = JSON.parse(f.options || "[]");
      } catch {}
      fieldsHtml += `<div style="margin-bottom:12px">
                <label style="display:block;font-weight:600;margin-bottom:4px;color:#3C2415;font-size:14px">${escapedLabel}</label>
                <select id="profile-${key}" class="swal2-select" style="margin:0;width:100%">
                    <option value="">-- 請選擇 --</option>
                    ${
        opts.map((o) =>
          `<option value="${escapeHtml(o)}" ${
            o === currentVal ? "selected" : ""
          }>${escapeHtml(o)}</option>`
        ).join("")
      }
                </select>
            </div>`;
    } else if (f.field_type === "textarea") {
      fieldsHtml += `<div style="margin-bottom:12px">
                <label style="display:block;font-weight:600;margin-bottom:4px;color:#3C2415;font-size:14px">${escapedLabel}</label>
                <textarea id="profile-${key}" class="swal2-textarea" placeholder="${escapedPlaceholder}" style="margin:0;width:100%;min-height:60px">${escapedVal}</textarea>
            </div>`;
    } else {
      fieldsHtml += `<div style="margin-bottom:12px">
                <label style="display:block;font-weight:600;margin-bottom:4px;color:#3C2415;font-size:14px">${escapedLabel}</label>
                <input id="profile-${key}" type="${
        f.field_type || "text"
      }" class="swal2-input" value="${escapedVal}" placeholder="${escapedPlaceholder}" style="margin:0;width:100%">
            </div>`;
    }
  }

  const { value: confirmed } = await Swal.fire({
    title: "會員資料",
    html:
      `<div style="text-align:left;max-height:60vh;overflow-y:auto;padding:4px">
            <p style="color:#888;font-size:13px;margin-bottom:16px">編輯常用資料，下次登入時將自動帶入表單。</p>
            ${fieldsHtml}
        </div>`,
    showCancelButton: true,
    confirmButtonText: "儲存",
    cancelButtonText: "取消",
    confirmButtonColor: "#3C2415",
    customClass: {
      popup: "storefront-profile-popup",
    },
    preConfirm: () => {
      const emailEl = document.getElementById("profile-email");
      const email = emailEl ? emailEl.value.trim() : "";
      if (email && !isValidEmail(email)) {
        Swal.showValidationMessage("請填寫正確的電子郵件格式");
        return false;
      }
      return true;
    },
  });

  if (!confirmed) return;

  // 收集資料
  const profileData = {};
  const customFieldsData = {};
  for (const f of fields) {
    const key = f.field_key;
    const el = document.getElementById(`profile-${key}`);
    const val = el ? el.value.trim() : "";
    if (key === "phone") profileData.phone = val;
    else if (key === "email") profileData.email = val;
    else if (val) customFieldsData[key] = val;
  }
  profileData.defaultCustomFields = JSON.stringify(customFieldsData);

  // 呼叫 API 儲存
  try {
    Swal.fire({
      title: "儲存中...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });
    const r = await authFetch(`${API_URL}?action=updateUserProfile`, {
      method: "POST",
      body: JSON.stringify(profileData),
    });
    const d = await r.json();
    if (d.success && d.profile) {
      // 更新本地 state
      Object.assign(state.currentUser, d.profile);
      localStorage.setItem("coffee_user", JSON.stringify(state.currentUser));
      // 重新帶入表單
      prefillUserFields();
      Toast.fire({ icon: "success", title: "會員資料已儲存" });
    } else {
      Swal.fire("錯誤", d.error || "儲存失敗", "error");
    }
  } catch (e) {
    Swal.fire("錯誤", e.message, "error");
  }
}

export function logoutCurrentUser() {
  state.currentUser = null;
  localStorage.removeItem("coffee_user");
  localStorage.removeItem("coffee_jwt");
  document.getElementById("login-prompt").classList.remove("hidden");
  document.getElementById("user-info").classList.add("hidden");
  document.getElementById("line-name").value = "";
  // 清除動態欄位
  const phoneEl = document.getElementById("field-phone");
  const emailEl = document.getElementById("field-email");
  if (phoneEl) phoneEl.value = "";
  if (emailEl) emailEl.value = "";
  updateFormState();
}

export function startMainLogin() {
  return loginWithLine(LINE_REDIRECT.main, "coffee_line_state");
}

let quoteRefreshTimer = null;
let latestQuoteRequestId = 0;

function getQuoteRequestItems() {
  return cart.map((c) => ({
    productId: Number(c.productId),
    specKey: String(c.specKey || ""),
    qty: Math.max(1, Number(c.qty) || 1),
  }));
}

function scheduleQuoteRefresh(options = {}) {
  if (quoteRefreshTimer) clearTimeout(quoteRefreshTimer);
  quoteRefreshTimer = setTimeout(() => {
    refreshQuote(options);
  }, 120);
}

async function refreshQuote(options = {}) {
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
  const payload = { items };
  if (state.selectedDelivery) payload.deliveryMethod = state.selectedDelivery;

  try {
    const res = await fetch(`${API_URL}?action=quoteOrder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await res.json();

    if (requestId !== latestQuoteRequestId) return result;
    if (!result.success || !result.quote) {
      state.orderQuote = null;
      state.quoteError = result.error || "計價失敗";
      if (!silent) Swal.fire("錯誤", state.quoteError, "error");
      updatePaymentOptionsState(storefrontRuntime.currentDeliveryConfig || []);
      updateCartUI();
      return result;
    }

    state.orderQuote = result.quote;
    state.quoteError = "";
    updatePaymentOptionsState(storefrontRuntime.currentDeliveryConfig || []);
    updateCartUI();
    return result;
  } catch (e) {
    if (requestId !== latestQuoteRequestId) {
      return { success: false, error: String(e) };
    }
    state.orderQuote = null;
    state.quoteError = e.message || "計價請求失敗";
    if (!silent) Swal.fire("錯誤", state.quoteError, "error");
    updatePaymentOptionsState(storefrontRuntime.currentDeliveryConfig || []);
    updateCartUI();
    return { success: false, error: state.quoteError };
  }
}
// ============ 載入資料 ============
async function loadInitData() {
  try {
    const res = await fetch(`${API_URL}?action=getInitData&_=${Date.now()}`);
    const result = await res.json();
    if (result.success) {
      state.products = (result.products || []).filter((p) => p.enabled);
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

      // 登入後再回填一次（因為渲染完才有欄位）
      if (state.currentUser) {
        prefillUserFields();
        applySavedOrderFormPrefs();
      }
    } else throw new Error(result.error);
  } catch (e) {
    const productsContainer = document.getElementById("products-container");
    if (productsContainer) {
      const message = document.createElement("p");
      message.className = "p-8 text-center text-red-600";
      message.append(`載入資料失敗: ${e.message}`);
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

function applySettings(s) {
  if (String(s.announcement_enabled) === "true" && s.announcement) {
    const announcementEl = document.getElementById("announcement-text");
    if (announcementEl) {
      const normalizedAnnouncement = String(s.announcement || "").replace(
        /\\n/g,
        "\n",
      );
      announcementEl.textContent = normalizedAnnouncement;
    }
    document.getElementById("announcement-banner").classList.remove("hidden");
  }
  if (String(s.is_open) === "false") {
    state.isStoreOpen = false;
    updateFormState();
    document.getElementById("total-price").textContent =
      "目前休息中，暫停接單";
  }

  // 將設定保存給其他模組使用
  setStorefrontAppSettings(s);

  // 套用金流自訂名稱與說明
  const paymentOptionsStr = s.payment_options_config || "";
  let paymentOptions = {};
  if (paymentOptionsStr) {
    try {
      paymentOptions = JSON.parse(paymentOptionsStr);
    } catch (e) {}
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
      if (nameEl && option.name) nameEl.textContent = option.name;
      if (descEl && option.description) descEl.textContent = option.description;
    });
  }

  currentDeliveryConfig = normalizeStorefrontDeliveryConfig(s).map((item) => ({
    ...item,
    icon_url: item.icon_url || item.iconUrl || "",
    iconFallbackKey: getDeliveryIconFallbackKey(item.id),
  }));
  setStorefrontDeliveryConfig(currentDeliveryConfig);

  // 渲染物流選項 (在 delivery.js 中定義)
  renderDeliveryOptions(currentDeliveryConfig);
  updatePaymentOptionsState(currentDeliveryConfig);
}

function updatePaymentOptionsState(deliveryConfig) {
  if (!Array.isArray(deliveryConfig)) return;

  // 確保有預設選擇的物流
  const activeDeliveryOptions = deliveryConfig.filter((d) =>
    d && d.enabled !== false
  );
  if (activeDeliveryOptions.length === 0) return; // 全部關閉的防呆

  if (
    !state.selectedDelivery ||
    !activeDeliveryOptions.find((d) => d.id === state.selectedDelivery)
  ) {
    // 如果目前選的物流不存在或被關閉，預設選回第一個
    state.selectedDelivery = activeDeliveryOptions[0].id;
    // 需同步更新 UI
    selectDelivery(state.selectedDelivery, null, { skipQuote: true });
  }

  const fallbackConfigOpt = activeDeliveryOptions.find((d) =>
    d.id === state.selectedDelivery
  );
  const fallbackConfig = fallbackConfigOpt?.payment ||
    { cod: true, linepay: false, jkopay: false, transfer: false };
  const hasJkoPayInFallback = Object.prototype.hasOwnProperty.call(
    fallbackConfig || {},
    "jkopay",
  );
  const inferredFallbackJkoPay = hasJkoPayInFallback
    ? !!fallbackConfig.jkopay
    : !!fallbackConfig.linepay;
  const quote = state.orderQuote;
  const canUseQuote = quote &&
    quote.availablePaymentMethods &&
    (!state.selectedDelivery ||
      quote.deliveryMethod === state.selectedDelivery);
  const currentConfig = canUseQuote
    ? {
      cod: !!quote.availablePaymentMethods.cod,
      linepay: !!quote.availablePaymentMethods.linepay,
      jkopay: !!quote.availablePaymentMethods.jkopay,
      transfer: !!quote.availablePaymentMethods.transfer,
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

  // 處理 DOM 更新
  if (codOpt) codOpt.classList.toggle("hidden", !currentConfig.cod);
  if (lpOpt) lpOpt.classList.toggle("hidden", !currentConfig.linepay);
  if (jkoOpt) jkoOpt.classList.toggle("hidden", !currentConfig.jkopay);
  if (trOpt) trOpt.classList.toggle("hidden", !currentConfig.transfer);

  // 如果目前選擇的選向不被該物流允許，則重置為第一個可用的選向
  if (state.selectedPayment && !currentConfig[state.selectedPayment]) {
    if (currentConfig.cod) selectPayment("cod", { skipQuote: true });
    else if (currentConfig.linepay) {
      selectPayment("linepay", { skipQuote: true });
    } else if (currentConfig.jkopay) {
      selectPayment("jkopay", { skipQuote: true });
    } else if (currentConfig.transfer) {
      selectPayment("transfer", { skipQuote: true });
    } else {
      state.selectedPayment = "";
      document.querySelectorAll(".payment-option").forEach((el) =>
        el.classList.remove("active")
      );
      // 隱藏轉帳資訊區塊
      const transferSection = document.getElementById("transfer-info-section");
      if (transferSection) transferSection.classList.add("hidden");
    }
  } else if (!state.selectedPayment) {
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
  if (submitBtn) submitBtn.disabled = !loggedIn || !open;
  const cartSubmitBtn = document.getElementById("cart-submit-btn");
  if (cartSubmitBtn) {
    const hasItems = cart.length > 0;
    cartSubmitBtn.disabled = !loggedIn || !open || !hasItems;
    // 根據禁用原因顯示對應的按鈕文字提示
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

// ============ 付款方式選擇 ============
export function selectPayment(method, options = {}) {
  state.selectedPayment = method;
  document.querySelectorAll(".payment-option").forEach((el) =>
    el.classList.remove("active")
  );

  const activeBtn = document.querySelector(
    `.payment-option[data-method="${method}"]`,
  );
  if (activeBtn) activeBtn.classList.add("active");

  // 顯示/隱藏轉帳資訊
  const transferSection = document.getElementById("transfer-info-section");
  if (method === "transfer") {
    transferSection.classList.remove("hidden");
    if (state.bankAccounts.length > 0 && !state.selectedBankAccountId) {
      selectBankAccount(state.bankAccounts[0].id); // 預設選擇第一個
    }
  } else {
    transferSection.classList.add("hidden");
  }

  if (!options.skipQuote) {
    scheduleQuoteRefresh({ silent: true });
  }
}

export function selectBankAccount(id) {
  const hasAccounts = Array.isArray(state.bankAccounts) &&
    state.bankAccounts.length > 0;
  if (!hasAccounts) {
    state.selectedBankAccountId = "";
    renderBankAccounts();
    return;
  }

  const selected = state.bankAccounts.find((b) => String(b.id) === String(id));
  state.selectedBankAccountId = selected
    ? selected.id
    : state.bankAccounts[0].id;
  renderBankAccounts(); // 重新渲染以更新 UI 狀態
}

function renderBankAccounts() {
  const container = document.getElementById("bank-accounts-list");
  if (!container) return;
  if (container.dataset?.vueManaged === "true") return;
  if (!Array.isArray(state.bankAccounts) || state.bankAccounts.length === 0) {
    state.selectedBankAccountId = "";
    container.replaceChildren();
    return;
  }

  // 如果目前選取帳號不存在（例如後台已刪除），自動回退到第一個可用帳號
  const selectedExists = state.bankAccounts.some((b) =>
    String(b.id) === String(state.selectedBankAccountId)
  );
  if (!selectedExists) {
    state.selectedBankAccountId = state.bankAccounts[0].id;
  }

  const fragment = document.createDocumentFragment();
  state.bankAccounts.forEach((b) => {
    const isSelected = state.selectedBankAccountId == b.id;
    const borderClass = isSelected
      ? "border-primary ring-2 ring-primary bg-orange-50"
      : "border-[#d1dce5] bg-white";

    const card = document.createElement("div");
    card.className =
      `p-3 rounded-lg mb-2 relative cursor-pointer font-sans transition-all border ${borderClass}`;
    card.dataset.bankCard = "true";
    card.dataset.bankId = String(b.id);

    const topRow = document.createElement("div");
    topRow.className = "flex items-center gap-3 mb-1";

    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "bank_account_selection";
    radio.value = String(b.id);
    radio.className = "w-4 h-4 text-primary";
    radio.checked = Boolean(isSelected);

    const bankLabel = document.createElement("div");
    bankLabel.className = "font-semibold text-gray-800";
    bankLabel.textContent =
      `${String(b.bankName || "")} (${String(b.bankCode || "")})`;

    topRow.append(radio, bankLabel);

    const accountRow = document.createElement("div");
    accountRow.className = "flex items-center gap-2 mt-1 pl-7";

    const accountNumber = document.createElement("span");
    accountNumber.className = "text-lg font-mono font-medium";
    accountNumber.style.color = "var(--primary)";
    accountNumber.textContent = String(b.accountNumber || "");

    const copyButton = document.createElement("button");
    copyButton.type = "button";
    copyButton.dataset.copyAccount = "true";
    copyButton.dataset.account = String(b.accountNumber || "");
    copyButton.className =
      "text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-1 rounded transition-colors";
    copyButton.title = "複製帳號";
    copyButton.textContent = "複製";

    accountRow.append(accountNumber, copyButton);
    card.append(topRow, accountRow);

    if (b.accountName) {
      const accountName = document.createElement("div");
      accountName.className = "text-sm text-gray-500 mt-1 pl-7";
      accountName.textContent = `戶名: ${String(b.accountName)}`;
      card.appendChild(accountName);
    }

    fragment.appendChild(card);
  });
  container.replaceChildren(fragment);

  container.querySelectorAll("[data-bank-card]").forEach((card) => {
    card.addEventListener("click", () => {
      selectBankAccount(card.dataset.bankId);
    });
  });

  container.querySelectorAll('input[name="bank_account_selection"]').forEach(
    (radio) => {
      radio.addEventListener("click", (event) => {
        event.stopPropagation();
        selectBankAccount(radio.value);
      });
    },
  );

  container.querySelectorAll("[data-copy-account]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      copyTransferAccount(button, button.dataset.account || "");
    });
  });
}

function copyTransferAccount(btn, account) {
  if (navigator.clipboard && globalThis.isSecureContext) {
    navigator.clipboard.writeText(account).then(() => {
      showCopySuccess(btn);
    }).catch((err) => {
      console.error("複製失敗:", err);
      fallbackCopyTextToClipboard(account, btn);
    });
  } else {
    fallbackCopyTextToClipboard(account, btn);
  }
}

function fallbackCopyTextToClipboard(text, btn) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  // 隱藏元素，不影響畫面排版
  textArea.style.top = "0";
  textArea.style.left = "0";
  textArea.style.position = "fixed";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    const successful = document.execCommand("copy");
    if (successful) showCopySuccess(btn);
  } catch (err) {
    console.error("Fallback 複製失敗:", err);
  }
  document.body.removeChild(textArea);
}

function showCopySuccess(btn) {
  const originalText = btn.textContent;
  btn.textContent = "已複製";
  btn.classList.add("bg-green-100", "text-green-700");
  setTimeout(() => {
    btn.textContent = originalText;
    btn.classList.remove("bg-green-100", "text-green-700");
  }, 2000);
}

// ============ LINE Pay 回調 ============
async function handleLinePayCallback(lpAction, params) {
  const transactionId = params.get("transactionId") || "";
  const orderId = params.get("orderId") || "";
  const callbackSig = params.get("sig") || "";

  if (lpAction === "confirm" && transactionId && orderId) {
    Swal.fire({
      title: "確認付款中...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });
    try {
      const res = await fetch(
        `${API_URL}?action=linePayConfirm&transactionId=${transactionId}&orderId=${orderId}`,
      );
      const result = await res.json();
      if (result.success) {
        Swal.fire({
          icon: "success",
          title: "付款成功！",
          text: `訂單編號：${orderId}`,
          confirmButtonColor: "#3C2415",
        });
      } else {
        Swal.fire("付款失敗", result.error || "請聯繫店家", "error");
      }
    } catch (e) {
      Swal.fire("錯誤", "付款確認失敗: " + e.message, "error");
    }
  } else if (lpAction === "cancel") {
    if (orderId) {
      const cancelUrl = `${API_URL}?action=linePayCancel&orderId=${
        encodeURIComponent(orderId)
      }${
        callbackSig ? `&sig=${encodeURIComponent(callbackSig)}` : ""
      }`;
      try {
        const response = callbackSig
          ? await fetch(cancelUrl)
          : await authFetch(cancelUrl);
        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          const message = String(result.error || "").trim();
          if (message) console.warn("[linepay-cancel] ", message);
        }
      } catch (error) {
        console.warn("[linepay-cancel] failed to notify backend:", error);
      }
    }
    Swal.fire({
      icon: "info",
      title: "付款已取消",
      text: "您已取消 LINE Pay 付款",
      confirmButtonColor: "#3C2415",
    });
  }
}

async function handleJkoPayReturn(orderId) {
  if (!orderId) return;
  Swal.fire({
    title: "確認付款狀態中...",
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });

  try {
    const response = await authFetch(
      `${API_URL}?action=jkoPayInquiry&orderId=${encodeURIComponent(orderId)}`,
    );
    const result = await response.json();
    if (result.success) {
      const dialogOptions = buildPaymentStatusDialogOptions({
        orderId,
        paymentMethod: "jkopay",
        paymentStatus: result.paymentStatus,
        paymentExpiresAt: result.paymentExpiresAt,
        paymentConfirmedAt: result.paymentConfirmedAt,
        paymentLastCheckedAt: result.paymentLastCheckedAt,
        paymentUrl: result.paymentUrl,
      });
      const dialogResult = await Swal.fire(dialogOptions);
      if (dialogResult.isConfirmed && dialogOptions.paymentLaunchUrl) {
        location.href = dialogOptions.paymentLaunchUrl;
      }
      return;
    }
    Swal.fire(
      buildPaymentStatusDialogOptions({
        orderId,
        paymentMethod: "jkopay",
        paymentStatus: "processing",
        paymentLastCheckedAt: new Date().toISOString(),
      }),
    );
  } catch (_error) {
    Swal.fire(
      buildPaymentStatusDialogOptions({
        orderId,
        paymentMethod: "jkopay",
        paymentStatus: "processing",
        paymentLastCheckedAt: new Date().toISOString(),
      }),
    );
  }
}
