// ============================================
// delivery.js — 配送方式、地址、門市選擇
// ============================================

import { API_URL, districtData } from './config.js?v=21';
import { escapeHtml, escapeAttr, Toast } from './utils.js?v=21';
import { state } from './state.js?v=21';

let allStores = [];
let storeListLoaded = false;
let citySelectorInstance = null; // 用來儲存 tw-city-selector 實體

function initCitySelector() {
    if (typeof TwCitySelector !== 'undefined' && !citySelectorInstance) {
        citySelectorInstance = new TwCitySelector({
            el: '[role="tw-city-selector"]',
            elCounty: '.county',
            elDistrict: '.district',
            elZipcode: '.zipcode'
        });
    }
}

// 由於 ES module (type="module") 預設為 defer 執行，DOMContentLoaded 可能已經觸發
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCitySelector);
} else {
    initCitySelector();
}

/** 動態渲染配送選項按鈕 */
window.renderDeliveryOptions = function (config) {
    const list = document.getElementById('delivery-options-list');
    if (!list) return;
    list.innerHTML = '';

    // 只渲染有啟用的物流方式
    const activeOptions = config.filter(opt => opt.enabled);

    activeOptions.forEach(opt => {
        const div = document.createElement('div');
        div.className = 'delivery-option';
        div.dataset.action = 'select-delivery';
        div.dataset.method = opt.id;
        div.dataset.id = opt.id;

        div.innerHTML = `
            <div class="check-mark">✓</div>
            <div class="text-2xl mb-2">${escapeHtml(opt.icon || '')}</div>
            <div class="font-semibold" style="font-size: 0.95rem;">${escapeHtml(opt.name || '')}</div>
            <div class="text-xs text-gray-500 mt-1">${escapeHtml(opt.description || '')}</div>
        `;
        list.appendChild(div);
    });
};

/** 選擇配送方式 */
window.selectDelivery = function (method, e) {
    state.selectedDelivery = method;
    document.querySelectorAll('.delivery-option').forEach(el => el.classList.remove('active'));

    // 如果有傳入 event 則使用目前的 target，否則透過 method 尋找對應的選項元素
    if (e && e.currentTarget && typeof e.currentTarget.classList !== 'undefined') {
        e.currentTarget.classList.add('active');
    } else {
        const btn = document.querySelector(`.delivery-option[data-id="${method}"]`) || document.querySelector(`.delivery-option[onclick*="'${method}'"]`);
        if (btn) btn.classList.add('active');
    }

    document.getElementById('delivery-address-section').classList.add('hidden');
    document.getElementById('store-pickup-section').classList.add('hidden');
    document.getElementById('in-store-section').classList.add('hidden');
    document.getElementById('home-delivery-section').classList.add('hidden');

    if (method === 'delivery') {
        document.getElementById('delivery-address-section').classList.remove('hidden');
    } else if (method === 'home_delivery') {
        initCitySelector(); // 確保使用者點擊時，如果尚未初始化，則再初始化一次
        document.getElementById('home-delivery-section').classList.remove('hidden');
    } else if (method === 'in_store') {
        document.getElementById('in-store-section').classList.remove('hidden');
    } else {
        document.getElementById('store-pickup-section').classList.remove('hidden');
        storeListLoaded = false;
        allStores = [];
        clearSelectedStore();
    }

    // 處理付款方式選項（根據新版陣列設定動態更新顯示與選取）
    if (typeof window.updatePaymentOptionsState === 'function') {
        // 從 appSettings 重新抓取
        const deliveryConfigStr = window.appSettings?.delivery_options_config || '';
        let deliveryConfig = [];
        if (deliveryConfigStr) {
            try { deliveryConfig = JSON.parse(deliveryConfigStr); } catch (e) { }
        }
        window.updatePaymentOptionsState(deliveryConfig);
    }

    // 切換配送方式後，立即重新計算運費與金額並更新 UI
    if (typeof window.updateCartUI === 'function') {
        window.updateCartUI();
    }
}
// 為了相容匯出 (如果其他檔案透過 import 引用)
export const selectDelivery = window.selectDelivery;

