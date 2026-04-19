// ============================================
// dashboard-app.js — 後台頁初始化入口
// ============================================

import { API_URL, LINE_REDIRECT } from "./config.js";
import { esc, Toast } from "./utils.js";
import { authFetch, loginWithLine } from "./auth.js";
import {
  getDefaultIconUrl,
  getDeliveryIconFallbackKey,
  getPaymentIconFallbackKey,
  normalizeIconPath,
  resolveAssetUrl,
} from "./icons.js";
import {
  createOrdersActionHandlers,
  createOrdersTabLoaders,
} from "./dashboard/modules/orders.js";
import {
  formatOrderDateTimeText,
  orderMethodLabel,
  orderPayMethodLabel,
  orderPayStatusLabel,
  orderStatusLabel,
  orderStatusOptions,
  normalizeReceiptInfo,
  normalizeTrackingUrl,
} from "./dashboard/modules/order-shared.js";
import { createOrdersController } from "./dashboard/modules/orders-controller.js";
import { createOrderStatusController } from "./dashboard/modules/order-status-controller.js";
import {
  createProductsActionHandlers,
  createProductsTabLoaders,
} from "./dashboard/modules/products.js";
import { createProductsController } from "./dashboard/modules/products-controller.js";
import { createOrderNotificationsController } from "./dashboard/modules/order-notifications-controller.js";
import { createPromotionsController } from "./dashboard/modules/promotions.js";
import { createFormFieldsController } from "./dashboard/modules/form-fields.js";
import { createSettingsController } from "./dashboard/modules/settings-controller.js";
import { createUsersController } from "./dashboard/modules/users-controller.js";
import { createIconAssetsController } from "./dashboard/modules/icon-assets-controller.js";
import { createCategoriesController } from "./dashboard/modules/categories-controller.js";
import {
  createSettingsActionHandlers,
  createSettingsTabLoaders,
} from "./dashboard/modules/settings.js";
import {
  DEFAULT_DELIVERY_OPTIONS,
  normalizeDeliveryOption,
  normalizePaymentOption,
  sectionIconSettingKey,
} from "./dashboard/modules/settings-shared.js";
import { createBankAccountsController } from "./dashboard/modules/bank-accounts.js";
import {
  createUsersActionHandlers,
  createUsersTabLoaders,
} from "./dashboard/modules/users.js";
import { createDashboardEvents } from "./dashboard/events.js";

// ============ 共享狀態 ============
let currentUser = null;
let products = [];
let categories = [];
let orders = [];
let selectedOrderIds = new Set();
let dashboardSettings = {};
const LINEPAY_SANDBOX_CACHE_KEY = "coffee_linepay_sandbox";
const DASHBOARD_PUBLIC_BRANDING_CACHE_KEY = "coffee_dashboard_public_branding";

function getAuthUserId() {
  if (!currentUser?.userId) throw new Error("請先登入");
  return currentUser.userId;
}

