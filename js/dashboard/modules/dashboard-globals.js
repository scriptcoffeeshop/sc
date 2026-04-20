export function registerDashboardGlobals(deps) {
  if (typeof window === "undefined") return;

  Object.assign(window, {
    loginWithLine: deps.loginWithLine,
    logout: deps.logout,
    showTab: deps.showTab,
    loadOrders: deps.loadOrders,
    renderOrders: deps.renderOrders,
    changeOrderStatus: deps.changeOrderStatus,
    sendOrderEmailByOrderId: deps.sendOrderEmailByOrderId,
    deleteOrderById: deps.deleteOrderById,
    showProductModal: deps.showProductModal,
    editProduct: deps.editProduct,
    closeProductModal: deps.closeProductModal,
    saveProduct: deps.saveProduct,
    delProduct: deps.delProduct,
    moveProduct: deps.moveProduct,
    addSpecRow: deps.addSpecRow,
    addCategory: deps.addCategory,
    editCategory: deps.editCategory,
    delCategory: deps.delCategory,
    updateCategoryOrders: deps.updateCategoryOrders,
    saveSettings: deps.saveSettings,
    loadUsers: deps.loadUsers,
    toggleUserRole: deps.toggleUserRole,
    toggleUserBlacklist: deps.toggleUserBlacklist,
    loadBlacklist: deps.loadBlacklist,
    esc: deps.esc,
    showAddFieldModal: deps.showAddFieldModal,
    editFormField: deps.editFormField,
    deleteFormField: deps.deleteFormField,
    toggleFieldEnabled: deps.toggleFieldEnabled,
    resetSectionTitle: deps.resetSectionTitle,
    refundOnlinePayOrder: deps.refundOnlinePayOrder,
    confirmTransferPayment: deps.confirmTransferPayment,
    showAddBankAccountModal: deps.showAddBankAccountModal,
    editBankAccount: deps.editBankAccount,
    deleteBankAccount: deps.deleteBankAccount,
    showPromotionModal: deps.showPromotionModal,
    closePromotionModal: deps.closePromotionModal,
    savePromotion: deps.savePromotion,
    editPromotion: deps.editPromotion,
    delPromotion: deps.delPromotion,
  });

  window.linePayRefundOrder = (orderId) =>
    deps.refundOnlinePayOrder(orderId, "linepay");
}
