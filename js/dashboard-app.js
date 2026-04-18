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
import { createPromotionsController } from "./dashboard/modules/promotions.js";
import { createFormFieldsController } from "./dashboard/modules/form-fields.js";
import { createSettingsController } from "./dashboard/modules/settings-controller.js";
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
let users = [];
let blacklist = [];
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
  return updateIconPreview({
    previewId: `dr-${method}-icon-preview`,
    rawUrl,
    fallbackUrl: getDefaultIconUrl(paymentIconFallbackKey(method)),
  });
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
  updateIconPreview,
  updateDeliveryRoutingPaymentHeaderIcon,
  setPreviewImageSource,
  readInputValue,
  defaultDeliveryOptions: DEFAULT_DELIVERY_OPTIONS,
  linePaySandboxCacheKey: LINEPAY_SANDBOX_CACHE_KEY,
  loadBankAccountsAdmin: bankAccountsController.loadBankAccountsAdmin,
  setDashboardSettings: (settings) => {
    dashboardSettings = settings;
  },
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

const ICON_LIBRARY_TARGET_MAP = {

  products: {
    label: "商品區塊 Icon",
    inputId: "s-products-icon-url",
    displayId: "s-products-icon-url-display",
    previewId: "s-products-icon-preview",
    fallbackKey: "products",
  },
  delivery: {
    label: "配送區塊 Icon",
    inputId: "s-delivery-icon-url",
    displayId: "s-delivery-icon-url-display",
    previewId: "s-delivery-icon-preview",
    fallbackKey: "delivery",
  },
  notes: {
    label: "備註區塊 Icon",
    inputId: "s-notes-icon-url",
    displayId: "s-notes-icon-url-display",
    previewId: "s-notes-icon-preview",
    fallbackKey: "notes",
  },
  cod: {
    label: "貨到/取貨付款 Icon",
    inputId: "po-cod-icon-url",
    displayId: "po-cod-icon-url-display",
    previewId: "po-cod-icon-preview",
    fallbackKey: "cod",
  },
  linepay: {
    label: "LINE Pay Icon",
    inputId: "po-linepay-icon-url",
    displayId: "po-linepay-icon-url-display",
    previewId: "po-linepay-icon-preview",
    fallbackKey: "linepay",
  },
  jkopay: {
    label: "街口支付 Icon",
    inputId: "po-jkopay-icon-url",
    displayId: "po-jkopay-icon-url-display",
    previewId: "po-jkopay-icon-preview",
    fallbackKey: "jkopay",
  },
  transfer: {
    label: "線上轉帳 Icon",
    inputId: "po-transfer-icon-url",
    displayId: "po-transfer-icon-url-display",
    previewId: "po-transfer-icon-preview",
    fallbackKey: "transfer",
  },
};



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
window.showProductModal = showProductModal;
window.editProduct = editProduct;
window.closeProductModal = closeProductModal;
window.saveProduct = saveProduct;
window.delProduct = delProduct;
window.moveProduct = moveProduct;
window.addSpecRow = addSpecRow;
window.addCategory = addCategory;
window.editCategory = editCategory;
window.delCategory = delCategory;
window.updateCategoryOrders = updateCategoryOrders;
window.saveSettings = settingsController.saveSettings;
window.loadUsers = loadUsers;
window.toggleUserRole = toggleUserRole;
window.toggleUserBlacklist = toggleUserBlacklist;
window.loadBlacklist = loadBlacklist;
window.esc = esc;
window.showAddFieldModal = formFieldsController.showAddFieldModal;
window.editFormField = formFieldsController.editFormField;
window.deleteFormField = formFieldsController.deleteFormField;
window.toggleFieldEnabled = formFieldsController.toggleFieldEnabled;
window.previewIcon = previewIcon;

window.uploadSiteIcon = uploadSiteIcon;
window.resetSiteIcon = resetSiteIcon;
window.uploadSectionIcon = uploadSectionIcon;
window.uploadPaymentIcon = uploadPaymentIcon;
window.uploadDeliveryRowIcon = uploadDeliveryRowIcon;
window.applyIconFromLibrary = applyIconFromLibrary;
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
    showProductModal,
    addCategory,
    showPromotionModal: promotionsController.showPromotionModal,
    editProduct,
    delProduct,
    toggleProductEnabled,
    editCategory,
    delCategory,
    editPromotion: promotionsController.editPromotion,
    delPromotion: promotionsController.delPromotion,
    togglePromotionEnabled: promotionsController.togglePromotionEnabled,
    addSpecRow,
    closeProductModal,
    closePromotionModal: promotionsController.closePromotionModal,
    renderCategories,
    loadPromotions: promotionsController.loadPromotions,
  }),
  ...createSettingsActionHandlers({
    uploadSiteIcon,
    resetSiteIcon,
    uploadSectionIcon,
    uploadPaymentIcon,
    uploadDeliveryRowIcon,
    applyIconFromLibrary,
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
    loadUsers,
    toggleUserBlacklist,
    toggleUserRole,
    loadBlacklist,
  }),
};

