import { computed, ref, type ComputedRef, type Ref } from "vue";
import { tryParseJsonRecord } from "../../lib/jsonUtils.ts";
import { getDashboardErrorMessage } from "./dashboardErrors.ts";
import type {
  DashboardSessionServices,
  SessionUser,
} from "../../types/index";

interface LineLoginResult {
  success?: boolean;
  isAdmin?: boolean;
  token?: string;
  user?: SessionUser;
  error?: string;
}

interface DashboardSessionState {
  currentUser: Ref<SessionUser | null>;
  activeTab: Ref<string>;
  isAuthenticated: ComputedRef<boolean>;
  adminDisplayName: ComputedRef<string>;
}

const currentUser = ref<SessionUser | null>(null);
const activeTab = ref("orders");

let services: DashboardSessionServices | null = null;
let initialDataLoaded = false;
let initialDataPromise: Promise<void> | null = null;

function getServices(): DashboardSessionServices {
  if (!services) {
    throw new Error("Dashboard session services 尚未初始化");
  }
  return services;
}

function clearStoredSession() {
  const {
    adminStorageKey = "coffee_admin",
    jwtStorageKey = "coffee_jwt",
  } = getServices();
  localStorage.removeItem(adminStorageKey);
  localStorage.removeItem(jwtStorageKey);
}

function normalizeTab(tab: string) {
  const { tabs = [], defaultTab = "orders" } = getServices();
  return tabs.includes(tab) ? tab : defaultTab;
}

async function runTabLoader(tab: string) {
  const tabLoaders = getServices().getDashboardTabLoaders?.() || {};
  const loader = tabLoaders[tab];
  if (typeof loader === "function") {
    await loader();
  }
}

async function ensureInitialDataLoaded() {
  if (initialDataLoaded) return;
  if (initialDataPromise) {
    await initialDataPromise;
    return;
  }

  initialDataPromise = Promise.resolve(getServices().loadInitialData?.())
    .then(() => {
      initialDataLoaded = true;
    })
    .finally(() => {
      initialDataPromise = null;
    });

  await initialDataPromise;
}

async function setActiveTab(tab: string, options: { force?: boolean } = {}) {
  const normalizedTab = normalizeTab(tab);
  const shouldReload = Boolean(options.force) || activeTab.value !== normalizedTab;
  activeTab.value = normalizedTab;
  if (shouldReload) {
    await runTabLoader(normalizedTab);
  }
}

async function enterAdmin(tab?: string) {
  const requestedTab = normalizeTab(
    tab || activeTab.value || getServices().defaultTab || "orders",
  );
  const tabBeforeInitialLoad = activeTab.value;
  await ensureInitialDataLoaded();
  const userChangedTabWhileLoading = activeTab.value !== tabBeforeInitialLoad;
  await setActiveTab(userChangedTabWhileLoading ? activeTab.value : requestedTab, {
    force: !userChangedTabWhileLoading,
  });
}

function getAuthUserId() {
  if (!currentUser.value?.userId) throw new Error("請先登入");
  return currentUser.value.userId;
}

async function handleLineCallback(code: string | null, state: string | null) {
  const {
    Swal,
    authFetch,
    API_URL,
    lineRedirect,
    loginStateKey = "coffee_admin_state",
    adminStorageKey = "coffee_admin",
    jwtStorageKey = "coffee_jwt",
    defaultTab = "orders",
  } = getServices();

  const savedState = localStorage.getItem(loginStateKey);
  localStorage.removeItem(loginStateKey);
  if (!savedState || state !== savedState) {
    Swal.fire("驗證失敗", "請重新登入", "error");
    window.history.replaceState({}, "", "dashboard.html");
    return;
  }

  Swal.fire({
    title: "登入中...",
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading?.(),
  });

  try {
    const response = await authFetch(`${API_URL}?action=lineLogin`, {
      method: "POST",
      body: JSON.stringify({
        code,
        redirectUri: lineRedirect,
      }),
    });
    const result = await response.json() as LineLoginResult;
    window.history.replaceState({}, "", "dashboard.html");

    if (result.success && result.isAdmin && result.user) {
      currentUser.value = result.user;
      localStorage.setItem(adminStorageKey, JSON.stringify(result.user));
      if (result.token) {
        localStorage.setItem(jwtStorageKey, result.token);
      }
      initialDataLoaded = false;
      Swal.close?.();
      await enterAdmin(defaultTab);
      return;
    }

    Swal.fire("錯誤", result.error || "無管理員權限", "error");
  } catch (error) {
    Swal.fire("錯誤", getDashboardErrorMessage(error, "登入失敗"), "error");
  }
}

async function checkLogin() {
  const {
    adminStorageKey = "coffee_admin",
    jwtStorageKey = "coffee_jwt",
    defaultTab = "orders",
  } = getServices();
  const savedAdmin = localStorage.getItem(adminStorageKey);
  const savedToken = localStorage.getItem(jwtStorageKey);

  if (!(savedAdmin && savedToken)) {
    clearStoredSession();
    currentUser.value = null;
    activeTab.value = defaultTab;
    initialDataLoaded = false;
    return;
  }

  const storedAdmin = tryParseJsonRecord(savedAdmin);
  const userId = String(storedAdmin?.["userId"] || "").trim();
  if (!userId) {
    clearStoredSession();
    currentUser.value = null;
    activeTab.value = defaultTab;
    initialDataLoaded = false;
    return;
  }
  currentUser.value = { ...storedAdmin, userId } as SessionUser;
  await enterAdmin(defaultTab);
}

async function bootstrapFromWindow() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("code")) {
    await handleLineCallback(params.get("code"), params.get("state"));
    return;
  }
  await checkLogin();
}

function logout() {
  clearStoredSession();
  currentUser.value = null;
  initialDataLoaded = false;
  activeTab.value = getServices().defaultTab || "orders";
}

function startLogin() {
  const { loginWithLineFn, lineRedirect, loginStateKey = "coffee_admin_state" } =
    getServices();
  return loginWithLineFn(lineRedirect, loginStateKey);
}

export function configureDashboardSessionServices(
  nextServices: Partial<DashboardSessionServices>,
) {
  services = {
    ...services,
    ...nextServices,
  } as DashboardSessionServices;
}

export function getDashboardCurrentUser() {
  return currentUser.value;
}

export function getDashboardActiveTab() {
  return activeTab.value;
}

export function useDashboardSession(): DashboardSessionState {
  return {
    currentUser,
    activeTab,
    isAuthenticated: computed(() => Boolean(currentUser.value?.userId)),
    adminDisplayName: computed(() => currentUser.value?.displayName || "管理員"),
  };
}

export const dashboardSessionActions = {
  getAuthUserId,
  setActiveTab,
  handleLineCallback,
  checkLogin,
  bootstrapFromWindow,
  logout,
  startLogin,
};
