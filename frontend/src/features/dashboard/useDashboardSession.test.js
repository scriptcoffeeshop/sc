import { beforeEach, describe, expect, it, vi } from "vitest";

function jsonResponse(payload) {
  return { json: async () => payload };
}

function createLocalStorageMock(initialEntries = {}) {
  const storage = new Map(Object.entries(initialEntries));
  return {
    getItem: vi.fn((key) => storage.has(key) ? storage.get(key) : null),
    setItem: vi.fn((key, value) => {
      storage.set(key, String(value));
    }),
    removeItem: vi.fn((key) => {
      storage.delete(key);
    }),
  };
}

function createDeferred() {
  let resolve;
  const promise = new Promise((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}

async function loadSessionModule() {
  vi.resetModules();
  return await import("./useDashboardSession.ts");
}

describe("useDashboardSession", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("handles LINE callback success, stores session, and enters the default tab", async () => {
    const module = await loadSessionModule();
    const localStorage = createLocalStorageMock({
      coffee_admin_state: "state-123",
    });
    const replaceState = vi.fn();
    vi.stubGlobal("localStorage", localStorage);
    vi.stubGlobal("window", {
      history: { replaceState },
      location: { search: "" },
    });

    const loadInitialData = vi.fn(async () => undefined);
    const usersLoader = vi.fn(async () => undefined);
    const Swal = {
      fire: vi.fn(async () => ({})),
      showLoading: vi.fn(),
      close: vi.fn(),
    };

    module.configureDashboardSessionServices({
      API_URL: "https://api.example",
      authFetch: vi.fn(async () =>
        jsonResponse({
          success: true,
          isAdmin: true,
          token: "jwt-token",
          user: {
            userId: "admin-user",
            displayName: "Script Admin",
          },
        })
      ),
      Swal,
      tabs: ["orders", "users"],
      defaultTab: "users",
      lineRedirect: "https://app.example/dashboard.html",
      loadInitialData,
      getDashboardTabLoaders: () => ({ users: usersLoader }),
      loginWithLineFn: vi.fn(),
    });

    await module.dashboardSessionActions.handleLineCallback("code-123", "state-123");

    const dashboard = module.useDashboardSession();
    expect(dashboard.currentUser.value).toMatchObject({
      userId: "admin-user",
      displayName: "Script Admin",
    });
    expect(dashboard.activeTab.value).toBe("users");
    expect(dashboard.isAuthenticated.value).toBe(true);
    expect(localStorage.setItem).toHaveBeenCalledWith(
      "coffee_admin",
      JSON.stringify({
        userId: "admin-user",
        displayName: "Script Admin",
      }),
    );
    expect(localStorage.setItem).toHaveBeenCalledWith("coffee_jwt", "jwt-token");
    expect(loadInitialData).toHaveBeenCalledTimes(1);
    expect(usersLoader).toHaveBeenCalledTimes(1);
    expect(Swal.close).toHaveBeenCalledTimes(1);
    expect(replaceState).toHaveBeenCalledWith({}, "", "dashboard.html");
  });

  it("restores a stored admin session, delegates startLogin, and clears state on logout", async () => {
    const module = await loadSessionModule();
    const localStorage = createLocalStorageMock({
      coffee_admin: JSON.stringify({
        userId: "saved-admin",
        displayName: "Saved Admin",
      }),
      coffee_jwt: "saved-token",
    });
    const loginWithLineFn = vi.fn();
    vi.stubGlobal("localStorage", localStorage);
    vi.stubGlobal("window", {
      history: { replaceState: vi.fn() },
      location: { search: "" },
    });

    const loadInitialData = vi.fn(async () => undefined);
    const ordersLoader = vi.fn(async () => undefined);

    module.configureDashboardSessionServices({
      tabs: ["orders", "users"],
      defaultTab: "orders",
      lineRedirect: "https://app.example/dashboard.html",
      loginWithLineFn,
      loadInitialData,
      getDashboardTabLoaders: () => ({ orders: ordersLoader }),
      Swal: { fire: vi.fn(), showLoading: vi.fn(), close: vi.fn() },
    });

    await module.dashboardSessionActions.checkLogin();
    expect(module.useDashboardSession().adminDisplayName.value).toBe("Saved Admin");
    expect(ordersLoader).toHaveBeenCalledTimes(1);

    module.dashboardSessionActions.startLogin();
    expect(loginWithLineFn).toHaveBeenCalledWith(
      "https://app.example/dashboard.html",
      "coffee_admin_state",
    );

    module.dashboardSessionActions.logout();
    expect(module.useDashboardSession().currentUser.value).toBe(null);
    expect(module.useDashboardSession().activeTab.value).toBe("orders");
    expect(localStorage.removeItem).toHaveBeenCalledWith("coffee_admin");
    expect(localStorage.removeItem).toHaveBeenCalledWith("coffee_jwt");
  });

  it("keeps a user-selected tab when stored-session bootstrap is still loading", async () => {
    const module = await loadSessionModule();
    const initialLoad = createDeferred();
    const localStorage = createLocalStorageMock({
      coffee_admin: JSON.stringify({
        userId: "saved-admin",
        displayName: "Saved Admin",
      }),
      coffee_jwt: "saved-token",
    });
    vi.stubGlobal("localStorage", localStorage);
    vi.stubGlobal("window", {
      history: { replaceState: vi.fn() },
      location: { search: "" },
    });

    const usersLoader = vi.fn(async () => undefined);
    const ordersLoader = vi.fn(async () => undefined);

    module.configureDashboardSessionServices({
      tabs: ["orders", "users"],
      defaultTab: "orders",
      lineRedirect: "https://app.example/dashboard.html",
      loginWithLineFn: vi.fn(),
      loadInitialData: vi.fn(() => initialLoad.promise),
      getDashboardTabLoaders: () => ({
        orders: ordersLoader,
        users: usersLoader,
      }),
      Swal: { fire: vi.fn(), showLoading: vi.fn(), close: vi.fn() },
    });

    const bootstrapPromise = module.dashboardSessionActions.checkLogin();
    expect(module.useDashboardSession().isAuthenticated.value).toBe(true);

    await module.dashboardSessionActions.setActiveTab("users");
    expect(module.useDashboardSession().activeTab.value).toBe("users");

    initialLoad.resolve();
    await bootstrapPromise;

    expect(module.useDashboardSession().activeTab.value).toBe("users");
    expect(usersLoader).toHaveBeenCalledTimes(1);
    expect(ordersLoader).not.toHaveBeenCalled();
  });
});