/** 更新地區下拉 (限新竹使用) */
export function updateDistricts() {
    const city = document.getElementById('delivery-city').value;
    const distSelect = document.getElementById('delivery-district');
    distSelect.innerHTML = '<option value="">請選擇</option>';
    if (city && districtData[city]) {
        districtData[city].forEach(d => { distSelect.innerHTML += `<option value="${d}">${d}</option>`; });
    }
}

/** 別名 (HTML onclick 使用) */
export const populateDistricts = updateDistricts;

/** 清除已選門市 */
export function clearSelectedStore() {
    document.getElementById('store-selected-info').classList.add('hidden');
    document.getElementById('store-input-section').classList.remove('hidden');
    document.getElementById('store-name-input').value = '';
    document.getElementById('store-address-input').value = '';
    document.getElementById('store-id-input').value = '';
    document.getElementById('selected-store-name').textContent = '';
    document.getElementById('selected-store-address').textContent = '';
    document.getElementById('selected-store-id').textContent = '';
}

/** 套用門市選擇結果 */
export function applyStoreSelection(data) {
    document.getElementById('selected-store-name').textContent = data.storeName;
    document.getElementById('selected-store-address').textContent = data.storeAddress;
    document.getElementById('selected-store-id').textContent = '門市代號：' + data.storeId;
    document.getElementById('store-name-input').value = data.storeName;
    document.getElementById('store-address-input').value = data.storeAddress;
    document.getElementById('store-id-input').value = data.storeId;
    document.getElementById('store-selected-info').classList.remove('hidden');
    document.getElementById('store-input-section').classList.add('hidden');
    Toast.fire({ icon: 'success', title: '已選擇門市：' + data.storeName });
}

