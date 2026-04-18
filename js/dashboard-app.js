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
import { createOrdersController } from "./dashboard/modules/orders-controller.js";
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
const orderStatusLabel = {
  pending: "待處理",
  processing: "處理中",
  shipped: "已出貨",
  completed: "已完成",
  cancelled: "已取消",
};
const orderMethodLabel = {
  delivery: "配送到府",
  home_delivery: "全台宅配",
  seven_eleven: "7-11",
  family_mart: "全家",
  in_store: "來店取貨",
};
const orderPayMethodLabel = {
  cod: "貨到付款",
  linepay: "LINE Pay",
  jkopay: "街口支付",
  transfer: "轉帳",
};
const orderPayStatusLabel = {
  pending: "待付款",
  processing: "付款確認中",
  paid: "已付款",
  failed: "付款失敗",
  cancelled: "付款取消",
  expired: "付款逾期",
  refunded: "已退款",
};
const orderStatusOptions = [
  "pending",
  "processing",
  "shipped",
  "completed",
  "cancelled",
];

const DEFAULT_DELIVERY_OPTIONS = {
  in_store: {
    id: "in_store",
    icon: "",
    icon_url: getDefaultIconUrl("in_store"),
    name: "來店自取",
    description: "到店自取",
    enabled: true,
  },
  delivery: {
    id: "delivery",
    icon: "",
    icon_url: getDefaultIconUrl("delivery_method"),
    name: "配送到府 (限新竹)",
    description: "專人外送",
    enabled: true,
  },
  home_delivery: {
    id: "home_delivery",
    icon: "",
    icon_url: getDefaultIconUrl("home_delivery"),
    name: "全台宅配",
    description: "宅配到府",
    enabled: true,
  },
  seven_eleven: {
    id: "seven_eleven",
    icon: "",
    icon_url: getDefaultIconUrl("seven_eleven"),
    name: "7-11 取件",
    description: "超商門市",
    enabled: true,
  },
  family_mart: {
    id: "family_mart",
    icon: "",
    icon_url: getDefaultIconUrl("family_mart"),
    name: "全家取件",
    description: "超商門市",
    enabled: true,
  },
};

const DEFAULT_PAYMENT_OPTIONS = {
  cod: {
    icon: "",
    icon_url: getDefaultIconUrl("cod"),
    name: "取件 / 到付",
    description: "取貨時付現或宅配到付",
  },
  linepay: {
    icon: "",
    icon_url: getDefaultIconUrl("linepay"),
    name: "LINE Pay",
    description: "線上安全付款",
  },
  jkopay: {
    icon: "",
    icon_url: getDefaultIconUrl("jkopay"),
    name: "街口支付",
    description: "街口支付線上付款",
  },
  transfer: {
    icon: "",
    icon_url: getDefaultIconUrl("transfer"),
    name: "線上轉帳",
    description: "ATM / 網銀匯款",
  },
};

function normalizeDeliveryOption(item = {}) {
  const id = String(item.id || "").trim();
  const defaults = DEFAULT_DELIVERY_OPTIONS[id] || {
    id: id || `custom_${Date.now()}`,
    icon: "",
    icon_url: getDefaultIconUrl("delivery"),
    name: "新物流方式",
    description: "設定敘述",
    enabled: true,
  };

  const hasJkoPayInConfig = Object.prototype.hasOwnProperty.call(
    item.payment || {},
    "jkopay",
  );
  const inferredJkoPay = hasJkoPayInConfig
    ? !!item.payment?.jkopay
    : !!item.payment?.linepay;

  return {
    ...defaults,
    ...item,
    id: id || defaults.id,
    icon: String(item.icon ?? defaults.icon ?? ""),
    icon_url: normalizeIconPath(
      item.icon_url ?? item.iconUrl ?? defaults.icon_url ?? "",
    ),
    name: String(item.name ?? defaults.name ?? ""),
    description: String(item.description ?? defaults.description ?? ""),
    enabled: item.enabled !== false,
    fee: Number.isFinite(Number(item.fee)) ? Number(item.fee) : 0,
    free_threshold: Number.isFinite(Number(item.free_threshold))
      ? Number(item.free_threshold)
      : 0,
    payment: {
      cod: item.payment?.cod !== false,
      linepay: !!item.payment?.linepay,
      jkopay: inferredJkoPay,
      transfer: !!item.payment?.transfer,
    },
  };
}

function normalizePaymentOption(method, option = {}) {
  const defaults = DEFAULT_PAYMENT_OPTIONS[method] || DEFAULT_PAYMENT_OPTIONS.cod;
  return {
    ...defaults,
    ...option,
    icon: String(option.icon ?? defaults.icon ?? ""),
    icon_url: normalizeIconPath(option.icon_url ?? option.iconUrl ?? defaults.icon_url ?? ""),
    name: String(option.name ?? defaults.name ?? ""),
    description: String(option.description ?? defaults.description ?? ""),
  };
}

