import { API_URL, LINE_REDIRECT } from "../../lib/appConfig.ts";
import Sortable from "sortablejs";
import Swal from "../../lib/swal.ts";
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
import { canAccessDashboardTab } from "./dashboardAdminPermissions.ts";

type DashboardTabLoader = () => Promise<unknown> | unknown;
type DashboardTabLoaderMap = Record<string, DashboardTabLoader>;

interface OrdersTabLoadersDeps {
  loadOrders: DashboardTabLoader;
}

interface ProductsTabLoadersDeps {
  renderCategories: DashboardTabLoader;
  loadPromotions: DashboardTabLoader;
}

interface SettingsTabLoadersDeps {
  loadSettings: DashboardTabLoader;
  loadFormFields: DashboardTabLoader;
}

interface UsersTabLoadersDeps {
  loadUsers: DashboardTabLoader;
  loadBlacklist: DashboardTabLoader;
}

let dashboardTabLoaders: DashboardTabLoaderMap = {};
let loadInitialDashboardData: () => Promise<void> = async () => {};

const LINEPAY_SANDBOX_CACHE_KEY = "coffee_linepay_sandbox";
export const DASHBOARD_PUBLIC_BRANDING_CACHE_KEY = "coffee_dashboard_public_branding";
const dashboardTabs = [
  "orders",
  "products",
  "categories",
  "promotions",
  "settings",
  "checkout-settings",
  "icon-library",
  "users",
  "blacklist",
  "formfields",
];

function createOrdersTabLoaders(deps: OrdersTabLoadersDeps): DashboardTabLoaderMap {
  return {
    orders: () => deps.loadOrders(),
  };
}

function createProductsTabLoaders(
  deps: ProductsTabLoadersDeps,
): DashboardTabLoaderMap {
  return {
    categories: () => deps.renderCategories(),
    promotions: () => deps.loadPromotions(),
  };
}

function createSettingsTabLoaders(
  deps: SettingsTabLoadersDeps,
): DashboardTabLoaderMap {
  return {
    settings: () => deps.loadSettings(),
    "checkout-settings": () => deps.loadSettings(),
    "icon-library": () => deps.loadSettings(),
    formfields: () => deps.loadFormFields(),
  };
}

function createUsersTabLoaders(deps: UsersTabLoadersDeps): DashboardTabLoaderMap {
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
  getSiteTitle: () => dashboardSettingsActions.getRawSettings()?.["site_title"],
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
  const currentUser = getDashboardCurrentUser();
  const tasks: Array<Promise<unknown> | unknown> = [];
  if (
    canAccessDashboardTab(currentUser, "products") ||
    canAccessDashboardTab(currentUser, "categories") ||
    canAccessDashboardTab(currentUser, "promotions")
  ) {
    tasks.push(dashboardCategoriesActions.loadCategories());
    tasks.push(dashboardProductsActions.loadProducts());
  }
  if (
    canAccessDashboardTab(currentUser, "settings") ||
    canAccessDashboardTab(currentUser, "checkout-settings") ||
    canAccessDashboardTab(currentUser, "icon-library") ||
    canAccessDashboardTab(currentUser, "formfields")
  ) {
    tasks.push(dashboardSettingsActions.loadSettings());
  }
  if (canAccessDashboardTab(currentUser, "orders")) {
    tasks.push(dashboardOrdersActions.loadOrders());
  }
  await Promise.all(tasks);
};

export const dashboardShellActions = {
  applyCachedPublicBranding: () => brandingController.applyCachedDashboardBranding(),
  loadPublicBranding: () => brandingController.loadPublicDashboardBranding(),
};