const dashboardTabLoaders = {
  ...createOrdersTabLoaders({ loadOrders }),
  ...createProductsTabLoaders({
    renderCategories,
    loadPromotions: promotionsController.loadPromotions,
  }),
  ...createSettingsTabLoaders({
    loadSettings: settingsController.loadSettings,
    loadFormFields: formFieldsController.loadFormFields,
  }),
  ...createUsersTabLoaders({ loadUsers, loadBlacklist }),
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
    window.saveProduct,
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
    loadCategories(),
    loadProducts(),
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

// ============ 商品管理 ============
async function loadProducts() {
  try {
    const r = await authFetch(`${API_URL}?action=getProducts&_=${Date.now()}`);
    const d = await r.json();
    if (d.success) {
      products = d.products;
      renderProducts();
    }
  } catch (e) {
    console.error(e);
  }
}

let productsMap = {};
function isVueManagedProductsTable(
  table = document.getElementById("products-main-table"),
) {
  return table?.dataset?.vueManaged === "true";
}

function getProductPriceLines(product) {
  try {
    const specs = product.specs ? JSON.parse(product.specs) : [];
    const enabled = specs.filter((spec) => spec.enabled);
    if (enabled.length > 0) {
      return enabled.map((spec) => ({
        label: spec.label || "",
        price: Number(spec.price) || 0,
        isSpec: true,
      }));
    }
  } catch {}
  return [{ label: "", price: Number(product.price) || 0, isSpec: false }];
}

function buildProductViewModel(product) {
  const enabled = Boolean(product?.enabled);
  return {
    id: Number(product?.id) || 0,
    category: product?.category || "",
    name: product?.name || "",
    description: product?.description || "",
    roastLevel: product?.roastLevel || "",
    enabled,
    statusLabel: enabled ? "啟用" : "未啟用",
    statusClass: enabled ? "ui-text-success" : "ui-text-muted",
    priceLines: getProductPriceLines(product),
  };
}

function buildGroupedProductsViewModel(nextProducts = products) {
  const grouped = {};
  (Array.isArray(nextProducts) ? nextProducts : []).forEach((product) => {
    const category = product?.category || "";
    if (!grouped[category]) grouped[category] = [];
    grouped[category].push(buildProductViewModel(product));
  });
  const categoryOrder = categories.map((category) => category.name);
  const sortedCategories = Object.keys(grouped).sort((a, b) => {
    const ia = categoryOrder.indexOf(a);
    const ib = categoryOrder.indexOf(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
  return sortedCategories.map((category) => ({
    category,
    items: grouped[category],
  }));
}

function emitDashboardProductsUpdated(nextProducts = products) {
  window.dispatchEvent(
    new CustomEvent("coffee:dashboard-products-updated", {
      detail: { groups: buildGroupedProductsViewModel(nextProducts) },
    }),
  );
}

function initializeProductSortables(table) {
  if (typeof Sortable === "undefined") return;
  if (Array.isArray(window.productSortables)) {
    window.productSortables.forEach((sortable) => sortable?.destroy?.());
  }
  window.productSortables = [];
  if (!table) return;

  const sortables = table.querySelectorAll("tbody.sortable-tbody");
  sortables.forEach((tbody) => {
    if (!(tbody instanceof HTMLElement)) return;
    if (!tbody.querySelector("tr[data-id]")) return;
    const sortable = Sortable.create(tbody, {
      handle: ".drag-handle",
      animation: 150,
      onEnd: async function (evt) {
        if (evt.oldIndex === evt.newIndex) return;
        const ids = Array.from(tbody.querySelectorAll("tr[data-id]"))
          .map((tr) => Number.parseInt(tr.dataset.id || "", 10))
          .filter((id) => !Number.isNaN(id));
        await updateProductOrders(ids);
      },
    });
    window.productSortables.push(sortable);
  });
}

function renderProducts() {
  const table = document.getElementById("products-main-table");
  if (!table) return;

  productsMap = {};
  products.forEach((product) => {
    productsMap[product.id] = product;
  });

  if (isVueManagedProductsTable(table)) {
    emitDashboardProductsUpdated(products);
    requestAnimationFrame(() => initializeProductSortables(table));
    return;
  }

  table.querySelectorAll("tbody").forEach((el) => el.remove());

  const grouped = buildGroupedProductsViewModel(products);
  if (!grouped.length) {
    const tbody = document.createElement("tbody");
    tbody.innerHTML =
      '<tr><td colspan="6" class="text-center py-8 ui-text-subtle">尚無商品</td></tr>';
    table.appendChild(tbody);
    initializeProductSortables(table);
    return;
  }

  grouped.forEach((group) => {
    const tbody = document.createElement("tbody");
    tbody.className = "sortable-tbody";
    tbody.dataset.cat = group.category;

    let html = "";
    group.items.forEach((product) => {
      const priceDisplay = product.priceLines.map((line) =>
        line.isSpec
          ? `<div class="text-xs">${esc(line.label)}: $${line.price}</div>`
          : `$${line.price}`
      ).join("");
          html += `
            <tr class="border-b" style="border-color:#E2DCC8;" data-id="${product.id}">
                <td class="p-3 text-center">
                    <span class="drag-handle cursor-move ui-text-muted hover:ui-text-warning text-xl font-bold select-none px-2 inline-block" title="拖曳排序" style="touch-action: none;">
                      <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 256 256" class="drag-handle-icon"><path d="M104,60A12,12,0,1,1,92,48,12,12,0,0,1,104,60Zm60-12a12,12,0,1,0,12,12A12,12,0,0,0,164,48ZM92,116a12,12,0,1,0,12,12A12,12,0,0,0,92,116Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,116ZM92,184a12,12,0,1,0,12,12A12,12,0,0,0,92,184Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,184Z"></path></svg>
                    </span>
                </td>
                <td class="p-3 text-sm">${esc(product.category)}</td>
                <td class="p-3">
                    <div class="font-medium mb-1">${esc(product.name)}</div>
                    <div class="text-xs ui-text-subtle">${
        esc(product.description || "")
      } ${product.roastLevel ? "・" + product.roastLevel : ""}</div>
                </td>
                <td class="p-3 text-right font-medium">${priceDisplay}</td>
                <td class="p-3 text-center">
                    <button data-action="toggle-product-enabled" data-product-id="${product.id}" data-enabled="${String(!product.enabled)}" class="text-sm font-medium ${product.statusClass} hover:underline">${product.statusLabel}</button>
                </td>
                <td class="p-3 text-center">
                    <button data-action="edit-product" data-product-id="${product.id}" class="text-sm mr-2 ui-text-highlight">編輯</button>
                    <button data-action="delete-product" data-product-id="${product.id}" class="text-sm ui-text-danger">刪除</button>
                </td>
            </tr>`;
    });
    tbody.innerHTML = html;
    table.appendChild(tbody);
  });
  initializeProductSortables(table);
}

async function moveProduct(id, dir) {
  // 保留這個 function 防止舊有代碼出錯，但不再被介面呼叫
  try {
    const r = await authFetch(`${API_URL}?action=reorderProduct`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: getAuthUserId(), id, direction: dir }),
    });
    const d = await r.json();
    if (d.success) loadProducts();
    else throw new Error(d.error);
  } catch (e) {
    Swal.fire("錯誤", e.message, "error");
  }
}

async function updateProductOrders(ids) {
  try {
    const r = await authFetch(`${API_URL}?action=reorderProductsBulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: getAuthUserId(), ids }),
    });
    const d = await r.json();
    if (!d.success) throw new Error(d.error);
    // 不強制重新 load products，保持畫面順暢，除非發生錯誤
  } catch (e) {
    Swal.fire("錯誤", e.message, "error");
    loadProducts(); // 錯誤時重新載入以恢復原狀
  }
}

// ======== 預設規格模板 ========
const defaultSpecs = [
  { key: "quarter", label: "1/4磅", price: 0, enabled: true },
  { key: "half", label: "半磅", price: 0, enabled: true },
  { key: "drip_bag", label: "單包耳掛", price: 0, enabled: true },
];

function addSpecRow(specData) {
  const container = document.getElementById("specs-container");
  const s = specData || { key: "", label: "", price: 0, enabled: true };
  const div = document.createElement("div");
  div.className = "spec-row flex items-center gap-2 p-2 rounded-lg border";
  div.style.borderColor = "#E2DCC8";
  div.innerHTML = `
        <label class="flex items-center"><input type="checkbox" class="spec-enabled w-4 h-4" ${
    s.enabled ? "checked" : ""
  }></label>
        <input type="text" class="spec-label input-field text-sm py-1" value="${
    esc(s.label)
  }" placeholder="規格名稱" style="width:90px">
        <span class="ui-text-subtle text-sm">$</span>
        <input type="number" class="spec-price input-field text-sm py-1" value="${
    s.price || ""
  }" placeholder="價格" min="0" style="width:80px">
        <button type="button" data-action="remove-spec-row" class="text-red-400 hover:ui-text-danger text-lg font-bold">&times;</button>
    `;
  container.appendChild(div);
}

function getSpecsFromForm() {
  const rows = document.querySelectorAll("#specs-container > div");
  const specs = [];
  rows.forEach((row) => {
    const label = row.querySelector(".spec-label").value.trim();
    const price = parseInt(row.querySelector(".spec-price").value) || 0;
    const enabled = row.querySelector(".spec-enabled").checked;
    if (label) {
      const key =
        label.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, "_").toLowerCase() ||
        `spec_${Date.now()}`;
      specs.push({ key, label, price, enabled });
    }
  });
  return specs;
}

function loadSpecsToForm(specsStr) {
  const container = document.getElementById("specs-container");
  container.innerHTML = "";
  let specs = [];
  try {
    if (specsStr) specs = JSON.parse(specsStr);
  } catch {}
  if (!specs.length) specs = JSON.parse(JSON.stringify(defaultSpecs));
  specs.forEach((s) => addSpecRow(s));
}

async function showProductModal() {
  if (!categories || !categories.length) await loadCategories();
  document.getElementById("pm-title").textContent = "新增商品";
  document.getElementById("product-form").reset();
  document.getElementById("pm-id").value = "";
  document.getElementById("pm-enabled").checked = true;
  updateCategorySelect();
  loadSpecsToForm("");
  document.getElementById("product-modal").classList.remove("hidden");
}

async function editProduct(id) {
  if (!categories || !categories.length) await loadCategories();
  const p = productsMap[id];
  if (!p) {
    Swal.fire("錯誤", "找不到商品", "error");
    return;
  }
  document.getElementById("pm-title").textContent = "編輯商品";
  document.getElementById("pm-id").value = p.id;
  updateCategorySelect();
  document.getElementById("pm-category").value = p.category;
  document.getElementById("pm-name").value = p.name;
  document.getElementById("pm-desc").value = p.description || "";
  document.getElementById("pm-roast").value = p.roastLevel || "";
  document.getElementById("pm-enabled").checked = p.enabled;
  loadSpecsToForm(p.specs || "");
  document.getElementById("product-modal").classList.remove("hidden");
}

function closeProductModal() {
  document.getElementById("product-modal").classList.add("hidden");
}

function updateCategorySelect() {
  const sel = document.getElementById("pm-category");
  sel.innerHTML = '<option value="">選擇分類</option>' +
    categories.map((c) => `<option value="${c.name}">${c.name}</option>`).join(
      "",
    );
}

async function saveProduct(e) {
  e.preventDefault();
  const id = document.getElementById("pm-id").value;
  const specs = getSpecsFromForm();
  const enabledSpecs = specs.filter((s) => s.enabled);
  if (!enabledSpecs.length) {
    Swal.fire("錯誤", "請至少啟用一個規格", "error");
    return;
  }
  const hasZeroPrice = enabledSpecs.some((s) => !s.price || s.price <= 0);
  if (hasZeroPrice) {
    Swal.fire("錯誤", "已啟用的規格必須設定價格", "error");
    return;
  }

  const payload = {
    userId: getAuthUserId(),
    category: document.getElementById("pm-category").value,
    name: document.getElementById("pm-name").value,
    description: document.getElementById("pm-desc").value,
    price: enabledSpecs[0]?.price || 0,
    roastLevel: document.getElementById("pm-roast").value,
    specs: JSON.stringify(specs),
    enabled: document.getElementById("pm-enabled").checked,
  };
  if (id) payload.id = parseInt(id);
  try {
    const r = await authFetch(
      `${API_URL}?action=${id ? "updateProduct" : "addProduct"}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const d = await r.json();
    if (d.success) {
      Toast.fire({ icon: "success", title: id ? "已更新" : "已新增" });
      closeProductModal();
      loadProducts();
    } else throw new Error(d.error);
  } catch (e) {
    Swal.fire("錯誤", e.message, "error");
  }
}

