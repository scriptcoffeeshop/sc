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
  createProductsActionHandlers,
  createProductsTabLoaders,
} from "./dashboard/modules/products.js";
import { createProductsController } from "./dashboard/modules/products-controller.js";
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
window.loadOrders = loadOrders;
window.renderOrders = renderOrders;
window.changeOrderStatus = changeOrderStatus;
window.sendOrderEmailByOrderId = sendOrderEmailByOrderId;
window.deleteOrderById = deleteOrderById;
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
    loadOrders,
    changeOrderStatus,
    sendOrderFlexByOrderId,
    sendOrderEmailByOrderId,
    deleteOrderById,
    refundOnlinePayOrder,
    confirmTransferPayment: (orderId) => window.confirmTransferPayment(orderId),
    toggleOrderSelection,
    toggleSelectAllOrders,
    batchUpdateOrders,
    batchDeleteOrders,
    exportFilteredOrdersCsv,
    exportSelectedOrdersCsv,
    showFlexHistory,
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
  ...createOrdersTabLoaders({ loadOrders }),
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
    window.renderOrders,
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

// ============ LINE Flex Message 產生器 ============

const FLEX_HISTORY_KEY = "coffee_flex_message_history";
const FLEX_HISTORY_MAX = 50;

const statusColorMap = {
  pending: "#B58900",    /* Solarized Yellow */
  processing: "#268BD2", /* Solarized Blue */
  shipped: "#859900",    /* Solarized Green */
  completed: "#586E75",  /* Base01 */
  cancelled: "#DC322F",  /* Solarized Red */
};

