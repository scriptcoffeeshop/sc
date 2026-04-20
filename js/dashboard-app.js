// ============================================
// dashboard-app.js — 後台頁初始化入口
// ============================================

import { API_URL, LINE_REDIRECT } from "./config.js";
import { esc, Toast } from "./utils.js";
import { authFetch, loginWithLine } from "./auth.js";
import {
  getDefaultIconUrl,
  normalizeIconPath,
  resolveAssetUrl,
} from "./icons.js";
import {
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
  createProductsTabLoaders,
} from "./dashboard/modules/products.js";
import { createOrderNotificationsController } from "./dashboard/modules/order-notifications-controller.js";
import {
  createSettingsTabLoaders,
} from "./dashboard/modules/settings.js";
import {
  createDashboardBrandingController,
  parseBooleanSetting,
} from "./dashboard/modules/dashboard-branding.js";
import { registerDashboardGlobals } from "./dashboard/modules/dashboard-globals.js";
import {
  DEFAULT_DELIVERY_OPTIONS,
  normalizeDeliveryOption,
  normalizePaymentOption,
  sectionIconSettingKey,
} from "./dashboard/modules/settings-shared.js";
import {
  createUsersTabLoaders,
} from "./dashboard/modules/users.js";
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
  configureDashboardBankAccountsServices,
  dashboardBankAccountsActions,
} from "../frontend/src/features/dashboard/useDashboardBankAccounts.js";
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
  configureDashboardSettingsIconServices,
} from "../frontend/src/features/dashboard/useDashboardSettingsIcons.js";
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
  API_URL,
  authFetch,
  getAuthUserId: dashboardSessionActions.getAuthUserId,
  Toast,
  Swal: globalThis.Swal,
  applyDashboardBranding: brandingController.applyDashboardBranding,
  loadBankAccounts: dashboardBankAccountsActions.loadBankAccounts,
  getDefaultIconUrl,
  normalizeIconPath,
  normalizeDeliveryOption,
  normalizePaymentOption,
  sectionIconSettingKey,
  defaultDeliveryOptions: DEFAULT_DELIVERY_OPTIONS,
  parseBooleanSetting,
  linePaySandboxCacheKey: LINEPAY_SANDBOX_CACHE_KEY,
  Sortable: globalThis.Sortable,
});
configureDashboardSettingsIconServices({
  API_URL,
  authFetch,
  getAuthUserId: dashboardSessionActions.getAuthUserId,
  Toast,
  Swal: globalThis.Swal,
});
configureDashboardBankAccountsServices({
  API_URL,
  authFetch,
  getAuthUserId: dashboardSessionActions.getAuthUserId,
  Toast,
  Swal: globalThis.Swal,
  Sortable: globalThis.Sortable,
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
  showFlexHistory: orderNotificationsController.showFlexHistory,
  sendOrderFlexByOrderId: orderNotificationsController.sendOrderFlexByOrderId,
  sendOrderEmailByOrderId: orderNotificationsController.sendOrderEmailByOrderId,
  refundOnlinePayOrder: orderStatusController.refundOnlinePayOrder,
  confirmTransferPayment: orderStatusController.confirmTransferPayment,
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
  getDashboardSettings: dashboardSettingsActions.getRawSettings,
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

dashboardTabLoaders = {
  ...createOrdersTabLoaders({ loadOrders: dashboardOrdersActions.loadOrders }),
  ...createProductsTabLoaders({
    renderCategories: dashboardCategoriesActions.loadCategories,
    loadPromotions: dashboardPromotionsActions.loadPromotions,
  }),
  ...createSettingsTabLoaders({
    loadSettings: dashboardSettingsActions.loadSettings,
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
  dashboardSettingsActions.loadSettings(),
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
  saveSettings: dashboardSettingsActions.saveSettings,
  loadUsers: dashboardUsersActions.loadUsers,
  toggleUserRole: dashboardUsersActions.toggleUserRole,
  toggleUserBlacklist: dashboardUsersActions.toggleUserBlacklist,
  loadBlacklist: dashboardUsersActions.loadBlacklist,
  esc,
  showAddFieldModal: dashboardFormFieldsActions.showAddFieldModal,
  editFormField: dashboardFormFieldsActions.editFormField,
  deleteFormField: dashboardFormFieldsActions.deleteFormField,
  toggleFieldEnabled: dashboardFormFieldsActions.toggleFieldEnabled,
  resetSectionTitle: dashboardSettingsActions.resetSectionTitle,
  refundOnlinePayOrder: orderStatusController.refundOnlinePayOrder,
  confirmTransferPayment: orderStatusController.confirmTransferPayment,
  showAddBankAccountModal: dashboardBankAccountsActions.showAddBankAccountModal,
  editBankAccount: dashboardBankAccountsActions.editBankAccount,
  deleteBankAccount: dashboardBankAccountsActions.deleteBankAccount,
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