async function delProduct(id) {
  const c = await Swal.fire({
    title: "刪除商品？",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#DC322F",
    confirmButtonText: "刪除",
    cancelButtonText: "取消",
  });
  if (!c.isConfirmed) return;
  try {
    const r = await authFetch(`${API_URL}?action=deleteProduct`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: getAuthUserId(), id }),
    });
    const d = await r.json();
    if (d.success) {
      Toast.fire({ icon: "success", title: "已刪除" });
      loadProducts();
    }
  } catch (e) {
    Swal.fire("錯誤", e.message, "error");
  }
}

async function toggleProductEnabled(id, enabled) {
  const product = productsMap[id];
  if (!product) {
    Swal.fire("錯誤", "找不到商品", "error");
    return;
  }

  const payload = {
    userId: getAuthUserId(),
    id: Number(product.id),
    category: product.category || "",
    name: product.name || "",
    description: product.description || "",
    price: Number(product.price) || 0,
    weight: product.weight || "",
    origin: product.origin || "",
    roastLevel: product.roastLevel || "",
    specs: product.specs || "",
    imageUrl: product.imageUrl || "",
    enabled: Boolean(enabled),
  };

  try {
    const r = await authFetch(`${API_URL}?action=updateProduct`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const d = await r.json();
    if (!d.success) throw new Error(d.error || "商品狀態更新失敗");
    product.enabled = Boolean(enabled);
    renderProducts();
    Toast.fire({
      icon: "success",
      title: enabled ? "商品已啟用" : "商品已停用",
    });
  } catch (e) {
    Swal.fire("錯誤", e.message, "error");
  }
}

// ============ 分類管理 ============
async function loadCategories() {
  try {
    const r = await authFetch(
      `${API_URL}?action=getCategories&_=${Date.now()}`,
    );
    const d = await r.json();
    if (d.success) {
      categories = d.categories;
      renderCategories();
    }
  } catch (e) {
    console.error(e);
  }
}

let categoriesMap = {};
function isVueManagedCategoriesList(
  container = document.getElementById("categories-list"),
) {
  return container?.dataset?.vueManaged === "true";
}

function buildCategoryViewModel(category) {
  return {
    id: Number(category?.id) || 0,
    name: category?.name || "",
  };
}

function emitDashboardCategoriesUpdated(nextCategories = categories) {
  const viewCategories = (Array.isArray(nextCategories) ? nextCategories : [])
    .map((category) => buildCategoryViewModel(category))
    .filter((category) => category.id > 0);
  window.dispatchEvent(
    new CustomEvent("coffee:dashboard-categories-updated", {
      detail: { categories: viewCategories },
    }),
  );
}

function initializeCategorySortable(container) {
  if (typeof Sortable === "undefined") return;
  if (window.categorySortable) {
    window.categorySortable.destroy();
    window.categorySortable = null;
  }
  if (!container?.querySelector("[data-id]")) return;
  window.categorySortable = Sortable.create(container, {
    handle: ".drag-handle-cat",
    animation: 150,
    onEnd: async function () {
      const ids = Array.from(container.querySelectorAll("[data-id]"))
        .map((el) => Number.parseInt(el.dataset.id || "", 10))
        .filter((id) => !Number.isNaN(id));
      await updateCategoryOrders(ids);
    },
  });
}

function renderCategories() {
  const container = document.getElementById("categories-list");
  if (!container) return;

  categoriesMap = {};
  categories.forEach((c) => {
    categoriesMap[c.id] = c;
  });

  if (isVueManagedCategoriesList(container)) {
    emitDashboardCategoriesUpdated(categories);
    requestAnimationFrame(() => initializeCategorySortable(container));
    return;
  }

  if (!categories.length) {
    container.innerHTML =
      '<p class="text-center ui-text-subtle py-4">尚無分類</p>';
    initializeCategorySortable(container);
    return;
  }

  container.innerHTML = categories.map((c) => `
        <div class="flex items-center justify-between p-3 mb-2 rounded-lg" style="background:#FFFDF7; border:1px solid #E2DCC8;" data-id="${c.id}">
            <div class="flex items-center gap-2">
                <span class="drag-handle-cat cursor-move ui-text-muted hover:ui-text-warning text-xl font-bold select-none px-1" title="拖曳排序" style="touch-action: none;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 256 256" class="drag-handle-icon"><path d="M104,60A12,12,0,1,1,92,48,12,12,0,0,1,104,60Zm60-12a12,12,0,1,0,12,12A12,12,0,0,0,164,48ZM92,116a12,12,0,1,0,12,12A12,12,0,0,0,92,116Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,116ZM92,184a12,12,0,1,0,12,12A12,12,0,0,0,92,184Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,184Z"></path></svg>
                </span>
                <span class="font-medium">${esc(c.name)}</span>
            </div>
            <div class="flex gap-2">
                <button data-action="edit-category" data-category-id="${c.id}" class="text-sm ui-text-highlight">編輯</button>
                <button data-action="delete-category" data-category-id="${c.id}" class="text-sm ui-text-danger">刪除</button>
            </div>
        </div>
    `).join("");

  initializeCategorySortable(container);
}

async function addCategory() {
  const name = document.getElementById("new-cat-name").value.trim();
  if (!name) return;
  try {
    const r = await authFetch(`${API_URL}?action=addCategory`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: getAuthUserId(), name }),
    });
    const d = await r.json();
    if (d.success) {
      document.getElementById("new-cat-name").value = "";
      Toast.fire({ icon: "success", title: "已新增" });
      loadCategories();
    } else throw new Error(d.error);
  } catch (e) {
    Swal.fire("錯誤", e.message, "error");
  }
}

