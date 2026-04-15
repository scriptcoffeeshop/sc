// ============================================
// main-app.js — 訂購頁初始化入口
// ============================================

import { API_URL, LINE_REDIRECT } from "./config.js";
import { escapeHtml, isValidEmail, Toast } from "./utils.js";
import { loginWithLine } from "./auth.js";
import { state } from "./state.js";
import {
  addToCart,
  cart,
  loadCart,
  removeCartItem,
  toggleCart,
  updateCartItemQty,
  updateCartItemQtyByKeys,
  updateCartUI,
} from "./cart.js";
import { renderProducts } from "./products.js";
import {
  checkStoreToken,
  clearSelectedStore,
  loadDeliveryPrefs,
  openStoreMap,
  openStoreSearchModal,
  selectDelivery,
  selectStoreFromList,
  updateDistricts,
} from "./delivery.js";
import {
  applySavedOrderFormPrefs,
  initReceiptRequestUi,
  showMyOrders,
  submitOrder,
} from "./orders.js";
import { applyBranding, renderDynamicFields } from "./form-renderer.js";
import { authFetch } from "./auth.js";
import {
  getDeliveryIconFallbackKey,
  getPaymentIconFallbackKey,
  setIconElement,
} from "./icons.js";
// ============ 事件代理 (Event Delegation) ============
// 透過 data-action 屬性在 document.body 統一監聯 click 事件，
// 取代原本散落在 HTML 各處的內嵌事件掛載方式。
const actionHandlers = {
  "add-to-cart": (el) => addToCart(+el.dataset.pid, el.dataset.spec),
  "cart-qty-change": (el) =>
    updateCartItemQtyByKeys(
      +el.dataset.pid,
      el.dataset.spec,
      +el.dataset.delta,
    ),
  "cart-item-qty": (el) =>
    updateCartItemQty(+el.dataset.idx, +el.dataset.delta),
  "remove-cart-item": (el) => removeCartItem(+el.dataset.idx),
  "toggle-cart": () => toggleCart(),
  "select-delivery": (el) => selectDelivery(el.dataset.method),
  "select-payment": (el) => selectPayment(el.dataset.method),
  "open-store-map": () => openStoreMap(),
  "clear-selected-store": () => clearSelectedStore(),
  "select-store": (el) => {
    selectStoreFromList(el);
    Swal.close();
  },
  "submit-order": () => {
    toggleCart();
    submitOrder();
  },
  "show-my-orders": () => showMyOrders(),
  "show-profile": () => showProfileModal(),
  "login-with-line": () =>
    loginWithLine(LINE_REDIRECT.main, "coffee_line_state"),
  "logout": () => window.logout(),
  "close-announcement": () =>
    document.getElementById("announcement-banner").classList.add("hidden"),
  "close-orders-modal": () =>
    document.getElementById("my-orders-modal").classList.add("hidden"),
  "reload-page": () => window.location.reload(),
  "select-bank-account": (el) => selectBankAccount(el.dataset.bankId),
  "copy-transfer-account": (el, event) => {
    event.stopPropagation();
    copyTransferAccount(el, el.dataset.account || "");
  },
  "copy-tracking-number": (el) => {
    const trackingNumber = String(el.dataset.trackingNumber || "").trim();
    if (!trackingNumber) return;
    navigator.clipboard.writeText(trackingNumber)
      .then(() => Toast.fire({ icon: "success", title: "單號已複製" }))
      .catch(() => Swal.fire("錯誤", "複製失敗，請手動複製", "error"));
  },
};

function initEventDelegation() {
  document.body.addEventListener("click", (e) => {
    const target = e.target.closest("[data-action]");
    if (!target) return;
    const action = target.dataset.action;
    const handler = actionHandlers[action];
    if (handler) {
      e.preventDefault();
      handler(target, e);
    }
  });

  const deliveryCity = document.getElementById("delivery-city");
  if (deliveryCity) {
    deliveryCity.addEventListener("change", updateDistricts);
  }
}

