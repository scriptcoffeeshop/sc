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
import {
  createSettingsActionHandlers,
  createSettingsTabLoaders,
} from "./dashboard/modules/settings.js";
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
let bankAccounts = [];
let bankAccountsSortable = null;
window.promotions = [];
let dashboardSettings = {};
let settingsLoadToken = 0;
const LINEPAY_SANDBOX_CACHE_KEY = "coffee_linepay_sandbox";

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

  return {
    ...defaults,
    ...item,
    id: id || defaults.id,
    icon: String(item.icon ?? defaults.icon ?? ""),
    icon_url: String(
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
    icon_url: String(option.icon_url ?? option.iconUrl ?? defaults.icon_url ?? ""),
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

function getAuthUserId() {
  if (!currentUser?.userId) throw new Error("請先登入");
  return currentUser.userId;
}

function parseBooleanSetting(value, defaultValue = true) {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }
  const normalized = String(value).trim().toLowerCase();
  return !["false", "0", "off", "no"].includes(normalized);
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
window.saveSettings = saveSettings;
window.loadUsers = loadUsers;
window.toggleUserRole = toggleUserRole;
window.toggleUserBlacklist = toggleUserBlacklist;
window.loadBlacklist = loadBlacklist;
window.esc = esc;
window.showAddFieldModal = showAddFieldModal;
window.editFormField = editFormField;
window.deleteFormField = deleteFormField;
window.toggleFieldEnabled = toggleFieldEnabled;
window.previewIcon = previewIcon;

window.uploadSiteIcon = uploadSiteIcon;
window.resetSiteIcon = resetSiteIcon;
window.uploadSectionIcon = uploadSectionIcon;
window.uploadPaymentIcon = uploadPaymentIcon;
window.uploadDeliveryRowIcon = uploadDeliveryRowIcon;
window.applyIconFromLibrary = applyIconFromLibrary;
window.resetSectionTitle = resetSectionTitle;
window.linePayRefundOrder = linePayRefundOrder;
window.showAddBankAccountModal = showAddBankAccountModal;
window.editBankAccount = editBankAccount;
window.deleteBankAccount = deleteBankAccount;
window.showPromotionModal = showPromotionModal;
window.closePromotionModal = closePromotionModal;
window.savePromotion = savePromotion;
window.editPromotion = editPromotion;
window.delPromotion = delPromotion;

const dashboardActionHandlers = {
  "login-with-line": () => window.loginWithLine(),
  "logout": () => logout(),
  ...createOrdersActionHandlers({
    loadOrders,
    changeOrderStatus,
    sendOrderFlexByOrderId,
    sendOrderEmailByOrderId,
    deleteOrderById,
    linePayRefundOrder,
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
    showPromotionModal,
    editProduct,
    delProduct,
    toggleProductEnabled,
    editCategory,
    delCategory,
    editPromotion,
    delPromotion,
    togglePromotionEnabled,
    addSpecRow,
    closeProductModal,
    closePromotionModal,
    renderCategories,
    loadPromotions,
  }),
  ...createSettingsActionHandlers({
    uploadSiteIcon,
    resetSiteIcon,
    uploadSectionIcon,
    uploadPaymentIcon,
    uploadDeliveryRowIcon,
    applyIconFromLibrary,
    resetSectionTitle,
    addDeliveryOptionAdmin,
    showAddBankAccountModal,
    saveSettings,
    showAddFieldModal,
    toggleFieldEnabled,
    editFormField,
    deleteFormField,
    editBankAccount,
    deleteBankAccount,
    loadSettings,
    loadFormFields,
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
  ...createProductsTabLoaders({ renderCategories, loadPromotions }),
  ...createSettingsTabLoaders({ loadSettings, loadFormFields }),
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
  await Promise.all([loadCategories(), loadProducts(), loadSettings()]);
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
  transfer: "轉帳",
};

const orderPayStatusLabel = {
  pending: "待付款",
  paid: "已付款",
  failed: "失敗",
  cancelled: "取消",
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
  const paymentLabel =
    orderPayMethodLabel[order.paymentMethod || "cod"] || "貨到付款";
  const paymentStatusStr = order.paymentStatus
    ? ` (${orderPayStatusLabel[order.paymentStatus] || order.paymentStatus})`
    : "";
  const receiptInfo = normalizeReceiptInfo(order.receiptInfo);
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
  const paymentStatus = order.paymentStatus || "";
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
      : paymentStatus === "refunded"
      ? "bg-purple-50 text-purple-700"
      : paymentStatus === "pending"
      ? "bg-yellow-50 text-yellow-700"
      : "ui-bg-soft ui-text-strong",
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
    showRefundButton: paymentMethod === "linepay" && paymentStatus === "paid",
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
    const ps = o.paymentStatus || "";
    const refundBtn = pm === "linepay" && ps === "paid"
      ? `<button data-action="refund-linepay-order" data-order-id="${
        esc(o.orderId)
      }" class="text-xs ui-text-violet hover:opacity-80 inline-flex items-center gap-1"><img src="${
        esc(getDefaultIconUrl("refund"))
      }" alt="" class="ui-icon-inline">退款</button>`
      : "";
    const payBadge = pm !== "cod"
      ? `<span class="text-xs px-2 py-0.5 rounded-full ui-border ${
        ps === "paid"
          ? "ui-text-success ui-bg-card-strong"
          : ps === "refunded"
          ? "ui-text-violet ui-bg-card-strong"
          : ps === "pending"
          ? "ui-text-warning ui-bg-card-strong"
          : "ui-bg-soft ui-text-strong"
      }">${orderPayMethodLabel[pm] || pm} ${
        orderPayStatusLabel[ps] || ps
      }</span>`
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

// ============ 促銷活動管理 ============
let promotionsMap = {};
async function loadPromotions() {
  try {
    const r = await authFetch(
      `${API_URL}?action=getPromotions&_=${Date.now()}`,
    );
    const d = await r.json();
    if (d.success) {
      window.promotions = d.promotions;
      renderPromotions();
    }
  } catch (e) {
    console.error(e);
  }
}

function isVueManagedPromotionsTable(
  table = document.getElementById("promotions-table"),
) {
  return table?.dataset?.vueManaged === "true";
}

function buildPromotionViewModel(promotion) {
  const isPercent = promotion?.discountType === "percent";
  const enabled = Boolean(promotion?.enabled);
  return {
    id: Number(promotion?.id) || 0,
    name: promotion?.name || "",
    conditionText: `任選 ${Number(promotion?.minQuantity) || 0} 件`,
    discountText: isPercent
      ? `${promotion?.discountValue} 折`
      : `折 $${promotion?.discountValue}`,
    enabled,
    statusLabel: enabled ? "啟用" : "未啟用",
    statusClass: enabled ? "ui-text-success" : "ui-text-muted",
  };
}

function emitDashboardPromotionsUpdated(nextPromotions = window.promotions) {
  const viewPromotions = (Array.isArray(nextPromotions) ? nextPromotions : [])
    .map((promotion) => buildPromotionViewModel(promotion));
  window.dispatchEvent(
    new CustomEvent("coffee:dashboard-promotions-updated", {
      detail: { promotions: viewPromotions },
    }),
  );
}

async function savePromotionSort(ids) {
  const r = await authFetch(`${API_URL}?action=reorderPromotionsBulk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: getAuthUserId(), ids }),
  });
  const d = await r.json();
  if (!d.success) throw new Error(d.error);
}

function initializePromotionSortable(table) {
  if (typeof Sortable === "undefined") return;
  if (window.promoSortable) {
    window.promoSortable.destroy();
    window.promoSortable = null;
  }
  if (!table?.querySelector("tr[data-id]")) return;
  window.promoSortable = Sortable.create(table, {
    handle: ".drag-handle-promo",
    animation: 150,
    onEnd: async function (evt) {
      if (evt.oldIndex === evt.newIndex) return;
      const ids = Array.from(table.querySelectorAll("tr[data-id]"))
        .map((tr) => Number.parseInt(tr.dataset.id || "", 10))
        .filter((id) => !Number.isNaN(id));
      try {
        await savePromotionSort(ids);
      } catch (e) {
        Swal.fire("錯誤", e.message, "error");
        loadPromotions();
      }
    },
  });
}

function renderPromotions() {
  const table = document.getElementById("promotions-table");
  if (!table) return;
  const proms = window.promotions || [];
  promotionsMap = {};
  proms.forEach((promotion) => {
    promotionsMap[promotion.id] = promotion;
  });

  if (isVueManagedPromotionsTable(table)) {
    emitDashboardPromotionsUpdated(proms);
    requestAnimationFrame(() => initializePromotionSortable(table));
    return;
  }

  table.innerHTML = "";
  if (!proms.length) {
    table.innerHTML =
      '<tr><td colspan="5" class="text-center py-8 ui-text-subtle">尚無活動</td></tr>';
    initializePromotionSortable(table);
    return;
  }

  let html = "";
  proms.forEach((promotion) => {
    const viewPromotion = buildPromotionViewModel(promotion);
    html += `
        <tr class="border-b" style="border-color:#E2DCC8;" data-id="${viewPromotion.id}">
            <td class="p-3 text-center">
                <span class="drag-handle-promo cursor-move ui-text-muted hover:ui-text-warning text-xl font-bold select-none px-2 inline-block" title="拖曳排序" style="touch-action: none;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 256 256" class="drag-handle-icon"><path d="M104,60A12,12,0,1,1,92,48,12,12,0,0,1,104,60Zm60-12a12,12,0,1,0,12,12A12,12,0,0,0,164,48ZM92,116a12,12,0,1,0,12,12A12,12,0,0,0,92,116Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,116ZM92,184a12,12,0,1,0,12,12A12,12,0,0,0,92,184Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,184Z"></path></svg>
                </span>
            </td>
            <td class="p-3 font-medium">${esc(viewPromotion.name)}</td>
            <td class="p-3 text-sm ui-text-strong">${esc(viewPromotion.conditionText)} <span class="font-bold ui-text-danger">${esc(viewPromotion.discountText)}</span></td>
            <td class="p-3 text-center"><button data-action="toggle-promotion-enabled" data-promotion-id="${viewPromotion.id}" data-enabled="${String(!viewPromotion.enabled)}" class="text-sm font-medium ${viewPromotion.statusClass} hover:underline">${viewPromotion.statusLabel}</button></td>
            <td class="p-3 text-right">
                <button data-action="edit-promotion" data-promotion-id="${viewPromotion.id}" class="text-sm mr-2 ui-text-highlight">編輯</button>
                <button data-action="delete-promotion" data-promotion-id="${viewPromotion.id}" class="text-sm ui-text-danger">刪除</button>
            </td>
        </tr>`;
  });
  table.innerHTML = html;
  initializePromotionSortable(table);
}

function renderPromoProducts(selectedItems = []) {
  const list = document.getElementById("prm-products-list");
  if (!products.length) {
    list.innerHTML = '<p class="ui-text-muted">目前沒有商品可選</p>';
    return;
  }

  // selectedItems 現在是 [{"productId": 1, "specKey": "..."}]
  const isSelected = (pid, skey) => {
    return selectedItems.some((i) => i.productId === pid && i.specKey === skey);
  };

  let html = "";
  products.forEach((p) => {
    let specs = [];
    try {
      specs = JSON.parse(p.specs || "[]");
    } catch (e) {}

    if (specs.length === 0) {
      // 無規格商品
      html += `
            <div class="mb-1 border-b pb-1 last:border-0" style="border-color:#E2DCC8">
                <label class="flex items-center gap-2 cursor-pointer p-1 hover:ui-bg-soft rounded">
                    <input type="checkbox" class="promo-product-cb" data-pid="${p.id}" data-skey="" ${
        isSelected(p.id, "") ? "checked" : ""
      }>
                    <span class="ui-text-strong font-medium">[${
        esc(p.category)
      }] ${esc(p.name)}</span>
                </label>
            </div>`;
    } else {
      // 有規格商品：標題列 + 規格子選項
      html += `
            <div class="mb-2 border-b pb-1 last:border-0" style="border-color:#E2DCC8">
                <div class="ui-text-strong font-medium p-1 ui-bg-soft rounded">[${
        esc(p.category)
      }] ${esc(p.name)}</div>
                <div class="pl-4 mt-1 space-y-1">
                    ${
        specs.map((s) => `
                        <label class="flex items-center gap-2 cursor-pointer p-1 hover:ui-bg-soft rounded text-sm">
                            <input type="checkbox" class="promo-product-cb" data-pid="${p.id}" data-skey="${
          esc(s.key)
        }" ${isSelected(p.id, s.key) ? "checked" : ""}>
                            <span class="ui-text-strong">${
          esc(s.label)
        } <span class="text-xs ui-text-muted">($${s.price})</span></span>
                        </label>
                    `).join("")
      }
                </div>
            </div>`;
    }
  });

  list.innerHTML = html;
}

function showPromotionModal() {
  document.getElementById("prm-title").textContent = "新增活動";
  document.getElementById("promotion-form").reset();
  document.getElementById("prm-id").value = "";
  document.getElementById("prm-enabled").checked = true;
  renderPromoProducts([]);
  document.getElementById("promotion-modal").classList.remove("hidden");
}

function editPromotion(id) {
  const p = promotionsMap[id];
  if (!p) return;
  document.getElementById("prm-title").textContent = "編輯活動";
  document.getElementById("prm-id").value = p.id;
  document.getElementById("prm-name").value = p.name;
  document.getElementById("prm-type").value = p.type || "bundle";
  document.getElementById("prm-min-qty").value = p.minQuantity || 1;
  document.getElementById("prm-discount-type").value = p.discountType ||
    "percent";
  document.getElementById("prm-discount-value").value = p.discountValue || 0;
  document.getElementById("prm-enabled").checked = p.enabled;
  // 相容舊版資料：如果沒有 targetItems，就將 targetProductIds 當作無規格商品轉換
  let targetItems = p.targetItems || [];
  if (
    targetItems.length === 0 && p.targetProductIds &&
    p.targetProductIds.length > 0
  ) {
    targetItems = p.targetProductIds.map((id) => ({
      productId: id,
      specKey: "",
    }));
  }
  renderPromoProducts(targetItems);
  document.getElementById("promotion-modal").classList.remove("hidden");
}

function closePromotionModal() {
  document.getElementById("promotion-modal").classList.add("hidden");
}

async function savePromotion(e) {
  e.preventDefault();
  const id = document.getElementById("prm-id").value;
  const cbs = document.querySelectorAll(".promo-product-cb:checked");
  const targetItems = Array.from(cbs).map((cb) => ({
    productId: parseInt(cb.dataset.pid),
    specKey: cb.dataset.skey || "",
  }));

  const payload = {
    userId: getAuthUserId(),
    name: document.getElementById("prm-name").value.trim(),
    type: document.getElementById("prm-type").value,
    targetItems,
    minQuantity: parseInt(document.getElementById("prm-min-qty").value) || 1,
    discountType: document.getElementById("prm-discount-type").value,
    discountValue:
      parseFloat(document.getElementById("prm-discount-value").value) || 0,
    enabled: document.getElementById("prm-enabled").checked,
  };
  if (id) payload.id = parseInt(id);

  try {
    const r = await authFetch(
      `${API_URL}?action=${id ? "updatePromotion" : "addPromotion"}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const d = await r.json();
    if (d.success) {
      Toast.fire({ icon: "success", title: id ? "已更新" : "已新增" });
      closePromotionModal();
      loadPromotions();
    } else throw new Error(d.error);
  } catch (err) {
    Swal.fire("錯誤", err.message, "error");
  }
}

async function delPromotion(id) {
  const c = await Swal.fire({
    title: "刪除活動？",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#DC322F",
    confirmButtonText: "刪除",
    cancelButtonText: "取消",
  });
  if (!c.isConfirmed) return;
  try {
    const r = await authFetch(`${API_URL}?action=deletePromotion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: getAuthUserId(), id }),
    });
    const d = await r.json();
    if (d.success) {
      Toast.fire({ icon: "success", title: "已刪除" });
      loadPromotions();
    } else throw new Error(d.error);
  } catch (e) {
    Swal.fire("錯誤", e.message, "error");
  }
}

async function togglePromotionEnabled(id, enabled) {
  const promotion = promotionsMap[id];
  if (!promotion) {
    Swal.fire("錯誤", "找不到活動", "error");
    return;
  }

  const payload = {
    userId: getAuthUserId(),
    id: Number(promotion.id),
    name: promotion.name || "",
    type: promotion.type || "bundle",
    targetProductIds: Array.isArray(promotion.targetProductIds)
      ? promotion.targetProductIds
      : [],
    targetItems: Array.isArray(promotion.targetItems) ? promotion.targetItems : [],
    minQuantity: Number(promotion.minQuantity) || 1,
    discountType: promotion.discountType || "percent",
    discountValue: Number(promotion.discountValue) || 0,
    enabled: Boolean(enabled),
    startTime: promotion.startTime || null,
    endTime: promotion.endTime || null,
  };

  try {
    const r = await authFetch(`${API_URL}?action=updatePromotion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const d = await r.json();
    if (!d.success) throw new Error(d.error || "活動狀態更新失敗");
    promotion.enabled = Boolean(enabled);
    renderPromotions();
    Toast.fire({
      icon: "success",
      title: enabled ? "活動已啟用" : "活動已停用",
    });
  } catch (e) {
    Swal.fire("錯誤", e.message, "error");
  }
}
// ============ 設定 ============
async function loadSettings() {
  const currentLoadToken = ++settingsLoadToken;
  try {
    const r = await authFetch(`${API_URL}?action=getSettings&_=${Date.now()}`);
    const d = await r.json();
    if (currentLoadToken !== settingsLoadToken) return;
    if (d.success) {
      const s = d.settings;
      dashboardSettings = s;
      applyDashboardBranding(s);
      document.getElementById("s-ann-enabled").checked =
        String(s.announcement_enabled) === "true";
      document.getElementById("s-announcement").value = s.announcement || "";
      const autoOrderEmailCheckbox = document.getElementById(
        "s-auto-order-email-enabled",
      );
      if (autoOrderEmailCheckbox) {
        autoOrderEmailCheckbox.checked = parseBooleanSetting(
          s.order_confirmation_auto_email_enabled,
          true,
        );
      }
      const isOpen = String(s.is_open) !== "false";
      document.querySelector(`input[name="s-open"][value="${isOpen}"]`)
        .checked = true;
      // 品牌設定
      document.getElementById("s-site-title").value = s.site_title || "";
      document.getElementById("s-site-subtitle").value = s.site_subtitle || "";
      document.getElementById("s-site-emoji").value = s.site_icon_emoji || "";

      document.getElementById("s-site-icon-url").value = s.site_icon_url || "";
      const siteLogoFallbackUrl = getDefaultIconUrl("brand");
      if (s.site_icon_url) {
        updateIconPreview({
          previewId: "s-icon-preview",
          rawUrl: s.site_icon_url,
          fallbackUrl: siteLogoFallbackUrl,
        });
        document.getElementById("s-icon-url-display").textContent = "自訂 Logo";
      } else {
        updateIconPreview({
          previewId: "s-icon-preview",
          rawUrl: siteLogoFallbackUrl,
          fallbackUrl: siteLogoFallbackUrl,
        });
        document.getElementById("s-icon-url-display").textContent = "未設定 (預設)";
      }

      // 區塊標題
      document.getElementById("s-products-title").value =
        s.products_section_title || "";
      document.getElementById("s-products-color").value =
        s.products_section_color || "#268BD2";
      document.getElementById("s-products-size").value =
        s.products_section_size || "text-lg";
      document.getElementById("s-products-bold").checked =
        String(s.products_section_bold) !== "false";

      document.getElementById("s-delivery-title").value =
        s.delivery_section_title || "";
      document.getElementById("s-delivery-color").value =
        s.delivery_section_color || "#268BD2";
      document.getElementById("s-delivery-size").value =
        s.delivery_section_size || "text-lg";
      document.getElementById("s-delivery-bold").checked =
        String(s.delivery_section_bold) !== "false";

      document.getElementById("s-notes-title").value = s.notes_section_title ||
        "";
      document.getElementById("s-notes-color").value = s.notes_section_color ||
        "#268BD2";
      document.getElementById("s-notes-size").value = s.notes_section_size ||
        "text-base";
      document.getElementById("s-notes-bold").checked =
        String(s.notes_section_bold) !== "false";

      ["products", "delivery", "notes"].forEach((section) => {
        const settingKey = sectionIconSettingKey(section);
        const fallbackKey = section === "products"
          ? "products"
          : section === "delivery"
          ? "delivery"
          : "notes";
        const sectionIconUrl = String(s[settingKey] || getDefaultIconUrl(fallbackKey));
        const urlInput = document.getElementById(`s-${section}-icon-url`);
        if (urlInput) urlInput.value = sectionIconUrl;
        updateIconPreview({
          previewId: `s-${section}-icon-preview`,
          rawUrl: sectionIconUrl,
          fallbackUrl: getDefaultIconUrl(fallbackKey),
        });
        const urlDisplay = document.getElementById(`s-${section}-icon-url-display`);
        if (urlDisplay) urlDisplay.textContent = sectionIconUrl;
      });

      // 物流與金流對應設定載入
      const deliveryConfigStr = s.delivery_options_config || "";
      let deliveryConfig = [];

      if (deliveryConfigStr) {
        try {
          deliveryConfig = JSON.parse(deliveryConfigStr);
        } catch (e) {
          console.error("Parsed delivery_options_config fails:", e);
        }
      }

      // 如果從未設定過 delivery_options_config，則進行舊版資料轉移 (Migration)
      if (!deliveryConfig.length) {
        // 嘗試讀取舊版金流對應
        const routingConfigStr = s.payment_routing_config || "";
        let routingConfig = {};
        if (routingConfigStr) {
          try {
            routingConfig = JSON.parse(routingConfigStr);
          } catch (e) {}
        } else {
          const le = String(s.linepay_enabled) === "true";
          const te = String(s.transfer_enabled) === "true";
          routingConfig = {
            in_store: { cod: true, linepay: le, transfer: te },
            delivery: { cod: true, linepay: le, transfer: te },
            home_delivery: { cod: true, linepay: le, transfer: te },
            seven_eleven: { cod: true, linepay: false, transfer: false },
            family_mart: { cod: true, linepay: false, transfer: false },
          };
        }

        // 將舊資料結構轉換為新版陣列
        deliveryConfig = Object.values(DEFAULT_DELIVERY_OPTIONS).map((item) => ({
          ...item,
          payment: routingConfig[item.id] || {
            cod: true,
            linepay: false,
            transfer: false,
          },
          fee: 0,
          free_threshold: 0,
        }));
      }
      const normalizedDeliveryConfig = deliveryConfig.map((item) =>
        normalizeDeliveryOption(item)
      );
      renderDeliveryOptionsAdmin(normalizedDeliveryConfig);

      const linePaySandboxCheckbox = document.getElementById(
        "s-linepay-sandbox",
      );
      if (linePaySandboxCheckbox) {
        const hasServerValue = Object.prototype.hasOwnProperty.call(
          s,
          "linepay_sandbox",
        );
        if (hasServerValue) {
          const sandboxEnabled = parseBooleanSetting(s.linepay_sandbox, true);
          linePaySandboxCheckbox.checked = sandboxEnabled;
          localStorage.setItem(
            LINEPAY_SANDBOX_CACHE_KEY,
            String(sandboxEnabled),
          );
        } else {
          const cachedSandbox = localStorage.getItem(
            LINEPAY_SANDBOX_CACHE_KEY,
          );
          linePaySandboxCheckbox.checked = cachedSandbox === null
            ? true
            : parseBooleanSetting(cachedSandbox, true);
        }
      }

      // 金流選項顯示設定載入
      const paymentOptionsStr = s.payment_options_config || "";
      let paymentOptions = {};
      if (paymentOptionsStr) {
        try {
          paymentOptions = JSON.parse(paymentOptionsStr);
        } catch (e) {}
      }
      ["cod", "linepay", "transfer"].forEach((method) => {
        const normalized = normalizePaymentOption(method, paymentOptions[method]);
        const iconInput = document.getElementById(`po-${method}-icon`);
        const nameInput = document.getElementById(`po-${method}-name`);
        const descInput = document.getElementById(`po-${method}-desc`);
        const iconUrlInput = document.getElementById(`po-${method}-icon-url`);
        if (iconInput) iconInput.value = normalized.icon;
        if (nameInput) nameInput.value = normalized.name;
        if (descInput) descInput.value = normalized.description;
        if (iconUrlInput) iconUrlInput.value = normalized.icon_url;
        updateIconPreview({
          previewId: `po-${method}-icon-preview`,
          rawUrl: normalized.icon_url,
          fallbackUrl: getDefaultIconUrl(paymentIconFallbackKey(method)),
        });
        const urlDisplay = document.getElementById(`po-${method}-icon-url-display`);
        if (urlDisplay) urlDisplay.textContent = normalized.icon_url;
      });

      // 載入匯款帳號
      if (currentLoadToken !== settingsLoadToken) return;
      await loadBankAccountsAdmin();
    }
  } catch (e) {
    console.error(e);
  }
}

// ============ 物流選項管理 ============
function renderDeliveryOptionsAdmin(config) {
  const tbody = document.getElementById("delivery-routing-table");
  if (!tbody) return;
  tbody.innerHTML = "";

  config.forEach((item) => {
    configToHtml(normalizeDeliveryOption(item), tbody);
  });

  // 重新綁定 Sortable (如果已經存在則銷毀重建)
  if (window.deliverySortable) {
    window.deliverySortable.destroy();
  }
  window.deliverySortable = new Sortable(tbody, {
    animation: 150,
    handle: ".cursor-move",
    ghostClass: "ui-bg-soft",
  });
}

function addDeliveryOptionAdmin() {
  const tempId = "custom_" + Date.now();
  const newConfig = normalizeDeliveryOption({
    id: tempId,
    icon: "",
    icon_url: getDefaultIconUrl("delivery"),
    name: "新物流方式",
    description: "設定敘述",
    enabled: true,
    fee: 0,
    free_threshold: 0,
    payment: { cod: true, linepay: false, transfer: false },
  });

  const tbody = document.getElementById("delivery-routing-table");
  if (!tbody) return;

  configToHtml(newConfig, tbody, true);
}

function configToHtml(item, tbody, isNew = false) {
  const normalized = normalizeDeliveryOption(item);
  const fallbackKey = getDeliveryIconFallbackKey(normalized.id);
  const previewUrl = resolveAssetUrl(normalized.icon_url) ||
    getDefaultIconUrl(fallbackKey);

  const tr = document.createElement("tr");
  tr.className = "border-b delivery-option-row group" +
    (isNew ? " bg-yellow-50" : "");
  tr.style.borderColor = "#E2DCC8";
  tr.dataset.id = normalized.id;
  tr.dataset.defaultIconKey = fallbackKey;

  tr.innerHTML = `
        <td class="p-3 text-center cursor-move ui-text-muted hover:ui-text-strong transition">
            <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 256 256" class="drag-handle-icon"><path d="M104,60A12,12,0,1,1,92,48,12,12,0,0,1,104,60Zm60-12a12,12,0,1,0,12,12A12,12,0,0,0,164,48ZM92,116a12,12,0,1,0,12,12A12,12,0,0,0,92,116Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,116ZM92,184a12,12,0,1,0,12,12A12,12,0,0,0,92,184Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,184Z"></path></svg>
        </td>
        <td class="p-3">
            <div class="flex flex-col gap-2 min-w-[280px]">
                <div class="icon-upload-row">
                    <img class="icon-upload-preview do-icon-preview" src="${esc(
    previewUrl
  )}" alt="配送圖示預覽">
                    <input type="hidden" class="do-icon-url" value="${esc(
    normalized.icon_url
  )}">
                    <input type="file" class="do-icon-file text-xs icon-upload-file" accept="image/png,image/webp,image/jpeg,image/jpg">
                    <button type="button" data-action="upload-delivery-row-icon" class="text-xs px-2 py-1 rounded border ui-border ui-text-highlight hover:ui-primary-soft icon-upload-action">上傳圖示</button>
                </div>
                <p class="text-[11px] ui-text-muted truncate do-icon-url-display">${
    esc(normalized.icon_url)
  }</p>
                <div class="flex items-center gap-2">
                    <input type="text" class="border rounded p-1 icon-text-fallback text-sm do-icon" value="${
    esc(normalized.icon)
  }" placeholder="備援字元">
                    <input type="text" class="border rounded p-1 flex-1 min-w-[120px] do-name" value="${
    esc(normalized.name)
  }" placeholder="物流名稱">
                    <input type="hidden" class="do-id" value="${
    esc(normalized.id)
  }">
                </div>
                <input type="text" class="border rounded p-1 w-full text-xs ui-text-strong do-desc" value="${
    esc(normalized.description)
  }" placeholder="簡短說明 (例如: 到店自取)">
            </div>
        </td>
        <td class="p-3 text-center border-l ui-bg-soft/50" style="border-color:#E2DCC8">
            <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" class="sr-only peer do-enabled" ${
    normalized.enabled ? "checked" : ""
  }>
                <div class="w-9 h-5 ui-bg-soft peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
            </label>
        </td>
        <td class="p-3 text-center border-l" style="border-color:#E2DCC8">
            <input type="number" class="border rounded p-1 w-16 text-center text-sm do-fee" value="${
    normalized.fee !== undefined ? normalized.fee : 0
  }" min="0">
        </td>
        <td class="p-3 text-center border-l" style="border-color:#E2DCC8">
            <input type="number" class="border rounded p-1 w-20 text-center text-sm do-free-threshold" value="${
    normalized.free_threshold !== undefined ? normalized.free_threshold : 0
  }" min="0">
        </td>
        <td class="p-3 text-center border-l" style="border-color:#E2DCC8">
            <input type="checkbox" class="w-4 h-4 do-cod" ${
    normalized.payment?.cod ? "checked" : ""
  }>
        </td>
        <td class="p-3 text-center border-l" style="border-color:#E2DCC8">
            <input type="checkbox" class="w-4 h-4 do-linepay" ${
    normalized.payment?.linepay ? "checked" : ""
  }>
        </td>
        <td class="p-3 text-center border-l" style="border-color:#E2DCC8">
            <input type="checkbox" class="w-4 h-4 do-transfer" ${
    normalized.payment?.transfer ? "checked" : ""
  }>
        </td>
        <td class="p-3 text-center border-l" style="border-color:#E2DCC8">
            <button type="button" data-action="remove-delivery-option-row" class="ui-text-danger hover:text-red-700 p-1" title="刪除此選項">
                刪除
            </button>
        </td>
    `;
  tbody.appendChild(tr);

  const previewEl = tr.querySelector(".do-icon-preview");
  if (previewEl instanceof HTMLImageElement) {
    setPreviewImageSource(previewEl, normalized.icon_url, getDefaultIconUrl(fallbackKey));
  }

  if (isNew) {
    setTimeout(() => tr.classList.remove("bg-yellow-50"), 1500);
  }
}

function resetSectionTitle(section) {
  const defaults = {
    products: {
      title: "咖啡豆選購",
      color: "#268BD2",
      size: "text-lg",
      bold: true,
      iconUrl: getDefaultIconUrl("products"),
    },
    delivery: {
      title: "配送方式",
      color: "#268BD2",
      size: "text-lg",
      bold: true,
      iconUrl: getDefaultIconUrl("delivery"),
    },
    notes: {
      title: "訂單備註",
      color: "#268BD2",
      size: "text-base",
      bold: true,
      iconUrl: getDefaultIconUrl("notes"),
    },
  };
  const d = defaults[section];
  if (!d) return;
  document.getElementById(`s-${section}-title`).value = d.title;
  document.getElementById(`s-${section}-color`).value = d.color;
  document.getElementById(`s-${section}-size`).value = d.size;
  document.getElementById(`s-${section}-bold`).checked = d.bold;
  const iconUrlInput = document.getElementById(`s-${section}-icon-url`);
  if (iconUrlInput) iconUrlInput.value = d.iconUrl;
  updateIconPreview({
    previewId: `s-${section}-icon-preview`,
    rawUrl: d.iconUrl,
    fallbackUrl: d.iconUrl,
  });
  const iconUrlDisplay = document.getElementById(
    `s-${section}-icon-url-display`,
  );
  if (iconUrlDisplay) iconUrlDisplay.textContent = d.iconUrl;
}

async function saveSettings() {
  try {
    const linePaySandboxChecked =
      document.getElementById("s-linepay-sandbox").checked;
    const autoOrderEmailEnabled =
      document.getElementById("s-auto-order-email-enabled")?.checked ?? true;
    const payload = {
      userId: getAuthUserId(),
      settings: {
        announcement_enabled: String(
          document.getElementById("s-ann-enabled").checked,
        ),
        announcement: document.getElementById("s-announcement").value,
        order_confirmation_auto_email_enabled: String(autoOrderEmailEnabled),
        is_open:
          document.querySelector('input[name="s-open"]:checked')?.value ||
          "true",
        site_title: document.getElementById("s-site-title").value.trim(),
        site_subtitle: document.getElementById("s-site-subtitle").value.trim(),
        site_icon_emoji: document.getElementById("s-site-emoji").value.trim(),
        site_icon_url: document.getElementById("s-site-icon-url").value.trim(),

        products_section_title: document.getElementById("s-products-title")
          .value.trim(),
        products_section_color:
          document.getElementById("s-products-color").value,
        products_section_size: document.getElementById("s-products-size").value,
        products_section_bold: String(
          document.getElementById("s-products-bold").checked,
        ),
        products_section_icon_url: readInputValue("s-products-icon-url"),

        delivery_section_title: document.getElementById("s-delivery-title")
          .value.trim(),
        delivery_section_color:
          document.getElementById("s-delivery-color").value,
        delivery_section_size: document.getElementById("s-delivery-size").value,
        delivery_section_bold: String(
          document.getElementById("s-delivery-bold").checked,
        ),
        delivery_section_icon_url: readInputValue("s-delivery-icon-url"),

        notes_section_title: document.getElementById("s-notes-title").value
          .trim(),
        notes_section_color: document.getElementById("s-notes-color").value,
        notes_section_size: document.getElementById("s-notes-size").value,
        notes_section_bold: String(
          document.getElementById("s-notes-bold").checked,
        ),
        notes_section_icon_url: readInputValue("s-notes-icon-url"),

        linepay_sandbox: String(linePaySandboxChecked),
      },
    };

    const deliveryConfig = [];
    document.querySelectorAll(".delivery-option-row").forEach((row) => {
      const id = row.querySelector(".do-id").value;
      const icon = row.querySelector(".do-icon").value.trim();
      const icon_url = row.querySelector(".do-icon-url")?.value.trim() || "";
      const name = row.querySelector(".do-name").value.trim();
      const desc = row.querySelector(".do-desc").value.trim();
      const enabled = row.querySelector(".do-enabled").checked;

      const fee = parseInt(row.querySelector(".do-fee").value) || 0;
      const free_threshold =
        parseInt(row.querySelector(".do-free-threshold").value) || 0;

      const cod = row.querySelector(".do-cod").checked;
      const linepay = row.querySelector(".do-linepay").checked;
      const transfer = row.querySelector(".do-transfer").checked;

      if (name) {
        deliveryConfig.push({
          id,
          icon,
          icon_url,
          name,
          description: desc,
          enabled,
          fee,
          free_threshold,
          payment: { cod, linepay, transfer },
        });
      }
    });

    payload.settings.delivery_options_config = JSON.stringify(deliveryConfig);

    payload.settings.payment_options_config = JSON.stringify({
      cod: {
        icon: document.getElementById("po-cod-icon").value.trim(),
        icon_url: readInputValue("po-cod-icon-url"),
        name: document.getElementById("po-cod-name").value.trim(),
        description: document.getElementById("po-cod-desc").value.trim(),
      },
      linepay: {
        icon: document.getElementById("po-linepay-icon").value.trim(),
        icon_url: readInputValue("po-linepay-icon-url"),
        name: document.getElementById("po-linepay-name").value.trim(),
        description: document.getElementById("po-linepay-desc").value.trim(),
      },
      transfer: {
        icon: document.getElementById("po-transfer-icon").value.trim(),
        icon_url: readInputValue("po-transfer-icon-url"),
        name: document.getElementById("po-transfer-name").value.trim(),
        description: document.getElementById("po-transfer-desc").value.trim(),
      },
    });

    const r = await authFetch(`${API_URL}?action=updateSettings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const d = await r.json();
    if (d.success) {
      localStorage.setItem(
        LINEPAY_SANDBOX_CACHE_KEY,
        String(linePaySandboxChecked),
      );
      Toast.fire({ icon: "success", title: "設定已儲存" });
      await loadSettings();
    }
    else throw new Error(d.error);
  } catch (e) {
    Swal.fire("錯誤", e.message, "error");
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

// ============ 表單欄位管理 ============
let formFields = [];

async function loadFormFields() {
  try {
    const r = await authFetch(
      `${API_URL}?action=getFormFieldsAdmin&_=${Date.now()}`,
    );
    const d = await r.json();
    if (d.success) {
      formFields = d.fields || [];
      renderFormFields();
    }
  } catch (e) {
    console.error(e);
  }
}

const FIELD_TYPE_LABELS = {
  text: "文字",
  email: "Email",
  tel: "電話",
  number: "數字",
  select: "下拉選單",
  checkbox: "勾選框",
  textarea: "多行文字",
  section_title: "區塊標題",
};

function isVueManagedFormFieldsList(
  container = document.getElementById("formfields-list"),
) {
  return container?.dataset?.vueManaged === "true";
}

function getHiddenDeliveryMethodsText(deliveryVisibility) {
  if (!deliveryVisibility) return "";
  try {
    const visibilityConfig = JSON.parse(deliveryVisibility);
    const hiddenDeliveryMethods = Object.entries(visibilityConfig)
      .filter(([, visible]) => visible === false)
      .map(([deliveryMethod]) => deliveryMethod);
    if (!hiddenDeliveryMethods.length) return "";
    return `在 ${hiddenDeliveryMethods.join(", ")} 時隱藏`;
  } catch {
    return "";
  }
}

function buildFormFieldViewModel(field) {
  return {
    id: Number(field?.id) || 0,
    label: field?.label || "",
    fieldTypeLabel: FIELD_TYPE_LABELS[field?.field_type] || field?.field_type ||
      "",
    required: Boolean(field?.required),
    enabled: Boolean(field?.enabled),
    fieldKey: field?.field_key || "",
    placeholder: field?.placeholder || "",
    hiddenDeliveryMethodsText: getHiddenDeliveryMethodsText(
      field?.delivery_visibility,
    ),
    toggleEnabledValue: String(!field?.enabled),
    toggleEnabledTitle: field?.enabled ? "停用" : "啟用",
    toggleEnabledIcon: field?.enabled ? "開" : "關",
  };
}

function emitDashboardFormFieldsUpdated(nextFields = formFields) {
  const viewFields = (Array.isArray(nextFields) ? nextFields : [])
    .map((field) => buildFormFieldViewModel(field));
  window.dispatchEvent(
    new CustomEvent("coffee:dashboard-formfields-updated", {
      detail: { fields: viewFields },
    }),
  );
}

function initializeFormFieldsSortable(container) {
  if (typeof Sortable === "undefined") return;
  if (window.formFieldsSortable) {
    window.formFieldsSortable.destroy();
    window.formFieldsSortable = null;
  }
  if (!container?.querySelector("[data-field-id]")) return;
  window.formFieldsSortable = new Sortable(container, {
    handle: ".drag-handle",
    animation: 150,
    onEnd: async () => {
      const ids = Array.from(container.querySelectorAll("[data-field-id]"))
        .map((el) => Number.parseInt(el.dataset.fieldId || "", 10))
        .filter((id) => !Number.isNaN(id));
      try {
        await authFetch(`${API_URL}?action=reorderFormFields`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: getAuthUserId(), ids }),
        });
        Toast.fire({ icon: "success", title: "排序已更新" });
      } catch (e) {
        console.error(e);
      }
    },
  });
}

function renderFormFields() {
  const container = document.getElementById("formfields-list");
  if (!container) return;

  if (isVueManagedFormFieldsList(container)) {
    emitDashboardFormFieldsUpdated(formFields);
    requestAnimationFrame(() => {
      initializeFormFieldsSortable(document.getElementById("formfields-sortable"));
    });
    return;
  }

  if (!formFields.length) {
    container.innerHTML =
      '<p class="text-center ui-text-subtle py-8">尚無自訂欄位</p>';
    initializeFormFieldsSortable(document.getElementById("formfields-sortable"));
    return;
  }

  container.innerHTML = `
        <div class="space-y-2" id="formfields-sortable">
            ${
    formFields.map((f) => {
      const viewField = buildFormFieldViewModel(f);
      const requiredBadge = viewField.required
        ? '<span class="text-xs bg-red-100 ui-text-danger px-2 py-0.5 rounded-full">必填</span>'
        : "";
      const enabledClass = viewField.enabled ? "" : "opacity-50";
      const isProtected = false;
      return `
                <div class="flex items-center gap-3 p-3 bg-white rounded-xl border ${enabledClass}" style="border-color:#E2DCC8;" data-field-id="${viewField.id}">
                    <span class="cursor-grab ui-text-muted drag-handle">
                      <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 256 256" class="drag-handle-icon-sm"><path d="M104,60A12,12,0,1,1,92,48,12,12,0,0,1,104,60Zm60-12a12,12,0,1,0,12,12A12,12,0,0,0,164,48ZM92,116a12,12,0,1,0,12,12A12,12,0,0,0,92,116Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,116ZM92,184a12,12,0,1,0,12,12A12,12,0,0,0,92,184Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,184Z"></path></svg>
                    </span>
                    <div class="flex-1">
                        <div class="flex items-center gap-2 flex-wrap">
                            <span class="font-medium">${esc(viewField.label)}</span>
                            <span class="text-xs ui-primary-soft ui-text-highlight px-2 py-0.5 rounded-full">${esc(viewField.fieldTypeLabel)}</span>
                            ${requiredBadge}
                            ${
        !viewField.enabled
          ? '<span class="text-xs ui-bg-soft ui-text-subtle px-2 py-0.5 rounded-full">已停用</span>'
          : ""
      }
                            ${
        isProtected
          ? '<span class="text-xs bg-yellow-50 text-yellow-600 px-2 py-0.5 rounded-full">系統</span>'
          : ""
      }
                        </div>
                        <div class="text-xs ui-text-muted mt-1">key: ${esc(viewField.fieldKey)} ${viewField.placeholder ? "・" + esc(viewField.placeholder) : ""}</div>
                        ${
        viewField.hiddenDeliveryMethodsText
          ? `<div class="text-xs text-orange-500 mt-1">${
            esc(viewField.hiddenDeliveryMethodsText)
          }</div>`
          : ""
      }
                    </div>
                    <div class="flex gap-1 items-center">
                        <button data-action="toggle-field-enabled" data-field-id="${viewField.id}" data-enabled="${viewField.toggleEnabledValue}" class="text-sm px-2 py-1 rounded hover:ui-bg-soft" title="${viewField.toggleEnabledTitle}">${viewField.toggleEnabledIcon}</button>
                        <button data-action="edit-form-field" data-field-id="${viewField.id}" class="text-sm px-2 py-1 rounded hover:ui-bg-soft" title="編輯">編輯</button>
                        ${
        !isProtected
          ? `<button data-action="delete-form-field" data-field-id="${viewField.id}" class="text-sm px-2 py-1 rounded hover:bg-red-50 ui-text-danger" title="刪除">刪除</button>`
          : ""
      }
                    </div>
                </div>`;
    }).join("")
  }
        </div>`;

  initializeFormFieldsSortable(document.getElementById("formfields-sortable"));
}

/** 渲染配送方式可見性 Checkbox 到 #swal-dv 容器 */
function renderDeliveryVisibilityCheckboxes(existingVisibility) {
  const container = document.getElementById("swal-dv");
  if (!container) return;
  // 從 delivery_options_config 取得所有配送方式
  const configStr = dashboardSettings?.delivery_options_config || "";
  let deliveryOptions = [];
  if (configStr) {
    try {
      deliveryOptions = JSON.parse(configStr);
    } catch {}
  }
  if (!deliveryOptions.length) {
    container.innerHTML =
      '<p class="text-xs ui-text-muted">尚未設定配送方式</p>';
    return;
  }
  let vis = {};
  if (existingVisibility) {
    try {
      vis = JSON.parse(existingVisibility);
    } catch {}
  }
  container.innerHTML = deliveryOptions.map((opt) => {
    const checked = vis[opt.id] !== false; // null/undefined/true 都是 checked
    return `<label class="flex items-center gap-1 text-sm cursor-pointer px-2 py-1 rounded-lg border" style="border-color:#E2DCC8">
            <input type="checkbox" class="dv-cb" data-delivery-id="${
      esc(opt.id)
    }" ${checked ? "checked" : ""}> ${esc(opt.label || opt.id)}
        </label>`;
  }).join("");
}

/** 收集 #swal-dv 中的勾選狀態，回傳 JSON 字串或 null */
function collectDeliveryVisibility() {
  const cbs = document.querySelectorAll(".dv-cb");
  if (!cbs.length) return null;
  const vis = {};
  cbs.forEach((cb) => {
    vis[cb.dataset.deliveryId] = cb.checked;
  });
  return JSON.stringify(vis);
}

async function showAddFieldModal() {
  const { value: formValues } = await Swal.fire({
    title: "新增欄位",
    html: `
            <div style="text-align:left;">
                <label class="block text-sm mb-1 font-medium">欄位識別碼 (英文，唯一)</label>
                <input id="swal-fk" class="swal2-input" placeholder="例：receipt_type" style="margin:0 0 12px 0;width:100%">
                <label class="block text-sm mb-1 font-medium">顯示名稱</label>
                <input id="swal-fl" class="swal2-input" placeholder="例：開立收據" style="margin:0 0 12px 0;width:100%">
                <label class="block text-sm mb-1 font-medium">類型</label>
                <select id="swal-ft" class="swal2-select" style="margin:0 0 12px 0;width:100%">
                    <option value="text">文字</option>
                    <option value="email">Email</option>
                    <option value="tel">電話</option>
                    <option value="number">數字</option>
                    <option value="select">下拉選單</option>
                    <option value="checkbox">勾選框</option>
                    <option value="textarea">多行文字</option>
                </select>
                <label class="block text-sm mb-1 font-medium">提示文字 (placeholder)</label>
                <input id="swal-fp" class="swal2-input" placeholder="例：請選擇" style="margin:0 0 12px 0;width:100%">
                <label class="block text-sm mb-1 font-medium">選項 (僅下拉選單，逗號分隔)</label>
                <input id="swal-fo" class="swal2-input" placeholder="例：二聯式,三聯式,免開" style="margin:0 0 12px 0;width:100%">
                <label class="flex items-center gap-2 cursor-pointer mt-2">
                    <input type="checkbox" id="swal-fr"> <span class="text-sm">必填</span>
                </label>
                <div class="mt-3 pt-3 border-t" style="border-color:#E2DCC8">
                    <label class="block text-sm mb-1 font-medium">配送方式可見性</label>
                    <p class="text-xs ui-text-muted mb-2">取消勾選 = 該配送方式下不顯示此欄位，全勾 = 全部顯示</p>
                    <div id="swal-dv" class="flex flex-wrap gap-2"></div>
                </div>
            </div>`,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: "新增",
    cancelButtonText: "取消",
    confirmButtonColor: "#268BD2",
    didOpen: () => renderDeliveryVisibilityCheckboxes(null),
    preConfirm: () => {
      const fieldKey = document.getElementById("swal-fk").value.trim();
      const label = document.getElementById("swal-fl").value.trim();
      if (!fieldKey || !label) {
        Swal.showValidationMessage("識別碼和名稱為必填");
        return false;
      }
      const fieldType = document.getElementById("swal-ft").value;
      const placeholder = document.getElementById("swal-fp").value.trim();
      const optionsRaw = document.getElementById("swal-fo").value.trim();
      const options = optionsRaw
        ? JSON.stringify(
          optionsRaw.split(",").map((s) => s.trim()).filter(Boolean),
        )
        : "";
      const required = document.getElementById("swal-fr").checked;
      const deliveryVisibility = collectDeliveryVisibility();
      return {
        fieldKey,
        label,
        fieldType,
        placeholder,
        options,
        required,
        deliveryVisibility,
      };
    },
  });

  // Swal didOpen callback 不能在這裡，改用 setTimeout
  // 實際上我們需要在 Swal 打開後渲染配送方式 checkbox
  // 但 SweetAlert2 的 didOpen 已在上面的 html 欄位處處理
  // 所以我們在這邊用 Swal.getHtmlContainer 不太方便
  // 改用另一個方式：在 showAddFieldModal 和 editFormField 中使用 didOpen

  if (!formValues) return;

  // 如果全部都是 true 就存 null（= 全部顯示）
  if (formValues.deliveryVisibility) {
    try {
      const vis = JSON.parse(formValues.deliveryVisibility);
      if (Object.values(vis).every((v) => v === true)) {
        formValues.deliveryVisibility = null;
      }
    } catch {}
  }

  try {
    Swal.fire({
      title: "新增中...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });
    const r = await authFetch(`${API_URL}?action=addFormField`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: getAuthUserId(), ...formValues }),
    });
    const d = await r.json();
    if (d.success) {
      Toast.fire({ icon: "success", title: "欄位已新增" });
      loadFormFields();
    } else Swal.fire("錯誤", d.error, "error");
  } catch (e) {
    Swal.fire("錯誤", e.message, "error");
  }
}

async function editFormField(id) {
  const f = formFields.find((x) => x.id === id);
  if (!f) return;

  const optionsStr = (() => {
    try {
      return JSON.parse(f.options || "[]").join(",");
    } catch {
      return "";
    }
  })();

  const { value: formValues } = await Swal.fire({
    title: "編輯欄位",
    html: `
            <div style="text-align:left;">
                <label class="block text-sm mb-1 font-medium">顯示名稱</label>
                <input id="swal-fl" class="swal2-input" value="${
      esc(f.label)
    }" style="margin:0 0 12px 0;width:100%">
                <label class="block text-sm mb-1 font-medium">類型</label>
                <select id="swal-ft" class="swal2-select" style="margin:0 0 12px 0;width:100%">
                    ${
      Object.entries(FIELD_TYPE_LABELS).map(([k, v]) =>
        `<option value="${k}" ${
          k === f.field_type ? "selected" : ""
        }>${v}</option>`
      ).join("")
    }
                </select>
                <label class="block text-sm mb-1 font-medium">提示文字</label>
                <input id="swal-fp" class="swal2-input" value="${
      esc(f.placeholder || "")
    }" style="margin:0 0 12px 0;width:100%">
                <label class="block text-sm mb-1 font-medium">選項 (下拉選單，逗號分隔)</label>
                <input id="swal-fo" class="swal2-input" value="${
      esc(optionsStr)
    }" style="margin:0 0 12px 0;width:100%">
                <label class="flex items-center gap-2 cursor-pointer mt-2">
                    <input type="checkbox" id="swal-fr" ${
      f.required ? "checked" : ""
    }> <span class="text-sm">必填</span>
                </label>
                <div class="mt-3 pt-3 border-t" style="border-color:#E2DCC8">
                    <label class="block text-sm mb-1 font-medium">配送方式可見性</label>
                    <p class="text-xs ui-text-muted mb-2">取消勾選 = 該配送方式下不顯示此欄位</p>
                    <div id="swal-dv" class="flex flex-wrap gap-2"></div>
                </div>
            </div>`,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: "儲存",
    cancelButtonText: "取消",
    confirmButtonColor: "#268BD2",
    didOpen: () =>
      renderDeliveryVisibilityCheckboxes(f.delivery_visibility || null),
    preConfirm: () => {
      const label = document.getElementById("swal-fl").value.trim();
      if (!label) {
        Swal.showValidationMessage("名稱為必填");
        return false;
      }
      const fieldType = document.getElementById("swal-ft").value;
      const placeholder = document.getElementById("swal-fp").value.trim();
      const optionsRaw = document.getElementById("swal-fo").value.trim();
      const options = optionsRaw
        ? JSON.stringify(
          optionsRaw.split(",").map((s) => s.trim()).filter(Boolean),
        )
        : "";
      const required = document.getElementById("swal-fr").checked;
      const deliveryVisibility = collectDeliveryVisibility();
      return {
        label,
        fieldType,
        placeholder,
        options,
        required,
        deliveryVisibility,
      };
    },
  });

  if (!formValues) return;

  if (formValues.deliveryVisibility) {
    try {
      const vis = JSON.parse(formValues.deliveryVisibility);
      if (Object.values(vis).every((v) => v === true)) {
        formValues.deliveryVisibility = null;
      }
    } catch {}
  }

  try {
    const r = await authFetch(`${API_URL}?action=updateFormField`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: getAuthUserId(), id, ...formValues }),
    });
    const d = await r.json();
    if (d.success) {
      Toast.fire({ icon: "success", title: "已更新" });
      loadFormFields();
    } else Swal.fire("錯誤", d.error, "error");
  } catch (e) {
    Swal.fire("錯誤", e.message, "error");
  }
}

async function deleteFormField(id) {
  const f = formFields.find((x) => x.id === id);
  const confirm = await Swal.fire({
    title: "確認刪除",
    text: `確定要刪除「${f?.label || ""}」欄位嗎？`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "刪除",
    cancelButtonText: "取消",
    confirmButtonColor: "#DC322F",
  });
  if (!confirm.isConfirmed) return;

  try {
    const r = await authFetch(`${API_URL}?action=deleteFormField`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: getAuthUserId(), id }),
    });
    const d = await r.json();
    if (d.success) {
      Toast.fire({ icon: "success", title: "已刪除" });
      loadFormFields();
    } else Swal.fire("錯誤", d.error, "error");
  } catch (e) {
    Swal.fire("錯誤", e.message, "error");
  }
}

async function toggleFieldEnabled(id, enabled) {
  try {
    const r = await authFetch(`${API_URL}?action=updateFormField`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: getAuthUserId(), id, enabled }),
    });
    const d = await r.json();
    if (d.success) {
      Toast.fire({ icon: "success", title: enabled ? "已啟用" : "已停用" });
      loadFormFields();
    } else Swal.fire("錯誤", d.error, "error");
  } catch (e) {
    Swal.fire("錯誤", e.message, "error");
  }
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

function setPreviewImageSource(preview, rawUrl, fallbackUrl = "") {
  if (!(preview instanceof HTMLImageElement)) return "";

  const primaryUrl = resolveAssetUrl(rawUrl || "");
  const resolvedFallbackUrl = resolveAssetUrl(fallbackUrl || "");

  preview.dataset.fallbackSrc = resolvedFallbackUrl;
  preview.dataset.usingFallback = "false";
  preview.onerror = () => {
    const fallbackSrc = preview.dataset.fallbackSrc || "";
    if (fallbackSrc && preview.dataset.usingFallback !== "true") {
      preview.dataset.usingFallback = "true";
      preview.src = fallbackSrc;
      preview.classList.remove("hidden");
      return;
    }
    preview.onerror = null;
    preview.removeAttribute("src");
    preview.classList.add("hidden");
  };

  const resolved = primaryUrl || resolvedFallbackUrl;
  if (!resolved) {
    preview.onerror = null;
    preview.removeAttribute("src");
    preview.classList.add("hidden");
    return "";
  }

  preview.dataset.usingFallback =
    resolvedFallbackUrl && resolved === resolvedFallbackUrl ? "true" : "false";
  preview.src = resolved;
  preview.classList.remove("hidden");
  return resolved;
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
  const input = document.getElementById(inputId);
  if (input) input.value = url;
  const display = document.getElementById(displayId);
  if (display) {
    const resolvedDisplayUrl = resolveAssetUrl(url) || url;
    display.textContent = resolvedDisplayUrl;
  }
  if (previewId) {
    updateIconPreview({
      previewId,
      rawUrl: url,
      fallbackUrl: getDefaultIconUrl(fallbackKey),
    });
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
      const urlInput = row.querySelector(".do-icon-url");
      const urlDisplay = row.querySelector(".do-icon-url-display");
      const preview = row.querySelector(".do-icon-preview");
      if (urlInput) urlInput.value = d.url;
      if (urlDisplay) urlDisplay.textContent = d.url;
      if (preview instanceof HTMLImageElement) {
        setPreviewImageSource(preview, d.url, getRowFallbackIconUrl(row));
      }
      Toast.fire({ icon: "success", title: "物流圖示已更新" });
    } else Swal.fire("錯誤", d.error, "error");
  } catch (e) {
    Swal.fire("錯誤", e.message, "error");
  }
}

// ============ LINE Pay 退款 ============
async function linePayRefundOrder(orderId) {
  const c = await Swal.fire({
    title: "LINE Pay 退款",
    text: `確定要對訂單 #${orderId} 進行退款嗎？`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#6C71C4",
    confirmButtonText: "確認退款",
    cancelButtonText: "取消",
  });
  if (!c.isConfirmed) return;

  Swal.fire({
    title: "退款處理中...",
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });
  try {
    const r = await authFetch(`${API_URL}?action=linePayRefund`, {
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

// ============ 匯款帳號管理 ============
async function loadBankAccountsAdmin() {
  try {
    const r = await authFetch(
      `${API_URL}?action=getBankAccounts&_=${Date.now()}`,
    );
    const d = await r.json();
    if (d.success) {
      bankAccounts = d.accounts || [];
      renderBankAccountsAdmin();
    }
  } catch (e) {
    console.error(e);
  }
}

function renderBankAccountsAdmin() {
  const container = document.getElementById("bank-accounts-admin-list");
  if (!container) return;
  if (!bankAccounts.length) {
    if (bankAccountsSortable) {
      bankAccountsSortable.destroy();
      bankAccountsSortable = null;
    }
    container.innerHTML = '<p class="text-sm ui-text-subtle">尚無匯款帳號</p>';
    return;
  }
  container.innerHTML = `
    <p class="text-xs ui-text-subtle mb-2">可拖曳左側排序圖示自由排序匯款帳號</p>
    <div id="bank-accounts-sortable" class="space-y-2">
      ${
    bankAccounts.map((b) => `
          <div class="flex items-center justify-between p-3 rounded-lg" data-account-id="${b.id}" style="background:#FFFDF7; border:1px solid #E2DCC8;">
              <div class="flex items-start gap-3 min-w-0">
                  <span class="drag-handle-bank cursor-move ui-text-muted hover:ui-text-strong select-none pt-1" title="拖曳排序">
                    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 256 256" class="drag-handle-icon-sm"><path d="M104,60A12,12,0,1,1,92,48,12,12,0,0,1,104,60Zm60-12a12,12,0,1,0,12,12A12,12,0,0,0,164,48ZM92,116a12,12,0,1,0,12,12A12,12,0,0,0,92,116Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,116ZM92,184a12,12,0,1,0,12,12A12,12,0,0,0,92,184Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,184Z"></path></svg>
                  </span>
                  <div>
                      <div class="font-medium">${esc(b.bankName)} (${
      esc(b.bankCode)
    })</div>
                      <div class="text-sm font-mono ui-text-strong">${
      esc(b.accountNumber)
    }</div>
                      ${
      b.accountName
        ? `<div class="text-xs ui-text-muted">戶名: ${esc(b.accountName)}</div>`
        : ""
    }
                  </div>
              </div>
              <div class="flex gap-2 shrink-0">
                  <button data-action="edit-bank-account" data-bank-account-id="${b.id}" class="text-sm ui-text-highlight">編輯</button>
                  <button data-action="delete-bank-account" data-bank-account-id="${b.id}" class="text-sm ui-text-danger">刪除</button>
              </div>
          </div>
      `).join("")
  }
    </div>`;

  const sortableRoot = document.getElementById("bank-accounts-sortable");
  if (!sortableRoot || typeof Sortable === "undefined") return;
  if (bankAccountsSortable) {
    bankAccountsSortable.destroy();
  }
  bankAccountsSortable = new Sortable(sortableRoot, {
    handle: ".drag-handle-bank",
    animation: 150,
    ghostClass: "ui-bg-soft",
    onEnd: async (evt) => {
      if (evt.oldIndex === evt.newIndex) return;
      const ids = Array.from(
        sortableRoot.querySelectorAll("[data-account-id]"),
      ).map((el) => parseInt(el.dataset.accountId, 10)).filter((id) =>
        Number.isInteger(id)
      );
      if (!ids.length) return;
      try {
        const r = await authFetch(`${API_URL}?action=reorderBankAccounts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: getAuthUserId(), ids }),
        });
        const d = await r.json();
        if (!d.success) throw new Error(d.error || "排序更新失敗");
        Toast.fire({ icon: "success", title: "排序已更新" });
      } catch (e) {
        Swal.fire("錯誤", e.message, "error");
        loadBankAccountsAdmin();
      }
    },
  });
}

async function showAddBankAccountModal() {
  const { value: formValues } = await Swal.fire({
    title: "新增匯款帳號",
    html: `<div style="text-align:left;">
            <label class="block text-sm mb-1 font-medium">銀行代碼</label>
            <input id="swal-bc" class="swal2-input" placeholder="例：013" style="margin:0 0 12px 0;width:100%">
            <label class="block text-sm mb-1 font-medium">銀行名稱</label>
            <input id="swal-bn" class="swal2-input" placeholder="例：國泰世華" style="margin:0 0 12px 0;width:100%">
            <label class="block text-sm mb-1 font-medium">帳號</label>
            <input id="swal-an" class="swal2-input" placeholder="帳號號碼" style="margin:0 0 12px 0;width:100%">
            <label class="block text-sm mb-1 font-medium">戶名（選填）</label>
            <input id="swal-am" class="swal2-input" placeholder="戶名" style="margin:0 0 12px 0;width:100%">
        </div>`,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: "新增",
    cancelButtonText: "取消",
    preConfirm: () => ({
      bankCode: document.getElementById("swal-bc").value.trim(),
      bankName: document.getElementById("swal-bn").value.trim(),
      accountNumber: document.getElementById("swal-an").value.trim(),
      accountName: document.getElementById("swal-am").value.trim(),
    }),
  });
  if (!formValues || !formValues.bankCode || !formValues.accountNumber) return;
  try {
    const r = await authFetch(`${API_URL}?action=addBankAccount`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: getAuthUserId(), ...formValues }),
    });
    const d = await r.json();
    if (d.success) {
      Toast.fire({ icon: "success", title: "帳號已新增" });
      loadBankAccountsAdmin();
    } else Swal.fire("錯誤", d.error, "error");
  } catch (e) {
    Swal.fire("錯誤", e.message, "error");
  }
}

async function editBankAccount(id) {
  const b = bankAccounts.find((a) => a.id === id);
  if (!b) return;
  const { value: formValues } = await Swal.fire({
    title: "編輯匯款帳號",
    html: `<div style="text-align:left;">
            <label class="block text-sm mb-1 font-medium">銀行代碼</label>
            <input id="swal-bc" class="swal2-input" value="${
      esc(b.bankCode)
    }" style="margin:0 0 12px 0;width:100%">
            <label class="block text-sm mb-1 font-medium">銀行名稱</label>
            <input id="swal-bn" class="swal2-input" value="${
      esc(b.bankName)
    }" style="margin:0 0 12px 0;width:100%">
            <label class="block text-sm mb-1 font-medium">帳號</label>
            <input id="swal-an" class="swal2-input" value="${
      esc(b.accountNumber)
    }" style="margin:0 0 12px 0;width:100%">
            <label class="block text-sm mb-1 font-medium">戶名（選填）</label>
            <input id="swal-am" class="swal2-input" value="${
      esc(b.accountName || "")
    }" style="margin:0 0 12px 0;width:100%">
        </div>`,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: "更新",
    cancelButtonText: "取消",
    preConfirm: () => ({
      bankCode: document.getElementById("swal-bc").value.trim(),
      bankName: document.getElementById("swal-bn").value.trim(),
      accountNumber: document.getElementById("swal-an").value.trim(),
      accountName: document.getElementById("swal-am").value.trim(),
    }),
  });
  if (!formValues) return;
  try {
    const r = await authFetch(`${API_URL}?action=updateBankAccount`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: getAuthUserId(), id, ...formValues }),
    });
    const d = await r.json();
    if (d.success) {
      Toast.fire({ icon: "success", title: "帳號已更新" });
      loadBankAccountsAdmin();
    } else Swal.fire("錯誤", d.error, "error");
  } catch (e) {
    Swal.fire("錯誤", e.message, "error");
  }
}

async function deleteBankAccount(id) {
  const c = await Swal.fire({
    title: "刪除帳號？",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#DC322F",
    confirmButtonText: "刪除",
    cancelButtonText: "取消",
  });
  if (!c.isConfirmed) return;
  try {
    const r = await authFetch(`${API_URL}?action=deleteBankAccount`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: getAuthUserId(), id }),
    });
    const d = await r.json();
    if (d.success) {
      Toast.fire({ icon: "success", title: "帳號已刪除" });
      loadBankAccountsAdmin();
    } else Swal.fire("錯誤", d.error, "error");
  } catch (e) {
    Swal.fire("錯誤", e.message, "error");
  }
}