async function editCategory(id) {
  const cat = categoriesMap[id];
  if (!cat) {
    Swal.fire("錯誤", "找不到分類", "error");
    return;
  }
  const oldName = cat.name;
  const { value } = await Swal.fire({
    title: "修改分類",
    input: "text",
    inputValue: oldName,
    showCancelButton: true,
    confirmButtonText: "更新",
    cancelButtonText: "取消",
  });
  if (value && value !== oldName) {
    try {
      const r = await authFetch(`${API_URL}?action=updateCategory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: getAuthUserId(), id, name: value }),
      });
      const d = await r.json();
      if (d.success) {
        Toast.fire({ icon: "success", title: "分類已更新，商品同步完成" });
        loadCategories();
        loadProducts();
      }
    } catch (e) {
      Swal.fire("錯誤", e.message, "error");
    }
  }
}

async function delCategory(id) {
  const c = await Swal.fire({
    title: "刪除分類？",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#DC322F",
    confirmButtonText: "刪除",
    cancelButtonText: "取消",
  });
  if (!c.isConfirmed) return;
  try {
    const r = await authFetch(`${API_URL}?action=deleteCategory`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: getAuthUserId(), id }),
    });
    const d = await r.json();
    if (d.success) loadCategories();
  } catch (e) {
    Swal.fire("錯誤", e.message, "error");
  }
}

async function updateCategoryOrders(ids) {
  try {
    const r = await authFetch(`${API_URL}?action=reorderCategory`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: getAuthUserId(), ids }),
    });
    const d = await r.json();
    if (!d.success) throw new Error(d.error);
  } catch (e) {
    Swal.fire("錯誤", e.message, "error");
    loadCategories();
  }
}

// ============ 用戶管理 ============
async function loadUsers() {
  try {
    const search = document.getElementById("user-search").value;
    Swal.fire({
      title: "載入中...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });
    const r = await authFetch(
      `${API_URL}?action=getUsers&userId=${getAuthUserId()}&search=${
        encodeURIComponent(search)
      }&_=${Date.now()}`,
    );
    const d = await r.json();
    if (d.success) {
      users = d.users;
      renderUsers();
      Swal.close();
    } else Swal.fire("錯誤", d.error, "error");
  } catch (e) {
    Swal.fire("錯誤", e.message, "error");
  }
}

function isVueManagedUsersTable(tbody = document.getElementById("users-table")) {
  return tbody?.dataset?.vueManaged === "true";
}

function getUserDefaultDeliveryText(user) {
  if (user.defaultDeliveryMethod === "delivery") {
    return `宅配 (${user.defaultCity || ""}${user.defaultDistrict || ""} ${
      user.defaultAddress || ""
    })`;
  }
  if (user.defaultDeliveryMethod === "in_store") return "來店自取";
  if (user.defaultDeliveryMethod) {
    return `${user.defaultDeliveryMethod === "seven_eleven" ? "7-11" : "全家"} (${
      user.defaultStoreName || ""
    } - ${user.defaultStoreId || ""})`;
  }
  return "尚未設定";
}

function buildUserViewModel(user, isSuperAdmin) {
  const isUserSuperAdmin = user.role === "SUPER_ADMIN";
  const isAdmin = user.role === "ADMIN" || isUserSuperAdmin;
  const isBlocked = user.status === "BLACKLISTED";
  const roleAction = isSuperAdmin && !isUserSuperAdmin
    ? {
      newRole: isAdmin ? "USER" : "ADMIN",
      label: isAdmin ? "移除管理員" : "設為管理員",
      className: isAdmin
        ? "ui-text-danger hover:text-red-800"
        : "text-purple-600 hover:text-purple-800",
    }
    : null;

  return {
    userId: user.userId || "",
    displayName: user.displayName || "",
    pictureUrl: user.pictureUrl || "https://via.placeholder.com/40",
    email: user.email || "",
    phone: user.phone || "",
    defaultDeliveryText: getUserDefaultDeliveryText(user),
    isAdmin,
    isBlocked,
    roleBadgeText: isAdmin ? "管理員" : "用戶",
    roleBadgeClass: isAdmin
      ? "bg-purple-100 text-purple-800"
      : "ui-bg-soft ui-text-strong",
    statusBadgeText: isBlocked ? "黑名單" : "正常",
    statusBadgeClass: isBlocked
      ? "bg-red-100 text-red-800"
      : "bg-green-100 text-green-800",
    lastLoginText: user.lastLogin
      ? new Date(user.lastLogin).toLocaleString("zh-TW")
      : "無紀錄",
    blacklistActionBlockedValue: String(!isBlocked),
    blacklistActionLabel: isBlocked ? "解除封鎖" : "封鎖",
    blacklistActionClass: isBlocked
      ? "ui-text-success hover:text-green-800"
      : "ui-text-danger hover:text-red-700",
    roleAction,
  };
}

function emitDashboardUsersUpdated(nextUsers = users) {
  const isSuperAdmin = currentUser?.role === "SUPER_ADMIN";
  const viewUsers = (Array.isArray(nextUsers) ? nextUsers : []).map((user) =>
    buildUserViewModel(user, isSuperAdmin)
  );
  window.dispatchEvent(
    new CustomEvent("coffee:dashboard-users-updated", {
      detail: { users: viewUsers },
    }),
  );
}

function renderUsers() {
  const tbody = document.getElementById("users-table");
  if (!tbody) return;
  if (isVueManagedUsersTable(tbody)) {
    emitDashboardUsersUpdated(users);
    return;
  }
  if (!users.length) {
    tbody.innerHTML =
      '<tr><td colspan="4" class="text-center py-8 ui-text-subtle">無符合條件的用戶</td></tr>';
    return;
  }
  const isSuperAdmin = currentUser?.role === "SUPER_ADMIN";

  tbody.innerHTML = users.map((u) => {
    const isUserSuperAdmin = u.role === "SUPER_ADMIN";
    const isAdmin = u.role === "ADMIN" || u.role === "SUPER_ADMIN";
    const isBlocked = u.status === "BLACKLISTED";
    const lastLogin = u.lastLogin
      ? new Date(u.lastLogin).toLocaleString("zh-TW")
      : "無紀錄";

    let actions = "";
    if (isBlocked) {
      actions += `<button data-action="toggle-user-blacklist" data-user-id="${
        esc(u.userId)
      }" data-blocked="false" class="ui-text-success hover:text-green-800 text-sm font-medium mr-3">解除封鎖</button>`;
    } else {
      actions += `<button data-action="toggle-user-blacklist" data-user-id="${
        esc(u.userId)
      }" data-blocked="true" class="ui-text-danger hover:text-red-700 text-sm font-medium mr-3">封鎖</button>`;
    }

    if (isSuperAdmin && !isUserSuperAdmin) {
      if (isAdmin) {
        actions += `<button data-action="toggle-user-role" data-user-id="${
          esc(u.userId)
        }" data-new-role="USER" class="ui-text-danger hover:text-red-800 text-sm font-medium">移除管理員</button>`;
      } else {
        actions += `<button data-action="toggle-user-role" data-user-id="${
          esc(u.userId)
        }" data-new-role="ADMIN" class="text-purple-600 hover:text-purple-800 text-sm font-medium">設為管理員</button>`;
      }
    }

    return `
        <tr class="border-b" style="border-color:#E2DCC8;">
            <td class="p-3"><img src="${
      esc(u.pictureUrl) || "https://via.placeholder.com/40"
    }" class="w-10 h-10 rounded-full border"></td>
            <td class="p-3">
                <div class="font-medium ui-text-strong">${
      esc(u.displayName)
    }</div>
                <div class="text-xs ui-text-subtle">${esc(u.email || "")} ${
      u.phone ? "・" + esc(u.phone) : ""
    }</div>
                <div class="text-xs ui-text-subtle mt-1">${
      u.defaultDeliveryMethod === "delivery"
        ? `宅配 (${esc(u.defaultCity)}${esc(u.defaultDistrict)} ${
          esc(u.defaultAddress)
        })`
        : u.defaultDeliveryMethod === "in_store"
        ? "來店自取"
        : u.defaultDeliveryMethod
        ? `${u.defaultDeliveryMethod === "seven_eleven" ? "7-11" : "全家"} (${
          esc(u.defaultStoreName)
        } - ${esc(u.defaultStoreId)})`
        : "尚未設定"
    }</div>
                <div class="text-xs ui-text-muted font-mono mt-1 opacity-50">${
      esc(u.userId)
    }</div>
            </td>
            <td class="p-3">
                <div>${
      isAdmin
        ? '<span class="px-2 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-800">管理員</span>'
        : '<span class="px-2 py-0.5 rounded text-xs font-medium ui-bg-soft ui-text-strong">用戶</span>'
    }</div>
                <div class="mt-1">${
      isBlocked
        ? '<span class="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800">黑名單</span>'
        : '<span class="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">正常</span>'
    }</div>
                <div class="text-xs ui-text-muted mt-1">登入：${lastLogin}</div>
            </td>
            <td class="p-3 text-right">${actions}</td>
        </tr>`;
  }).join("");
}

