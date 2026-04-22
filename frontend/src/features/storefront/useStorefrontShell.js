import { ref } from "vue";

export function useStorefrontShell(deps = {}) {
  const productsCategories = ref([]);
  const deliveryOptions = ref([]);
  const bankAccounts = ref([]);
  const selectedBankAccountId = ref("");
  const copiedBankAccountId = ref("");

  function syncStorefrontUiState() {
    const snapshot = deps.getStorefrontUiSnapshot?.() || {};
    deliveryOptions.value = Array.isArray(snapshot.deliveryConfig)
      ? snapshot.deliveryConfig.filter((item) => item && item.enabled !== false)
      : [];
    bankAccounts.value = Array.isArray(snapshot.bankAccounts)
      ? snapshot.bankAccounts
      : [];
    selectedBankAccountId.value = String(snapshot.selectedBankAccountId || "");
  }

  function handleProductsUpdated(event) {
    const detail = event?.detail || {};
    productsCategories.value = Array.isArray(detail.categories)
      ? detail.categories
      : [];
  }

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

  function handleSelectPayment(method) {
    deps.selectPayment?.(method);
    syncStorefrontUiState();
  }

  function handleSelectDelivery(method) {
    deps.selectDelivery?.(method);
    syncStorefrontUiState();
  }

  function handleOpenStoreMap() {
    void deps.openStoreMap?.();
  }

  function handleClearSelectedStore() {
    deps.clearSelectedStore?.();
  }

  function handleSelectBankAccount(bankId) {
    deps.selectBankAccount?.(bankId);
    syncStorefrontUiState();
  }

  function handleCopyTransferAccount(bankId, accountNumber) {
    const account = String(accountNumber || "").trim();
    if (!account) return;
    const clipboard = deps.clipboard;
    const Toast = deps.Toast;
    const Swal = deps.Swal;
    clipboard?.writeText?.(account)
      .then(() => {
        copiedBankAccountId.value = String(bankId);
        Toast?.fire?.({ icon: "success", title: "帳號已複製" });
        deps.setTimeout?.(() => {
          if (copiedBankAccountId.value === String(bankId)) {
            copiedBankAccountId.value = "";
          }
        }, 2000);
      })
      .catch(() => Swal?.fire?.("錯誤", "複製失敗，請手動複製", "error"));
  }

  return {
    productsCategories,
    deliveryOptions,
    bankAccounts,
    selectedBankAccountId,
    copiedBankAccountId,
    syncStorefrontUiState,
    handleProductsUpdated,
    handleCloseAnnouncement,
    handleStorefrontLogin,
    handleStorefrontLogout,
    handleShowProfile,
    handleShowMyOrders,
    handleCloseOrdersModal,
    handleSelectPayment,
    handleSelectDelivery,
    handleOpenStoreMap,
    handleClearSelectedStore,
    handleSelectBankAccount,
    handleCopyTransferAccount,
  };
}