const bankAccountsController = createBankAccountsController({
  API_URL,
  authFetch,
  getAuthUserId,
  Toast,
  Swal: globalThis.Swal,
  esc,
  Sortable: globalThis.Sortable,
});
const promotionsController = createPromotionsController({
  API_URL,
  authFetch,
  getAuthUserId,
  Toast,
  Swal: globalThis.Swal,
  esc,
  Sortable: globalThis.Sortable,
  getProducts: () => products,
  requestAnimationFrame: globalThis.requestAnimationFrame?.bind(globalThis),
});
const formFieldsController = createFormFieldsController({
  API_URL,
  authFetch,
  getAuthUserId,
  Toast,
  Swal: globalThis.Swal,
  esc,
  Sortable: globalThis.Sortable,
  getDashboardSettings: () => dashboardSettings,
  requestAnimationFrame: globalThis.requestAnimationFrame?.bind(globalThis),
});
const iconAssetsController = createIconAssetsController({
  API_URL,
  authFetch,
  getAuthUserId,
  Toast,
  Swal: globalThis.Swal,
  normalizeIconPath,
  resolveAssetUrl,
  getDefaultIconUrl,
  getPaymentIconFallbackKey,
  sectionIconSettingKey,
});
const settingsController = createSettingsController({
  API_URL,
  authFetch,
  getAuthUserId,
  Toast,
  Swal: globalThis.Swal,
  Sortable: globalThis.Sortable,
  applyDashboardBranding,
  parseBooleanSetting,
  getDefaultIconUrl,
  getDeliveryIconFallbackKey,
  getPaymentIconFallbackKey,
  resolveAssetUrl,
  normalizeDeliveryOption,
  normalizePaymentOption,
  normalizeIconPath,
  sectionIconSettingKey,
  updateIconPreview: iconAssetsController.updateIconPreview,
  updateDeliveryRoutingPaymentHeaderIcon:
    iconAssetsController.updateDeliveryRoutingPaymentHeaderIcon,
  setPreviewImageSource: iconAssetsController.setPreviewImageSource,
  readInputValue,
  defaultDeliveryOptions: DEFAULT_DELIVERY_OPTIONS,
  linePaySandboxCacheKey: LINEPAY_SANDBOX_CACHE_KEY,
  loadBankAccountsAdmin: bankAccountsController.loadBankAccountsAdmin,
  setDashboardSettings: (settings) => {
    dashboardSettings = settings;
  },
  esc,
});
const usersController = createUsersController({
  API_URL,
  authFetch,
  getAuthUserId,
  getCurrentUser: () => currentUser,
  Toast,
  Swal: globalThis.Swal,
  esc,
});
const orderNotificationsController = createOrderNotificationsController({
  API_URL,
  authFetch,
  getAuthUserId,
  getOrders: () => orders,
  Toast,
  Swal: globalThis.Swal,
  esc,
  orderStatusLabel,
  orderMethodLabel,
  orderPayMethodLabel,
  orderPayStatusLabel,
  normalizeReceiptInfo,
  normalizeTrackingUrl,
});
const ordersController = createOrdersController({
  API_URL,
  authFetch,
  getAuthUserId,
  getOrders: () => orders,
  setOrders: (nextOrders) => {
    orders = Array.isArray(nextOrders) ? nextOrders : [];
  },
  getSelectedOrderIdsState: () => selectedOrderIds,
  setSelectedOrderIdsState: (nextSelectedOrderIds) => {
    selectedOrderIds = nextSelectedOrderIds instanceof Set
      ? nextSelectedOrderIds
      : new Set(nextSelectedOrderIds || []);
  },
  Toast,
  Swal: globalThis.Swal,
  esc,
  orderStatusLabel,
  orderMethodLabel,
  orderPayMethodLabel,
  orderPayStatusLabel,
  orderStatusOptions,
  normalizeReceiptInfo,
  formatOrderDateTimeText,
  normalizeTrackingUrl,
});
const orderStatusController = createOrderStatusController({
  API_URL,
  authFetch,
  getAuthUserId,
  getOrders: () => orders,
  loadOrders: ordersController.loadOrders,
  previewOrderStatusNotification:
    orderNotificationsController.previewOrderStatusNotification,
  Toast,
  Swal: globalThis.Swal,
  esc,
  orderStatusLabel,
});
const productsController = createProductsController({
  API_URL,
  authFetch,
  getAuthUserId,
  getProducts: () => products,
  setProducts: (nextProducts) => {
    products = Array.isArray(nextProducts) ? nextProducts : [];
  },
  getCategories: () => categories,
  ensureCategoriesLoaded: () => categoriesController.loadCategories(),
  Toast,
  Swal: globalThis.Swal,
  esc,
  Sortable: globalThis.Sortable,
  requestAnimationFrame: globalThis.requestAnimationFrame?.bind(globalThis),
});
const categoriesController = createCategoriesController({
  API_URL,
  authFetch,
  getAuthUserId,
  getCategories: () => categories,
  setCategories: (nextCategories) => {
    categories = Array.isArray(nextCategories) ? nextCategories : [];
  },
  loadProducts: productsController.loadProducts,
  Toast,
  Swal: globalThis.Swal,
  Sortable: globalThis.Sortable,
  requestAnimationFrame: globalThis.requestAnimationFrame?.bind(globalThis),
  esc,
});

function parseBooleanSetting(value, defaultValue = true) {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }
  const normalized = String(value).trim().toLowerCase();
  return !["false", "0", "off", "no"].includes(normalized);
}

function cacheDashboardPublicBranding(settings = {}, resolvedLogoUrl = "") {
  if (typeof window === "undefined" || !window.localStorage) return;

  try {
    const payload = {
      site_title: String(settings.site_title || "").trim(),
      resolved_logo_url: String(resolvedLogoUrl || "").trim(),
    };
    window.localStorage.setItem(
      DASHBOARD_PUBLIC_BRANDING_CACHE_KEY,
      JSON.stringify(payload),
    );
  } catch {
  }
}