function buildLineFlexMessage(order, newStatus) {
  const statusLabel = orderStatusLabel[newStatus] || newStatus;
  const statusColor = statusColorMap[newStatus] || "#586E75";
  const deliveryLabel = orderMethodLabel[order.deliveryMethod] ||
    order.deliveryMethod || "";
  const isAddressDelivery = order.deliveryMethod === "delivery" ||
    order.deliveryMethod === "home_delivery";
  const deliveryAddressText = isAddressDelivery
    ? `${String(order.city || "")}${String(order.district || "")} ${
      String(order.address || "")
    }`.trim()
    : `${String(order.storeName || "")}${
      String(order.storeAddress || "").trim()
        ? ` (${String(order.storeAddress || "").trim()})`
        : ""
    }`.trim();
  const paymentLabel =
    orderPayMethodLabel[order.paymentMethod || "cod"] || "貨到付款";
  const paymentStatusStr = order.paymentStatus
    ? ` (${orderPayStatusLabel[order.paymentStatus] || order.paymentStatus})`
    : "";
  const receiptInfo = normalizeReceiptInfo(order.receiptInfo);
  const orderNote = String(order.note || "").trim();
  const customTrackingUrl = normalizeTrackingUrl(order.trackingUrl || "");
  const hasTrackingLinkCta = Boolean(order.shippingProvider && customTrackingUrl);

  const bodyContents = [
    {
      type: "box",
      layout: "horizontal",
      contents: [
        {
          type: "text",
          text: "訂單編號",
          size: "sm",
          color: "#839496",
          flex: 3,
        },
        {
          type: "text",
          text: `#${order.orderId || ""}`,
          size: "sm",
          weight: "bold",
          flex: 5,
          wrap: true,
        },
      ],
    },
    { type: "separator", margin: "md" },
    ...(deliveryAddressText
      ? [{
        type: "box",
        layout: "horizontal",
        margin: "md",
        contents: [
          {
            type: "text",
            text: "配送地址",
            size: "sm",
            color: "#839496",
            flex: 3,
          },
          {
            type: "text",
            text: deliveryAddressText,
            size: "sm",
            flex: 5,
            wrap: true,
          },
        ],
      }, { type: "separator", margin: "md" }]
      : []),
    {
      type: "box",
      layout: "horizontal",
      margin: "md",
      contents: [
        {
          type: "text",
          text: "訂單狀態",
          size: "sm",
          color: "#839496",
          flex: 3,
        },
        {
          type: "text",
          text: statusLabel,
          size: "sm",
          weight: "bold",
          color: statusColor,
          flex: 5,
        },
      ],
    },
    { type: "separator", margin: "md" },
    {
      type: "box",
      layout: "horizontal",
      margin: "md",
      contents: [
        {
          type: "text",
          text: "配送方式",
          size: "sm",
          color: "#839496",
          flex: 3,
        },
        {
          type: "text",
          text: deliveryLabel,
          size: "sm",
          flex: 5,
          wrap: true,
        },
      ],
    },
    { type: "separator", margin: "md" },
    {
      type: "box",
      layout: "horizontal",
      margin: "md",
      contents: [
        {
          type: "text",
          text: "付款方式",
          size: "sm",
          color: "#839496",
          flex: 3,
        },
        {
          type: "text",
          text: `${paymentLabel}${paymentStatusStr}`,
          size: "sm",
          flex: 5,
          wrap: true,
        },
      ],
    },
    { type: "separator", margin: "md" },
    {
      type: "box",
      layout: "horizontal",
      margin: "md",
      contents: [
        {
          type: "text",
          text: "訂單金額",
          size: "sm",
          color: "#839496",
          flex: 3,
        },
        {
          type: "text",
          text: `$${Number(order.total) || 0}`,
          size: "sm",
          weight: "bold",
          color: "#DC322F",
          flex: 5,
        },
      ],
    },
  ];

  if (orderNote) {
    bodyContents.push({ type: "separator", margin: "md" });
    bodyContents.push({
      type: "box",
      layout: "horizontal",
      margin: "md",
      contents: [
        {
          type: "text",
          text: "訂單備註",
          size: "sm",
          color: "#839496",
          flex: 3,
        },
        {
          type: "text",
          text: orderNote,
          size: "sm",
          flex: 5,
          wrap: true,
        },
      ],
    });
  }

  // 收據資訊
  if (receiptInfo) {
    bodyContents.push({ type: "separator", margin: "md" });
    bodyContents.push({
      type: "box",
      layout: "horizontal",
      margin: "md",
      contents: [
        {
          type: "text",
          text: "收據需求",
          size: "sm",
          color: "#839496",
          flex: 3,
        },
        {
          type: "text",
          text: "需要索取",
          size: "sm",
          weight: "bold",
          color: "#B58900",
          flex: 5,
        },
      ],
    });
    bodyContents.push({
      type: "box",
      layout: "horizontal",
      margin: "sm",
      contents: [
        {
          type: "text",
          text: "統一編號",
          size: "sm",
          color: "#839496",
          flex: 3,
        },
        {
          type: "text",
          text: receiptInfo.taxId || "未填寫",
          size: "sm",
          flex: 5,
          wrap: true,
        },
      ],
    });
    bodyContents.push({
      type: "box",
      layout: "horizontal",
      margin: "sm",
      contents: [
        {
          type: "text",
          text: "壓印日期",
          size: "sm",
          color: "#839496",
          flex: 3,
        },
        {
          type: "text",
          text: receiptInfo.needDateStamp ? "需要" : "不需要",
          size: "sm",
          flex: 5,
        },
      ],
    });
    if (receiptInfo.buyer) {
      bodyContents.push({
        type: "box",
        layout: "horizontal",
        margin: "sm",
        contents: [
          {
            type: "text",
            text: "買受人",
            size: "sm",
            color: "#839496",
            flex: 3,
          },
          {
            type: "text",
            text: receiptInfo.buyer,
            size: "sm",
            flex: 5,
            wrap: true,
          },
        ],
      });
    }
    if (receiptInfo.address) {
      bodyContents.push({
        type: "box",
        layout: "horizontal",
        margin: "sm",
        contents: [
          {
            type: "text",
            text: "收據地址",
            size: "sm",
            color: "#839496",
            flex: 3,
          },
          {
            type: "text",
            text: receiptInfo.address,
            size: "sm",
            flex: 5,
            wrap: true,
          },
        ],
      });
    }
  }

  // 物流資訊
  if (order.trackingNumber || order.shippingProvider) {
    bodyContents.push({ type: "separator", margin: "md" });
    if (order.shippingProvider) {
      bodyContents.push({
        type: "box",
        layout: "horizontal",
        margin: "md",
        contents: [
          {
            type: "text",
            text: "物流商",
            size: "sm",
            color: "#839496",
            flex: 3,
          },
          {
            type: "text",
            text: order.shippingProvider,
            size: "sm",
            flex: 5,
            wrap: true,
          },
        ],
      });
    }
    if (order.trackingNumber) {
      bodyContents.push({
        type: "box",
        layout: "horizontal",
        margin: "sm",
        contents: [
          {
            type: "text",
            text: "物流單號",
            size: "sm",
            color: "#839496",
            flex: 3,
          },
          {
            type: "text",
            text: order.trackingNumber,
            size: "sm",
            weight: "bold",
            color: "#268BD2",
            flex: 5,
            wrap: true,
          },
        ],
      });
    }
  }

  const cancelReason = String(order.cancelReason || "").trim();
  if (newStatus === "cancelled" && cancelReason) {
    bodyContents.push({ type: "separator", margin: "md" });
    bodyContents.push({
      type: "box",
      layout: "horizontal",
      margin: "md",
      contents: [
        {
          type: "text",
          text: "取消原因",
          size: "sm",
          color: "#839496",
          flex: 3,
        },
        {
          type: "text",
          text: cancelReason,
          size: "sm",
          color: "#DC322F",
          flex: 5,
          wrap: true,
        },
      ],
    });
  }

  // 訂單明細
  if (order.items) {
    bodyContents.push({ type: "separator", margin: "md" });
    bodyContents.push({
      type: "text",
      text: "📦 訂單明細",
      size: "sm",
      weight: "bold",
      color: "#073642",
      margin: "md",
    });
    bodyContents.push({
      type: "text",
      text: String(order.items || ""),
      size: "xs",
      color: "#586E75",
      wrap: true,
      margin: "sm",
    });
  }

  // 查詢 site_title（從 DOM 取得當前設定值）
  const siteTitleEl = document.getElementById("s-site-title");
  const siteTitle = siteTitleEl?.value || "Script Coffee";
  const footerContents = [];
  if (hasTrackingLinkCta) {
    footerContents.push({
      type: "button",
      style: "primary",
      color: "#859900",
      height: "sm",
      action: {
        type: "uri",
        label: "追蹤貨態",
        uri: customTrackingUrl,
      },
    });
    footerContents.push({
      type: "separator",
      margin: "md",
    });
  }
  footerContents.push({
    type: "text",
    text: `更新時間：${new Date().toLocaleString("zh-TW")}`,
    size: "xxs",
    color: "#93A1A1",
    align: "center",
  });

  return {
    type: "flex",
    altText: `[${siteTitle}] 訂單 #${order.orderId || ""} ${statusLabel}`,
    contents: {
      type: "bubble",
      size: "mega",
      header: {
        type: "box",
        layout: "vertical",
        paddingAll: "16px",
        backgroundColor: "#EEE8D5",
        contents: [
          {
            type: "text",
            text: `📋 ${siteTitle} - 訂單通知`,
            weight: "bold",
            size: "md",
            color: "#073642",
          },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "16px",
        contents: bodyContents,
      },
      footer: {
        type: "box",
        layout: "vertical",
        paddingAll: "12px",
        contents: footerContents,
      },
    },
  };
}

function saveFlexToHistory(flexMsg, orderId, statusLabel) {
  try {
    const history = JSON.parse(
      localStorage.getItem(FLEX_HISTORY_KEY) || "[]",
    );
    history.unshift({
      orderId,
      statusLabel,
      timestamp: new Date().toISOString(),
      flex: flexMsg,
    });
    if (history.length > FLEX_HISTORY_MAX) history.length = FLEX_HISTORY_MAX;
    localStorage.setItem(FLEX_HISTORY_KEY, JSON.stringify(history));
  } catch {
    // localStorage 寫入失敗不阻塞流程
  }
}

function resolveOrderLineUserId(order) {
  return String(order?.lineUserId || order?.line_user_id || "").trim();
}

async function sendFlexMessageToLine(order, flexMsg) {
  const orderId = String(order?.orderId || "").trim();
  const lineUserId = resolveOrderLineUserId(order);

  if (!orderId) {
    Swal.fire("提醒", "找不到訂單編號，無法發送 LINE 通知", "warning");
    return false;
  }
  if (!lineUserId) {
    Swal.fire("提醒", "此訂單缺少 LINE 使用者 ID，無法一鍵發送", "warning");
    return false;
  }

  try {
    const response = await authFetch(`${API_URL}?action=sendLineFlexMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId,
        to: lineUserId,
        flexMessage: flexMsg,
      }),
    });
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || "LINE 訊息發送失敗");
    }
    Toast.fire({ icon: "success", title: "LINE 訊息已發送" });
    return true;
  } catch (error) {
    Swal.fire("發送失敗", error?.message || String(error), "error");
    return false;
  }
}

async function showFlexMessagePopup(flexMsg, order, statusLabel) {
  const orderId = String(order?.orderId || "");
  const lineUserId = resolveOrderLineUserId(order);
  const canSendLine = Boolean(lineUserId);
  const jsonStr = JSON.stringify(flexMsg, null, 2);
  const result = await Swal.fire({
    title: "LINE Flex Message",
    html: `
      <div class="text-left text-sm mb-2">
        <span class="ui-text-subtle">訂單</span> <b class="ui-text-highlight">#${esc(orderId)}</b>
        → <span class="font-bold ui-text-warning">${esc(statusLabel)}</span>
      </div>
      ${
      canSendLine
        ? `<div class="text-left text-xs text-green-700 mb-2">可直接一鍵發送至 LINE（目標 ID：${
          esc(lineUserId)
        }）</div>`
        : `<div class="text-left text-xs ui-text-warning mb-2">此訂單缺少 LINE 使用者 ID，僅可複製 JSON</div>`
    }
      <div style="position:relative;">
        <pre id="swal-flex-json" style="text-align:left; font-size:11px; max-height:300px; overflow:auto; background:#FFFDF7; border:1px solid #E2DCC8; border-radius:6px; padding:12px; white-space:pre-wrap; word-break:break-all;">${esc(jsonStr)}</pre>
      </div>
      <p class="text-xs ui-text-muted mt-2">已自動暫存至歷史紀錄，可從訂單列表上方 📋 按鈕查看</p>
    `,
    showCancelButton: true,
    showConfirmButton: canSendLine,
    confirmButtonText: "🚀 一鍵發送 LINE",
    showDenyButton: true,
    denyButtonText: "📋 複製 JSON",
    cancelButtonText: "關閉",
    confirmButtonColor: "#859900",
    denyButtonColor: "#268BD2",
    width: 600,
    customClass: {
      popup: "flex-message-popup",
    },
  });
  if (result.isConfirmed) {
    await sendFlexMessageToLine(order, flexMsg);
    return;
  }
  if (result.isDenied) {
    try {
      await navigator.clipboard.writeText(jsonStr);
      Toast.fire({ icon: "success", title: "Flex Message 已複製" });
    } catch {
      // fallback: select text
      const pre = document.getElementById("swal-flex-json");
      if (pre) {
        const range = document.createRange();
        range.selectNodeContents(pre);
        window.getSelection()?.removeAllRanges();
        window.getSelection()?.addRange(range);
      }
      Swal.fire("提醒", "自動複製失敗，請手動選取後 Ctrl+C 複製", "info");
    }
  }
}

function showFlexHistory() {
  const history = JSON.parse(
    localStorage.getItem(FLEX_HISTORY_KEY) || "[]",
  );
  if (!history.length) {
    Swal.fire("LINE Flex 歷史", "目前沒有暫存的 Flex Message", "info");
    return;
  }

  const listHtml = history.map((item, idx) => {
    const time = new Date(item.timestamp).toLocaleString("zh-TW");
    return `<div class="flex items-center justify-between p-2 rounded mb-1" style="background:#FFFDF7; border:1px solid #E2DCC8;">
      <div class="text-sm">
        <span class="font-bold" style="color:var(--primary)">#${esc(item.orderId)}</span>
        <span class="ml-2 text-xs px-1.5 py-0.5 rounded" style="background:#268BD2;color:#FFFDF7;">${esc(item.statusLabel)}</span>
        <span class="text-xs ui-text-muted ml-2">${esc(time)}</span>
      </div>
      <button data-flex-idx="${idx}" class="flex-history-copy-btn text-xs px-3 py-1 rounded" style="background:#268BD2; color:#FFFDF7; cursor:pointer;">複製</button>
    </div>`;
  }).join("");

  Swal.fire({
    title: "📋 LINE Flex 歷史紀錄",
    html: `
      <div style="max-height:400px; overflow-y:auto; text-align:left;">
        ${listHtml}
      </div>
      <button id="flex-history-clear" class="text-xs ui-text-danger mt-3 hover:underline">清除所有歷史</button>
    `,
    showConfirmButton: false,
    showCancelButton: true,
    cancelButtonText: "關閉",
    width: 600,
    didOpen: () => {
      const popup = Swal.getPopup();
      if (!popup) return;
      popup.querySelectorAll(".flex-history-copy-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const idx = Number(btn.dataset.flexIdx);
          const item = history[idx];
          if (!item) return;
          try {
            await navigator.clipboard.writeText(
              JSON.stringify(item.flex, null, 2),
            );
            Toast.fire({ icon: "success", title: "已複製" });
          } catch {
            Swal.fire("提醒", "複製失敗，請手動操作", "info");
          }
        });
      });
      const clearBtn = popup.querySelector("#flex-history-clear");
      if (clearBtn) {
        clearBtn.addEventListener("click", () => {
          localStorage.removeItem(FLEX_HISTORY_KEY);
          Swal.fire("已清除", "所有 Flex Message 歷史已刪除", "success");
        });
      }
    },
  });
}

function isVueManagedOrdersList(container = document.getElementById("orders-list")) {
  return container?.dataset?.vueManaged === "true";
}

function getTrackingLinkInfo(order) {
  const customTrackingUrl = normalizeTrackingUrl(order.trackingUrl || "");
  if (customTrackingUrl) {
    return {
      url: customTrackingUrl,
      label: "物流追蹤頁面",
    };
  }
  if (!order.trackingNumber) return null;
  if (order.deliveryMethod === "seven_eleven") {
    return {
      url: "https://eservice.7-11.com.tw/e-tracking/search.aspx",
      label: "7-11貨態查詢",
    };
  }
  if (order.deliveryMethod === "family_mart") {
    return {
      url: "https://fmec.famiport.com.tw/FP_Entrance/QueryBox",
      label: "全家貨態查詢",
    };
  }
  if (
    order.deliveryMethod === "delivery" ||
    order.deliveryMethod === "home_delivery"
  ) {
    return {
      url: "https://postserv.post.gov.tw/pstmail/main_mail.html?targetTxn=EB500100",
      label: "中華郵政查詢",
    };
  }
  return null;
}

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

function buildReceiptSummaryHtml(receiptInfo) {
  if (!receiptInfo) return "";
  return `<div class="text-xs text-amber-800 ui-primary-soft p-2 rounded mt-2 border border-amber-100">
            <div><span class="ui-text-subtle">統一編號：</span>${
    esc(receiptInfo.taxId) || "未填寫"
  }</div>
            <div><span class="ui-text-subtle">收據買受人：</span>${
    esc(receiptInfo.buyer) || "未填寫"
  }</div>
            <div><span class="ui-text-subtle">收據地址：</span>${
    esc(receiptInfo.address) || "未填寫"
  }</div>
            <div><span class="ui-text-subtle">壓印日期：</span>${
    receiptInfo.needDateStamp ? "需要" : "不需要"
  }</div>
          </div>`;
}

function buildOrderViewModel(order) {
  const paymentMethod = order.paymentMethod || "cod";
  const paymentStatus = String(order.paymentStatus || "").trim();
  const paymentExpiresAt = String(order.paymentExpiresAt || "").trim();
  const paymentLastCheckedAt = String(order.paymentLastCheckedAt || "").trim();
  const paymentProviderStatusCode = String(order.paymentProviderStatusCode || "")
    .trim();
  const paymentExpiresAtText = formatOrderDateTimeText(paymentExpiresAt);
  const paymentLastCheckedAtText = formatOrderDateTimeText(paymentLastCheckedAt);
  const showPaymentDeadline = paymentMethod !== "cod" &&
    Boolean(paymentExpiresAtText) &&
    ["pending", "processing", "expired"].includes(paymentStatus);
  const showPaymentMeta = paymentMethod !== "cod" && (
    showPaymentDeadline ||
    Boolean(paymentLastCheckedAtText) ||
    Boolean(paymentProviderStatusCode)
  );
  const trackingLink = getTrackingLinkInfo(order);
  const receiptInfo = normalizeReceiptInfo(order.receiptInfo);
  const addressInfo =
    (order.deliveryMethod === "delivery" || order.deliveryMethod === "home_delivery")
      ? `${order.city || ""}${order.district || ""} ${order.address || ""}`
      : `${order.storeName || ""}${order.storeId ? ` [${order.storeId}]` : ""}${
        order.storeAddress ? ` (${order.storeAddress})` : ""
      }`;

  return {
    orderId: String(order.orderId || ""),
    timestampText: new Date(order.timestamp).toLocaleString("zh-TW"),
    deliveryMethod: order.deliveryMethod || "",
    deliveryLabel: orderMethodLabel[order.deliveryMethod] || order.deliveryMethod,
    status: order.status || "",
    statusLabel: orderStatusLabel[order.status] || order.status || "",
    paymentMethod,
    paymentStatus,
    paymentMethodLabel: orderPayMethodLabel[paymentMethod] || paymentMethod,
    paymentStatusLabel: orderPayStatusLabel[paymentStatus] || paymentStatus,
    payBadgeClass: paymentStatus === "paid"
      ? "bg-green-50 text-green-700"
      : paymentStatus === "processing"
      ? "bg-blue-50 text-blue-700"
      : paymentStatus === "pending"
      ? "bg-yellow-50 text-yellow-700"
      : paymentStatus === "failed" || paymentStatus === "cancelled" ||
          paymentStatus === "expired"
      ? "bg-red-50 text-red-700"
      : paymentStatus === "refunded"
      ? "bg-purple-50 text-purple-700"
      : "ui-bg-soft ui-text-strong",
    paymentExpiresAt,
    paymentExpiresAtText,
    paymentLastCheckedAt,
    paymentLastCheckedAtText,
    paymentProviderStatusCode,
    showPaymentDeadline,
    showPaymentMeta,
    isSelected: selectedOrderIds.has(order.orderId),
    lineUserId: order.lineUserId || "",
    lineName: order.lineName || "",
    phone: order.phone || "",
    email: order.email || "",
    addressInfo,
    transferAccountLast5: order.transferAccountLast5 || "",
    paymentId: order.paymentId || "",
    showTransferInfo: paymentMethod === "transfer",
    shippingProvider: order.shippingProvider || "",
    trackingNumber: order.trackingNumber || "",
    trackingLinkUrl: trackingLink?.url || "",
    trackingLinkLabel: trackingLink?.label || "",
    hasShippingInfo: Boolean(
      order.trackingNumber || order.shippingProvider || trackingLink,
    ),
    items: order.items || "",
    note: order.note || "",
    cancelReason: String(order.cancelReason || "").trim(),
    showCancellationReason:
      String(order.status || "") === "cancelled" &&
      Boolean(String(order.cancelReason || "").trim()),
    receiptInfo,
    showReceiptInfo: Boolean(receiptInfo),
    total: Number(order.total) || 0,
    showSendLineButton: Boolean(order.lineUserId),
    showSendEmailButton: Boolean(order.email),
    showRefundButton:
      (paymentMethod === "linepay" || paymentMethod === "jkopay") &&
      paymentStatus === "paid",
    refundButtonText: paymentMethod === "jkopay" ? "街口退款" : "LINE退款",
    showConfirmTransferButton:
      paymentMethod === "transfer" && paymentStatus === "pending",
  };
}

function emitDashboardOrdersUpdated(filteredOrders) {
  if (!isVueManagedOrdersList()) return;
  window.dispatchEvent(
    new CustomEvent("coffee:dashboard-orders-updated", {
      detail: {
        orders: filteredOrders.map(buildOrderViewModel),
        statusOptions: orderStatusOptions,
      },
    }),
  );
}

function getOrderFilterValue(id, fallback = "all") {
  const el = document.getElementById(id);
  if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement)) {
    return fallback;
  }
  if (el.value === undefined || el.value === null) return fallback;
  return String(el.value).trim();
}

function parseDateBound(dateStr, isEnd = false) {
  if (!dateStr) return null;
  const parsed = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  if (isEnd) {
    parsed.setHours(23, 59, 59, 999);
  }
  return parsed;
}

function getFilteredOrders() {
  const status = getOrderFilterValue("order-filter");
  const paymentMethod = getOrderFilterValue("order-payment-filter");
  const paymentStatus = getOrderFilterValue("order-payment-status-filter");
  const deliveryMethod = getOrderFilterValue("order-delivery-filter");
  const dateFrom = parseDateBound(getOrderFilterValue("order-date-from", ""));
  const dateTo = parseDateBound(getOrderFilterValue("order-date-to", ""), true);
  const minAmountRaw = getOrderFilterValue("order-amount-min", "");
  const maxAmountRaw = getOrderFilterValue("order-amount-max", "");
  const minAmount = minAmountRaw === "" ? null : Number(minAmountRaw);
  const maxAmount = maxAmountRaw === "" ? null : Number(maxAmountRaw);

  return orders.filter((order) => {
    if (status !== "all" && order.status !== status) return false;

    const pm = order.paymentMethod || "cod";
    if (paymentMethod !== "all" && pm !== paymentMethod) return false;

    const ps = String(order.paymentStatus || "");
    if (paymentStatus !== "all") {
      if (paymentStatus === "empty" && ps !== "") return false;
      if (paymentStatus !== "empty" && ps !== paymentStatus) return false;
    }

    if (deliveryMethod !== "all" && order.deliveryMethod !== deliveryMethod) {
      return false;
    }

    const ts = new Date(order.timestamp);
    if (dateFrom && ts < dateFrom) return false;
    if (dateTo && ts > dateTo) return false;

    const total = Number(order.total) || 0;
    if (minAmount !== null && !Number.isNaN(minAmount) && total < minAmount) {
      return false;
    }
    if (maxAmount !== null && !Number.isNaN(maxAmount) && total > maxAmount) {
      return false;
    }

    return true;
  });
}

function updateOrdersSelectionUi(filteredOrders) {
  const selected = [...selectedOrderIds].filter((orderId) =>
    orders.some((order) => order.orderId === orderId)
  );
  selectedOrderIds = new Set(selected);

  const selectedCountEl = document.getElementById("orders-selected-count");
  if (selectedCountEl) {
    selectedCountEl.textContent = `已選 ${selected.length} 筆`;
  }

  const selectAllEl = document.getElementById("orders-select-all");
  if (!(selectAllEl instanceof HTMLInputElement)) return;
  const filteredIds = filteredOrders.map((order) => order.orderId);
  const selectedVisible = filteredIds.filter((id) => selectedOrderIds.has(id))
    .length;
  selectAllEl.checked = filteredIds.length > 0 &&
    selectedVisible === filteredIds.length;
  selectAllEl.indeterminate = selectedVisible > 0 &&
    selectedVisible < filteredIds.length;
}

function renderOrdersSummary(filteredOrders) {
  const summaryEl = document.getElementById("orders-summary");
  if (!summaryEl) return;
  const totalAmount = filteredOrders.reduce(
    (sum, order) => sum + (Number(order.total) || 0),
    0,
  );
  summaryEl.textContent =
    `總訂單 ${orders.length} 筆｜篩選結果 ${filteredOrders.length} 筆｜金額合計 $${
      totalAmount.toLocaleString("zh-TW")
    }`;
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

function getTrackingLinkHtml(order) {
  const trackingLink = getTrackingLinkInfo(order);
  if (!trackingLink) return "";
  return `<a href="${
    esc(trackingLink.url)
  }" target="_blank" class="text-xs ui-text-highlight hover:underline ml-2">${
    esc(trackingLink.label)
  }</a>`;
}

async function loadOrders() {
  try {
    const r = await authFetch(
      `${API_URL}?action=getOrders&userId=${getAuthUserId()}&_=${Date.now()}`,
    );
    const d = await r.json();
    if (d.success) {
      orders = Array.isArray(d.orders) ? d.orders : [];
      selectedOrderIds = new Set(
        [...selectedOrderIds].filter((orderId) =>
          orders.some((order) => order.orderId === orderId)
        ),
      );
      renderOrders();
    }
  } catch (e) {
    console.error(e);
  }
}

function renderOrders() {
  const filtered = getFilteredOrders();
  const container = document.getElementById("orders-list");
  renderOrdersSummary(filtered);
  updateOrdersSelectionUi(filtered);

  if (isVueManagedOrdersList(container)) {
    emitDashboardOrdersUpdated(filtered);
    return;
  }

  if (!filtered.length) {
    if (container) {
      container.innerHTML =
        '<p class="text-center ui-text-subtle py-8">沒有符合的訂單</p>';
    }
    return;
  }

  if (!container) return;

  container.innerHTML = filtered.map((o) => {
    const time = new Date(o.timestamp).toLocaleString("zh-TW");
    const isSelected = selectedOrderIds.has(o.orderId);
    const receiptInfo = normalizeReceiptInfo(o.receiptInfo);
    const addrInfo =
      (o.deliveryMethod === "delivery" || o.deliveryMethod === "home_delivery")
        ? `${o.city || ""}${o.district || ""} ${o.address || ""}`
        : `${o.storeName || ""}${o.storeId ? " [" + o.storeId + "]" : ""}${
          o.storeAddress ? " (" + o.storeAddress + ")" : ""
        }`;

    const pm = o.paymentMethod || "cod";
    const ps = String(o.paymentStatus || "").trim();
    const paymentExpiresAtText = formatOrderDateTimeText(o.paymentExpiresAt);
    const paymentLastCheckedAtText = formatOrderDateTimeText(
      o.paymentLastCheckedAt,
    );
    const paymentProviderStatusCode = String(o.paymentProviderStatusCode || "")
      .trim();
    const canOnlineRefund = (pm === "linepay" || pm === "jkopay") &&
      ps === "paid";
    const refundBtn = canOnlineRefund
      ? `<button data-action="refund-onlinepay-order" data-payment-method="${
        esc(pm)
      }" data-order-id="${
        esc(o.orderId)
      }" class="text-xs ui-text-violet hover:opacity-80 inline-flex items-center gap-1.5"><svg viewBox="0 0 24 24" aria-hidden="true" class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"></path><path d="M21 17a9 9 0 0 0-15-6l-3 2"></path></svg>退款</button>`
      : "";
    const payBadge = pm !== "cod"
      ? `<span class="text-xs px-2 py-0.5 rounded-full ui-border ${
        ps === "paid"
          ? "ui-text-success ui-bg-card-strong"
          : ps === "processing"
          ? "bg-blue-50 text-blue-700"
          : ps === "pending"
          ? "ui-text-warning ui-bg-card-strong"
          : ps === "failed" || ps === "cancelled" || ps === "expired"
          ? "bg-red-50 text-red-700"
          : ps === "refunded"
          ? "ui-text-violet ui-bg-card-strong"
          : "ui-bg-soft ui-text-strong"
      }">${orderPayMethodLabel[pm] || pm} ${
        orderPayStatusLabel[ps] || ps
      }</span>`
      : "";
    const paymentMetaHtml = pm !== "cod"
      ? `<div class="text-xs ui-bg-soft p-2 rounded mt-2 border ui-border">
            ${
        paymentExpiresAtText &&
          (ps === "pending" || ps === "processing" || ps === "expired")
          ? `<div><span class="ui-text-subtle">付款期限：</span>${
            esc(paymentExpiresAtText)
          }</div>`
          : ""
      }
            ${
        paymentLastCheckedAtText
          ? `<div${
            paymentExpiresAtText ? ' class="mt-1"' : ""
          }><span class="ui-text-subtle">最近同步：</span>${
            esc(paymentLastCheckedAtText)
          }</div>`
          : ""
      }
            ${
        paymentProviderStatusCode
          ? `<div${
            (paymentExpiresAtText || paymentLastCheckedAtText)
              ? ' class="mt-1"'
              : ""
          }><span class="ui-text-subtle">金流狀態碼：</span>${
            esc(paymentProviderStatusCode)
          }</div>`
          : ""
      }
        </div>`
      : "";
    const transferInfo = pm === "transfer"
      ? `<div class="text-xs ui-text-highlight mt-2 ui-primary-soft p-2 rounded">
                 <div><b>顧客匯出末5碼:</b> ${
        esc(o.transferAccountLast5 || "未提供")
      }</div>
                 <div class="mt-1 pb-1"><b>匯入目標帳號:</b> ${
        esc(o.paymentId || "未提供 (舊版訂單)")
      }</div>
               </div>`
      : "";
    const confirmPayBtn = pm === "transfer" && ps === "pending"
      ? `<button data-action="confirm-transfer-payment" data-order-id="${
        esc(o.orderId)
      }" class="text-xs ui-text-success hover:text-green-800">確認已收款</button>`
      : "";
    const sendLineBtn = o.lineUserId
      ? `<button data-action="send-order-flex" data-order-id="${
        esc(o.orderId)
      }" class="text-xs ui-text-success hover:opacity-80">LINE通知</button>`
      : "";
    const sendEmailBtn = o.email
      ? `<button data-action="send-order-email" data-order-id="${
        esc(o.orderId)
      }" class="text-xs ui-text-strong hover:opacity-80">發送信件</button>`
      : "";

    const trackingLinkHtml = getTrackingLinkHtml(o);
    const hasShippingInfo = !!o.trackingNumber || !!o.shippingProvider ||
      !!trackingLinkHtml;
    const shippingProviderHtml = o.shippingProvider
      ? `<div><span class="ui-text-subtle">物流商：</span>${
        esc(o.shippingProvider)
      }</div>`
      : "";
    const trackingNumberHtml = o.trackingNumber
      ? `<div class="mt-1"><span class="ui-text-subtle">物流單號：</span>
                    <span class="font-mono font-bold">${
        esc(o.trackingNumber)
      }</span>
                    <button type="button" data-action="copy-tracking-number" data-tracking-number="${
        esc(o.trackingNumber)
      }" class="ml-2 px-2 py-0.5 ui-bg-soft hover:ui-bg-soft rounded ui-text-strong" title="複製單號">複製</button></div>`
      : "";
    const trackingHtml = hasShippingInfo
      ? `<div class="text-xs ui-bg-soft p-2 rounded mt-2 border ui-border">
                    ${shippingProviderHtml}
                    ${trackingNumberHtml}
                    ${
        trackingLinkHtml ? `<div class="mt-1">${trackingLinkHtml}</div>` : ""
      }
                </div>`
      : "";
    const receiptHtml = buildReceiptSummaryHtml(receiptInfo);

    return `
        <div class="border ui-border rounded-xl p-4 mb-3">
            <div class="flex justify-between items-center mb-2">
                <div class="flex items-center gap-2 flex-wrap">
                    <label class="inline-flex items-center cursor-pointer">
                        <input type="checkbox" data-action="toggle-order-selection" data-order-id="${
      esc(o.orderId)
    }" class="w-4 h-4" ${isSelected ? "checked" : ""}>
                    </label>
                    <span class="font-bold text-sm ui-text-highlight">#${o.orderId}</span>
                    <span class="delivery-tag delivery-${o.deliveryMethod}">${
      orderMethodLabel[o.deliveryMethod] || o.deliveryMethod
    }</span>
                    <span class="status-badge status-${o.status}">${
      orderStatusLabel[o.status] || o.status
    }</span>
                    ${payBadge}
                </div>
                <span class="text-xs ui-text-subtle">${time}</span>
            </div>
            <div class="grid grid-cols-2 gap-2 text-sm mb-2">
                <div><span class="ui-text-subtle">顧客：</span>${
      esc(o.lineName)
    }</div>
                <div><span class="ui-text-subtle">電話：</span>${
      esc(o.phone)
    }</div>
                <div class="col-span-2"><span class="ui-text-subtle">信箱：</span>${
      o.email
        ? `<a href="mailto:${esc(o.email)}" class="ui-text-highlight">${
          esc(o.email)
        }</a>`
        : "無"
    }</div>
                <div class="col-span-2"><span class="ui-text-subtle">地址/門市：</span>${
      esc(addrInfo)
    }</div>
                ${transferInfo}
            </div>
            ${trackingHtml}
            ${paymentMetaHtml}
            ${receiptHtml}
            <div class="text-sm ui-text-strong whitespace-pre-line ui-bg-soft p-3 rounded mb-2 mt-2">${
      esc(o.items)
    }</div>
            ${
      o.note
        ? `<div class="text-sm ui-text-warning ui-primary-soft p-2 rounded mb-2"> ${
          esc(o.note)
        }</div>`
        : ""
    }
            ${
      o.status === "cancelled" && String(o.cancelReason || "").trim()
        ? `<div class="text-sm text-red-700 bg-red-50 p-2 rounded mb-2 border border-red-100"><span class="ui-text-subtle">取消原因：</span>${
          esc(String(o.cancelReason || "").trim())
        }</div>`
        : ""
    }
            <div class="flex justify-between items-center">
                <span class="font-bold ui-text-warning">$${o.total}</span>
                <div class="flex gap-2">
                    ${sendLineBtn}
                    ${sendEmailBtn}
                    ${refundBtn}
                    ${confirmPayBtn}
                    <select data-action="change-order-status" data-order-id="${
      esc(o.orderId)
    }" data-current-status="${
      esc(o.status || "")
    }" class="text-xs border rounded px-2 py-1">
                        ${
      ["pending", "processing", "shipped", "completed", "cancelled"].map((s) =>
        `<option value="${s}" ${o.status === s ? "selected" : ""}>${
          orderStatusLabel[s]
        }</option>`
      ).join("")
    }
                    </select>
                    <button data-action="confirm-order-status" data-order-id="${
      esc(o.orderId)
    }" class="confirm-status-btn hidden text-xs px-2 py-1 rounded font-medium">確認</button>
                    <button data-action="delete-order" data-order-id="${
      esc(o.orderId)
    }" class="text-xs ui-text-danger hover:text-red-700">刪除</button>
                </div>
            </div>
        </div>`;
  }).join("");
}

