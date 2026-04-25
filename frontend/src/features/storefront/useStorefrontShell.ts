interface StorefrontShellDeps {
  closeAnnouncement?: () => void;
  startMainLogin?: () => Promise<unknown> | unknown;
  logoutCurrentUser?: () => void;
  showProfileModal?: () => Promise<unknown> | unknown;
  openOrderHistory?: () => Promise<unknown> | unknown;
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
    return deps.openOrderHistory?.();
  }

  function handleCloseOrdersModal() {
    return deps.closeOrderHistory?.();
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