function sectionIconSettingKey(section) {
  const normalized = String(section || "").trim();
  if (!normalized) return "";
  return `${normalized}_section_icon_url`;
}

function paymentIconFallbackKey(method) {
  return getPaymentIconFallbackKey(method);
}

function updateDeliveryRoutingPaymentHeaderIcon(method, rawUrl = "") {
  return iconAssetsController.updateDeliveryRoutingPaymentHeaderIcon(
    method,
    rawUrl,
  );
}

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
  updateDeliveryRoutingPaymentHeaderIcon,
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
window.changeOrderStatus = changeOrderStatus;
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
window.refundOnlinePayOrder = refundOnlinePayOrder;
window.linePayRefundOrder = (orderId) => refundOnlinePayOrder(orderId, "linepay");
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
    changeOrderStatus,
    sendOrderFlexByOrderId: orderNotificationsController.sendOrderFlexByOrderId,
    sendOrderEmailByOrderId: orderNotificationsController.sendOrderEmailByOrderId,
    deleteOrderById: ordersController.deleteOrderById,
    refundOnlinePayOrder,
    confirmTransferPayment: (orderId) => window.confirmTransferPayment(orderId),
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
    window.changeOrderStatus,
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

// ============ 訂單管理 ============

function normalizeReceiptInfo(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const buyer = String(raw.buyer || "").trim();
  const taxId = String(raw.taxId || "").trim();
  const address = String(raw.address || "").trim();
  const needDateStamp = Boolean(raw.needDateStamp);
  if (taxId && !/^\d{8}$/.test(taxId)) return null;
  return { buyer, taxId, address, needDateStamp };
}

function formatOrderDateTimeText(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleString("zh-TW");
}

function normalizeTrackingUrl(url) {
  const raw = String(url || "").trim();
  if (!raw || !/^https?:\/\//i.test(raw)) return "";
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    return parsed.toString();
  } catch {
    return "";
  }
}