function applyDashboardBranding(settings = {}) {
  const siteIconUrl = String(settings.site_icon_url || "").trim();
  const resolvedLogoUrl = siteIconUrl
    ? resolveAssetUrl(siteIconUrl)
    : getDefaultIconUrl("brand");
  const logoIds = [
    "dashboard-login-logo",
    "dashboard-header-logo",
    "settings-brand-logo",
  ];
  logoIds.forEach((id) => {
    const logoEl = document.getElementById(id);
    if (!(logoEl instanceof HTMLImageElement) || !resolvedLogoUrl) return;
    logoEl.src = resolvedLogoUrl;
  });

  const faviconEl = document.getElementById("dynamic-favicon");
  if (faviconEl instanceof HTMLLinkElement && resolvedLogoUrl) {
    faviconEl.href = resolvedLogoUrl;
  }

  const siteTitle = String(settings.site_title || "").trim();
  document.title = siteTitle
    ? `管理後台 | ${siteTitle}`
    : "管理後台 | Script Coffee";

  const loginTitleEl = document.querySelector("#login-page h1");
  if (loginTitleEl instanceof HTMLElement) {
    loginTitleEl.textContent = "後台登入";
    loginTitleEl.classList.remove("ui-text-highlight");
    loginTitleEl.classList.add("text-slate-800");
  }

  const loginSubtitleEl = document.querySelector("#login-page p");
  if (loginSubtitleEl instanceof HTMLElement) {
    loginSubtitleEl.classList.remove("ui-text-subtle");
    loginSubtitleEl.classList.add("text-slate-600");
  }

  cacheDashboardPublicBranding(settings, resolvedLogoUrl);
}

async function loadPublicDashboardBranding() {
  try {
    const response = await fetch(`${API_URL}?action=getSettings&_=${Date.now()}`);
    if (!response.ok) return;
    const result = await response.json();
    if (!result?.success || !result?.settings) return;
    applyDashboardBranding(result.settings);
  } catch {
    // ignore branding prefetch failures on login page
  }
}

function readInputValue(id, fallback = "") {
  const el = document.getElementById(id);
  if (el && typeof el.value !== "undefined") {
    return String(el.value || "").trim();
  }
  return fallback;
}

// ============ 全域函式掛載（保留舊快取相容性） ============
window.loginWithLine = () =>
  loginWithLine(LINE_REDIRECT.dashboard, "coffee_admin_state");
window.logout = logout;
window.showTab = showTab;
window.loadOrders = ordersController.loadOrders;
window.renderOrders = ordersController.renderOrders;
window.changeOrderStatus = orderStatusController.changeOrderStatus;
window.sendOrderEmailByOrderId = orderNotificationsController.sendOrderEmailByOrderId;
window.deleteOrderById = ordersController.deleteOrderById;
window.showProductModal = productsController.showProductModal;
window.editProduct = productsController.editProduct;
window.closeProductModal = productsController.closeProductModal;
window.saveProduct = productsController.saveProduct;
window.delProduct = productsController.delProduct;
window.moveProduct = productsController.moveProduct;
window.addSpecRow = productsController.addSpecRow;
window.addCategory = categoriesController.addCategory;
window.editCategory = categoriesController.editCategory;
window.delCategory = categoriesController.delCategory;
window.updateCategoryOrders = categoriesController.updateCategoryOrders;
window.saveSettings = settingsController.saveSettings;
window.loadUsers = usersController.loadUsers;
window.toggleUserRole = usersController.toggleUserRole;
window.toggleUserBlacklist = usersController.toggleUserBlacklist;
window.loadBlacklist = usersController.loadBlacklist;
window.esc = esc;
window.showAddFieldModal = formFieldsController.showAddFieldModal;
window.editFormField = formFieldsController.editFormField;
window.deleteFormField = formFieldsController.deleteFormField;
window.toggleFieldEnabled = formFieldsController.toggleFieldEnabled;
window.previewIcon = iconAssetsController.previewIcon;

window.uploadSiteIcon = iconAssetsController.uploadSiteIcon;
window.resetSiteIcon = iconAssetsController.resetSiteIcon;
window.uploadSectionIcon = iconAssetsController.uploadSectionIcon;
window.uploadPaymentIcon = iconAssetsController.uploadPaymentIcon;
window.uploadDeliveryRowIcon = iconAssetsController.uploadDeliveryRowIcon;
window.applyIconFromLibrary = iconAssetsController.applyIconFromLibrary;
window.resetSectionTitle = settingsController.resetSectionTitle;
window.refundOnlinePayOrder = orderStatusController.refundOnlinePayOrder;
window.linePayRefundOrder = (orderId) =>
  orderStatusController.refundOnlinePayOrder(orderId, "linepay");
