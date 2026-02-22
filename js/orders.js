// ============================================
// orders.js — 訂單送出 & 我的訂單
// ============================================

import { API_URL } from './config.js';
import { escapeHtml, Toast } from './utils.js';
import { state } from './state.js';
import { cart, clearCart, updateCartUI } from './cart.js';
import { collectDynamicFields } from './form-renderer.js';

/** 送出訂單 */
export async function submitOrder() {
    const u = state.currentUser;
    if (!u) { Swal.fire('請先登入', '使用 LINE 登入後再訂購', 'warning'); return; }

    // 動態欄位驗證
    const fieldsResult = collectDynamicFields(state.formFields);
    if (!fieldsResult.valid) {
        Swal.fire('錯誤', fieldsResult.error, 'error');
        return;
    }

    // 從動態欄位取值（相容舊的 phone / email）
    const phone = fieldsResult.data.phone || '';
    const email = fieldsResult.data.email || '';

    if (!state.selectedDelivery) { Swal.fire('錯誤', '請選擇配送方式', 'error'); return; }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { Swal.fire('錯誤', '請填寫正確的電子郵件', 'error'); return; }

    if (!email) {
        const emailField = state.formFields.find(f => f.field_key === 'email');
        if (emailField && emailField.enabled) {
            const proceed = await Swal.fire({
                title: '未填寫電子郵件', text: '您沒有填寫電子郵件，將無法接收到訂單成立與出貨通知信。確定要繼續送出訂單嗎？',
                icon: 'warning', showCancelButton: true, confirmButtonText: '繼續送出', cancelButtonText: '返回填寫', confirmButtonColor: '#3C2415',
            });
            if (!proceed.isConfirmed) return;
        }
    }

    // 收集訂購品項（從購物車）
    let orderLines = [];
    let total = 0;
    cart.forEach(c => {
        const amt = c.qty * c.unitPrice;
        orderLines.push(`${c.productName} (${c.specLabel}) x ${c.qty} (${amt}元)`);
        total += amt;
    });
    if (orderLines.length === 0) { Swal.fire('錯誤', '購物車是空的，請先選擇商品', 'error'); return; }

    // 收集配送資訊
    let deliveryInfo = {};
    if (state.selectedDelivery === 'delivery') {
        const city = document.getElementById('delivery-city').value;
        const district = document.getElementById('delivery-district').value;
        const addr = document.getElementById('delivery-detail-address').value.trim();
        if (!city) { Swal.fire('錯誤', '請選擇縣市', 'error'); return; }
        if (!addr) { Swal.fire('錯誤', '請填寫詳細地址', 'error'); return; }
        deliveryInfo = { city, district, address: addr };
    } else if (state.selectedDelivery === 'in_store') {
        deliveryInfo = { storeName: '來店自取', storeAddress: '新竹市東區建中路101號1樓' };
    } else {
        const sName = document.getElementById('store-name-input').value.trim();
        const sAddr = document.getElementById('store-address-input').value.trim();
        if (!sName) { Swal.fire('錯誤', '請填寫取貨門市名稱', 'error'); return; }
        deliveryInfo = { storeName: sName, storeAddress: sAddr, storeId: document.getElementById('store-id-input').value || '' };
    }

    const note = document.getElementById('order-note').value.trim();

    // 組合自訂欄位（排除 phone / email，轉為 JSON）
    const customFieldsData = {};
    for (const [k, v] of Object.entries(fieldsResult.data)) {
        if (k !== 'phone' && k !== 'email') {
            customFieldsData[k] = v;
        }
    }
    const customFieldsJson = Object.keys(customFieldsData).length > 0 ? JSON.stringify(customFieldsData) : '';

    // 配送方式文字
    const methodText = { delivery: '宅配到府', seven_eleven: '7-11 取貨付款', family_mart: '全家取貨付款', in_store: '來店取貨' };
    let addrText = state.selectedDelivery === 'delivery'
        ? `${deliveryInfo.city}${deliveryInfo.district || ''} ${deliveryInfo.address}`
        : state.selectedDelivery === 'in_store'
            ? `來店自取 (${deliveryInfo.storeAddress})`
            : `${deliveryInfo.storeName} [店號：${deliveryInfo.storeId}]${deliveryInfo.storeAddress ? ' (' + deliveryInfo.storeAddress + ')' : ''}`;

    const confirmHtml = `
        <div style="text-align:left;font-size:0.95rem;">
        <b>配送方式：</b>${methodText[state.selectedDelivery]}<br>
        <b>取貨地點：</b>${escapeHtml(addrText)}<br><br>
        <b>訂單內容：</b><br>${orderLines.join('<br>')}<br><br>
        <b>總金額：</b>$${total}
        ${note ? `<br><br><b>訂單備註：</b><br>${escapeHtml(note)}` : ''}
        </div>`;

    const confirmResult = await Swal.fire({
        title: '確認訂單', html: confirmHtml, icon: 'question',
        showCancelButton: true, confirmButtonText: '確認送出', cancelButtonText: '取消', confirmButtonColor: '#3C2415',
    });
    if (!confirmResult.isConfirmed) return;

    Swal.fire({ title: '送出中...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        const res = await fetch(`${API_URL}?action=submitOrder`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                lineName: u.displayName || u.display_name,
                phone, email,
                orders: orderLines.join('\n'),
                total,
                lineUserId: u.userId || u.line_user_id,
                deliveryMethod: state.selectedDelivery,
                note,
                customFields: customFieldsJson,
                ...deliveryInfo,
            }),
        });
        const result = await res.json();
        if (result.success) {
            if (email) u.email = email;
            if (phone) u.phone = phone;
            localStorage.setItem('coffee_user', JSON.stringify(u));
            try { localStorage.setItem('coffee_delivery_prefs', JSON.stringify({ method: state.selectedDelivery, ...deliveryInfo })); } catch { }

            Swal.fire({ icon: 'success', title: '訂單已送出！', text: `訂單編號：${result.orderId}`, confirmButtonColor: '#3C2415' }).then(() => {
                clearCart();
                document.getElementById('order-note').value = '';
            });
        } else { throw new Error(result.error); }
    } catch (e) {
        Swal.fire('送出失敗', e.message === 'Failed to fetch' ? '網路連線失敗' : e.message, 'error');
    }
}