export async function checkStoreToken(token) {
    Swal.fire({ title: '載入門市資訊...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
        const res = await fetch(`${API_URL}?action=getStoreSelection&token=${encodeURIComponent(token)}&_=${Date.now()}`);
        const result = await res.json();
        if (result.success && result.found) {
            Swal.close();
            const typeMap = { 'UNIMARTC2C': 'seven_eleven', 'FAMIC2C': 'family_mart', 'UNIMART': 'seven_eleven', 'FAMI': 'family_mart' };
            const method = typeMap[result.logisticsSubType] || 'seven_eleven';
            const btn = document.querySelector(`.delivery-option[data-id="${method}"]`) || document.querySelector(`.delivery-option[onclick*="selectDelivery('${method}'"]`);
            if (btn) btn.click();
            else selectDelivery(method, { currentTarget: { classList: { add: () => { } } } });

            applyStoreSelection({ storeId: result.storeId, storeName: result.storeName, storeAddress: result.storeAddress });

            Toast.fire({ icon: 'success', title: '門市選擇成功' });
        } else {
            Swal.fire('提示', '門市資訊已過期或不存在，請重新選擇', 'warning');
        }
    } catch (e) {
        Swal.fire('錯誤', '門市資訊載入失敗', 'error');
    }
}

export async function openStoreMap() {
    if (state.selectedDelivery !== 'seven_eleven' && state.selectedDelivery !== 'family_mart') {
        Swal.fire('錯誤', '請先選擇 7-11 或全家取貨', 'error');
        return;
    }

    // 7-11 使用 PCSC 官方電子地圖
    if (state.selectedDelivery === 'seven_eleven') {
        Swal.fire({ title: '準備前往 7-11 門市地圖...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        try {
            const clientUrl = window.location.origin + window.location.pathname;
            // 先在後端建立 store selection session（取得 token 與 callback URL）
            const res = await fetch(`${API_URL}?action=createPcscMapSession&clientUrl=${encodeURIComponent(clientUrl)}`);
            const result = await res.json();
            if (!result.success) throw new Error(result.error || '建立地圖會話失敗');

            // 以 POST 表單提交到 PCSC 電子地圖
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = 'https://emap.presco.com.tw/c2cemap.ashx';
            form.target = '_self';

            const fields = {
                eshopid: result.eshopid || '870',
                url: result.callbackUrl,
                tempvar: result.token,
                sid: '1',
                stoession: '',
                showtype: '1',
                servicetype: '1',
            };
            Object.entries(fields).forEach(([k, v]) => {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = k;
                input.value = v;
                form.appendChild(input);
            });
            document.body.appendChild(form);
            Swal.close();
            form.submit();
        } catch (e) {
            const choice = await Swal.fire({
                icon: 'error', title: '無法開啟 7-11 門市地圖', text: e.message || String(e),
                showCancelButton: true, confirmButtonText: '改用門市搜尋', cancelButtonText: '關閉', confirmButtonColor: '#3C2415',
            });
            if (choice.isConfirmed) await openStoreSearchModal();
        }
        return;
    }

    // 全家仍使用綠界地圖
    Swal.fire({ title: '準備前往綠界地圖...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
        const clientUrl = window.location.origin + window.location.pathname;
        const res = await fetch(`${API_URL}?action=createStoreMapSession&deliveryMethod=${encodeURIComponent(state.selectedDelivery)}&clientUrl=${encodeURIComponent(clientUrl)}`);
        const result = await res.json();
        if (!result.success) throw new Error(result.error || '建立地圖會話失敗');

        const form = document.createElement('form');
        form.method = 'POST';
        form.action = result.mapUrl;
        Object.entries(result.params || {}).forEach(([k, v]) => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = k;
            input.value = v;
            form.appendChild(input);
        });
        document.body.appendChild(form);
        form.submit();
    } catch (e) {
        const choice = await Swal.fire({
            icon: 'error', title: '無法開啟綠界地圖', text: e.message || String(e),
            showCancelButton: true, confirmButtonText: '改用門市搜尋', cancelButtonText: '關閉', confirmButtonColor: '#3C2415',
        });
        if (choice.isConfirmed) await openStoreSearchModal();
    }
}

/** 開啟門市搜尋彈窗 */
export async function openStoreSearchModal() {
    if (!storeListLoaded) {
        Swal.fire({ title: '載入門市清單中...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        try {
            const cvsType = state.selectedDelivery === 'family_mart' ? 'FAMI' : 'UNIMART';
            const res = await fetch(`${API_URL}?action=getStoreList&cvsType=${cvsType}`);
            const result = await res.json();
            if (!result.success) { Swal.fire('錯誤', result.error || '取得門市清單失敗', 'error'); return; }
            allStores = result.stores || [];
            storeListLoaded = true;
            Swal.close();
        } catch (e) { Swal.fire('錯誤', '無法載入門市清單：' + e.message, 'error'); return; }
    }

    await Swal.fire({
        title: '🔍 搜尋門市',
        html: `
            <input id="store-search-input" class="swal2-input" placeholder="輸入門市名稱、地址或關鍵字" style="width:90%">
            <div id="store-search-results" style="max-height:300px; overflow-y:auto; margin-top:12px; text-align:left;"></div>
            <p id="store-search-hint" style="color:#999; font-size:12px; margin-top:8px;">共 ${allStores.length} 間門市，請輸入關鍵字搜尋</p>
        `,
        showConfirmButton: false, showCloseButton: true, width: 480,
        didOpen: () => {
            const searchInput = document.getElementById('store-search-input');
            const resultsDiv = document.getElementById('store-search-results');
            const hintP = document.getElementById('store-search-hint');
            searchInput.focus();
            searchInput.addEventListener('input', () => {
                const kw = searchInput.value.trim().toLowerCase();
                if (kw.length < 1) { resultsDiv.innerHTML = ''; hintP.textContent = `共 ${allStores.length} 間門市，請輸入關鍵字搜尋`; return; }
                const matches = allStores.filter(s =>
                    s.name.toLowerCase().includes(kw) || s.address.toLowerCase().includes(kw) || s.id.includes(kw)
                ).slice(0, 50);
                hintP.textContent = matches.length >= 50 ? `顯示前 50 筆，請輸入更精確的關鍵字` : `找到 ${matches.length} 間門市`;
                resultsDiv.innerHTML = matches.map(s => `
                    <div class="store-result-item" data-action="select-store" data-id="${s.id}" data-name="${s.name}" data-addr="${s.address}"
                         style="padding:10px 12px; border-bottom:1px solid #eee; cursor:pointer; transition:background 0.2s;"
                         onmouseover="this.style.background='#f0faf0'" onmouseout="this.style.background=''">
                        <div style="font-weight:600; font-size:14px;">${s.name}</div>
                        <div style="color:#666; font-size:12px;">${s.address}</div>
                        <div style="color:#aaa; font-size:11px;">代號：${s.id}</div>
                    </div>
                `).join('');
            });
        },
    });
}

/** 從搜尋清單選擇門市 */
export function selectStoreFromList(el) {
    applyStoreSelection({ storeId: el.dataset.id, storeName: el.dataset.name, storeAddress: el.dataset.addr });
    Swal.close();
}

/** 載入配送偏好 */
export function loadDeliveryPrefs() {
    try {
        let prefs = {};
        const u = state.currentUser;
        if (u && u.defaultDeliveryMethod) {
            prefs = {
                method: u.defaultDeliveryMethod, city: u.defaultCity, district: u.defaultDistrict,
                address: u.defaultAddress, storeId: u.defaultStoreId, storeName: u.defaultStoreName,
                storeAddress: u.defaultStoreAddress,
            };
        } else {
            const prefsStr = localStorage.getItem('coffee_delivery_prefs');
            if (prefsStr) prefs = JSON.parse(prefsStr);
        }

        if (prefs && prefs.method) {
            const method = String(prefs.method);
            const btn = document.querySelector(`.delivery-option[data-id="${method}"]`) ||
                document.querySelector(`.delivery-option[onclick*="selectDelivery('${method}'"]`);

            // 即使按鈕尚未渲染，也先套用 method，避免登入後偏好遺失
            if (btn) selectDelivery(method, { currentTarget: btn });
            else selectDelivery(method);

            if (method === 'delivery') {
                if (prefs.city) {
                    document.getElementById('delivery-city').value = prefs.city;
                    populateDistricts();
                    if (prefs.district) document.getElementById('delivery-district').value = prefs.district;
                }
                if (prefs.address) document.getElementById('delivery-detail-address').value = prefs.address;
            } else if (method === 'home_delivery') {
                // home_delivery 的 district 可能是 "300 東區"，回填時需拆出區域名稱
                const countyEl = document.querySelector('.county');
                const districtEl = document.querySelector('.district');
                const zipEl = document.querySelector('.zipcode');
                const rawDistrict = String(prefs.district || '').trim();
                const districtText = rawDistrict.replace(/^\d{3}\s*/, '');
                const zipMatch = rawDistrict.match(/^(\d{3})/);

                if (countyEl && prefs.city) {
                    countyEl.value = prefs.city;
                    countyEl.dispatchEvent(new Event('change', { bubbles: true }));
                }
                if (districtEl && districtText) {
                    districtEl.value = districtText;
                    districtEl.dispatchEvent(new Event('change', { bubbles: true }));
                }
                if (zipEl && zipMatch) {
                    zipEl.value = zipMatch[1];
                }
                if (prefs.address) {
                    const homeAddrEl = document.getElementById('home-delivery-detail');
                    if (homeAddrEl) homeAddrEl.value = prefs.address;
                }
            } else if (method === 'seven_eleven' || method === 'family_mart') {
                if (prefs.storeId) {
                    applyStoreSelection({ storeId: prefs.storeId, storeName: prefs.storeName, storeAddress: prefs.storeAddress });
                }
            }
        }
    } catch (e) { console.error('載入配送偏好失敗', e); }
}
