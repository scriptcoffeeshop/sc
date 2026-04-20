// ============================================
// dashboard-app.js — 後台頁初始化入口
// ============================================

import { API_URL, LINE_REDIRECT } from "./config.js";
import { esc, Toast } from "./utils.js";
import { authFetch, loginWithLine } from "./auth.js";
import {
  getDefaultIconUrl,
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
import { createSettingsController } from "./dashboard/modules/settings-controller.js";
import { createIconAssetsController } from "./dashboard/modules/icon-assets-controller.js";
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
  configureDashboardCategoriesServices,
  dashboardCategoriesActions,
  getDashboardCategories,
} from "../frontend/src/features/dashboard/useDashboardCategories.js";
import {
  configureDashboardFormFieldsServices,
  dashboardFormFieldsActions,
} from "../frontend/src/features/dashboard/useDashboardFormFields.js";
import {
  configureDashboardPromotionsServices,
  dashboardPromotionsActions,
} from "../frontend/src/features/dashboard/useDashboardPromotions.js";
import {
  configureDashboardSessionServices,
  dashboardSessionActions,
  getDashboardCurrentUser,
} from "../frontend/src/features/dashboard/useDashboardSession.js";
import {
  configureDashboardSettingsServices,
  dashboardSettingsActions,
} from "../frontend/src/features/dashboard/useDashboardSettings.js";
import {
  configureDashboardUsersServices,
  dashboardUsersActions,
} from "../frontend/src/features/dashboard/useDashboardUsers.js";
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
const triggerDashboardLogin = () => dashboardSessionActions.startLogin();
const brandingController = createDashboardBrandingController({
  API_URL,
  cacheKey: DASHBOARD_PUBLIC_BRANDING_CACHE_KEY,
  getDefaultIconUrl,
  resolveAssetUrl,
  fetch: globalThis.fetch?.bind(globalThis),
});
configureDashboardSessionServices({
  API_URL,
  authFetch,
  loginWithLineFn: loginWithLine,
  lineRedirect: LINE_REDIRECT.dashboard,
  getDashboardTabLoaders: () => dashboardTabLoaders,
  loadInitialData: () => loadInitialDashboardData(),
  defaultTab: "orders",
  tabs: dashboardTabs,
  Swal: globalThis.Swal,
});
configureDashboardSettingsServices({
  normalizeDeliveryOption,
  normalizePaymentOption,
  defaultDeliveryOptions: DEFAULT_DELIVERY_OPTIONS,
  parseBooleanSetting,
  linePaySandboxCacheKey: LINEPAY_SANDBOX_CACHE_KEY,
  Sortable: globalThis.Sortable,
});