window.confirmTransferPayment = orderStatusController.confirmTransferPayment;
window.showAddBankAccountModal = bankAccountsController.showAddBankAccountModal;
window.editBankAccount = bankAccountsController.editBankAccount;
window.deleteBankAccount = bankAccountsController.deleteBankAccount;
window.showPromotionModal = promotionsController.showPromotionModal;
window.closePromotionModal = promotionsController.closePromotionModal;
window.savePromotion = promotionsController.savePromotion;
window.editPromotion = promotionsController.editPromotion;
window.delPromotion = promotionsController.delPromotion;

const dashboardActionHandlers = {
  "login-with-line": () => window.loginWithLine(),
  "logout": () => logout(),
  ...createOrdersActionHandlers({
    loadOrders: ordersController.loadOrders,
    changeOrderStatus: orderStatusController.changeOrderStatus,
    sendOrderFlexByOrderId: orderNotificationsController.sendOrderFlexByOrderId,
    sendOrderEmailByOrderId: orderNotificationsController.sendOrderEmailByOrderId,
    deleteOrderById: ordersController.deleteOrderById,
    refundOnlinePayOrder: orderStatusController.refundOnlinePayOrder,
    confirmTransferPayment: orderStatusController.confirmTransferPayment,
    toggleOrderSelection: ordersController.toggleOrderSelection,
    toggleSelectAllOrders: ordersController.toggleSelectAllOrders,
    batchUpdateOrders: ordersController.batchUpdateOrders,
    batchDeleteOrders: ordersController.batchDeleteOrders,
    exportFilteredOrdersCsv: ordersController.exportFilteredOrdersCsv,
    exportSelectedOrdersCsv: ordersController.exportSelectedOrdersCsv,
    showFlexHistory: orderNotificationsController.showFlexHistory,
    Toast,
  }),
  ...createProductsActionHandlers({
    showProductModal: productsController.showProductModal,
    addCategory: categoriesController.addCategory,
    showPromotionModal: promotionsController.showPromotionModal,
    editProduct: productsController.editProduct,
    delProduct: productsController.delProduct,
    toggleProductEnabled: productsController.toggleProductEnabled,
    editCategory: categoriesController.editCategory,
    delCategory: categoriesController.delCategory,
    editPromotion: promotionsController.editPromotion,
    delPromotion: promotionsController.delPromotion,
    togglePromotionEnabled: promotionsController.togglePromotionEnabled,
    addSpecRow: productsController.addSpecRow,
    closeProductModal: productsController.closeProductModal,
    closePromotionModal: promotionsController.closePromotionModal,
    renderCategories: categoriesController.renderCategories,
    loadPromotions: promotionsController.loadPromotions,
  }),
  ...createSettingsActionHandlers({
    uploadSiteIcon: iconAssetsController.uploadSiteIcon,
    resetSiteIcon: iconAssetsController.resetSiteIcon,
    uploadSectionIcon: iconAssetsController.uploadSectionIcon,
    uploadPaymentIcon: iconAssetsController.uploadPaymentIcon,
    uploadDeliveryRowIcon: iconAssetsController.uploadDeliveryRowIcon,
    applyIconFromLibrary: iconAssetsController.applyIconFromLibrary,
    resetSectionTitle: settingsController.resetSectionTitle,
    addDeliveryOptionAdmin: settingsController.addDeliveryOptionAdmin,
    showAddBankAccountModal: bankAccountsController.showAddBankAccountModal,
    saveSettings: settingsController.saveSettings,
    showAddFieldModal: formFieldsController.showAddFieldModal,
    toggleFieldEnabled: formFieldsController.toggleFieldEnabled,
    editFormField: formFieldsController.editFormField,
    deleteFormField: formFieldsController.deleteFormField,
    editBankAccount: bankAccountsController.editBankAccount,
    deleteBankAccount: bankAccountsController.deleteBankAccount,
    loadSettings: settingsController.loadSettings,
    loadFormFields: formFieldsController.loadFormFields,
  }),
  ...createUsersActionHandlers({
    loadUsers: usersController.loadUsers,
    toggleUserBlacklist: usersController.toggleUserBlacklist,
    toggleUserRole: usersController.toggleUserRole,
    loadBlacklist: usersController.loadBlacklist,
  }),
};

const dashboardTabLoaders = {
  ...createOrdersTabLoaders({ loadOrders: ordersController.loadOrders }),
  ...createProductsTabLoaders({
    renderCategories: categoriesController.renderCategories,
    loadPromotions: promotionsController.loadPromotions,
  }),
  ...createSettingsTabLoaders({
    loadSettings: settingsController.loadSettings,
    loadFormFields: formFieldsController.loadFormFields,
  }),
  ...createUsersTabLoaders({
    loadUsers: usersController.loadUsers,
    loadBlacklist: usersController.loadBlacklist,
  }),
};

