export function createDashboardSessionController(deps) {
  function getAuthUserId() {
    const currentUser = deps.getCurrentUser?.();
    if (!currentUser?.userId) throw new Error("請先登入");
    return currentUser.userId;
  }

  function showTab(tab) {
    const tabs = Array.isArray(deps.tabs) ? deps.tabs : [];
    tabs.forEach((tabId) => {
      const tabBtn = document.getElementById(`tab-${tabId}`);
      const section = document.getElementById(`${tabId}-section`);
      if (tabBtn) {
        tabBtn.classList.remove("tab-active");
        tabBtn.classList.add("bg-white", "ui-text-strong");
      }
      if (section) section.classList.add("hidden");
    });

    document.getElementById(`tab-${tab}`)?.classList.add("tab-active");
    document.getElementById(`tab-${tab}`)?.classList.remove(
      "bg-white",
      "ui-text-strong",
    );
    document.getElementById(`${tab}-section`)?.classList.remove("hidden");

    const tabLoaders = deps.getDashboardTabLoaders?.() || {};
    const loader = tabLoaders[tab];
    if (loader) loader();
  }

  async function showAdmin() {
    document.getElementById("login-page")?.classList.add("hidden");
    document.getElementById("admin-page")?.classList.remove("hidden");
    const currentUser = deps.getCurrentUser?.() || {};
    const adminNameEl = document.getElementById("admin-name");
    if (adminNameEl) {
      adminNameEl.textContent = currentUser.displayName || "管理員";
    }
    await deps.loadInitialData?.();
    showTab(deps.defaultTab || "orders");
  }

  async function handleLineCallback(code, state) {
    const saved = localStorage.getItem(deps.loginStateKey || "coffee_admin_state");
    localStorage.removeItem(deps.loginStateKey || "coffee_admin_state");
    if (!saved || state !== saved) {
      deps.Swal.fire("驗證失敗", "請重新登入", "error");
      window.history.replaceState({}, "", "dashboard.html");
      return;
    }

    deps.Swal.fire({
      title: "登入中...",
      allowOutsideClick: false,
      didOpen: () => deps.Swal.showLoading(),
    });

    try {
      const response = await deps.authFetch(
        `${deps.API_URL}?action=lineLogin`,
        {
          method: "POST",
          body: JSON.stringify({
            code,
            redirectUri: deps.lineRedirect,
          }),
        },
      );
      const result = await response.json();
      window.history.replaceState({}, "", "dashboard.html");
      if (result.success && result.isAdmin) {
        deps.setCurrentUser?.(result.user);
        localStorage.setItem(
          deps.adminStorageKey || "coffee_admin",
          JSON.stringify(result.user),
        );
        if (result.token) {
          localStorage.setItem(deps.jwtStorageKey || "coffee_jwt", result.token);
        }
        deps.Swal.close();
        await showAdmin();
      } else {
        deps.Swal.fire("錯誤", result.error || "無管理員權限", "error");
      }
    } catch (error) {
      deps.Swal.fire("錯誤", error.message, "error");
    }
  }

  function checkLogin() {
    const adminStorageKey = deps.adminStorageKey || "coffee_admin";
    const jwtStorageKey = deps.jwtStorageKey || "coffee_jwt";
    const savedAdmin = localStorage.getItem(adminStorageKey);
    const savedToken = localStorage.getItem(jwtStorageKey);
    if (savedAdmin && savedToken) {
      try {
        deps.setCurrentUser?.(JSON.parse(savedAdmin));
        showAdmin();
      } catch {
        localStorage.removeItem(adminStorageKey);
        localStorage.removeItem(jwtStorageKey);
      }
    } else {
      localStorage.removeItem(adminStorageKey);
      localStorage.removeItem(jwtStorageKey);
    }
  }

  function logout() {
    localStorage.removeItem(deps.adminStorageKey || "coffee_admin");
    localStorage.removeItem(deps.jwtStorageKey || "coffee_jwt");
    deps.setCurrentUser?.(null);
    document.getElementById("login-page")?.classList.remove("hidden");
    document.getElementById("admin-page")?.classList.add("hidden");
  }

  return {
    getAuthUserId,
    showTab,
    showAdmin,
    handleLineCallback,
    checkLogin,
    logout,
  };
}