const bankAccountsController = createBankAccountsController({
  API_URL,
  authFetch,
  getAuthUserId: dashboardSessionActions.getAuthUserId,
  Toast,
  Swal: globalThis.Swal,
  esc,
  Sortable: globalThis.Sortable,
});
const iconAssetsController = createIconAssetsController({
  API_URL,
  authFetch,
  getAuthUserId: dashboardSessionActions.getAuthUserId,
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
  getAuthUserId: dashboardSessionActions.getAuthUserId,
  Toast,
  Swal: globalThis.Swal,
  applyDashboardBranding: brandingController.applyDashboardBranding,
  parseBooleanSetting,
  getDefaultIconUrl,
  normalizeIconPath,
  sectionIconSettingKey,
  updateIconPreview: iconAssetsController.updateIconPreview,
  readInputValue,
  linePaySandboxCacheKey: LINEPAY_SANDBOX_CACHE_KEY,
  loadBankAccountsAdmin: bankAccountsController.loadBankAccountsAdmin,
  setDashboardSettings: (settings) => {
    dashboardSettings = settings;
  },
  replaceSettingsConfig: dashboardSettingsActions.replaceSettingsConfig,
  buildSettingsConfig: dashboardSettingsActions.buildSettingsConfig,
});
const orderNotificationsController = createOrderNotificationsController({
  API_URL,
  authFetch,
  getAuthUserId: dashboardSessionActions.getAuthUserId,
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
  getAuthUserId: dashboardSessionActions.getAuthUserId,
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
  getAuthUserId: dashboardSessionActions.getAuthUserId,
  Toast,
  Swal: globalThis.Swal,
  changeOrderStatus: orderStatusController.changeOrderStatus,
});
configureDashboardCategoriesServices({
  API_URL,
  authFetch,
  getAuthUserId: dashboardSessionActions.getAuthUserId,
  loadProducts: dashboardProductsActions.loadProducts,
  onCategoriesChanged: () => {
    dashboardProductsActions.syncCategories();
  },
  Toast,
  Swal: globalThis.Swal,
  Sortable: globalThis.Sortable,
  requestAnimationFrame: globalThis.requestAnimationFrame?.bind(globalThis),
});
configureDashboardPromotionsServices({
  API_URL,
  authFetch,
  getAuthUserId: dashboardSessionActions.getAuthUserId,
  getProducts: getDashboardProducts,
  ensureProductsLoaded: dashboardProductsActions.loadProducts,
  Toast,
  Swal: globalThis.Swal,
  Sortable: globalThis.Sortable,
});
configureDashboardFormFieldsServices({
  API_URL,
  authFetch,
  getAuthUserId: dashboardSessionActions.getAuthUserId,
  Toast,
  Swal: globalThis.Swal,
  esc,
  Sortable: globalThis.Sortable,
  getDashboardSettings: () => dashboardSettings,
  requestAnimationFrame: globalThis.requestAnimationFrame?.bind(globalThis),
});
configureDashboardUsersServices({
  API_URL,
  authFetch,
  getAuthUserId: dashboardSessionActions.getAuthUserId,
  getCurrentUser: getDashboardCurrentUser,
  Toast,
  Swal: globalThis.Swal,
  esc,
});
configureDashboardProductsServices({
  API_URL,
  authFetch,
  getAuthUserId: dashboardSessionActions.getAuthUserId,
  getCategories: getDashboardCategories,
  ensureCategoriesLoaded: () => dashboardCategoriesActions.loadCategories(),
  Toast,
  Swal: globalThis.Swal,
  Sortable: globalThis.Sortable,
});

const dashboardActionHandlers = {
  "login-with-line": triggerDashboardLogin,
  "logout": dashboardSessionActions.logout,
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
    addCategory: dashboardCategoriesActions.addCategory,
    showPromotionModal: dashboardPromotionsActions.showPromotionModal,
    editProduct: dashboardProductsActions.editProduct,
    delProduct: dashboardProductsActions.delProduct,
    toggleProductEnabled: dashboardProductsActions.toggleProductEnabled,
    editCategory: dashboardCategoriesActions.editCategory,
    delCategory: dashboardCategoriesActions.delCategory,
    editPromotion: dashboardPromotionsActions.editPromotion,
    delPromotion: dashboardPromotionsActions.delPromotion,
    togglePromotionEnabled: dashboardPromotionsActions.togglePromotionEnabled,
    addSpecRow: dashboardProductsActions.addSpecRow,
    removeSpecRow: dashboardProductsActions.removeSpecRow,
    closeProductModal: dashboardProductsActions.closeProductModal,
    closePromotionModal: dashboardPromotionsActions.closePromotionModal,
    loadPromotions: dashboardPromotionsActions.loadPromotions,
  }),
  ...createSettingsActionHandlers({
    uploadSiteIcon: iconAssetsController.uploadSiteIcon,
    resetSiteIcon: iconAssetsController.resetSiteIcon,
    uploadSectionIcon: iconAssetsController.uploadSectionIcon,
    uploadPaymentIcon: iconAssetsController.uploadPaymentIcon,
    uploadDeliveryRowIcon: iconAssetsController.uploadDeliveryRowIcon,
    applyIconFromLibrary: iconAssetsController.applyIconFromLibrary,
    resetSectionTitle: settingsController.resetSectionTitle,
    addDeliveryOption: dashboardSettingsActions.addDeliveryOption,
    removeDeliveryOption: dashboardSettingsActions.removeDeliveryOption,
    showAddBankAccountModal: bankAccountsController.showAddBankAccountModal,
    saveSettings: settingsController.saveSettings,
    showAddFieldModal: dashboardFormFieldsActions.showAddFieldModal,
    toggleFieldEnabled: dashboardFormFieldsActions.toggleFieldEnabled,
    editFormField: dashboardFormFieldsActions.editFormField,
    deleteFormField: dashboardFormFieldsActions.deleteFormField,
    editBankAccount: bankAccountsController.editBankAccount,
    deleteBankAccount: bankAccountsController.deleteBankAccount,
    loadSettings: settingsController.loadSettings,
    loadFormFields: dashboardFormFieldsActions.loadFormFields,
  }),
  ...createUsersActionHandlers({
    loadUsers: dashboardUsersActions.loadUsers,
    toggleUserBlacklist: dashboardUsersActions.toggleUserBlacklist,
    toggleUserRole: dashboardUsersActions.toggleUserRole,
    loadBlacklist: dashboardUsersActions.loadBlacklist,
  }),
};