async function sendOrderFlexByOrderId(orderId) {
  const targetOrder = orders.find((order) => order.orderId === orderId);
  if (!targetOrder) {
    Swal.fire("錯誤", "找不到訂單資料，請先重整列表", "error");
    return;
  }

  const nextStatus = targetOrder.status || "pending";
  const statusLabel = orderStatusLabel[nextStatus] || nextStatus;
  const flexMsg = buildLineFlexMessage(targetOrder, nextStatus);
  saveFlexToHistory(flexMsg, orderId, statusLabel);
  await showFlexMessagePopup(flexMsg, targetOrder, statusLabel);
}

async function sendOrderEmailByOrderId(orderId) {
  const targetOrder = orders.find((order) => order.orderId === orderId);
  if (!targetOrder) {
    Swal.fire("錯誤", "找不到訂單資料，請先重整列表", "error");
    return;
  }
  const targetEmail = String(targetOrder.email || "").trim();
  if (!targetEmail) {
    Swal.fire("提醒", "此訂單沒有 Email，無法發送信件", "warning");
    return;
  }

  const status = String(targetOrder.status || "pending");
  const statusLabel = orderStatusLabel[status] || status;
  const emailTypeLabel = status === "shipped"
    ? "出貨通知"
    : status === "processing"
    ? "處理中通知"
    : status === "completed"
    ? "完成通知"
    : status === "cancelled"
    ? "取消通知"
    : "成立確認信";

  const confirm = await Swal.fire({
    title: "確認發送信件",
    html: `訂單 <b>#${esc(orderId)}</b><br>
      將寄送「<b>${esc(emailTypeLabel)}</b>」到<br>
      <span class="ui-text-highlight">${esc(targetEmail)}</span><br>
      <span class="text-xs ui-text-subtle">（目前狀態：${esc(statusLabel)}）</span>`,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "發送信件",
    cancelButtonText: "取消",
    confirmButtonColor: "#268BD2",
  });
  if (!confirm.isConfirmed) return;

  try {
    const r = await authFetch(`${API_URL}?action=sendOrderEmail`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: getAuthUserId(),
        orderId,
      }),
    });
    const d = await r.json();
    if (!d.success) throw new Error(d.error || "信件發送失敗");
    Toast.fire({ icon: "success", title: d.message || "信件已發送" });
  } catch (e) {
    Swal.fire("錯誤", e.message, "error");
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
        loadOrders();
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
        loadOrders();
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
        loadOrders();
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
      const flexMsg = buildLineFlexMessage(flexOrder, status);
      saveFlexToHistory(flexMsg, orderId, newStatusLabel);
      // 先刷新訂單列表，再顯示 Flex Message
      await loadOrders();
      await showFlexMessagePopup(flexMsg, flexOrder, newStatusLabel);
    } else throw new Error(d.error);
  } catch (e) {
    Swal.fire("錯誤", e.message, "error");
  }
}

