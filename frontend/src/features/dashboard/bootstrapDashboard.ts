import { API_URL, LINE_REDIRECT } from "../../lib/appConfig.ts";
import Sortable from "sortablejs";
import Swal from "../../lib/swal.js";
import { esc, Toast } from "../../lib/sharedUtils.ts";
import { authFetch, loginWithLine } from "../../lib/auth.ts";
import {
  getDefaultIconUrl,
  normalizeIconPath,
  resolveAssetUrl,
} from "../../lib/icons.ts";
import {
  orderMethodLabel,
  orderPayMethodLabel,
  orderPayStatusLabel,
  orderStatusLabel,
  normalizeReceiptInfo,
  normalizeTrackingUrl,
} from "./orderShared.ts";
import { createOrderStatusController } from "./dashboardOrderStatusController.ts";
import { createOrderNotificationsController } from "./dashboardOrderNotifications.ts";
import {
  createDashboardBrandingController,
  parseBooleanSetting,
} from "./dashboardBranding.ts";
import {
  DEFAULT_DELIVERY_OPTIONS,
  normalizeDeliveryOption,
  normalizePaymentOption,
  sectionIconSettingKey,
} from "./dashboardSettingsShared.ts";
import {
  configureDashboardCategoriesServices,
  dashboardCategoriesActions,
  getDashboardCategories,
} from "./useDashboardCategories.ts";
import {
  configureDashboardFormFieldsServices,
  dashboardFormFieldsActions,
} from "./useDashboardFormFields.ts";
import {
  configureDashboardBankAccountsServices,
  dashboardBankAccountsActions,
} from "./useDashboardBankAccounts.ts";
import {
  configureDashboardPromotionsServices,
  dashboardPromotionsActions,
} from "./useDashboardPromotions.ts";
import {
  configureDashboardSessionServices,
  dashboardSessionActions,
  getDashboardCurrentUser,
} from "./useDashboardSession.ts";
import {
  configureDashboardSettingsServices,
  dashboardSettingsActions,
} from "./useDashboardSettings.ts";
import {
  configureDashboardSettingsIconServices,
} from "./useDashboardSettingsIcons.ts";
import {
  configureDashboardUsersServices,
  dashboardUsersActions,
} from "./useDashboardUsers.ts";
import {
  configureDashboardOrdersServices,
  dashboardOrdersActions,
  getDashboardOrders,
} from "./useDashboardOrders.ts";
import {
  configureDashboardProductsServices,
  dashboardProductsActions,
  getDashboardProducts,
} from "./useDashboardProducts.ts";

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

function createOrdersTabLoaders(deps: Record<string, any>) {
  return {
    orders: () => deps.loadOrders(),
  };
}

function createProductsTabLoaders(deps: Record<string, any>) {
  return {
    categories: () => deps.renderCategories(),
    promotions: () => deps.loadPromotions(),
  };
}

function createSettingsTabLoaders(deps: Record<string, any>) {
  return {
    settings: () => deps.loadSettings(),
    "icon-library": () => deps.loadSettings(),
    formfields: () => deps.loadFormFields(),
  };
}

function createUsersTabLoaders(deps: Record<string, any>) {
  return {
    users: () => deps.loadUsers(),
    blacklist: () => deps.loadBlacklist(),
  };
}

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
  Swal,
});

configureDashboardSettingsServices({
  API_URL,
  authFetch,
  getAuthUserId: dashboardSessionActions.getAuthUserId,
  Toast,
  Swal,
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
  Sortable,
});

configureDashboardSettingsIconServices({
  API_URL,
  authFetch,
  getAuthUserId: dashboardSessionActions.getAuthUserId,
  Toast,
  Swal,
});

configureDashboardBankAccountsServices({
  API_URL,
  authFetch,
  getAuthUserId: dashboardSessionActions.getAuthUserId,
  Toast,
  Swal,
  Sortable,
});

const orderNotificationsController = createOrderNotificationsController({
  API_URL,
  authFetch,
  getAuthUserId: dashboardSessionActions.getAuthUserId,
  getSiteTitle: () => dashboardSettingsActions.getRawSettings()?.site_title,
  getOrders: getDashboardOrders,
  Toast,
  Swal,
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
  Swal,
  esc,
  orderStatusLabel,
});

configureDashboardOrdersServices({
  API_URL,
  authFetch,
  getAuthUserId: dashboardSessionActions.getAuthUserId,
  Toast,
  Swal,
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
  Swal,
  Sortable,
  requestAnimationFrame: globalThis.requestAnimationFrame?.bind(globalThis),
});

configureDashboardPromotionsServices({
  API_URL,
  authFetch,
  getAuthUserId: dashboardSessionActions.getAuthUserId,
  getProducts: getDashboardProducts,
  ensureProductsLoaded: dashboardProductsActions.loadProducts,
  Toast,
  Swal,
  Sortable,
});

configureDashboardFormFieldsServices({
  API_URL,
  authFetch,
  getAuthUserId: dashboardSessionActions.getAuthUserId,
  Toast,
  Swal,
  esc,
  Sortable,
  getDashboardSettings: dashboardSettingsActions.getRawSettings,
  requestAnimationFrame: globalThis.requestAnimationFrame?.bind(globalThis),
});

configureDashboardUsersServices({
  API_URL,
  authFetch,
  getAuthUserId: dashboardSessionActions.getAuthUserId,
  getCurrentUser: getDashboardCurrentUser,
  Toast,
  Swal,
  esc,
});

configureDashboardProductsServices({
  API_URL,
  authFetch,
  getAuthUserId: dashboardSessionActions.getAuthUserId,
  getCategories: getDashboardCategories,
  ensureCategoriesLoaded: () => dashboardCategoriesActions.loadCategories(),
  Toast,
  Swal,
  Sortable,
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

loadInitialDashboardData = async () => {
  await Promise.all([
    dashboardCategoriesActions.loadCategories(),
    dashboardProductsActions.loadProducts(),
    dashboardSettingsActions.loadSettings(),
    dashboardOrdersActions.loadOrders(),
  ]);
};

export const dashboardShellActions = {
  loadPublicBranding: () => brandingController.loadPublicDashboardBranding(),
};
