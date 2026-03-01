// ============================================
// main-app.js — 訂購頁初始化入口
// ============================================

import { API_URL, LINE_REDIRECT } from './config.js';
import { Toast } from './utils.js';
import { loginWithLine } from './auth.js';
import { state } from './state.js';
import { cart, addToCart, updateCartItemQty, updateCartItemQtyByKeys, removeCartItem, toggleCart, loadCart } from './cart.js';
import { renderProducts } from './products.js';
import { selectDelivery, updateDistricts, openStoreMap, openStoreSearchModal, selectStoreFromList, clearSelectedStore, loadDeliveryPrefs, checkStoreToken } from './delivery.js';
import { submitOrder, showMyOrders } from './orders.js';
import { renderDynamicFields, applyBranding } from './form-renderer.js';
import { authFetch } from './auth.js';
import { escapeHtml } from './utils.js';
import { supabase } from './supabase-client.js';

// ============ 事件代理 (Event Delegation) ============
// 透過 data-action 屬性在 document.body 統一監聯 click 事件，
// 取代原本散落在 HTML 各處的 onclick="window.xxx()" 掛載方式。
const actionHandlers = {
    'add-to-cart': (el) => addToCart(+el.dataset.pid, el.dataset.spec),
    'cart-qty-change': (el) => updateCartItemQtyByKeys(+el.dataset.pid, el.dataset.spec, +el.dataset.delta),
    'cart-item-qty': (el) => updateCartItemQty(+el.dataset.idx, +el.dataset.delta),
    'remove-cart-item': (el) => removeCartItem(+el.dataset.idx),
    'toggle-cart': () => toggleCart(),
    'select-delivery': (el) => selectDelivery(el.dataset.method),
    'select-payment': (el) => selectPayment(el.dataset.method),
    'open-store-map': () => openStoreMap(),
    'clear-selected-store': () => clearSelectedStore(),
    'select-store': (el) => { selectStoreFromList(el); Swal.close(); },
    'submit-order': () => { toggleCart(); submitOrder(); },
    'show-my-orders': () => showMyOrders(),
    'login-with-line': () => loginWithLine(LINE_REDIRECT.main, 'coffee_line_state'),
    'logout': () => window.logout(),
    'close-announcement': () => document.getElementById('announcement-banner').classList.add('hidden'),
    'close-orders-modal': () => document.getElementById('my-orders-modal').classList.add('hidden'),
};

function initEventDelegation() {
    document.body.addEventListener('click', (e) => {
        const target = e.target.closest('[data-action]');
        if (!target) return;
        const action = target.dataset.action;
        const handler = actionHandlers[action];
        if (handler) {
            e.preventDefault();
            handler(target, e);
        }
    });
}

// ============ 保留必要的 window 掛載 ============
// 以下函式仍需掛載到 window，因為它們在程式碼內部的渲染邏輯中透過 onclick 呼叫
// （如 renderBankAccounts / selectPayment 的 querySelector 等）
window.selectPayment = selectPayment;
window.copyTransferAccount = copyTransferAccount;
window.selectBankAccount = selectBankAccount;