async function toggleUserRole(targetUserId, newRole) {
  const c = await Swal.fire({
    title: `設為 ${newRole === "ADMIN" ? "管理員" : "一般用戶"}？`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "確定",
  });
  if (!c.isConfirmed) return;
  try {
    Swal.fire({
      title: "處理中...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });
    const r = await authFetch(`${API_URL}?action=updateUserRole`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId, newRole }),
    });
    const d = await r.json();
    if (d.success) {
      Toast.fire({ icon: "success", title: "權限已更新" });
      loadUsers();
    } else throw new Error(d.error);
  } catch (e) {
    Swal.fire("錯誤", e.message, "error");
  }
}

async function toggleUserBlacklist(targetUserId, isBlocked) {
  if (isBlocked) {
    const { value: reason } = await Swal.fire({
      title: "封鎖用戶",
      input: "text",
      inputPlaceholder: "請輸入封鎖原因（例如惡意棄單）",
      showCancelButton: true,
      confirmButtonText: "封鎖",
    });
    if (reason === undefined) return;
    try {
      Swal.fire({
        title: "處理中...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });
      const r = await authFetch(`${API_URL}?action=addToBlacklist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId, reason }),
      });
      const d = await r.json();
      if (d.success) {
        Toast.fire({ icon: "success", title: "已加入黑名單" });
        loadUsers();
        if (
          document.getElementById("tab-blacklist").classList.contains(
            "tab-active",
          )
        ) loadBlacklist();
      } else throw new Error(d.error);
    } catch (e) {
      Swal.fire("錯誤", e.message, "error");
    }
  } else {
    const c = await Swal.fire({
      title: "解除封鎖？",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "確定解除",
    });
    if (!c.isConfirmed) return;
    try {
      Swal.fire({
        title: "處理中...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });
      const r = await authFetch(`${API_URL}?action=removeFromBlacklist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId }),
      });
      const d = await r.json();
      if (d.success) {
        Toast.fire({ icon: "success", title: "已解除封鎖" });
        loadUsers();
        if (
          document.getElementById("tab-blacklist").classList.contains(
            "tab-active",
          )
        ) loadBlacklist();
      } else throw new Error(d.error);
    } catch (e) {
      Swal.fire("錯誤", e.message, "error");
    }
  }
}

