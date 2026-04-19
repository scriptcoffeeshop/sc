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
  orderMethodLabel,
  orderPayMethodLabel,
  orderPayStatusLabel,
  orderStatusLabel,
  normalizeReceiptInfo,
  normalizeTrackingUrl,
} from "./dashboard/modules/order-shared.js";
import { createOrderStatusController } from "./dashboard/modules/order-status-controller.js";
import {
  createProductsActionHandlers,
  createProductsTabLoaders,
} from "./dashboard/modules/products.js";
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
  createDashboardBrandingController,
  parseBooleanSetting,
  readInputValue,
} from "./dashboard/modules/dashboard-branding.js";
import { registerDashboardGlobals } from "./dashboard/modules/dashboard-globals.js";
import { createDashboardSessionController } from "./dashboard/modules/dashboard-session-controller.js";
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
import {
  configureDashboardOrdersServices,
  dashboardOrdersActions,
  getDashboardOrders,
} from "../frontend/src/features/dashboard/useDashboardOrders.js";
import {
  configureDashboardProductsServices,
  dashboardProductsActions,
  getDashboardProducts,
} from "../frontend/src/features/dashboard/useDashboardProducts.js";

// ============ 共享狀態 ============
let currentUser = null;
let categories = [];
let dashboardSettings = {};
let dashboardTabLoaders = {};
let loadInitialDashboardData = async () => {};
const LINEPAY_SANDBOX_CACHE_KEY = "coffee_linepay_sandbox";
const DASHBOARD_PUBLIC_BRANDING_CACHE_KEY = "coffee_dashboard_public_branding";
const dashboardTabs = [
  "orders",
  "products",
  "categories",
  "promotions",
  "settings",
  "icon-library",
  "users",
  "blacklist",
  "formfields",
];
const triggerDashboardLogin = () =>
  loginWithLine(LINE_REDIRECT.dashboard, "coffee_admin_state");
const brandingController = createDashboardBrandingController({
  API_URL,
  cacheKey: DASHBOARD_PUBLIC_BRANDING_CACHE_KEY,
  getDefaultIconUrl,
  resolveAssetUrl,
  fetch: globalThis.fetch?.bind(globalThis),
});
const sessionController = createDashboardSessionController({
  API_URL,
  authFetch,
  lineRedirect: LINE_REDIRECT.dashboard,
  getCurrentUser: () => currentUser,
  setCurrentUser: (nextCurrentUser) => {
    currentUser = nextCurrentUser;
  },
  getDashboardTabLoaders: () => dashboardTabLoaders,
  loadInitialData: () => loadInitialDashboardData(),
  defaultTab: "orders",
  tabs: dashboardTabs,
  Swal: globalThis.Swal,
});