// ============ 保留必要的 window 掛載 ============
// 以下函式保留掛載，避免舊快取版本或外部調用造成功能中斷。
window.selectPayment = selectPayment;
window.copyTransferAccount = copyTransferAccount;
window.selectBankAccount = selectBankAccount;
window.updateCartUI = updateCartUI;
window.updateFormState = updateFormState;
window.rerenderFormFields = function () {
  renderDynamicFields(
    state.formFields,
    document.getElementById("dynamic-fields-container"),
    state.selectedDelivery,
  );
  // 回填使用者資料（包含所有動態表單欄位）
  prefillUserFields();
};
window.updateDistricts = updateDistricts;

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
  initEventDelegation(); // 啟動事件代理
  initReceiptRequestUi();
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get("code");
  const stateParam = urlParams.get("state");

  // LINE Pay 回調處理
  const lpAction = urlParams.get("lpAction");
  if (lpAction) {
    window.history.replaceState({}, "", "main.html");
    await handleLinePayCallback(lpAction, urlParams);
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
    window.history.replaceState({}, "", "main.html");
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
    window.history.replaceState({}, "", "main.html");
    return;
  }
  Swal.fire({
    title: "登入中...",
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });
  try {
    const res = await fetch(
      `${API_URL}?action=customerLineLogin&code=${
        encodeURIComponent(code)
      }&redirectUri=${encodeURIComponent(LINE_REDIRECT.main)}`,
    );
    const result = await res.json();
    window.history.replaceState({}, "", "main.html");
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
async function showProfileModal() {
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

window.logout = function () {
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
};

let quoteRefreshTimer = null;
let latestQuoteRequestId = 0;

function getQuoteRequestItems() {
  return cart.map((c) => ({
    productId: Number(c.productId),
    specKey: String(c.specKey || ""),
    qty: Math.max(1, Number(c.qty) || 1),
  }));
}

window.scheduleQuoteRefresh = function (options = {}) {
  if (quoteRefreshTimer) clearTimeout(quoteRefreshTimer);
  quoteRefreshTimer = setTimeout(() => {
    window.refreshQuote(options);
  }, 120);
};

window.refreshQuote = async function (options = {}) {
  const silent = options.silent !== false;
  const items = getQuoteRequestItems();

  if (!items.length) {
    state.orderQuote = null;
    state.quoteError = "";
    if (typeof window.updatePaymentOptionsState === "function") {
      window.updatePaymentOptionsState(window.currentDeliveryConfig || []);
    }
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
      if (typeof window.updatePaymentOptionsState === "function") {
        window.updatePaymentOptionsState(window.currentDeliveryConfig || []);
      }
      updateCartUI();
      return result;
    }

    state.orderQuote = result.quote;
    state.quoteError = "";
    if (typeof window.updatePaymentOptionsState === "function") {
      window.updatePaymentOptionsState(window.currentDeliveryConfig || []);
    }
    updateCartUI();
    return result;
  } catch (e) {
    if (requestId !== latestQuoteRequestId) {
      return { success: false, error: String(e) };
    }
    state.orderQuote = null;
    state.quoteError = e.message || "計價請求失敗";
    if (!silent) Swal.fire("錯誤", state.quoteError, "error");
    if (typeof window.updatePaymentOptionsState === "function") {
      window.updatePaymentOptionsState(window.currentDeliveryConfig || []);
    }
    updateCartUI();
    return { success: false, error: state.quoteError };
  }
};
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
      renderProducts();
      renderBankAccounts();

      // 登入後再回填一次（因為渲染完才有欄位）
      if (state.currentUser) {
        prefillUserFields();
        applySavedOrderFormPrefs();
      }
    } else throw new Error(result.error);
  } catch (e) {
    document.getElementById("products-container").innerHTML =
      `<p class="p-8 text-center text-red-600">載入資料失敗: ${e.message}<br><button type="button" data-action="reload-page" class="mt-3 btn-primary">重試</button></p>`;
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
  window.appSettings = s;

  // 套用金流自訂名稱與說明
  const paymentOptionsStr = s.payment_options_config || "";
  let paymentOptions = {};
  if (paymentOptionsStr) {
    try {
      paymentOptions = JSON.parse(paymentOptionsStr);
    } catch (e) {}
  }

  ["cod", "linepay", "transfer"].forEach((method) => {
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

  // 取出最新的物流選項
  const deliveryConfigStr = window.appSettings.delivery_options_config || "";
  let deliveryConfig = [];
  if (deliveryConfigStr) {
    try {
      deliveryConfig = JSON.parse(deliveryConfigStr);
    } catch (e) {}
  }

  // 如果尚未轉移格式，進行臨時轉換以保證前台正常運作
  if (!deliveryConfig.length) {
    const rStr = s.payment_routing_config || "";
    let rConfig = {};
    if (rStr) {
      try {
        rConfig = JSON.parse(rStr);
      } catch (e) {}
    } else {
      const le = String(s.linepay_enabled) === "true";
      const te = String(s.transfer_enabled) === "true";
      rConfig = {
        in_store: { cod: true, linepay: le, transfer: te },
        delivery: { cod: true, linepay: le, transfer: te },
        home_delivery: { cod: true, linepay: le, transfer: te },
        seven_eleven: { cod: true, linepay: false, transfer: false },
        family_mart: { cod: true, linepay: false, transfer: false },
      };
    }
    deliveryConfig = [
      {
        id: "in_store",
        icon: "",
        icon_url: "",
        name: "來店自取",
        description: "到店自取",
        enabled: true,
        payment: rConfig["in_store"] ||
          { cod: true, linepay: false, transfer: false },
      },
      {
        id: "delivery",
        icon: "",
        icon_url: "",
        name: "配送到府 (限新竹)",
        description: "專人外送",
        enabled: true,
        payment: rConfig["delivery"] ||
          { cod: true, linepay: false, transfer: false },
      },
      {
        id: "home_delivery",
        icon: "",
        icon_url: "",
        name: "全台宅配",
        description: "宅配到府",
        enabled: true,
        payment: rConfig["home_delivery"] ||
          { cod: true, linepay: false, transfer: false },
      },
      {
        id: "seven_eleven",
        icon: "",
        icon_url: "",
        name: "7-11 取件",
        description: "超商門市",
        enabled: true,
        payment: rConfig["seven_eleven"] ||
          { cod: true, linepay: false, transfer: false },
      },
      {
        id: "family_mart",
        icon: "",
        icon_url: "",
        name: "全家取件",
        description: "超商門市",
        enabled: true,
        payment: rConfig["family_mart"] ||
          { cod: true, linepay: false, transfer: false },
      },
    ];
  }
  window.currentDeliveryConfig = deliveryConfig;
  window.currentDeliveryConfig = window.currentDeliveryConfig.map((item) => ({
    ...item,
    icon_url: item.icon_url || item.iconUrl || "",
    iconFallbackKey: getDeliveryIconFallbackKey(item.id),
  }));

  // 渲染物流選項 (在 delivery.js 中定義)
  if (typeof window.renderDeliveryOptions === "function") {
    window.renderDeliveryOptions(window.currentDeliveryConfig);
  }

  if (typeof window.updatePaymentOptionsState === "function") {
    window.updatePaymentOptionsState(window.currentDeliveryConfig);
  }
}

window.updatePaymentOptionsState = function (deliveryConfig) {
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
    if (typeof window.selectDelivery === "function") {
      window.selectDelivery(state.selectedDelivery, null, { skipQuote: true });
    }
  }

  const fallbackConfigOpt = activeDeliveryOptions.find((d) =>
    d.id === state.selectedDelivery
  );
  const fallbackConfig = fallbackConfigOpt?.payment ||
    { cod: true, linepay: false, transfer: false };
  const quote = state.orderQuote;
  const canUseQuote = quote &&
    quote.availablePaymentMethods &&
    (!state.selectedDelivery ||
      quote.deliveryMethod === state.selectedDelivery);
  const currentConfig = canUseQuote
    ? {
      cod: !!quote.availablePaymentMethods.cod,
      linepay: !!quote.availablePaymentMethods.linepay,
      transfer: !!quote.availablePaymentMethods.transfer,
    }
    : {
      cod: !!fallbackConfig.cod,
      linepay: !!fallbackConfig.linepay,
      transfer: !!fallbackConfig.transfer,
    };

  const codOpt = document.getElementById("cod-option");
  const lpOpt = document.getElementById("linepay-option");
  const trOpt = document.getElementById("transfer-option");

  // 處理 DOM 更新
  if (codOpt) codOpt.classList.toggle("hidden", !currentConfig.cod);
  if (lpOpt) lpOpt.classList.toggle("hidden", !currentConfig.linepay);
  if (trOpt) trOpt.classList.toggle("hidden", !currentConfig.transfer);

  // 如果目前選擇的選向不被該物流允許，則重置為第一個可用的選向
  if (state.selectedPayment && !currentConfig[state.selectedPayment]) {
    if (currentConfig.cod) selectPayment("cod", { skipQuote: true });
    else if (currentConfig.linepay) {
      selectPayment("linepay", { skipQuote: true });
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
    } else if (currentConfig.transfer) {
      selectPayment("transfer", { skipQuote: true });
    }
  }
};

window.selectPayment = selectPayment;

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
function selectPayment(method, options = {}) {
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

  if (!options.skipQuote && typeof window.scheduleQuoteRefresh === "function") {
    window.scheduleQuoteRefresh({ silent: true });
  }
}

function selectBankAccount(id) {
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
  if (!Array.isArray(state.bankAccounts) || state.bankAccounts.length === 0) {
    state.selectedBankAccountId = "";
    container.innerHTML = "";
    return;
  }

  // 如果目前選取帳號不存在（例如後台已刪除），自動回退到第一個可用帳號
  const selectedExists = state.bankAccounts.some((b) =>
    String(b.id) === String(state.selectedBankAccountId)
  );
  if (!selectedExists) {
    state.selectedBankAccountId = state.bankAccounts[0].id;
  }

  container.innerHTML = state.bankAccounts.map((b) => {
    const isSelected = state.selectedBankAccountId == b.id;
    const borderClass = isSelected
      ? "border-primary ring-2 ring-primary bg-orange-50"
      : "border-[#d1dce5] bg-white";
    return `
        <div class="p-3 rounded-lg mb-2 relative cursor-pointer font-sans transition-all border ${borderClass}" data-action="select-bank-account" data-bank-id="${b.id}">
            <div class="flex items-center gap-3 mb-1">
                <input type="radio" name="bank_account_selection" value="${b.id}" class="w-4 h-4 text-primary" ${
      isSelected ? "checked" : ""
    }>
                <div class="font-semibold text-gray-800">${
      escapeHtml(b.bankName)
    } (${escapeHtml(b.bankCode)})</div>
            </div>
            <div class="flex items-center gap-2 mt-1 pl-7">
                <span class="text-lg font-mono font-medium" style="color:var(--primary)">${
      escapeHtml(b.accountNumber)
    }</span>
                <button type="button" data-action="copy-transfer-account" data-account="${
      escapeHtml(b.accountNumber)
    }" class="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-1 rounded transition-colors" title="複製帳號">
                    複製
                </button>
            </div>
            ${
      b.accountName
        ? `<div class="text-sm text-gray-500 mt-1 pl-7">戶名: ${
          escapeHtml(b.accountName)
        }</div>`
        : ""
    }
        </div>
        `;
  }).join("");
}

function copyTransferAccount(btn, account) {
  if (navigator.clipboard && window.isSecureContext) {
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
  const originalText = btn.innerHTML;
  btn.innerHTML = "已複製";
  btn.classList.add("bg-green-100", "text-green-700");
  setTimeout(() => {
    btn.innerHTML = originalText;
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