// ============ 黑名單 ============
async function loadBlacklist() {
  try {
    const r = await authFetch(
      `${API_URL}?action=getBlacklist&userId=${getAuthUserId()}&_=${Date.now()}`,
    );
    const d = await r.json();
    if (d.success) {
      blacklist = d.blacklist;
      renderBlacklist();
    }
  } catch (e) {
    console.error(e);
  }
}

function isVueManagedBlacklistTable(
  tbody = document.getElementById("blacklist-table"),
) {
  return tbody?.dataset?.vueManaged === "true";
}

function buildBlacklistViewModel(blacklistEntry) {
  return {
    displayName: blacklistEntry.displayName || "",
    lineUserId: blacklistEntry.lineUserId || "",
    blockedAtText: blacklistEntry.blockedAt
      ? new Date(blacklistEntry.blockedAt).toLocaleString("zh-TW")
      : "無紀錄",
    reasonText: blacklistEntry.reason || "(無原因)",
  };
}

function emitDashboardBlacklistUpdated(nextBlacklist = blacklist) {
  const viewBlacklist = (Array.isArray(nextBlacklist) ? nextBlacklist : [])
    .map((entry) => buildBlacklistViewModel(entry));
  window.dispatchEvent(
    new CustomEvent("coffee:dashboard-blacklist-updated", {
      detail: { blacklist: viewBlacklist },
    }),
  );
}

function renderBlacklist() {
  const tbody = document.getElementById("blacklist-table");
  if (!tbody) return;
  if (isVueManagedBlacklistTable(tbody)) {
    emitDashboardBlacklistUpdated(blacklist);
    return;
  }
  if (!blacklist.length) {
    tbody.innerHTML =
      '<tr><td colspan="3" class="text-center py-8 ui-text-subtle">目前沒有封鎖名單</td></tr>';
    return;
  }
  tbody.innerHTML = blacklist.map((b) => {
    const dt = b.blockedAt
      ? new Date(b.blockedAt).toLocaleString("zh-TW")
      : "無紀錄";
    return `
        <tr class="border-b" style="border-color:#E2DCC8;">
            <td class="p-3">
                <div class="font-medium">${esc(b.displayName)}</div>
                <div class="text-xs ui-text-muted font-mono">${
      esc(b.lineUserId)
    }</div>
            </td>
            <td class="p-3">
                <div class="text-sm">${dt}</div>
                <div class="text-xs ui-text-danger mt-1">${
      esc(b.reason) || "(無原因)"
    }</div>
            </td>
            <td class="p-3 text-right">
                <button data-action="toggle-user-blacklist" data-user-id="${
      esc(b.lineUserId)
    }" data-blocked="false" class="ui-text-success hover:text-green-800 text-sm font-medium">解除封鎖</button>
            </td>
        </tr>`;
  }).join("");
}

