// ============================================
// main-app.js — 訂購頁初始化入口
// ============================================

import { API_URL, LINE_REDIRECT } from './config.js';
import { Toast } from './utils.js';
import { loginWithLine } from './auth.js';
import { state } from './state.js';
import { addToCart, updateCartItemQty, removeCartItem, toggleCart, loadCart } from './cart.js';
import { renderProducts } from './products.js';
import { selectDelivery, updateDistricts, openStoreMap, openStoreSearchModal, selectStoreFromList, clearSelectedStore, loadDeliveryPrefs, checkStoreToken } from './delivery.js';
import { submitOrder, showMyOrders } from './orders.js';
import { renderDynamicFields, applyBranding } from './form-renderer.js';

// ============ 全域函式掛載 (HTML onclick 呼叫) ============
window._cart = { addToCart, updateCartItemQty, removeCartItem, toggleCart };
window._delivery = { selectDelivery, updateDistricts, openStoreMap, openStoreSearchModal, selectStoreFromList, clearSelectedStore };
window._orders = { submitOrder, showMyOrders };

// 直接掛載到 window（保持 HTML onclick 相容）
window.addToCart = addToCart;
window.updateCartItemQty = updateCartItemQty;
window.removeCartItem = removeCartItem;
window.toggleCart = toggleCart;
window.selectDelivery = selectDelivery;
window.updateDistricts = updateDistricts;
window.openStoreMap = openStoreMap;
window.openStoreSearchModal = openStoreSearchModal;
window.selectStoreFromList = selectStoreFromList;
window.clearSelectedStore = clearSelectedStore;
window.submitOrder = submitOrder;
window.showMyOrders = showMyOrders;
window.loginWithLine = () => loginWithLine(LINE_REDIRECT.main, 'coffee_line_state');
window.closeAnnouncement = () => document.getElementById('announcement-banner').classList.add('hidden');

// ============ 初始化 ============
document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const stateParam = urlParams.get('state');
    if (code) {
        await handleLineCallback(code, stateParam);
    } else {
        checkLoginStatus();
    }
    loadCart(); // 載入購物車
    await loadInitData();
    updateFormState();

    const storeToken = urlParams.get('store_token');
    if (storeToken) {
        window.history.replaceState({}, '', 'main.html');
        await checkStoreToken(storeToken);
    }
});

// ============ LINE Login 回呼 ============
async function handleLineCallback(code, stateParam) {
    const saved = localStorage.getItem('coffee_line_state');
    localStorage.removeItem('coffee_line_state');
    if (!saved || stateParam !== saved) {
        Swal.fire('驗證失敗', '請重新登入', 'error');
        window.history.replaceState({}, '', 'main.html');
        return;
    }
    Swal.fire({ title: '登入中...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
        const res = await fetch(`${API_URL}?action=customerLineLogin&code=${encodeURIComponent(code)}&redirectUri=${encodeURIComponent(LINE_REDIRECT.main)}`);
        const result = await res.json();
        window.history.replaceState({}, '', 'main.html');
        if (result.success) {
            state.currentUser = result.user;
            localStorage.setItem('coffee_user', JSON.stringify(state.currentUser));
            showUserInfo();
            Swal.close();
        } else { throw new Error(result.error || '登入失敗'); }
    } catch (e) { Swal.fire('登入失敗', e.message, 'error'); }
}

function checkLoginStatus() {
    const saved = localStorage.getItem('coffee_user');
    if (saved) { try { state.currentUser = JSON.parse(saved); showUserInfo(); } catch { localStorage.removeItem('coffee_user'); } }
}

function showUserInfo() {
    document.getElementById('login-prompt').classList.add('hidden');
    document.getElementById('user-info').classList.remove('hidden');
    document.getElementById('user-display-name').textContent = state.currentUser.displayName || state.currentUser.display_name;
    document.getElementById('user-avatar').src = state.currentUser.pictureUrl || state.currentUser.picture_url || 'https://via.placeholder.com/48';
    document.getElementById('line-name').value = state.currentUser.displayName || state.currentUser.display_name;
    // 回填動態欄位: phone / email
    const phoneEl = document.getElementById('field-phone');
    const emailEl = document.getElementById('field-email');
    if (phoneEl && state.currentUser.phone) phoneEl.value = state.currentUser.phone;
    if (emailEl && state.currentUser.email) emailEl.value = state.currentUser.email;
    updateFormState();
    setTimeout(loadDeliveryPrefs, 100);
}

window.logout = function () {
    state.currentUser = null;
    localStorage.removeItem('coffee_user');
    document.getElementById('login-prompt').classList.remove('hidden');
    document.getElementById('user-info').classList.add('hidden');
    document.getElementById('line-name').value = '';
    // 清除動態欄位
    const phoneEl = document.getElementById('field-phone');
    const emailEl = document.getElementById('field-email');
    if (phoneEl) phoneEl.value = '';
    if (emailEl) emailEl.value = '';
    updateFormState();
};

// ============ 載入資料 ============
async function loadInitData() {
    try {
        const res = await fetch(`${API_URL}?action=getInitData&_=${Date.now()}`);
        const result = await res.json();
        if (result.success) {
            state.products = (result.products || []).filter(p => p.enabled);
            state.categories = result.categories || [];
            state.formFields = result.formFields || [];

            applySettings(result.settings || {});
            applyBranding(result.settings || {});
            renderDynamicFields(state.formFields, document.getElementById('dynamic-fields-container'));
            renderProducts();

            // 登入後再回填一次（因為渲染完才有欄位）
            if (state.currentUser) {
                const phoneEl = document.getElementById('field-phone');
                const emailEl = document.getElementById('field-email');
                if (phoneEl && state.currentUser.phone) phoneEl.value = state.currentUser.phone;
                if (emailEl && state.currentUser.email) emailEl.value = state.currentUser.email;
            }
        } else { throw new Error(result.error); }
    } catch (e) {
        document.getElementById('products-container').innerHTML = `<p class="p-8 text-center text-red-600">載入失敗: ${e.message}<br><button onclick="location.reload()" class="mt-3 btn-primary">重試</button></p>`;
    }
}

function applySettings(s) {
    if (String(s.announcement_enabled) === 'true' && s.announcement) {
        document.getElementById('announcement-text').textContent = s.announcement;
        document.getElementById('announcement-banner').classList.remove('hidden');
    }
    if (String(s.is_open) === 'false') {
        state.isStoreOpen = false;
        updateFormState();
        document.getElementById('total-price').textContent = '🔒 目前休息中，暫停接單';
    }
}

function updateFormState() {
    const loggedIn = !!state.currentUser;
    const open = state.isStoreOpen;
    const submitBtn = document.getElementById('submit-btn');
    submitBtn.disabled = !loggedIn || !open;
}