// ============ 初始化 ============
let dashboardInitialized = false;

function canInitDashboard() {
  return Boolean(
    document.getElementById("login-page") &&
      document.getElementById("admin-page"),
  );
}

export function initDashboardApp() {
  if (dashboardInitialized || !canInitDashboard()) return;
  dashboardInitialized = true;
  const { initializeDashboardEventDelegation } = createDashboardEvents(
    dashboardActionHandlers,
    dashboardTabLoaders,
    showTab,
    window.loadUsers,
    window.previewIcon,
    productsController.saveProduct,
    window.savePromotion,
    orderStatusController.changeOrderStatus,
    ordersController.renderOrders,
  );
  initializeDashboardEventDelegation();
  loadPublicDashboardBranding();
  const p = new URLSearchParams(window.location.search);
  if (p.get("code")) handleLineCallback(p.get("code"), p.get("state"));
  else checkLogin();
}

// 由 Vue Page 元件在 onMounted 時顯式呼叫 initDashboardApp()
// 同時保留 legacy HTML 直載入時的自動初始化 fallback。
function autoInitDashboardAppFallback() {
  try {
    initDashboardApp();
  } catch (error) {
    console.error("initDashboardApp fallback failed:", error);
  }
}

if (typeof window !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoInitDashboardAppFallback, {
      once: true,
    });
  } else {
    autoInitDashboardAppFallback();
  }
}

// ============ LINE Login ============
async function handleLineCallback(code, state) {
  const saved = localStorage.getItem("coffee_admin_state");
  localStorage.removeItem("coffee_admin_state");
  if (!saved || state !== saved) {
    Swal.fire("驗證失敗", "請重新登入", "error");
    window.history.replaceState({}, "", "dashboard.html");
    return;
  }
  Swal.fire({
    title: "登入中...",
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });
  try {
    const r = await authFetch(
      `${API_URL}?action=lineLogin&code=${
        encodeURIComponent(code)
      }&redirectUri=${encodeURIComponent(LINE_REDIRECT.dashboard)}`,
    );
    const d = await r.json();
    window.history.replaceState({}, "", "dashboard.html");
    if (d.success && d.isAdmin) {
      currentUser = d.user;
      localStorage.setItem("coffee_admin", JSON.stringify(currentUser));
      if (d.token) localStorage.setItem("coffee_jwt", d.token);
      Swal.close();
      showAdmin();
    } else Swal.fire("錯誤", d.error || "無管理員權限", "error");
  } catch (e) {
    Swal.fire("錯誤", e.message, "error");
  }
}

function checkLogin() {
  const s = localStorage.getItem("coffee_admin");
  const t = localStorage.getItem("coffee_jwt");
  if (s && t) {
    try {
      currentUser = JSON.parse(s);
      showAdmin();
    } catch {
      localStorage.removeItem("coffee_admin");
      localStorage.removeItem("coffee_jwt");
    }
  } else {
    localStorage.removeItem("coffee_admin");
    localStorage.removeItem("coffee_jwt");
  }
}
function logout() {
  localStorage.removeItem("coffee_admin");
  localStorage.removeItem("coffee_jwt");
  currentUser = null;
  document.getElementById("login-page").classList.remove("hidden");
  document.getElementById("admin-page").classList.add("hidden");
}

async function showAdmin() {
  document.getElementById("login-page").classList.add("hidden");
  document.getElementById("admin-page").classList.remove("hidden");
  document.getElementById("admin-name").textContent = currentUser.displayName ||
    "管理員";
  await Promise.all([
    categoriesController.loadCategories(),
    productsController.loadProducts(),
    settingsController.loadSettings(),
    ordersController.loadOrders(),
  ]);
  showTab("orders");
}

function showTab(tab) {
  [
    "orders",
    "products",
    "categories",
    "promotions",
    "settings",
    "icon-library",
    "users",
    "blacklist",
    "formfields",
  ].forEach((t) => {
    const tabBtn = document.getElementById(`tab-${t}`);
    const section = document.getElementById(`${t}-section`);
    if (tabBtn) {
      tabBtn.classList.remove("tab-active");
      tabBtn.classList.add("bg-white", "ui-text-strong");
    }
    if (section) section.classList.add("hidden");
  });
  document.getElementById(`tab-${tab}`).classList.add("tab-active");
  document.getElementById(`tab-${tab}`).classList.remove(
    "bg-white",
    "ui-text-strong",
  );
  document.getElementById(`${tab}-section`).classList.remove("hidden");
  const loader = dashboardTabLoaders[tab];
  if (loader) loader();
}