// ============ Icon 上傳 ============
function previewIcon(input) {
  if (!(input instanceof HTMLInputElement)) return;
  const file = input.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = String(e?.target?.result || "");
    if (!dataUrl) return;

    if (input.classList.contains("do-icon-file")) {
      const row = input.closest(".delivery-option-row");
      const preview = row?.querySelector(".do-icon-preview");
      if (preview instanceof HTMLImageElement) {
        setPreviewImageSource(preview, dataUrl, getRowFallbackIconUrl(row));
      }
      return;
    }

    const previewId = input.dataset.previewTarget;
    if (previewId) {
      updateIconPreview({
        previewId,
        rawUrl: dataUrl,
        fallbackUrl: getDefaultIconUrl(input.dataset.fallbackKey || ""),
      });
    }
  };
  reader.readAsDataURL(file);
}

function getRowFallbackIconUrl(row) {
  const key = row?.dataset?.defaultIconKey || "delivery";
  return getDefaultIconUrl(key);
}

const ICON_PREVIEW_PLACEHOLDER = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="7" y="7" width="50" height="50" rx="12" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="3"/><path d="M20 41l9-10 7 7 8-10 7 13H20z" fill="#94A3B8"/><circle cx="25" cy="24" r="4" fill="#94A3B8"/></svg>',
)}`;

function pushPreviewCandidate(candidates, seen, value) {
  const normalized = String(value || "").trim();
  if (!normalized || seen.has(normalized)) return;
  seen.add(normalized);
  candidates.push(normalized);
}

function buildPreviewSrcCandidates(rawUrl, fallbackUrl = "") {
  const candidates = [];
  const seen = new Set();
  const rawValues = [rawUrl, fallbackUrl];

  rawValues.forEach((value) => {
    const normalizedValue = normalizeIconPath(value || "");
    const resolved = resolveAssetUrl(normalizedValue);
    if (!resolved) return;

    pushPreviewCandidate(candidates, seen, resolved);

    if (
      typeof window !== "undefined" &&
      /^\/(?:sc\/)?icons\//.test(resolved)
    ) {
      pushPreviewCandidate(candidates, seen, `${window.location.origin}${resolved}`);
    }

    if (/^(?:https?:|data:|blob:|\/\/)/i.test(resolved)) {
      if (/^(?:data:|blob:|\/\/)/i.test(resolved)) return;
      try {
        const parsed = new URL(resolved);
        const normalizedPath = parsed.pathname || "";
        if (normalizedPath.startsWith("/sc/icons/")) {
          const rootPath =
            `/icons/${normalizedPath.slice("/sc/icons/".length)}`;
          pushPreviewCandidate(
            candidates,
            seen,
            rootPath,
          );
          pushPreviewCandidate(
            candidates,
            seen,
            `${parsed.origin}${rootPath}`,
          );
        } else if (normalizedPath.startsWith("/icons/")) {
          const scPath = `/sc${normalizedPath}`;
          pushPreviewCandidate(candidates, seen, scPath);
          pushPreviewCandidate(candidates, seen, `${parsed.origin}${scPath}`);
        }
      } catch {
      }
      return;
    }

    if (resolved.startsWith("/sc/")) {
      const rootPath = resolved.replace(/^\/sc\//, "/");
      pushPreviewCandidate(candidates, seen, rootPath);
      if (typeof window !== "undefined") {
        pushPreviewCandidate(candidates, seen, `${window.location.origin}${rootPath}`);
      }
      return;
    }

    if (resolved.startsWith("/icons/")) {
      const scPath = `/sc${resolved}`;
      pushPreviewCandidate(candidates, seen, scPath);
      if (typeof window !== "undefined") {
        pushPreviewCandidate(candidates, seen, `${window.location.origin}${scPath}`);
      }
    }
  });

  return candidates;
}

function setPreviewImageSource(preview, rawUrl, fallbackUrl = "") {
  if (!(preview instanceof HTMLImageElement)) return "";
  const candidates = buildPreviewSrcCandidates(rawUrl, fallbackUrl);
  const applyPlaceholder = () => {
    preview.onerror = null;
    preview.src = ICON_PREVIEW_PLACEHOLDER;
    preview.classList.add("is-placeholder");
    preview.classList.remove("hidden");
  };
  if (!candidates.length) {
    applyPlaceholder();
    return "";
  }

  let candidateIndex = 0;
  const applyCandidate = () => {
    preview.classList.remove("is-placeholder");
    preview.src = candidates[candidateIndex];
    preview.classList.remove("hidden");
  };

  preview.onerror = () => {
    candidateIndex += 1;
    if (candidateIndex < candidates.length) {
      applyCandidate();
      return;
    }
    applyPlaceholder();
  };

  applyCandidate();
  return candidates[0];
}

function updateIconPreview({ previewId, rawUrl, fallbackUrl = "" }) {
  const preview = document.getElementById(previewId);
  if (!(preview instanceof HTMLImageElement)) return "";
  return setPreviewImageSource(preview, rawUrl, fallbackUrl);
}

function validateIconFile(file) {
  if (!file) {
    Swal.fire("提示", "請先選擇圖片檔案", "info");
    return false;
  }
  if (!String(file.type || "").startsWith("image/")) {
    Swal.fire("錯誤", "請選擇圖片檔案 (PNG/JPG/WebP)", "error");
    return false;
  }
  return true;
}

async function fileToBase64(file) {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result || "");
      resolve(value.split(",")[1] || "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}



function setIconUrlToField({
  inputId,
  displayId,
  previewId,
  url,
  fallbackKey = "",
}) {
  const normalizedUrl = normalizeIconPath(url);
  const finalUrl = normalizedUrl || String(url || "").trim();
  const input = document.getElementById(inputId);
  if (input) input.value = finalUrl;
  const display = document.getElementById(displayId);
  if (display) {
    const resolvedDisplayUrl = resolveAssetUrl(finalUrl) || finalUrl;
    display.textContent = resolvedDisplayUrl;
  }
  if (previewId) {
    updateIconPreview({
      previewId,
      rawUrl: finalUrl,
      fallbackUrl: getDefaultIconUrl(fallbackKey),
    });
  }

  const paymentInputMatch = /^po-(cod|linepay|jkopay|transfer)-icon-url$/.exec(
    String(inputId || ""),
  );
  if (paymentInputMatch) {
    updateDeliveryRoutingPaymentHeaderIcon(paymentInputMatch[1], finalUrl);
  }

}

function applyIconFromLibrary(button) {
  const targetSelect = document.getElementById("icon-library-target");
  const targetKey = String(targetSelect?.value || "site").trim();
  const target = ICON_LIBRARY_TARGET_MAP[targetKey];
  if (!target) {
    Swal.fire("錯誤", "請先選擇有效的套用目標", "error");
    return;
  }

  const iconKey = String(button?.dataset?.iconKey || "").trim();
  const rawUrl = String(button?.dataset?.iconUrl || "").trim();
  const iconUrl = rawUrl || getDefaultIconUrl(iconKey);
  if (!iconUrl) {
    Swal.fire("錯誤", "找不到要套用的 icon 路徑", "error");
    return;
  }

  setIconUrlToField({
    inputId: target.inputId,
    displayId: target.displayId,
    previewId: target.previewId,
    url: iconUrl,
    fallbackKey: target.fallbackKey,
  });
  Toast.fire({
    icon: "success",
    title: `已套用到${target.label}`,
  });
}


async function uploadAssetFile(file, settingKey = "") {
  const base64 = await fileToBase64(file);
  const r = await authFetch(`${API_URL}?action=uploadAsset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: getAuthUserId(),
      fileData: base64,
      fileName: file.name,
      contentType: file.type,
      settingKey,
    }),
  });
  return await r.json();
}