async function deleteOrderById(orderId) {
  const c = await Swal.fire({
    title: "刪除訂單？",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#DC322F",
    confirmButtonText: "刪除",
    cancelButtonText: "取消",
  });
  if (!c.isConfirmed) return;
  try {
    const r = await authFetch(`${API_URL}?action=deleteOrder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: getAuthUserId(), orderId }),
    });
    const d = await r.json();
    if (d.success) {
      selectedOrderIds.delete(orderId);
      Toast.fire({ icon: "success", title: "已刪除" });
      loadOrders();
    }
  } catch (e) {
    Swal.fire("錯誤", e.message, "error");
  }
}

function toggleOrderSelection(orderId, checked) {
  if (checked) selectedOrderIds.add(orderId);
  else selectedOrderIds.delete(orderId);
  const filtered = getFilteredOrders();
  updateOrdersSelectionUi(filtered);
  emitDashboardOrdersUpdated(filtered);
}

function toggleSelectAllOrders(checked) {
  const filtered = getFilteredOrders();
  filtered.forEach((order) => {
    if (checked) selectedOrderIds.add(order.orderId);
    else selectedOrderIds.delete(order.orderId);
  });
  renderOrders();
}

function getSelectedOrderIds() {
  return [...selectedOrderIds].filter((orderId) =>
    orders.some((order) => order.orderId === orderId)
  );
}

async function batchUpdateOrders() {
  const orderIds = getSelectedOrderIds();
  if (!orderIds.length) {
    Swal.fire("提醒", "請先勾選至少一筆訂單", "warning");
    return;
  }

  const status = getOrderFilterValue("batch-order-status", "");
  if (!status) {
    Swal.fire("提醒", "請先選擇批次狀態", "warning");
    return;
  }

  let trackingNumber;
  let shippingProvider;
  let trackingUrl;
  if (status === "shipped") {
    const { value, isConfirmed } = await Swal.fire({
      title: "批次出貨設定",
      html: `
        <div class="text-left space-y-2">
          <label class="text-sm ui-text-strong block">共用物流單號（可選）</label>
          <input id="swal-batch-tracking-number" class="swal2-input" placeholder="請輸入物流單號">
          <label class="text-sm ui-text-strong block">共用物流商（可選）</label>
          <input id="swal-batch-shipping-provider" class="swal2-input" placeholder="例如：黑貓宅急便">
          <label class="text-sm ui-text-strong block">共用物流追蹤網址（可選）</label>
          <input id="swal-batch-tracking-url" class="swal2-input" placeholder="https://...">
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "確定",
      cancelButtonText: "取消",
      confirmButtonColor: "#268BD2",
      focusConfirm: false,
      preConfirm: () => {
        const trackingNumEl = document.getElementById(
          "swal-batch-tracking-number",
        );
        const providerEl = document.getElementById(
          "swal-batch-shipping-provider",
        );
        const urlEl = document.getElementById("swal-batch-tracking-url");
        const trackingNumberValue = String(trackingNumEl?.value || "").trim();
        const shippingProviderValue = String(providerEl?.value || "").trim();
        const trackingUrlValue = String(urlEl?.value || "").trim();
        if (trackingUrlValue && !/^https?:\/\//i.test(trackingUrlValue)) {
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
    if (!isConfirmed) return;
    trackingNumber = value?.trackingNumber || "";
    shippingProvider = value?.shippingProvider || "";
    trackingUrl = value?.trackingUrl || "";
  }

  const paymentStatus = getOrderFilterValue("batch-payment-status", "__keep__");
  const payload = {
    userId: getAuthUserId(),
    orderIds,
    status,
  };
  if (paymentStatus !== "__keep__") payload.paymentStatus = paymentStatus;
  if (status === "shipped") {
    payload.trackingNumber = trackingNumber;
    payload.shippingProvider = shippingProvider;
    payload.trackingUrl = trackingUrl;
  }

  try {
    const r = await authFetch(`${API_URL}?action=batchUpdateOrderStatus`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const d = await r.json();
    if (d.success) {
      Toast.fire({ icon: "success", title: d.message || "批次更新完成" });
    } else {
      const msg = d.error || "批次更新失敗";
      await Swal.fire("提醒", msg, d.updatedCount ? "warning" : "error");
    }
    await loadOrders();
  } catch (e) {
    Swal.fire("錯誤", e.message, "error");
  }
}

async function batchDeleteOrders() {
  const orderIds = getSelectedOrderIds();
  if (!orderIds.length) {
    Swal.fire("提醒", "請先勾選至少一筆訂單", "warning");
    return;
  }

  const confirmDelete = await Swal.fire({
    title: `確定刪除 ${orderIds.length} 筆訂單？`,
    text: "此動作無法復原",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#DC322F",
    confirmButtonText: "批次刪除",
    cancelButtonText: "取消",
  });
  if (!confirmDelete.isConfirmed) return;

  try {
    const r = await authFetch(`${API_URL}?action=batchDeleteOrders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: getAuthUserId(),
        orderIds,
      }),
    });
    const d = await r.json();
    if (!d.success) throw new Error(d.error || "批次刪除失敗");
    selectedOrderIds = new Set();
    Toast.fire({ icon: "success", title: d.message || "批次刪除完成" });
    await loadOrders();
  } catch (e) {
    Swal.fire("錯誤", e.message, "error");
  }
}

function csvEscape(value) {
  const str = String(value ?? "").replace(/\r?\n/g, " | ");
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildOrdersCsv(orderList) {
  const header = [
    "訂單編號",
    "建立時間",
    "顧客",
    "電話",
    "Email",
    "配送方式",
    "訂單狀態",
    "付款方式",
    "付款狀態",
    "付款期限",
    "付款確認時間",
    "付款同步時間",
    "金流狀態碼",
    "金額",
    "物流商",
    "物流單號",
    "追蹤網址",
    "地址或門市",
    "訂單內容",
    "備註",
    "是否索取收據",
    "收據統一編號",
    "收據買受人",
    "收據地址",
    "收據壓印日期",
  ];
  const rows = orderList.map((o) => {
    const receiptInfo = normalizeReceiptInfo(o.receiptInfo);
    const addrInfo =
      (o.deliveryMethod === "delivery" || o.deliveryMethod === "home_delivery")
        ? `${o.city || ""}${o.district || ""} ${o.address || ""}`.trim()
        : `${o.storeName || ""}${o.storeId ? ` [${o.storeId}]` : ""}${
          o.storeAddress ? ` (${o.storeAddress})` : ""
        }`.trim();
    return [
      o.orderId || "",
      o.timestamp || "",
      o.lineName || "",
      o.phone || "",
      o.email || "",
      orderMethodLabel[o.deliveryMethod] || o.deliveryMethod || "",
      orderStatusLabel[o.status] || o.status || "",
      orderPayMethodLabel[o.paymentMethod || "cod"] || o.paymentMethod || "",
      orderPayStatusLabel[o.paymentStatus || ""] || o.paymentStatus || "",
      o.paymentExpiresAt || "",
      o.paymentConfirmedAt || "",
      o.paymentLastCheckedAt || "",
      o.paymentProviderStatusCode || "",
      Number(o.total) || 0,
      o.shippingProvider || "",
      o.trackingNumber || "",
      o.trackingUrl || "",
      addrInfo,
      o.items || "",
      o.note || "",
      receiptInfo ? "是" : "否",
      receiptInfo?.taxId || "",
      receiptInfo?.buyer || "",
      receiptInfo?.address || "",
      receiptInfo ? (receiptInfo.needDateStamp ? "需要" : "不需要") : "",
    ];
  });
  return [header, ...rows].map((cols) => cols.map(csvEscape).join(",")).join(
    "\r\n",
  );
}

function triggerCsvDownload(fileName, csvText) {
  const blob = new Blob(["\uFEFF" + csvText], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function getCsvTimestamp() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  return `${y}${m}${d}-${h}${min}`;
}

function exportFilteredOrdersCsv() {
  const filtered = getFilteredOrders();
  if (!filtered.length) {
    Swal.fire("提醒", "目前沒有可匯出的訂單", "warning");
    return;
  }
  const csvText = buildOrdersCsv(filtered);
  triggerCsvDownload(`orders-filtered-${getCsvTimestamp()}.csv`, csvText);
  Toast.fire({ icon: "success", title: `已匯出 ${filtered.length} 筆` });
}

function exportSelectedOrdersCsv() {
  const selectedIds = new Set(getSelectedOrderIds());
  const selectedOrders = orders.filter((order) =>
    selectedIds.has(order.orderId)
  );
  if (!selectedOrders.length) {
    Swal.fire("提醒", "請先勾選要匯出的訂單", "warning");
    return;
  }
  const csvText = buildOrdersCsv(selectedOrders);
  triggerCsvDownload(`orders-selected-${getCsvTimestamp()}.csv`, csvText);
  Toast.fire({ icon: "success", title: `已匯出 ${selectedOrders.length} 筆` });
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
      loadOrders();
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
      loadOrders();
    } else Swal.fire("錯誤", d.error, "error");
  } catch (e) {
    Swal.fire("錯誤", e.message, "error");
  }
};
