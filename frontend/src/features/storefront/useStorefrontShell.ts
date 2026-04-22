interface StorefrontShellDeps {
  document?: Document;
  startMainLogin?: () => Promise<unknown> | unknown;
  logoutCurrentUser?: () => void;
  showProfileModal?: () => Promise<unknown> | unknown;
  showMyOrders?: () => Promise<unknown> | unknown;
  closeOrderHistory?: () => void;
}

export function useStorefrontShell(deps: StorefrontShellDeps = {}) {
  function handleCloseAnnouncement() {
    deps.document?.getElementById?.("announcement-banner")?.classList.add(
      "hidden",
    );
  }

  function handleStorefrontLogin() {
    void deps.startMainLogin?.();
  }

  function handleStorefrontLogout() {
    deps.logoutCurrentUser?.();
  }

  function handleShowProfile() {
    void deps.showProfileModal?.();
  }

  function handleShowMyOrders() {
    void deps.showMyOrders?.();
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