/** 顯示我的訂單 */
export async function showMyOrders() {
    const u = state.currentUser;
    if (!u) { Swal.fire('請先登入', '', 'info'); return; }
    document.getElementById('my-orders-modal').classList.remove('hidden');
    const list = document.getElementById('my-orders-list');
    list.innerHTML = '<p class="text-center text-gray-500 py-8">載入中...</p>';
    try {
        const uid = u.userId || u.line_user_id;
        const res = await fetch(`${API_URL}?action=getMyOrders&lineUserId=${uid}&_=${Date.now()}`);
        const result = await res.json();
        if (!result.success || !result.orders?.length) { list.innerHTML = '<p class="text-center text-gray-500 py-8">尚無訂單</p>'; return; }

        const statusMap = { pending: '⏳ 待處理', processing: '📦 處理中', shipped: '🚚 已出貨', completed: '✅ 已完成', cancelled: '❌ 已取消' };
        const methodMap = { delivery: '🏠 宅配', seven_eleven: '🏪 7-11', family_mart: '🏬 全家', in_store: '🚶 來店取貨' };

        list.innerHTML = result.orders.map(o => `
            <div class="border rounded-xl p-4 mb-3" style="border-color:#e5ddd5;">
                <div class="flex justify-between items-center mb-2">
                    <span class="text-sm font-bold" style="color:var(--primary)">#${o.orderId}</span>
                    <span class="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700">${statusMap[o.status] || o.status}</span>
                </div>
                <div class="text-xs text-gray-500 mb-2">${methodMap[o.deliveryMethod] || o.deliveryMethod} ${o.storeName ? '・' + o.storeName : o.city ? '・' + o.city + (o.address || '') : ''}</div>
                <div class="text-sm text-gray-600 whitespace-pre-line bg-gray-50 p-3 rounded mb-2">${escapeHtml(o.items)}</div>
                <div class="text-right font-bold" style="color:var(--primary)">$${o.total}</div>
            </div>
        `).join('');
    } catch (e) { list.innerHTML = `<p class="text-center text-red-500 py-8">${e.message}</p>`; }
}