async function changeOrderStatus(orderId, status) {
  try {
    const targetOrder = orders.find((order) => order.orderId === orderId) ||
      {};
    const currentStatus = targetOrder.status || "";
    const newStatusLabel = orderStatusLabel[status] || status;

    let trackingNumber;
    let shippingProvider;
    let trackingUrl;
    let cancelReason = "";
    if (status === "shipped") {
      const { value: shippingInfo, isConfirmed } = await Swal.fire({
        title: "設定已出貨",
        html: `
          <div class="text-left space-y-2">
            <label class="text-sm ui-text-strong block">物流單號（可選）</label>
            <input id="swal-tracking-number" class="swal2-input" placeholder="請輸入物流單號" value="${
          esc(targetOrder.trackingNumber || "")
        }">
            <label class="text-sm ui-text-strong block">物流商（可選）</label>
            <input id="swal-shipping-provider" class="swal2-input" placeholder="例如：黑貓宅急便" value="${
          esc(targetOrder.shippingProvider || "")
        }">
            <label class="text-sm ui-text-strong block">物流追蹤網址（可選）</label>
            <input id="swal-tracking-url" class="swal2-input" placeholder="https://..." value="${
          esc(targetOrder.trackingUrl || "")
        }">
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: "確定出貨",
        cancelButtonText: "取消",
        confirmButtonColor: "#268BD2",
        focusConfirm: false,
        preConfirm: () => {
          const trackingNumEl = document.getElementById("swal-tracking-number");
          const providerEl = document.getElementById("swal-shipping-provider");
          const urlEl = document.getElementById("swal-tracking-url");
          const trackingNumberValue = String(trackingNumEl?.value || "").trim();
          const shippingProviderValue = String(providerEl?.value || "").trim();
          const trackingUrlValue = String(urlEl?.value || "").trim();
          if (
            trackingUrlValue &&
            !/^https?:\/\//i.test(trackingUrlValue)
          ) {
            Swal.showValidationMessage(
              "物流追蹤網址需以 http:// 或 https:// 開頭",
            );
            return false;
          }
          return {
            trackingNumber: trackingNumberValue,
            shippingProvider: shippingProviderValue,
            trackingUrl: trackingUrlValue,
          };
        },
      });
      if (!isConfirmed) {
        // 如果取消，則恢復原本的選單狀態 (重新載入一次列表)
        ordersController.loadOrders();
        return;
      }
      trackingNumber = shippingInfo?.trackingNumber || "";
      shippingProvider = shippingInfo?.shippingProvider || "";
      trackingUrl = shippingInfo?.trackingUrl || "";
    } else if (status === "cancelled") {
      const { value: cancelInfo, isConfirmed } = await Swal.fire({
        title: "設定已取消",
        html: `
          <div class="text-left space-y-2">
            <label class="text-sm ui-text-strong block">取消原因（選填）</label>
            <textarea id="swal-cancel-reason" class="swal2-textarea" placeholder="請輸入取消原因，例如：付款逾時未完成">${esc(String(targetOrder.cancelReason || "").trim())}</textarea>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: "確認取消",
        cancelButtonText: "取消",
        confirmButtonColor: "#DC322F",
        focusConfirm: false,
        preConfirm: () => {
          const reasonEl = document.getElementById("swal-cancel-reason");
          const reasonValue = String(reasonEl?.value || "").trim();
          return { cancelReason: reasonValue };
        },
      });
      if (!isConfirmed) {
        ordersController.loadOrders();
        return;
      }
      cancelReason = String(cancelInfo?.cancelReason || "").trim();
    } else {
      // 非出貨狀態：跳出確認彈窗
      const confirm = await Swal.fire({
        title: "確認變更訂單狀態",
        html: `訂單 <b>#${esc(orderId)}</b><br>
          <span class="ui-text-muted">${esc(orderStatusLabel[currentStatus] || currentStatus)}</span>
          → <span class="ui-text-warning font-bold">${esc(newStatusLabel)}</span>`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "確認變更",
        cancelButtonText: "取消",
        confirmButtonColor: "#268BD2",
      });
      if (!confirm.isConfirmed) {
        ordersController.loadOrders();
        return;
      }
    }

    const payload = { userId: getAuthUserId(), orderId, status };
    if (status === "shipped") {
      payload.trackingNumber = trackingNumber;
      payload.shippingProvider = shippingProvider;
      payload.trackingUrl = trackingUrl;
    } else if (status === "cancelled") {
      payload.cancelReason = cancelReason;
    } else {
      payload.cancelReason = "";
    }

    const r = await authFetch(`${API_URL}?action=updateOrderStatus`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const d = await r.json();
    if (d.success) {
      Toast.fire({ icon: "success", title: "狀態已更新" });

      // 建構 LINE Flex Message（使用更新後的物流資訊）
      const flexOrder = {
        ...targetOrder,
        status,
      };
      if (status === "shipped") {
        flexOrder.trackingNumber = trackingNumber || "";
        flexOrder.shippingProvider = shippingProvider || "";
        flexOrder.trackingUrl = trackingUrl || "";
      } else if (status === "cancelled") {
        flexOrder.cancelReason = cancelReason;
      } else {
        flexOrder.cancelReason = "";
      }
      // 先刷新訂單列表，再顯示 Flex Message
      await ordersController.loadOrders();
      await orderNotificationsController.previewOrderStatusNotification(
        flexOrder,
        status,
      );
    } else throw new Error(d.error);
  } catch (e) {
    Swal.fire("錯誤", e.message, "error");
  }
}

// ============ 線上支付退款（LINE Pay / 街口） ============
async function refundOnlinePayOrder(orderId, paymentMethod = "linepay") {
  const normalizedMethod = String(paymentMethod || "").trim().toLowerCase();
  const isJkoPay = normalizedMethod === "jkopay";
  const action = isJkoPay ? "jkoPayRefund" : "linePayRefund";
  const title = isJkoPay ? "街口支付退款" : "LINE Pay 退款";

  const c = await Swal.fire({
    title,
    text: `確定要對訂單 #${orderId} 進行退款嗎？`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#6C71C4",
    confirmButtonText: "確認退款",
    cancelButtonText: "取消",
  });
  if (!c.isConfirmed) return;

  Swal.fire({
    title: `${isJkoPay ? "街口" : "LINE Pay"} 退款處理中...`,
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });
  try {
    const r = await authFetch(`${API_URL}?action=${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: getAuthUserId(), orderId }),
    });
    const d = await r.json();
    if (d.success) {
      Toast.fire({ icon: "success", title: "退款成功" });
      ordersController.loadOrders();
    } else Swal.fire("退款失敗", d.error, "error");
  } catch (e) {
    Swal.fire("錯誤", e.message, "error");
  }
}

// ============ 轉帳確認收款 ============
window.confirmTransferPayment = async function (orderId) {
  const c = await Swal.fire({
    title: "確認收款",
    text: `確認已收到訂單 #${orderId} 的匯款？`,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "確認已收款",
    cancelButtonText: "取消",
  });
  if (!c.isConfirmed) return;
  try {
    const r = await authFetch(`${API_URL}?action=updateOrderStatus`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: getAuthUserId(),
        orderId,
        status: "processing",
        paymentStatus: "paid",
      }),
    });
    const d = await r.json();
    if (d.success) {
      Toast.fire({ icon: "success", title: "已確認收款" });
      ordersController.loadOrders();
    } else Swal.fire("錯誤", d.error, "error");
  } catch (e) {
    Swal.fire("錯誤", e.message, "error");
  }
};