// ============ 初始化 ============
document.addEventListener('DOMContentLoaded', async () => {
    initEventDelegation(); // 啟動事件代理
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
    await loadInitData();
    loadCart();
    // 初始化資料與配送選項渲染完成後，再次套用偏好，避免重新登入後無法自動帶入
    loadDeliveryPrefs();
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
        // 使用 Supabase 直連，平行查詢所有公開資料
        const [productsRes, categoriesRes, settingsRes, formFieldsRes, bankAccountsRes, promotionsRes] = await Promise.all([
            supabase.from('coffee_products').select('*').order('sort_order', { ascending: true }),
            supabase.from('coffee_categories').select('*').order('sort_order', { ascending: true }).order('id', { ascending: true }),
            supabase.from('coffee_settings').select('*'),
            supabase.from('coffee_form_fields').select('*').eq('enabled', true).order('sort_order', { ascending: true }),
            supabase.from('coffee_bank_accounts').select('*').eq('enabled', true).order('sort_order', { ascending: true }),
            supabase.from('coffee_promotions').select('*').order('sort_order', { ascending: true }),
        ]);

        // 檢查是否有任何查詢失敗
        const errors = [productsRes, categoriesRes, settingsRes, formFieldsRes, bankAccountsRes, promotionsRes]
            .filter(r => r.error)
            .map(r => r.error.message);
        if (errors.length > 0) {
            console.warn('Supabase 直連查詢部分失敗，嘗試 fallback:', errors);
            return await loadInitDataFallback();
        }

        // 映射商品資料（與後端 getProducts 的格式一致）
        const products = (productsRes.data || []).map(r => ({
            id: r.id,
            category: r.category,
            name: r.name,
            description: r.description || '',
            price: r.price,
            weight: r.weight || '',
            origin: r.origin || '',
            roastLevel: r.roast_level || '',
            specs: r.specs || '',
            imageUrl: r.image_url || '',
            enabled: r.enabled !== false,
            sortOrder: r.sort_order || 0,
        })).filter(p => p.enabled);

        // 映射分類資料
        const categories = (categoriesRes.data || []).map(r => ({
            id: r.id,
            name: r.name,
        }));

        // 映射設定資料（key-value 格式）
        const settings = {};
        for (const row of (settingsRes.data || [])) {
            settings[row.key] = row.value;
        }

        // 映射促銷活動資料
        const promotions = (promotionsRes.data || []).map(r => ({
            id: r.id,
            name: r.name,
            type: r.type,
            targetProductIds: (typeof r.target_product_ids === 'string' ? JSON.parse(r.target_product_ids) : r.target_product_ids) || [],
            targetItems: (typeof r.target_items === 'string' ? JSON.parse(r.target_items) : r.target_items) || [],
            minQuantity: Number(r.min_quantity) || 1,
            discountType: r.discount_type,
            discountValue: Number(r.discount_value) || 0,
            enabled: r.enabled !== false,
            startTime: r.start_time,
            endTime: r.end_time,
            sortOrder: Number(r.sort_order) || 0,
        }));

        // 映射銀行帳號資料
        const bankAccounts = (bankAccountsRes.data || []).map(r => ({
            id: r.id,
            bankCode: r.bank_code,
            bankName: r.bank_name,
            accountNumber: r.account_number,
            accountName: r.account_name || '',
        }));

        // 表單欄位直接使用（已與後端格式一致）
        const formFields = formFieldsRes.data || [];

        // 賦值到 state
        state.products = products;
        state.categories = categories;
        state.formFields = formFields;
        state.bankAccounts = bankAccounts;
        state.promotions = promotions;

        applySettings(settings);
        applyBranding(settings);
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
    } catch (e) {
        console.warn('Supabase 直連載入失敗，嘗試 fallback:', e);
        return await loadInitDataFallback();
    }
}

