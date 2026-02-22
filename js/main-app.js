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
import { authFetch } from './auth.js';
import { escapeHtml } from './utils.js';

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
window.selectPayment = selectPayment;
window.copyTransferAccount = copyTransferAccount;
window.loginWithLine = () => loginWithLine(LINE_REDIRECT.main, 'coffee_line_state');
window.closeAnnouncement = () => document.getElementById('announcement-banner').classList.add('hidden');

// ============ 初始化 ============
document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const stateParam = urlParams.get('state');

    // LINE Pay 回調處理
    const lpAction = urlParams.get('lpAction');
    if (lpAction) {
        window.history.replaceState({}, '', 'main.html');
        await handleLinePayCallback(lpAction, urlParams);
    }

    if (code) {
        await handleLineCallback(code, stateParam);
    } else {
        checkLoginStatus();
    }
    loadCart();
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
            if (result.token) {
                localStorage.setItem('coffee_jwt', result.token);
            }
            showUserInfo();
            Swal.close();
        } else { throw new Error(result.error || '登入失敗'); }
    } catch (e) { Swal.fire('登入失敗', e.message, 'error'); }
}

function checkLoginStatus() {
    const saved = localStorage.getItem('coffee_user');
    const token = localStorage.getItem('coffee_jwt');
    if (saved && token) {
        try {
            state.currentUser = JSON.parse(saved);
            showUserInfo();
        } catch {
            localStorage.removeItem('coffee_user');
            localStorage.removeItem('coffee_jwt');
        }
    } else {
        localStorage.removeItem('coffee_user');
        localStorage.removeItem('coffee_jwt');
    }
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
    localStorage.removeItem('coffee_jwt');
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
            state.bankAccounts = result.bankAccounts || [];

            applySettings(result.settings || {});
            applyBranding(result.settings || {});
            renderDynamicFields(state.formFields, document.getElementById('dynamic-fields-container'));
            renderProducts();
            renderBankAccounts();

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

    // 付款方式設定
    state.linePayEnabled = String(s.linepay_enabled) === 'true';
    state.transferEnabled = String(s.transfer_enabled) === 'true';

    if (state.linePayEnabled) {
        document.getElementById('linepay-option').classList.remove('hidden');
    }
    if (state.transferEnabled) {
        document.getElementById('transfer-option').classList.remove('hidden');
    }
}

function updateFormState() {
    const loggedIn = !!state.currentUser;
    const open = state.isStoreOpen;
    const submitBtn = document.getElementById('submit-btn');
    submitBtn.disabled = !loggedIn || !open;
}

// ============ 付款方式選擇 ============
function selectPayment(method) {
    state.selectedPayment = method;
    document.querySelectorAll('.payment-option').forEach(el => el.classList.remove('active'));

    // 改以 method 尋找對應的按鈕，避免 event.currentTarget 在程式呼叫時不存在的問題
    const activeBtn = document.querySelector(`.payment-option[onclick*="'${method}'"]`);
    if (activeBtn) activeBtn.classList.add('active');

    // 顯示/隱藏轉帳資訊
    const transferSection = document.getElementById('transfer-info-section');
    if (method === 'transfer') {
        transferSection.classList.remove('hidden');
        if (state.bankAccounts.length > 0 && !state.selectedBankAccountId) {
            selectBankAccount(state.bankAccounts[0].id); // 預設選擇第一個
        }
    } else {
        transferSection.classList.add('hidden');
    }
}

function selectBankAccount(id) {
    state.selectedBankAccountId = id;
    renderBankAccounts(); // 重新渲染以更新 UI 狀態
}

function renderBankAccounts() {
    const container = document.getElementById('bank-accounts-list');
    if (!container || !state.bankAccounts.length) return;
    container.innerHTML = state.bankAccounts.map(b => {
        const isSelected = state.selectedBankAccountId == b.id;
        const borderClass = isSelected ? 'border-primary ring-2 ring-primary bg-orange-50' : 'border-[#d1dce5] bg-white';
        return `
        <div class="p-3 rounded-lg mb-2 relative cursor-pointer font-sans transition-all border ${borderClass}" onclick="selectBankAccount('${b.id}')">
            <div class="flex items-center gap-3 mb-1">
                <input type="radio" name="bank_account_selection" class="w-4 h-4 text-primary" ${isSelected ? 'checked' : ''} onclick="event.stopPropagation(); selectBankAccount('${b.id}')">
                <div class="font-semibold text-gray-800">${escapeHtml(b.bankName)} (${escapeHtml(b.bankCode)})</div>
            </div>
            <div class="flex items-center gap-2 mt-1 pl-7">
                <span class="text-lg font-mono font-medium" style="color:var(--primary)">${escapeHtml(b.accountNumber)}</span>
                <button onclick="event.stopPropagation(); copyTransferAccount(this, '${escapeHtml(b.accountNumber)}')" class="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-1 rounded transition-colors" title="複製帳號">
                    📋 複製
                </button>
            </div>
            ${b.accountName ? `<div class="text-sm text-gray-500 mt-1 pl-7">戶名: ${escapeHtml(b.accountName)}</div>` : ''}
        </div>
        `;
    }).join('');
}

function copyTransferAccount(btn, account) {
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(account).then(() => {
            showCopySuccess(btn);
        }).catch(err => {
            console.error('複製失敗:', err);
            fallbackCopyTextToClipboard(account, btn);
        });
    } else {
        fallbackCopyTextToClipboard(account, btn);
    }
}

function fallbackCopyTextToClipboard(text, btn) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    // 隱藏元素，不影響畫面排版
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        const successful = document.execCommand('copy');
        if (successful) showCopySuccess(btn);
    } catch (err) {
        console.error('Fallback 複製失敗:', err);
    }
    document.body.removeChild(textArea);
}

function showCopySuccess(btn) {
    const originalText = btn.innerHTML;
    btn.innerHTML = '✅ 已複製';
    btn.classList.add('bg-green-100', 'text-green-700');
    setTimeout(() => {
        btn.innerHTML = originalText;
        btn.classList.remove('bg-green-100', 'text-green-700');
    }, 2000);
}

// ============ LINE Pay 回調 ============
async function handleLinePayCallback(lpAction, params) {
    const transactionId = params.get('transactionId') || '';
    const orderId = params.get('orderId') || '';

    if (lpAction === 'confirm' && transactionId && orderId) {
        Swal.fire({ title: '確認付款中...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        try {
            const res = await fetch(`${API_URL}?action=linePayConfirm&transactionId=${transactionId}&orderId=${orderId}`);
            const result = await res.json();
            if (result.success) {
                Swal.fire({ icon: 'success', title: '付款成功！', text: `訂單編號：${orderId}`, confirmButtonColor: '#3C2415' });
            } else {
                Swal.fire('付款失敗', result.error || '請聯繫店家', 'error');
            }
        } catch (e) {
            Swal.fire('錯誤', '付款確認失敗: ' + e.message, 'error');
        }
    } else if (lpAction === 'cancel') {
        // 通知後端取消
        if (orderId) {
            try { await fetch(`${API_URL}?action=linePayCancel&orderId=${orderId}`); } catch { }
        }
        Swal.fire({ icon: 'info', title: '付款已取消', text: '您已取消 LINE Pay 付款', confirmButtonColor: '#3C2415' });
    }
}
