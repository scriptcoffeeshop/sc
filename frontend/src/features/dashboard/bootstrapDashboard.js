import { API_URL, LINE_REDIRECT } from "../../../../js/config.js";
import Sortable from "sortablejs";
import Swal from "../../lib/swal.js";
import { esc, Toast } from "../../../../js/utils.js";
import { authFetch, loginWithLine } from "../../../../js/auth.js";
import {
  getDefaultIconUrl,
  normalizeIconPath,
  resolveAssetUrl,
} from "../../../../js/icons.js";
import {
  createOrdersTabLoaders,
} from "../../../../js/dashboard/modules/orders.js";
import {
  orderMethodLabel,
  orderPayMethodLabel,
  orderPayStatusLabel,
  orderStatusLabel,
  normalizeReceiptInfo,
  normalizeTrackingUrl,
} from "../../../../js/dashboard/modules/order-shared.js";
import { createOrderStatusController } from "../../../../js/dashboard/modules/order-status-controller.js";
import {
  createProductsTabLoaders,
} from "../../../../js/dashboard/modules/products.js";
import { createOrderNotificationsController } from "../../../../js/dashboard/modules/order-notifications-controller.js";
import {
  createSettingsTabLoaders,
} from "../../../../js/dashboard/modules/settings.js";
import {
  createDashboardBrandingController,
  parseBooleanSetting,
} from "../../../../js/dashboard/modules/dashboard-branding.js";
import {
  DEFAULT_DELIVERY_OPTIONS,
  normalizeDeliveryOption,
  normalizePaymentOption,
  sectionIconSettingKey,
} from "../../../../js/dashboard/modules/settings-shared.js";
import {
  createUsersTabLoaders,
} from "../../../../js/dashboard/modules/users.js";
import {
  configureDashboardCategoriesServices,
  dashboardCategoriesActions,
  getDashboardCategories,
} from "./useDashboardCategories.js";
import {
  configureDashboardFormFieldsServices,
  dashboardFormFieldsActions,
} from "./useDashboardFormFields.ts";
import {
  configureDashboardBankAccountsServices,
  dashboardBankAccountsActions,
} from "./useDashboardBankAccounts.js";
import {
  configureDashboardPromotionsServices,
  dashboardPromotionsActions,
} from "./useDashboardPromotions.js";
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
} from "./useDashboardSettingsIcons.js";
import {
  configureDashboardUsersServices,
  dashboardUsersActions,
} from "./useDashboardUsers.js";
import {
  configureDashboardOrdersServices,
  dashboardOrdersActions,
  getDashboardOrders,
} from "./useDashboardOrders.ts";
import {
  configureDashboardProductsServices,
  dashboardProductsActions,
  getDashboardProducts,
} from "./useDashboardProducts.js";

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

loadInitialDashboardData = () => Promise.all([
  dashboardCategoriesActions.loadCategories(),
  dashboardProductsActions.loadProducts(),
  dashboardSettingsActions.loadSettings(),
  dashboardOrdersActions.loadOrders(),
]);

export const dashboardShellActions = {
  loadPublicBranding: () => brandingController.loadPublicDashboardBranding(),
};