const bankAccountsController = createBankAccountsController({
  API_URL,
  authFetch,
  getAuthUserId: sessionController.getAuthUserId,
  Toast,
  Swal: globalThis.Swal,
  esc,
  Sortable: globalThis.Sortable,
});
const promotionsController = createPromotionsController({
  API_URL,
  authFetch,
  getAuthUserId: sessionController.getAuthUserId,
  Toast,
  Swal: globalThis.Swal,
  esc,
  Sortable: globalThis.Sortable,
  getProducts: getDashboardProducts,
  requestAnimationFrame: globalThis.requestAnimationFrame?.bind(globalThis),
});
const formFieldsController = createFormFieldsController({
  API_URL,
  authFetch,
  getAuthUserId: sessionController.getAuthUserId,
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
  getAuthUserId: sessionController.getAuthUserId,
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
  getAuthUserId: sessionController.getAuthUserId,
  Toast,
  Swal: globalThis.Swal,
  Sortable: globalThis.Sortable,
  applyDashboardBranding: brandingController.applyDashboardBranding,
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
  getAuthUserId: sessionController.getAuthUserId,
  getCurrentUser: () => currentUser,
  Toast,
  Swal: globalThis.Swal,
  esc,
});
const orderNotificationsController = createOrderNotificationsController({
  API_URL,
  authFetch,
  getAuthUserId: sessionController.getAuthUserId,
  getOrders: getDashboardOrders,
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
const orderStatusController = createOrderStatusController({
  API_URL,
  authFetch,
  getAuthUserId: sessionController.getAuthUserId,
  getOrders: getDashboardOrders,
  loadOrders: dashboardOrdersActions.loadOrders,
  previewOrderStatusNotification:
    orderNotificationsController.previewOrderStatusNotification,
  Toast,
  Swal: globalThis.Swal,
  esc,
  orderStatusLabel,
});
configureDashboardOrdersServices({
  API_URL,
  authFetch,
  getAuthUserId: sessionController.getAuthUserId,
  Toast,
  Swal: globalThis.Swal,
  changeOrderStatus: orderStatusController.changeOrderStatus,
});
const categoriesController = createCategoriesController({
  API_URL,
  authFetch,
  getAuthUserId: sessionController.getAuthUserId,
  getCategories: () => categories,
  setCategories: (nextCategories) => {
    categories = Array.isArray(nextCategories) ? nextCategories : [];
  },
  loadProducts: dashboardProductsActions.loadProducts,
  Toast,
  Swal: globalThis.Swal,
  Sortable: globalThis.Sortable,
  requestAnimationFrame: globalThis.requestAnimationFrame?.bind(globalThis),
  esc,
});
configureDashboardProductsServices({
  API_URL,
  authFetch,
  getAuthUserId: sessionController.getAuthUserId,
  getCategories: () => categories,
  ensureCategoriesLoaded: () => categoriesController.loadCategories(),
  Toast,
  Swal: globalThis.Swal,
  Sortable: globalThis.Sortable,
});

const dashboardActionHandlers = {
  "login-with-line": triggerDashboardLogin,
  "logout": sessionController.logout,
  ...createOrdersActionHandlers({
    loadOrders: dashboardOrdersActions.loadOrders,
    sendOrderFlexByOrderId: orderNotificationsController.sendOrderFlexByOrderId,
    sendOrderEmailByOrderId: orderNotificationsController.sendOrderEmailByOrderId,
    deleteOrderById: dashboardOrdersActions.deleteOrderById,
    refundOnlinePayOrder: orderStatusController.refundOnlinePayOrder,
    confirmTransferPayment: orderStatusController.confirmTransferPayment,
    toggleOrderSelection: dashboardOrdersActions.toggleOrderSelection,
    toggleSelectAllOrders: dashboardOrdersActions.toggleSelectAllOrders,
    batchUpdateOrders: dashboardOrdersActions.batchUpdateOrders,
    batchDeleteOrders: dashboardOrdersActions.batchDeleteOrders,
    exportFilteredOrdersCsv: dashboardOrdersActions.exportFilteredOrdersCsv,
    exportSelectedOrdersCsv: dashboardOrdersActions.exportSelectedOrdersCsv,
    setPendingOrderStatus: dashboardOrdersActions.setPendingOrderStatus,
    confirmOrderStatus: dashboardOrdersActions.confirmOrderStatus,
    showFlexHistory: orderNotificationsController.showFlexHistory,
    Toast,
  }),
  ...createProductsActionHandlers({
    showProductModal: dashboardProductsActions.showProductModal,
    addCategory: categoriesController.addCategory,
    showPromotionModal: promotionsController.showPromotionModal,
    editProduct: dashboardProductsActions.editProduct,
    delProduct: dashboardProductsActions.delProduct,
    toggleProductEnabled: dashboardProductsActions.toggleProductEnabled,
    editCategory: categoriesController.editCategory,
    delCategory: categoriesController.delCategory,
    editPromotion: promotionsController.editPromotion,
    delPromotion: promotionsController.delPromotion,
    togglePromotionEnabled: promotionsController.togglePromotionEnabled,
    addSpecRow: dashboardProductsActions.addSpecRow,
    removeSpecRow: dashboardProductsActions.removeSpecRow,
    closeProductModal: dashboardProductsActions.closeProductModal,
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

dashboardTabLoaders = {
  ...createOrdersTabLoaders({ loadOrders: dashboardOrdersActions.loadOrders }),
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

loadInitialDashboardData = () => Promise.all([
  categoriesController.loadCategories(),
  dashboardProductsActions.loadProducts(),
  settingsController.loadSettings(),
  dashboardOrdersActions.loadOrders(),
]);

registerDashboardGlobals({
  loginWithLine: triggerDashboardLogin,
  logout: sessionController.logout,
  showTab: sessionController.showTab,
  loadOrders: dashboardOrdersActions.loadOrders,
  renderOrders: dashboardOrdersActions.renderOrders,
  changeOrderStatus: orderStatusController.changeOrderStatus,
  sendOrderEmailByOrderId: orderNotificationsController.sendOrderEmailByOrderId,
  deleteOrderById: dashboardOrdersActions.deleteOrderById,
  showProductModal: dashboardProductsActions.showProductModal,
  editProduct: dashboardProductsActions.editProduct,
  closeProductModal: dashboardProductsActions.closeProductModal,
  saveProduct: dashboardProductsActions.saveProduct,
  delProduct: dashboardProductsActions.delProduct,
  moveProduct: dashboardProductsActions.moveProduct,
  addSpecRow: dashboardProductsActions.addSpecRow,
  addCategory: categoriesController.addCategory,
  editCategory: categoriesController.editCategory,
  delCategory: categoriesController.delCategory,
  updateCategoryOrders: categoriesController.updateCategoryOrders,
  saveSettings: settingsController.saveSettings,
  loadUsers: usersController.loadUsers,
  toggleUserRole: usersController.toggleUserRole,
  toggleUserBlacklist: usersController.toggleUserBlacklist,
  loadBlacklist: usersController.loadBlacklist,
  esc,
  showAddFieldModal: formFieldsController.showAddFieldModal,
  editFormField: formFieldsController.editFormField,
  deleteFormField: formFieldsController.deleteFormField,
  toggleFieldEnabled: formFieldsController.toggleFieldEnabled,
  previewIcon: iconAssetsController.previewIcon,
  uploadSiteIcon: iconAssetsController.uploadSiteIcon,
  resetSiteIcon: iconAssetsController.resetSiteIcon,
  uploadSectionIcon: iconAssetsController.uploadSectionIcon,
  uploadPaymentIcon: iconAssetsController.uploadPaymentIcon,
  uploadDeliveryRowIcon: iconAssetsController.uploadDeliveryRowIcon,
  applyIconFromLibrary: iconAssetsController.applyIconFromLibrary,
  resetSectionTitle: settingsController.resetSectionTitle,
  refundOnlinePayOrder: orderStatusController.refundOnlinePayOrder,
  confirmTransferPayment: orderStatusController.confirmTransferPayment,
  showAddBankAccountModal: bankAccountsController.showAddBankAccountModal,
  editBankAccount: bankAccountsController.editBankAccount,
  deleteBankAccount: bankAccountsController.deleteBankAccount,
  showPromotionModal: promotionsController.showPromotionModal,
  closePromotionModal: promotionsController.closePromotionModal,
  savePromotion: promotionsController.savePromotion,
  editPromotion: promotionsController.editPromotion,
  delPromotion: promotionsController.delPromotion,
});

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
    sessionController.showTab,
    usersController.loadUsers,
    iconAssetsController.previewIcon,
    dashboardProductsActions.saveProduct,
    promotionsController.savePromotion,
    orderStatusController.changeOrderStatus,
    dashboardOrdersActions.renderOrders,
  );
  initializeDashboardEventDelegation();
  brandingController.loadPublicDashboardBranding();
  const p = new URLSearchParams(window.location.search);
  if (p.get("code")) {
    sessionController.handleLineCallback(p.get("code"), p.get("state"));
  } else {
    sessionController.checkLogin();
  }
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
