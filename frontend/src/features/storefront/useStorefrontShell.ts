interface StorefrontShellDeps {
  document?: Document;
  closeAnnouncement?: () => void;
  startMainLogin?: () => Promise<unknown> | unknown;
  logoutCurrentUser?: () => void;
  showProfileModal?: () => Promise<unknown> | unknown;
  showMyOrders?: () => Promise<unknown> | unknown;
  closeOrderHistory?: () => void;
}

export function useStorefrontShell(deps: StorefrontShellDeps = {}) {
  function handleCloseAnnouncement() {
    return deps.closeAnnouncement?.();
  }

  function handleStorefrontLogin() {
    return deps.startMainLogin?.();
  }

  function handleStorefrontLogout() {
    return deps.logoutCurrentUser?.();
  }

  function handleShowProfile() {
    return deps.showProfileModal?.();
  }

  function handleShowMyOrders() {
    return deps.showMyOrders?.();
  }

  function handleCloseOrdersModal() {
    if (deps.closeOrderHistory) {
      deps.closeOrderHistory();
      return;
    }
    deps.document?.getElementById?.("my-orders-modal")?.classList.add("hidden");
  }

  return {
    handleCloseAnnouncement,
    handleStorefrontLogin,
    handleStorefrontLogout,
    handleShowProfile,
    handleShowMyOrders,
    handleCloseOrdersModal,
  };
}