/** Fallback：透過 Edge Function 載入資料（原有邏輯） */
async function loadInitDataFallback() {
    try {
        const res = await fetch(`${API_URL}?action=getInitData&_=${Date.now()}`);
        const result = await res.json();
        if (result.success) {
            state.products = (result.products || []).filter(p => p.enabled);
            state.categories = result.categories || [];
            state.formFields = result.formFields || [];
            state.bankAccounts = result.bankAccounts || [];
            state.promotions = result.promotions || [];

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

    // 將設定保存給其他模組使用
    window.appSettings = s;

    // 套用金流自訂名稱與說明
    const paymentOptionsStr = s.payment_options_config || '';
    let paymentOptions = {};
    if (paymentOptionsStr) {
        try { paymentOptions = JSON.parse(paymentOptionsStr); } catch (e) { }
    }

    if (paymentOptions.cod) {
        const iconEl = document.getElementById('po-cod-icon-display');
        const nameEl = document.getElementById('po-cod-name-display');
        const descEl = document.getElementById('po-cod-desc-display');
        if (iconEl) iconEl.textContent = paymentOptions.cod.icon;
        if (nameEl) nameEl.textContent = paymentOptions.cod.name;
        if (descEl) descEl.textContent = paymentOptions.cod.description;
    }
    if (paymentOptions.linepay) {
        const iconEl = document.getElementById('po-linepay-icon-display');
        const nameEl = document.getElementById('po-linepay-name-display');
        const descEl = document.getElementById('po-linepay-desc-display');
        if (iconEl) iconEl.textContent = paymentOptions.linepay.icon;
        if (nameEl) nameEl.textContent = paymentOptions.linepay.name;
        if (descEl) descEl.textContent = paymentOptions.linepay.description;
    }
    if (paymentOptions.transfer) {
        const iconEl = document.getElementById('po-transfer-icon-display');
        const nameEl = document.getElementById('po-transfer-name-display');
        const descEl = document.getElementById('po-transfer-desc-display');
        if (iconEl) iconEl.textContent = paymentOptions.transfer.icon;
        if (nameEl) nameEl.textContent = paymentOptions.transfer.name;
        if (descEl) descEl.textContent = paymentOptions.transfer.description;
    }

    // 取出最新的物流選項
    const deliveryConfigStr = window.appSettings.delivery_options_config || '';
    let deliveryConfig = [];
    if (deliveryConfigStr) {
        try { deliveryConfig = JSON.parse(deliveryConfigStr); } catch (e) { }
    }

    // 如果尚未轉移格式，進行臨時轉換以保證前台正常運作
    if (!deliveryConfig.length) {
        const rStr = s.payment_routing_config || '';
        let rConfig = {};
        if (rStr) { try { rConfig = JSON.parse(rStr); } catch (e) { } }
        else {
            const le = String(s.linepay_enabled) === 'true';
            const te = String(s.transfer_enabled) === 'true';
            rConfig = {
                in_store: { cod: true, linepay: le, transfer: te },
                delivery: { cod: true, linepay: le, transfer: te },
                home_delivery: { cod: true, linepay: le, transfer: te },
                seven_eleven: { cod: true, linepay: false, transfer: false },
                family_mart: { cod: true, linepay: false, transfer: false }
            };
        }
        deliveryConfig = [
            { id: 'in_store', icon: '🚶', name: '來店自取', description: '到店自取', enabled: true, payment: rConfig['in_store'] || { cod: true, linepay: false, transfer: false } },
            { id: 'delivery', icon: '🛵', name: '配送到府 (限新竹)', description: '專人外送', enabled: true, payment: rConfig['delivery'] || { cod: true, linepay: false, transfer: false } },
            { id: 'home_delivery', icon: '📦', name: '全台宅配', description: '宅配到府', enabled: true, payment: rConfig['home_delivery'] || { cod: true, linepay: false, transfer: false } },
            { id: 'seven_eleven', icon: '🏪', name: '7-11 取件', description: '超商門市', enabled: true, payment: rConfig['seven_eleven'] || { cod: true, linepay: false, transfer: false } },
            { id: 'family_mart', icon: '🏬', name: '全家取件', description: '超商門市', enabled: true, payment: rConfig['family_mart'] || { cod: true, linepay: false, transfer: false } }
        ];
    }

    // 渲染物流選項 (在 delivery.js 中定義)
    if (typeof window.renderDeliveryOptions === 'function') {
        window.renderDeliveryOptions(deliveryConfig);
    }

    if (typeof window.updatePaymentOptionsState === 'function') {
        window.updatePaymentOptionsState(deliveryConfig);
    }
}

window.updatePaymentOptionsState = function (deliveryConfig) {
    if (!deliveryConfig) return;

    // 確保有預設選擇的物流
    const activeDeliveryOptions = deliveryConfig.filter(d => d.enabled);
    if (activeDeliveryOptions.length === 0) return; // 全部關閉的防呆

    if (!state.selectedDelivery || !activeDeliveryOptions.find(d => d.id === state.selectedDelivery)) {
        // 如果目前選的物流不存在或被關閉，預設選回第一個
        state.selectedDelivery = activeDeliveryOptions[0].id;
        // 需同步更新 UI
        if (typeof window.selectDelivery === 'function') {
            window.selectDelivery(state.selectedDelivery);
        }
    }

    const currentConfigOpt = activeDeliveryOptions.find(d => d.id === state.selectedDelivery);
    const currentConfig = currentConfigOpt ? currentConfigOpt.payment : { cod: true, linepay: false, transfer: false };

    const codOpt = document.getElementById('cod-option');
    const lpOpt = document.getElementById('linepay-option');
    const trOpt = document.getElementById('transfer-option');

    // 處理 DOM 更新
    if (codOpt) codOpt.classList.toggle('hidden', !currentConfig.cod);
    if (lpOpt) lpOpt.classList.toggle('hidden', !currentConfig.linepay);
    if (trOpt) trOpt.classList.toggle('hidden', !currentConfig.transfer);

    // 如果目前選擇的選向不被該物流允許，則重置為第一個可用的選向
    if (state.selectedPayment && !currentConfig[state.selectedPayment]) {
        if (currentConfig.cod) selectPayment('cod');
        else if (currentConfig.linepay) selectPayment('linepay');
        else if (currentConfig.transfer) selectPayment('transfer');
        else {
            state.selectedPayment = '';
            document.querySelectorAll('.payment-option').forEach(el => el.classList.remove('active'));
            // 隱藏轉帳資訊區塊
            const transferSection = document.getElementById('transfer-info-section');
            if (transferSection) transferSection.classList.add('hidden');
        }
    } else if (!state.selectedPayment) {
        if (currentConfig.cod) selectPayment('cod');
        else if (currentConfig.linepay) selectPayment('linepay');
        else if (currentConfig.transfer) selectPayment('transfer');
    }
};

window.selectPayment = selectPayment;

function updateFormState() {
    const loggedIn = !!state.currentUser;
    const open = state.isStoreOpen;
    const submitBtn = document.getElementById('submit-btn');
    if (submitBtn) submitBtn.disabled = !loggedIn || !open;
    const cartSubmitBtn = document.getElementById('cart-submit-btn');
    if (cartSubmitBtn) cartSubmitBtn.disabled = !loggedIn || !open || cart.length === 0;
}

// ============ 付款方式選擇 ============
function selectPayment(method) {
    state.selectedPayment = method;
    document.querySelectorAll('.payment-option').forEach(el => el.classList.remove('active'));

    // 以 method 尋找對應的按鈕（支援 data-method 或傳統的 onclick）
    const activeBtn = document.querySelector(`.payment-option[data-method="${method}"]`) || document.querySelector(`.payment-option[onclick*="'${method}'"]`);
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
    const hasAccounts = Array.isArray(state.bankAccounts) && state.bankAccounts.length > 0;
    if (!hasAccounts) {
        state.selectedBankAccountId = '';
        renderBankAccounts();
        return;
    }

    const selected = state.bankAccounts.find(b => String(b.id) === String(id));
    state.selectedBankAccountId = selected ? selected.id : state.bankAccounts[0].id;
    renderBankAccounts(); // 重新渲染以更新 UI 狀態
}

function renderBankAccounts() {
    const container = document.getElementById('bank-accounts-list');
    if (!container) return;
    if (!Array.isArray(state.bankAccounts) || state.bankAccounts.length === 0) {
        state.selectedBankAccountId = '';
        container.innerHTML = '';
        return;
    }

    // 如果目前選取帳號不存在（例如後台已刪除），自動回退到第一個可用帳號
    const selectedExists = state.bankAccounts.some(b => String(b.id) === String(state.selectedBankAccountId));
    if (!selectedExists) {
        state.selectedBankAccountId = state.bankAccounts[0].id;
    }

    container.innerHTML = state.bankAccounts.map(b => {
        const isSelected = state.selectedBankAccountId == b.id;
        const borderClass = isSelected ? 'border-primary ring-2 ring-primary bg-orange-50' : 'border-[#d1dce5] bg-white';
        return `
        <div class="p-3 rounded-lg mb-2 relative cursor-pointer font-sans transition-all border ${borderClass}" onclick="window.selectBankAccount('${b.id}')">
            <div class="flex items-center gap-3 mb-1">
                <input type="radio" name="bank_account_selection" value="${b.id}" class="w-4 h-4 text-primary" ${isSelected ? 'checked' : ''} onclick="window.selectBankAccount('${b.id}')">
                <div class="font-semibold text-gray-800">${escapeHtml(b.bankName)} (${escapeHtml(b.bankCode)})</div>
            </div>
            <div class="flex items-center gap-2 mt-1 pl-7">
                <span class="text-lg font-mono font-medium" style="color:var(--primary)">${escapeHtml(b.accountNumber)}</span>
                <button type="button" onclick="if(typeof event !== 'undefined') { event.preventDefault(); event.stopPropagation(); } window.copyTransferAccount(this, '${escapeHtml(b.accountNumber)}')" class="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-1 rounded transition-colors" title="複製帳號">
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
            try { await authFetch(`${API_URL}?action=linePayCancel&orderId=${orderId}`); } catch { }
        }
        Swal.fire({ icon: 'info', title: '付款已取消', text: '您已取消 LINE Pay 付款', confirmButtonColor: '#3C2415' });
    }
}
