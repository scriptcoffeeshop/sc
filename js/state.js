// ============================================
// state.js — 訂購頁共享狀態 (避免循環依賴)
// ============================================

export const state = {
    products: [],
    categories: [],
    currentUser: null,
    selectedDelivery: '',
    isStoreOpen: true,
};