dashboardTabLoaders = {
  ...createOrdersTabLoaders({ loadOrders: dashboardOrdersActions.loadOrders }),
  ...createProductsTabLoaders({
    renderCategories: dashboardCategoriesActions.loadCategories,
    loadPromotions: dashboardPromotionsActions.loadPromotions,
  }),
  ...createSettingsTabLoaders({
    loadSettings: settingsController.loadSettings,
    loadFormFields: dashboardFormFieldsActions.loadFormFields,
  }),
  ...createUsersTabLoaders({
    loadUsers: dashboardUsersActions.loadUsers,
    loadBlacklist: dashboardUsersActions.loadBlacklist,
  }),
};

loadInitialDashboardData = () => Promise.all([
  dashboardCategoriesActions.loadCategories(),
  dashboardProductsActions.loadProducts(),
  settingsController.loadSettings(),
  dashboardOrdersActions.loadOrders(),
]);

registerDashboardGlobals({
  loginWithLine: triggerDashboardLogin,
  logout: dashboardSessionActions.logout,
  showTab: dashboardSessionActions.setActiveTab,
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
  addCategory: dashboardCategoriesActions.addCategory,
  editCategory: dashboardCategoriesActions.editCategory,
  delCategory: dashboardCategoriesActions.delCategory,
  updateCategoryOrders: dashboardCategoriesActions.updateCategoryOrders,
  saveSettings: settingsController.saveSettings,
  loadUsers: dashboardUsersActions.loadUsers,
  toggleUserRole: dashboardUsersActions.toggleUserRole,
  toggleUserBlacklist: dashboardUsersActions.toggleUserBlacklist,
  loadBlacklist: dashboardUsersActions.loadBlacklist,
  esc,
  showAddFieldModal: dashboardFormFieldsActions.showAddFieldModal,
  editFormField: dashboardFormFieldsActions.editFormField,
  deleteFormField: dashboardFormFieldsActions.deleteFormField,
  toggleFieldEnabled: dashboardFormFieldsActions.toggleFieldEnabled,
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
  showPromotionModal: dashboardPromotionsActions.showPromotionModal,
  closePromotionModal: dashboardPromotionsActions.closePromotionModal,
  savePromotion: dashboardPromotionsActions.savePromotion,
  editPromotion: dashboardPromotionsActions.editPromotion,
  delPromotion: dashboardPromotionsActions.delPromotion,
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
    dashboardUsersActions.loadUsers,
    iconAssetsController.previewIcon,
    dashboardProductsActions.saveProduct,
    dashboardPromotionsActions.savePromotion,
    orderStatusController.changeOrderStatus,
    dashboardOrdersActions.renderOrders,
  );
  initializeDashboardEventDelegation();
  brandingController.loadPublicDashboardBranding();
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