async function uploadSiteIcon() {
  const fileInput = document.getElementById("s-site-icon-upload");
  const file = fileInput?.files?.[0];
  if (!validateIconFile(file)) return;

  Swal.fire({
    title: "上傳中...",
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });

  try {
    const d = await uploadAssetFile(file, "site_icon_url");
    if (d.success) {
      document.getElementById("s-site-icon-url").value = d.url;
      updateIconPreview({
        previewId: "s-icon-preview",
        rawUrl: d.url,
        fallbackUrl: getDefaultIconUrl("brand"),
      });
      document.getElementById("s-icon-url-display").textContent = "自訂 Logo (儲存後生效)";
      Toast.fire({ icon: "success", title: "品牌 Logo 已上傳！請記得點擊儲存設定。" });
    } else {
      Swal.fire("錯誤", d.error, "error");
    }
  } catch (e) {
    Swal.fire("錯誤", e.message, "error");
  } finally {
    if (fileInput) fileInput.value = "";
  }
}

async function resetSiteIcon() {
  document.getElementById("s-site-icon-url").value = "";
  updateIconPreview({
    previewId: "s-icon-preview",
    rawUrl: getDefaultIconUrl("brand"),
    fallbackUrl: getDefaultIconUrl("brand"),
  });
  document.getElementById("s-icon-url-display").textContent = "未設定 (預設)";
  Toast.fire({ icon: "success", title: "已恢復預設 Logo！請記得點擊儲存設定。" });
}

async function uploadSectionIcon(button) {
  const section = button?.dataset?.section;
  if (!section) return;

  const fileInput = document.getElementById(`s-${section}-icon-file`);
  const file = fileInput?.files?.[0];
  if (!validateIconFile(file)) return;

  Swal.fire({
    title: "上傳中...",
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });

  try {
    const settingKey = sectionIconSettingKey(section);
    const d = await uploadAssetFile(file, settingKey);
    if (d.success) {
      const fallbackKey = section === "products"
        ? "products"
        : section === "delivery"
        ? "delivery"
        : "notes";
      setIconUrlToField({
        inputId: `s-${section}-icon-url`,
        displayId: `s-${section}-icon-url-display`,
        previewId: `s-${section}-icon-preview`,
        url: d.url,
        fallbackKey,
      });
      Toast.fire({ icon: "success", title: "區塊圖示已更新" });
    } else Swal.fire("錯誤", d.error, "error");
  } catch (e) {
    Swal.fire("錯誤", e.message, "error");
  }
}

async function uploadPaymentIcon(button) {
  const method = button?.dataset?.method;
  if (!method) return;

  const fileInput = document.getElementById(`po-${method}-icon-file`);
  const file = fileInput?.files?.[0];
  if (!validateIconFile(file)) return;

  Swal.fire({
    title: "上傳中...",
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });

  try {
    const d = await uploadAssetFile(file, "");
    if (d.success) {
      setIconUrlToField({
        inputId: `po-${method}-icon-url`,
        displayId: `po-${method}-icon-url-display`,
        previewId: `po-${method}-icon-preview`,
        url: d.url,
        fallbackKey: paymentIconFallbackKey(method),
      });
      Toast.fire({ icon: "success", title: "付款圖示已更新" });
    } else Swal.fire("錯誤", d.error, "error");
  } catch (e) {
    Swal.fire("錯誤", e.message, "error");
  }
}

async function uploadDeliveryRowIcon(button) {
  const row = button?.closest?.(".delivery-option-row");
  if (!row) return;
  const fileInput = row.querySelector(".do-icon-file");
  const file = fileInput?.files?.[0];
  if (!validateIconFile(file)) return;

  Swal.fire({
    title: "上傳中...",
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });

  try {
    const d = await uploadAssetFile(file, "");
    if (d.success) {
      const normalizedUrl = normalizeIconPath(d.url);
      const finalUrl = normalizedUrl || String(d.url || "").trim();
      const urlInput = row.querySelector(".do-icon-url");
      const urlDisplay = row.querySelector(".do-icon-url-display");
      const preview = row.querySelector(".do-icon-preview");
      if (urlInput) urlInput.value = finalUrl;
      if (urlDisplay) {
        const resolvedDisplayUrl = resolveAssetUrl(finalUrl) || finalUrl;
        urlDisplay.textContent = resolvedDisplayUrl;
      }
      if (preview instanceof HTMLImageElement) {
        setPreviewImageSource(preview, finalUrl, getRowFallbackIconUrl(row));
      }
      Toast.fire({ icon: "success", title: "物流圖示已更新" });
    } else Swal.fire("錯誤", d.error, "error");
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
