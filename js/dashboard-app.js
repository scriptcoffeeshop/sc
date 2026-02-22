// ============================================
// dashboard-app.js — 後台頁初始化入口
// ============================================

import { API_URL, LINE_REDIRECT } from './config.js';
import { esc, Toast } from './utils.js';
import { loginWithLine } from './auth.js';

// ============ 共享狀態 ============
let currentUser = null;
let products = [];
let categories = [];
let orders = [];
let users = [];
let blacklist = [];

function getAuthUserId() { if (!currentUser?.userId) throw new Error('請先登入'); return currentUser.userId; }

// ============ 全域函式掛載 (HTML onclick 呼叫) ============
window.loginWithLine = () => loginWithLine(LINE_REDIRECT.dashboard, 'coffee_admin_state');
window.logout = logout;
window.showTab = showTab;
window.loadOrders = loadOrders;
window.renderOrders = renderOrders;
window.changeOrderStatus = changeOrderStatus;
window.deleteOrderById = deleteOrderById;
window.showProductModal = showProductModal;
window.editProduct = editProduct;
window.closeProductModal = closeProductModal;
window.saveProduct = saveProduct;
window.delProduct = delProduct;
window.moveProduct = moveProduct;
window.addSpecRow = addSpecRow;
window.addCategory = addCategory;
window.editCategory = editCategory;
window.delCategory = delCategory;
window.moveCategory = moveCategory;
window.saveSettings = saveSettings;
window.loadUsers = loadUsers;
window.toggleUserRole = toggleUserRole;
window.toggleUserBlacklist = toggleUserBlacklist;
window.loadBlacklist = loadBlacklist;
window.esc = esc;
window.showAddFieldModal = showAddFieldModal;
window.editFormField = editFormField;
window.deleteFormField = deleteFormField;
window.toggleFieldEnabled = toggleFieldEnabled;
window.previewIcon = previewIcon;
window.uploadSiteIcon = uploadSiteIcon;

// ============ 初始化 ============
document.addEventListener('DOMContentLoaded', () => {
    const p = new URLSearchParams(window.location.search);
    if (p.get('code')) handleLineCallback(p.get('code'), p.get('state'));
    else checkLogin();
});

// ============ LINE Login ============
async function handleLineCallback(code, state) {
    const saved = localStorage.getItem('coffee_admin_state');
    localStorage.removeItem('coffee_admin_state');
    if (!saved || state !== saved) { Swal.fire('驗證失敗', '請重新登入', 'error'); window.history.replaceState({}, '', 'dashboard.html'); return; }
    Swal.fire({ title: '登入中...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
        const r = await fetch(`${API_URL}?action=lineLogin&code=${encodeURIComponent(code)}&redirectUri=${encodeURIComponent(LINE_REDIRECT.dashboard)}`);
        const d = await r.json();
        window.history.replaceState({}, '', 'dashboard.html');
        if (d.success && d.isAdmin) {
            currentUser = d.user; localStorage.setItem('coffee_admin', JSON.stringify(currentUser));
            Swal.close(); showAdmin();
        } else { Swal.fire('錯誤', d.error || '無管理員權限', 'error'); }
    } catch (e) { Swal.fire('錯誤', e.message, 'error'); }
}

function checkLogin() { const s = localStorage.getItem('coffee_admin'); if (s) { try { currentUser = JSON.parse(s); showAdmin(); } catch { localStorage.removeItem('coffee_admin'); } } }
function logout() { localStorage.removeItem('coffee_admin'); currentUser = null; document.getElementById('login-page').classList.remove('hidden'); document.getElementById('admin-page').classList.add('hidden'); }

async function showAdmin() {
    document.getElementById('login-page').classList.add('hidden');
    document.getElementById('admin-page').classList.remove('hidden');
    document.getElementById('admin-name').textContent = currentUser.displayName || '管理員';
    await Promise.all([loadCategories(), loadProducts()]);
    showTab('orders');
}

function showTab(tab) {
    ['orders', 'products', 'categories', 'settings', 'users', 'blacklist', 'formfields'].forEach(t => {
        const tabBtn = document.getElementById(`tab-${t}`);
        const section = document.getElementById(`${t}-section`);
        if (tabBtn) { tabBtn.classList.remove('tab-active'); tabBtn.classList.add('bg-white', 'text-gray-600'); }
        if (section) section.classList.add('hidden');
    });
    document.getElementById(`tab-${tab}`).classList.add('tab-active');
    document.getElementById(`tab-${tab}`).classList.remove('bg-white', 'text-gray-600');
    document.getElementById(`${tab}-section`).classList.remove('hidden');
    if (tab === 'orders') loadOrders();
    else if (tab === 'settings') loadSettings();
    else if (tab === 'categories') renderCategories();
    else if (tab === 'users') loadUsers();
    else if (tab === 'blacklist') loadBlacklist();
    else if (tab === 'formfields') loadFormFields();
}

// ============ 訂單管理 ============
async function loadOrders() {
    try {
        const r = await fetch(`${API_URL}?action=getOrders&userId=${getAuthUserId()}&_=${Date.now()}`);
        const d = await r.json();
        if (d.success) { orders = d.orders; renderOrders(); }
    } catch (e) { console.error(e); }
}

function renderOrders() {
    const filter = document.getElementById('order-filter').value;
    const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);
    const container = document.getElementById('orders-list');
    if (!filtered.length) { container.innerHTML = '<p class="text-center text-gray-500 py-8">沒有符合的訂單</p>'; return; }

    const statusLabel = { pending: '待處理', processing: '處理中', shipped: '已出貨', completed: '已完成', cancelled: '已取消' };
    const methodLabel = { delivery: '🏠 宅配', seven_eleven: '🏪 7-11', family_mart: '🏬 全家' };

    container.innerHTML = filtered.map(o => {
        const time = new Date(o.timestamp).toLocaleString('zh-TW');
        const addrInfo = o.deliveryMethod === 'delivery'
            ? `${o.city || ''}${o.district || ''} ${o.address || ''}`
            : `${o.storeName || ''}${o.storeId ? ' [' + o.storeId + ']' : ''}${o.storeAddress ? ' (' + o.storeAddress + ')' : ''}`;
        return `
        <div class="border rounded-xl p-4 mb-3" style="border-color:#e5ddd5;">
            <div class="flex justify-between items-center mb-2">
                <div class="flex items-center gap-2">
                    <span class="font-bold text-sm" style="color:var(--primary)">#${o.orderId}</span>
                    <span class="delivery-tag delivery-${o.deliveryMethod}">${methodLabel[o.deliveryMethod] || o.deliveryMethod}</span>
                    <span class="status-badge status-${o.status}">${statusLabel[o.status] || o.status}</span>
                </div>
                <span class="text-xs text-gray-500">${time}</span>
            </div>
            <div class="grid grid-cols-2 gap-2 text-sm mb-2">
                <div><span class="text-gray-500">顧客：</span>${esc(o.lineName)}</div>
                <div><span class="text-gray-500">電話：</span>${esc(o.phone)}</div>
                <div class="col-span-2"><span class="text-gray-500">信箱：</span>${o.email ? `<a href="mailto:${esc(o.email)}" class="text-blue-500">${esc(o.email)}</a>` : '無'}</div>
                <div class="col-span-2"><span class="text-gray-500">地址/門市：</span>${esc(addrInfo)}</div>
            </div>
            <div class="text-sm text-gray-600 whitespace-pre-line bg-gray-50 p-3 rounded mb-2">${esc(o.items)}</div>
            ${o.note ? `<div class="text-sm text-amber-700 bg-amber-50 p-2 rounded mb-2">📝 ${esc(o.note)}</div>` : ''}
            <div class="flex justify-between items-center">
                <span class="font-bold" style="color:var(--accent)">$${o.total}</span>
                <div class="flex gap-2">
                    <select onchange="changeOrderStatus('${esc(o.orderId)}',this.value)" class="text-xs border rounded px-2 py-1">
                        ${['pending', 'processing', 'shipped', 'completed', 'cancelled'].map(s => `<option value="${s}" ${o.status === s ? 'selected' : ''}>${statusLabel[s]}</option>`).join('')}
                    </select>
                    <button onclick="deleteOrderById('${esc(o.orderId)}')" class="text-xs text-red-500 hover:text-red-700">刪除</button>
                </div>
            </div>
        </div>`;
    }).join('');
}

async function changeOrderStatus(orderId, status) {
    try {
        const r = await fetch(`${API_URL}?action=updateOrderStatus`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: getAuthUserId(), orderId, status }) });
        const d = await r.json();
        if (d.success) { Toast.fire({ icon: 'success', title: '狀態已更新' }); loadOrders(); }
        else throw new Error(d.error);
    } catch (e) { Swal.fire('錯誤', e.message, 'error'); }
}

async function deleteOrderById(orderId) {
    const c = await Swal.fire({ title: '刪除訂單？', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: '刪除', cancelButtonText: '取消' });
    if (!c.isConfirmed) return;
    try {
        const r = await fetch(`${API_URL}?action=deleteOrder`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: getAuthUserId(), orderId }) });
        const d = await r.json();
        if (d.success) { Toast.fire({ icon: 'success', title: '已刪除' }); loadOrders(); }
    } catch (e) { Swal.fire('錯誤', e.message, 'error'); }
}

// ============ 商品管理 ============
async function loadProducts() {
    try {
        const r = await fetch(`${API_URL}?action=getProducts&_=${Date.now()}`);
        const d = await r.json();
        if (d.success) { products = d.products; renderProducts(); }
    } catch (e) { console.error(e); }
}

let productsMap = {};
function renderProducts() {
    const table = document.getElementById('products-main-table');
    table.querySelectorAll('tbody').forEach(el => el.remove());

    if (!products.length) {
        const tbody = document.createElement('tbody');
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-gray-500">尚無商品</td></tr>';
        table.appendChild(tbody);
        return;
    }

    productsMap = {};
    products.forEach(p => { productsMap[p.id] = p; });

    const grouped = {};
    products.forEach(p => { if (!grouped[p.category]) grouped[p.category] = []; grouped[p.category].push(p); });
    const catOrder = categories.map(c => c.name);
    const sortedCats = Object.keys(grouped).sort((a, b) => {
        const ia = catOrder.indexOf(a), ib = catOrder.indexOf(b);
        if (ia === -1) return 1; if (ib === -1) return -1; return ia - ib;
    });

    sortedCats.forEach(cat => {
        const catProds = grouped[cat];
        const tbody = document.createElement('tbody');
        tbody.className = 'sortable-tbody';
        tbody.dataset.cat = cat;

        let html = '';
        catProds.forEach((p, i) => {
            let priceDisplay = `$${p.price}`;
            try {
                const specs = p.specs ? JSON.parse(p.specs) : [];
                const enabled = specs.filter(s => s.enabled);
                if (enabled.length) {
                    priceDisplay = enabled.map(s => `<div class="text-xs">${esc(s.label)}: $${s.price}</div>`).join('');
                }
            } catch { }
            html += `
            <tr class="border-b" style="border-color:#f0e6db;" data-id="${p.id}">
                <td class="p-3 text-center">
                    <span class="drag-handle cursor-move text-gray-400 hover:text-amber-700 text-xl font-bold select-none px-2 inline-block" title="拖曳排序" style="touch-action: none;">☰</span>
                </td>
                <td class="p-3 text-sm">${esc(p.category)}</td>
                <td class="p-3">
                    <div class="font-medium mb-1">${esc(p.name)}</div>
                    <div class="text-xs text-gray-500">${esc(p.description || '')} ${p.roastLevel ? '・' + p.roastLevel : ''}</div>
                </td>
                <td class="p-3 text-right font-medium">${priceDisplay}</td>
                <td class="p-3 text-center"><span class="${p.enabled ? 'text-green-600' : 'text-gray-400'}">${p.enabled ? '啟用' : '停用'}</span></td>
                <td class="p-3 text-center">
                    <button onclick="editProduct(${p.id})" class="text-sm mr-2" style="color:var(--primary)">編輯</button>
                    <button onclick="delProduct(${p.id})" class="text-sm text-red-500">刪除</button>
                </td>
            </tr>`;
        });
        tbody.innerHTML = html;
        table.appendChild(tbody);

        if (typeof Sortable !== 'undefined') {
            Sortable.create(tbody, {
                handle: '.drag-handle',
                animation: 150,
                onEnd: async function (evt) {
                    if (evt.oldIndex === evt.newIndex) return;
                    const ids = Array.from(tbody.querySelectorAll('tr[data-id]')).map(tr => parseInt(tr.dataset.id));
                    await updateProductOrders(ids);
                }
            });
        }
    });
}

async function moveProduct(id, dir) {
    // 保留這個 function 防止舊有代碼出錯，但不再被介面呼叫
    try {
        const r = await fetch(`${API_URL}?action=reorderProduct`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: getAuthUserId(), id, direction: dir }) });
        const d = await r.json();
        if (d.success) loadProducts();
        else throw new Error(d.error);
    } catch (e) { Swal.fire('錯誤', e.message, 'error'); }
}

async function updateProductOrders(ids) {
    try {
        const r = await fetch(`${API_URL}?action=reorderProductsBulk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: getAuthUserId(), ids })
        });
        const d = await r.json();
        if (!d.success) throw new Error(d.error);
        // 不強制重新 load products，保持畫面順暢，除非發生錯誤
    } catch (e) {
        Swal.fire('錯誤', e.message, 'error');
        loadProducts(); // 錯誤時重新載入以恢復原狀
    }
}

// ======== 預設規格模板 ========
const defaultSpecs = [
    { key: 'quarter', label: '1/4磅', price: 0, enabled: true },
    { key: 'half', label: '半磅', price: 0, enabled: true },
    { key: 'drip_bag', label: '單包耳掛', price: 0, enabled: true },
];

function addSpecRow(specData) {
    const container = document.getElementById('specs-container');
    const s = specData || { key: '', label: '', price: 0, enabled: true };
    const div = document.createElement('div');
    div.className = 'flex items-center gap-2 p-2 rounded-lg border';
    div.style.borderColor = '#e5ddd5';
    div.innerHTML = `
        <label class="flex items-center"><input type="checkbox" class="spec-enabled w-4 h-4" ${s.enabled ? 'checked' : ''}></label>
        <input type="text" class="spec-label input-field text-sm py-1" value="${esc(s.label)}" placeholder="規格名稱" style="width:90px">
        <span class="text-gray-500 text-sm">$</span>
        <input type="number" class="spec-price input-field text-sm py-1" value="${s.price || ''}" placeholder="價格" min="0" style="width:80px">
        <button type="button" onclick="this.closest('div').remove()" class="text-red-400 hover:text-red-600 text-lg font-bold">&times;</button>
    `;
    container.appendChild(div);
}

function getSpecsFromForm() {
    const rows = document.querySelectorAll('#specs-container > div');
    const specs = [];
    rows.forEach(row => {
        const label = row.querySelector('.spec-label').value.trim();
        const price = parseInt(row.querySelector('.spec-price').value) || 0;
        const enabled = row.querySelector('.spec-enabled').checked;
        if (label) {
            const key = label.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, '_').toLowerCase() || `spec_${Date.now()}`;
            specs.push({ key, label, price, enabled });
        }
    });
    return specs;
}

function loadSpecsToForm(specsStr) {
    const container = document.getElementById('specs-container');
    container.innerHTML = '';
    let specs = [];
    try { if (specsStr) specs = JSON.parse(specsStr); } catch { }
    if (!specs.length) specs = JSON.parse(JSON.stringify(defaultSpecs));
    specs.forEach(s => addSpecRow(s));
}

function showProductModal() {
    document.getElementById('pm-title').textContent = '新增商品';
    document.getElementById('product-form').reset();
    document.getElementById('pm-id').value = '';
    document.getElementById('pm-enabled').checked = true;
    updateCategorySelect();
    loadSpecsToForm('');
    document.getElementById('product-modal').classList.remove('hidden');
}

function editProduct(id) {
    const p = productsMap[id];
    if (!p) { Swal.fire('錯誤', '找不到商品', 'error'); return; }
    document.getElementById('pm-title').textContent = '編輯商品';
    document.getElementById('pm-id').value = p.id;
    updateCategorySelect();
    document.getElementById('pm-category').value = p.category;
    document.getElementById('pm-name').value = p.name;
    document.getElementById('pm-desc').value = p.description || '';
    document.getElementById('pm-roast').value = p.roastLevel || '';
    document.getElementById('pm-enabled').checked = p.enabled;
    loadSpecsToForm(p.specs || '');
    document.getElementById('product-modal').classList.remove('hidden');
}

function closeProductModal() { document.getElementById('product-modal').classList.add('hidden'); }

function updateCategorySelect() {
    const sel = document.getElementById('pm-category');
    sel.innerHTML = '<option value="">選擇分類</option>' + categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
}

async function saveProduct(e) {
    e.preventDefault();
    const id = document.getElementById('pm-id').value;
    const specs = getSpecsFromForm();
    const enabledSpecs = specs.filter(s => s.enabled);
    if (!enabledSpecs.length) { Swal.fire('錯誤', '請至少啟用一個規格', 'error'); return; }
    const hasZeroPrice = enabledSpecs.some(s => !s.price || s.price <= 0);
    if (hasZeroPrice) { Swal.fire('錯誤', '已啟用的規格必須設定價格', 'error'); return; }

    const payload = {
        userId: getAuthUserId(), category: document.getElementById('pm-category').value,
        name: document.getElementById('pm-name').value, description: document.getElementById('pm-desc').value,
        price: enabledSpecs[0]?.price || 0,
        roastLevel: document.getElementById('pm-roast').value,
        specs: JSON.stringify(specs),
        enabled: document.getElementById('pm-enabled').checked,
    };
    if (id) payload.id = parseInt(id);
    try {
        const r = await fetch(`${API_URL}?action=${id ? 'updateProduct' : 'addProduct'}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const d = await r.json();
        if (d.success) { Toast.fire({ icon: 'success', title: id ? '已更新' : '已新增' }); closeProductModal(); loadProducts(); }
        else throw new Error(d.error);
    } catch (e) { Swal.fire('錯誤', e.message, 'error'); }
}

async function delProduct(id) {
    const c = await Swal.fire({ title: '刪除商品？', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: '刪除', cancelButtonText: '取消' });
    if (!c.isConfirmed) return;
    try {
        const r = await fetch(`${API_URL}?action=deleteProduct`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: getAuthUserId(), id }) });
        const d = await r.json();
        if (d.success) { Toast.fire({ icon: 'success', title: '已刪除' }); loadProducts(); }
    } catch (e) { Swal.fire('錯誤', e.message, 'error'); }
}

// ============ 分類管理 ============
async function loadCategories() {
    try {
        const r = await fetch(`${API_URL}?action=getCategories&_=${Date.now()}`);
        const d = await r.json();
        if (d.success) { categories = d.categories; renderCategories(); }
    } catch (e) { console.error(e); }
}

let categoriesMap = {};
function renderCategories() {
    const container = document.getElementById('categories-list');
    if (!categories.length) { container.innerHTML = '<p class="text-center text-gray-500 py-4">尚無分類</p>'; return; }
    categoriesMap = {};
    categories.forEach(c => { categoriesMap[c.id] = c; });
    container.innerHTML = categories.map((c, i) => `
        <div class="flex items-center justify-between p-3 mb-2 rounded-lg" style="background:#faf6f2; border:1px solid #e5ddd5;">
            <div class="flex items-center gap-2">
                <button onclick="moveCategory(${c.id},'up')" class="text-gray-400 hover:text-amber-700 ${i === 0 ? 'opacity-30' : ''}" ${i === 0 ? 'disabled' : ''}>▲</button>
                <button onclick="moveCategory(${c.id},'down')" class="text-gray-400 hover:text-amber-700 ${i === categories.length - 1 ? 'opacity-30' : ''}" ${i === categories.length - 1 ? 'disabled' : ''}>▼</button>
                <span class="font-medium">${esc(c.name)}</span>
            </div>
            <div class="flex gap-2">
                <button onclick="editCategory(${c.id})" class="text-sm" style="color:var(--primary)">編輯</button>
                <button onclick="delCategory(${c.id})" class="text-sm text-red-500">刪除</button>
            </div>
        </div>
    `).join('');
}

async function addCategory() {
    const name = document.getElementById('new-cat-name').value.trim();
    if (!name) return;
    try {
        const r = await fetch(`${API_URL}?action=addCategory`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: getAuthUserId(), name }) });
        const d = await r.json();
        if (d.success) { document.getElementById('new-cat-name').value = ''; Toast.fire({ icon: 'success', title: '已新增' }); loadCategories(); }
        else throw new Error(d.error);
    } catch (e) { Swal.fire('錯誤', e.message, 'error'); }
}

async function editCategory(id) {
    const cat = categoriesMap[id];
    if (!cat) { Swal.fire('錯誤', '找不到分類', 'error'); return; }
    const oldName = cat.name;
    const { value } = await Swal.fire({ title: '修改分類', input: 'text', inputValue: oldName, showCancelButton: true, confirmButtonText: '更新', cancelButtonText: '取消' });
    if (value && value !== oldName) {
        try {
            const r = await fetch(`${API_URL}?action=updateCategory`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: getAuthUserId(), id, name: value }) });
            const d = await r.json();
            if (d.success) { loadCategories(); loadProducts(); }
        } catch (e) { Swal.fire('錯誤', e.message, 'error'); }
    }
}

async function delCategory(id) {
    const c = await Swal.fire({ title: '刪除分類？', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: '刪除', cancelButtonText: '取消' });
    if (!c.isConfirmed) return;
    try {
        const r = await fetch(`${API_URL}?action=deleteCategory`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: getAuthUserId(), id }) });
        const d = await r.json();
        if (d.success) { loadCategories(); }
    } catch (e) { Swal.fire('錯誤', e.message, 'error'); }
}

async function moveCategory(id, dir) {
    try {
        const r = await fetch(`${API_URL}?action=reorderCategory`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: getAuthUserId(), id, direction: dir }) });
        const d = await r.json();
        if (d.success) loadCategories();
    } catch (e) { Swal.fire('錯誤', e.message, 'error'); }
}

// ============ 設定 ============
async function loadSettings() {
    try {
        const r = await fetch(`${API_URL}?action=getSettings&_=${Date.now()}`);
        const d = await r.json();
        if (d.success) {
            const s = d.settings;
            document.getElementById('s-ann-enabled').checked = String(s.announcement_enabled) === 'true';
            document.getElementById('s-announcement').value = s.announcement || '';
            const isOpen = String(s.is_open) !== 'false';
            document.querySelector(`input[name="s-open"][value="${isOpen}"]`).checked = true;
            // 品牌設定
            document.getElementById('s-site-title').value = s.site_title || '';
            document.getElementById('s-site-subtitle').value = s.site_subtitle || '';
            document.getElementById('s-site-emoji').value = s.site_icon_emoji || '';
            // Icon 預覽
            if (s.site_icon_url) {
                document.getElementById('s-icon-preview').src = s.site_icon_url;
                document.getElementById('s-icon-preview').classList.remove('hidden');
                document.getElementById('s-icon-url-display').textContent = s.site_icon_url;
            }
            // 區塊標題
            document.getElementById('s-products-title').value = s.products_section_title || '';
            document.getElementById('s-delivery-title').value = s.delivery_section_title || '';
            document.getElementById('s-notes-title').value = s.notes_section_title || '';
        }
    } catch (e) { console.error(e); }
}

async function saveSettings() {
    try {
        const r = await fetch(`${API_URL}?action=updateSettings`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
                userId: getAuthUserId(),
                settings: {
                    announcement_enabled: String(document.getElementById('s-ann-enabled').checked),
                    announcement: document.getElementById('s-announcement').value,
                    is_open: document.querySelector('input[name="s-open"]:checked')?.value || 'true',
                    site_title: document.getElementById('s-site-title').value.trim(),
                    site_subtitle: document.getElementById('s-site-subtitle').value.trim(),
                    site_icon_emoji: document.getElementById('s-site-emoji').value.trim(),
                    products_section_title: document.getElementById('s-products-title').value.trim(),
                    delivery_section_title: document.getElementById('s-delivery-title').value.trim(),
                    notes_section_title: document.getElementById('s-notes-title').value.trim(),
                }
            })
        });
        const d = await r.json();
        if (d.success) Toast.fire({ icon: 'success', title: '設定已儲存' });
        else throw new Error(d.error);
    } catch (e) { Swal.fire('錯誤', e.message, 'error'); }
}

// ============ 用戶管理 ============
async function loadUsers() {
    try {
        const search = document.getElementById('user-search').value;
        Swal.fire({ title: '載入中...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        const r = await fetch(`${API_URL}?action=getUsers&userId=${getAuthUserId()}&search=${encodeURIComponent(search)}&_=${Date.now()}`);
        const d = await r.json();
        if (d.success) { users = d.users; renderUsers(); Swal.close(); }
        else { Swal.fire('錯誤', d.error, 'error'); }
    } catch (e) { Swal.fire('錯誤', e.message, 'error'); }
}

function renderUsers() {
    const tbody = document.getElementById('users-table');
    if (!users.length) { tbody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-gray-500">無符合條件的用戶</td></tr>'; return; }
    const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.userId === 'U7cd3c1e2d837eed20fdcaed7ac6a4fa9';

    tbody.innerHTML = users.map(u => {
        const isUserSuperAdmin = u.role === 'SUPER_ADMIN';
        const isAdmin = u.role === 'ADMIN' || u.role === 'SUPER_ADMIN';
        const isBlocked = u.status === 'BLACKLISTED';
        const lastLogin = u.lastLogin ? new Date(u.lastLogin).toLocaleString('zh-TW') : '無紀錄';

        let actions = '';
        if (isBlocked) {
            actions += `<button onclick="toggleUserBlacklist('${esc(u.userId)}', false)" class="text-green-600 hover:text-green-800 text-sm font-medium mr-3">解除封鎖</button>`;
        } else {
            actions += `<button onclick="toggleUserBlacklist('${esc(u.userId)}', true)" class="text-red-500 hover:text-red-700 text-sm font-medium mr-3">封鎖</button>`;
        }

        if (isSuperAdmin && !isUserSuperAdmin) {
            if (isAdmin) actions += `<button onclick="toggleUserRole('${esc(u.userId)}', 'USER')" class="text-red-600 hover:text-red-800 text-sm font-medium">移除管理員</button>`;
            else actions += `<button onclick="toggleUserRole('${esc(u.userId)}', 'ADMIN')" class="text-purple-600 hover:text-purple-800 text-sm font-medium">設為管理員</button>`;
        }

        return `
        <tr class="border-b" style="border-color:#f0e6db;">
            <td class="p-3"><img src="${esc(u.pictureUrl) || 'https://via.placeholder.com/40'}" class="w-10 h-10 rounded-full border"></td>
            <td class="p-3">
                <div class="font-medium text-gray-800">${esc(u.displayName)}</div>
                <div class="text-xs text-gray-500">${esc(u.email || '')} ${u.phone ? '・' + esc(u.phone) : ''}</div>
                <div class="text-xs text-gray-500 mt-1">🏠 ${u.defaultDeliveryMethod === 'delivery' ? `宅配 (${esc(u.defaultCity)}${esc(u.defaultDistrict)} ${esc(u.defaultAddress)})` :
                u.defaultDeliveryMethod === 'in_store' ? '來店自取' :
                    u.defaultDeliveryMethod ? `${u.defaultDeliveryMethod === 'seven_eleven' ? '7-11' : '全家'} (${esc(u.defaultStoreName)} - ${esc(u.defaultStoreId)})` : '尚未設定'
            }</div>
                <div class="text-xs text-gray-400 font-mono mt-1 opacity-50">${esc(u.userId)}</div>
            </td>
            <td class="p-3">
                <div>${isAdmin ? '<span class="px-2 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-800">管理員</span>' : '<span class="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">用戶</span>'}</div>
                <div class="mt-1">${isBlocked ? '<span class="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800">黑名單</span>' : '<span class="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">正常</span>'}</div>
                <div class="text-xs text-gray-400 mt-1">登入：${lastLogin}</div>
            </td>
            <td class="p-3 text-right">${actions}</td>
        </tr>`;
    }).join('');
}

async function toggleUserRole(targetUserId, newRole) {
    const c = await Swal.fire({ title: `設為 ${newRole === 'ADMIN' ? '管理員' : '一般用戶'}？`, icon: 'warning', showCancelButton: true, confirmButtonText: '確定' });
    if (!c.isConfirmed) return;
    try {
        Swal.fire({ title: '處理中...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        const r = await fetch(`${API_URL}?action=updateUserRole`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: getAuthUserId(), targetUserId, newRole }) });
        const d = await r.json();
        if (d.success) { Toast.fire({ icon: 'success', title: '權限已更新' }); loadUsers(); }
        else throw new Error(d.error);
    } catch (e) { Swal.fire('錯誤', e.message, 'error'); }
}

async function toggleUserBlacklist(targetUserId, isBlocked) {
    if (isBlocked) {
        const { value: reason } = await Swal.fire({ title: '封鎖用戶', input: 'text', inputPlaceholder: '請輸入封鎖原因（例如惡意棄單）', showCancelButton: true, confirmButtonText: '封鎖' });
        if (reason === undefined) return;
        try {
            Swal.fire({ title: '處理中...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            const r = await fetch(`${API_URL}?action=addToBlacklist`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: getAuthUserId(), lineUserId: targetUserId, reason }) });
            const d = await r.json();
            if (d.success) { Toast.fire({ icon: 'success', title: '已加入黑名單' }); loadUsers(); if (document.getElementById('tab-blacklist').classList.contains('tab-active')) loadBlacklist(); }
            else throw new Error(d.error);
        } catch (e) { Swal.fire('錯誤', e.message, 'error'); }
    } else {
        const c = await Swal.fire({ title: '解除封鎖？', icon: 'question', showCancelButton: true, confirmButtonText: '確定解除' });
        if (!c.isConfirmed) return;
        try {
            Swal.fire({ title: '處理中...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            const r = await fetch(`${API_URL}?action=removeFromBlacklist`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: getAuthUserId(), lineUserId: targetUserId }) });
            const d = await r.json();
            if (d.success) { Toast.fire({ icon: 'success', title: '已解除封鎖' }); loadUsers(); if (document.getElementById('tab-blacklist').classList.contains('tab-active')) loadBlacklist(); }
            else throw new Error(d.error);
        } catch (e) { Swal.fire('錯誤', e.message, 'error'); }
    }
}

// ============ 黑名單 ============
async function loadBlacklist() {
    try {
        const r = await fetch(`${API_URL}?action=getBlacklist&userId=${getAuthUserId()}&_=${Date.now()}`);
        const d = await r.json();
        if (d.success) { blacklist = d.blacklist; renderBlacklist(); }
    } catch (e) { console.error(e); }
}

function renderBlacklist() {
    const tbody = document.getElementById('blacklist-table');
    if (!blacklist.length) { tbody.innerHTML = '<tr><td colspan="3" class="text-center py-8 text-gray-500">目前沒有封鎖名單</td></tr>'; return; }
    tbody.innerHTML = blacklist.map(b => {
        const dt = b.blockedAt ? new Date(b.blockedAt).toLocaleString('zh-TW') : '無紀錄';
        return `
        <tr class="border-b" style="border-color:#f0e6db;">
            <td class="p-3">
                <div class="font-medium">${esc(b.displayName)}</div>
                <div class="text-xs text-gray-400 font-mono">${esc(b.lineUserId)}</div>
            </td>
            <td class="p-3">
                <div class="text-sm">${dt}</div>
                <div class="text-xs text-red-500 mt-1">${esc(b.reason) || '(無原因)'}</div>
            </td>
            <td class="p-3 text-right">
                <button onclick="toggleUserBlacklist('${esc(b.lineUserId)}', false)" class="text-green-600 hover:text-green-800 text-sm font-medium">解除封鎖</button>
            </td>
        </tr>`;
    }).join('');
}

// ============ 表單欄位管理 ============
let formFields = [];

async function loadFormFields() {
    try {
        const r = await fetch(`${API_URL}?action=getFormFieldsAdmin&_=${Date.now()}`);
        const d = await r.json();
        if (d.success) { formFields = d.fields || []; renderFormFields(); }
    } catch (e) { console.error(e); }
}

const FIELD_TYPE_LABELS = {
    text: '文字', email: 'Email', tel: '電話', number: '數字',
    select: '下拉選單', checkbox: '勾選框', textarea: '多行文字',
    section_title: '區塊標題',
};

function renderFormFields() {
    const container = document.getElementById('formfields-list');
    if (!formFields.length) {
        container.innerHTML = '<p class="text-center text-gray-500 py-8">尚無自訂欄位</p>';
        return;
    }
    container.innerHTML = `
        <div class="space-y-2" id="formfields-sortable">
            ${formFields.map(f => {
        const typeBadge = FIELD_TYPE_LABELS[f.field_type] || f.field_type;
        const requiredBadge = f.required ? '<span class="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">必填</span>' : '';
        const enabledClass = f.enabled ? '' : 'opacity-50';
        const protectedKeys = ['phone', 'email'];
        const isProtected = protectedKeys.includes(f.field_key);
        return `
                <div class="flex items-center gap-3 p-3 bg-white rounded-xl border ${enabledClass}" style="border-color:#e5ddd5;" data-field-id="${f.id}">
                    <span class="cursor-grab text-gray-400 drag-handle">⠿</span>
                    <div class="flex-1">
                        <div class="flex items-center gap-2 flex-wrap">
                            <span class="font-medium">${esc(f.label)}</span>
                            <span class="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">${typeBadge}</span>
                            ${requiredBadge}
                            ${!f.enabled ? '<span class="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">已停用</span>' : ''}
                            ${isProtected ? '<span class="text-xs bg-yellow-50 text-yellow-600 px-2 py-0.5 rounded-full">🔒 系統</span>' : ''}
                        </div>
                        <div class="text-xs text-gray-400 mt-1">key: ${esc(f.field_key)} ${f.placeholder ? '・' + esc(f.placeholder) : ''}</div>
                    </div>
                    <div class="flex gap-1 items-center">
                        <button onclick="toggleFieldEnabled(${f.id}, ${!f.enabled})" class="text-sm px-2 py-1 rounded hover:bg-gray-100" title="${f.enabled ? '停用' : '啟用'}">${f.enabled ? '🟢' : '⚪'}</button>
                        <button onclick="editFormField(${f.id})" class="text-sm px-2 py-1 rounded hover:bg-gray-100" title="編輯">✏️</button>
                        ${!isProtected ? `<button onclick="deleteFormField(${f.id})" class="text-sm px-2 py-1 rounded hover:bg-red-50 text-red-500" title="刪除">🗑</button>` : ''}
                    </div>
                </div>`;
    }).join('')}
        </div>`;

    // 拖拽排序
    if (typeof Sortable !== 'undefined') {
        new Sortable(document.getElementById('formfields-sortable'), {
            handle: '.drag-handle',
            animation: 150,
            onEnd: async () => {
                const ids = [...document.querySelectorAll('#formfields-sortable [data-field-id]')].map(el => parseInt(el.dataset.fieldId));
                try {
                    await fetch(`${API_URL}?action=reorderFormFields`, {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: getAuthUserId(), ids }),
                    });
                    Toast.fire({ icon: 'success', title: '排序已更新' });
                } catch (e) { console.error(e); }
            },
        });
    }
}

async function showAddFieldModal() {
    const { value: formValues } = await Swal.fire({
        title: '新增欄位',
        html: `
            <div style="text-align:left;">
                <label class="block text-sm mb-1 font-medium">欄位識別碼 (英文，唯一)</label>
                <input id="swal-fk" class="swal2-input" placeholder="例：receipt_type" style="margin:0 0 12px 0;width:100%">
                <label class="block text-sm mb-1 font-medium">顯示名稱</label>
                <input id="swal-fl" class="swal2-input" placeholder="例：📄 開立收據" style="margin:0 0 12px 0;width:100%">
                <label class="block text-sm mb-1 font-medium">類型</label>
                <select id="swal-ft" class="swal2-select" style="margin:0 0 12px 0;width:100%">
                    <option value="text">文字</option>
                    <option value="email">Email</option>
                    <option value="tel">電話</option>
                    <option value="number">數字</option>
                    <option value="select">下拉選單</option>
                    <option value="checkbox">勾選框</option>
                    <option value="textarea">多行文字</option>
                </select>
                <label class="block text-sm mb-1 font-medium">提示文字 (placeholder)</label>
                <input id="swal-fp" class="swal2-input" placeholder="例：請選擇" style="margin:0 0 12px 0;width:100%">
                <label class="block text-sm mb-1 font-medium">選項 (僅下拉選單，逗號分隔)</label>
                <input id="swal-fo" class="swal2-input" placeholder="例：二聯式,三聯式,免開" style="margin:0 0 12px 0;width:100%">
                <label class="flex items-center gap-2 cursor-pointer mt-2">
                    <input type="checkbox" id="swal-fr"> <span class="text-sm">必填</span>
                </label>
            </div>`,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: '新增',
        cancelButtonText: '取消',
        confirmButtonColor: '#3C2415',
        preConfirm: () => {
            const fieldKey = document.getElementById('swal-fk').value.trim();
            const label = document.getElementById('swal-fl').value.trim();
            if (!fieldKey || !label) { Swal.showValidationMessage('識別碼和名稱為必填'); return false; }
            const fieldType = document.getElementById('swal-ft').value;
            const placeholder = document.getElementById('swal-fp').value.trim();
            const optionsRaw = document.getElementById('swal-fo').value.trim();
            const options = optionsRaw ? JSON.stringify(optionsRaw.split(',').map(s => s.trim()).filter(Boolean)) : '';
            const required = document.getElementById('swal-fr').checked;
            return { fieldKey, label, fieldType, placeholder, options, required };
        },
    });

    if (!formValues) return;

    try {
        Swal.fire({ title: '新增中...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        const r = await fetch(`${API_URL}?action=addFormField`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: getAuthUserId(), ...formValues }),
        });
        const d = await r.json();
        if (d.success) { Toast.fire({ icon: 'success', title: '欄位已新增' }); loadFormFields(); }
        else { Swal.fire('錯誤', d.error, 'error'); }
    } catch (e) { Swal.fire('錯誤', e.message, 'error'); }
}

async function editFormField(id) {
    const f = formFields.find(x => x.id === id);
    if (!f) return;

    const optionsStr = (() => { try { return JSON.parse(f.options || '[]').join(','); } catch { return ''; } })();

    const { value: formValues } = await Swal.fire({
        title: '編輯欄位',
        html: `
            <div style="text-align:left;">
                <label class="block text-sm mb-1 font-medium">顯示名稱</label>
                <input id="swal-fl" class="swal2-input" value="${esc(f.label)}" style="margin:0 0 12px 0;width:100%">
                <label class="block text-sm mb-1 font-medium">類型</label>
                <select id="swal-ft" class="swal2-select" style="margin:0 0 12px 0;width:100%">
                    ${Object.entries(FIELD_TYPE_LABELS).map(([k, v]) => `<option value="${k}" ${k === f.field_type ? 'selected' : ''}>${v}</option>`).join('')}
                </select>
                <label class="block text-sm mb-1 font-medium">提示文字</label>
                <input id="swal-fp" class="swal2-input" value="${esc(f.placeholder || '')}" style="margin:0 0 12px 0;width:100%">
                <label class="block text-sm mb-1 font-medium">選項 (下拉選單，逗號分隔)</label>
                <input id="swal-fo" class="swal2-input" value="${esc(optionsStr)}" style="margin:0 0 12px 0;width:100%">
                <label class="flex items-center gap-2 cursor-pointer mt-2">
                    <input type="checkbox" id="swal-fr" ${f.required ? 'checked' : ''}> <span class="text-sm">必填</span>
                </label>
            </div>`,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: '儲存',
        cancelButtonText: '取消',
        confirmButtonColor: '#3C2415',
        preConfirm: () => {
            const label = document.getElementById('swal-fl').value.trim();
            if (!label) { Swal.showValidationMessage('名稱為必填'); return false; }
            const fieldType = document.getElementById('swal-ft').value;
            const placeholder = document.getElementById('swal-fp').value.trim();
            const optionsRaw = document.getElementById('swal-fo').value.trim();
            const options = optionsRaw ? JSON.stringify(optionsRaw.split(',').map(s => s.trim()).filter(Boolean)) : '';
            const required = document.getElementById('swal-fr').checked;
            return { label, fieldType, placeholder, options, required };
        },
    });

    if (!formValues) return;

    try {
        const r = await fetch(`${API_URL}?action=updateFormField`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: getAuthUserId(), id, ...formValues }),
        });
        const d = await r.json();
        if (d.success) { Toast.fire({ icon: 'success', title: '已更新' }); loadFormFields(); }
        else { Swal.fire('錯誤', d.error, 'error'); }
    } catch (e) { Swal.fire('錯誤', e.message, 'error'); }
}

async function deleteFormField(id) {
    const f = formFields.find(x => x.id === id);
    const confirm = await Swal.fire({
        title: '確認刪除', text: `確定要刪除「${f?.label || ''}」欄位嗎？`, icon: 'warning',
        showCancelButton: true, confirmButtonText: '刪除', cancelButtonText: '取消', confirmButtonColor: '#ef4444',
    });
    if (!confirm.isConfirmed) return;

    try {
        const r = await fetch(`${API_URL}?action=deleteFormField`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: getAuthUserId(), id }),
        });
        const d = await r.json();
        if (d.success) { Toast.fire({ icon: 'success', title: '已刪除' }); loadFormFields(); }
        else { Swal.fire('錯誤', d.error, 'error'); }
    } catch (e) { Swal.fire('錯誤', e.message, 'error'); }
}

async function toggleFieldEnabled(id, enabled) {
    try {
        const r = await fetch(`${API_URL}?action=updateFormField`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: getAuthUserId(), id, enabled }),
        });
        const d = await r.json();
        if (d.success) { Toast.fire({ icon: 'success', title: enabled ? '已啟用' : '已停用' }); loadFormFields(); }
        else { Swal.fire('錯誤', d.error, 'error'); }
    } catch (e) { Swal.fire('錯誤', e.message, 'error'); }
}

// ============ Icon 上傳 ============
function previewIcon(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('s-icon-preview').src = e.target.result;
        document.getElementById('s-icon-preview').classList.remove('hidden');
    };
    reader.readAsDataURL(file);
}

async function uploadSiteIcon() {
    const input = document.getElementById('s-icon-file');
    const file = input.files[0];
    if (!file) { Swal.fire('提示', '請先選擇圖片檔案', 'info'); return; }
    if (file.size > 500 * 1024) { Swal.fire('錯誤', '圖片大小不能超過 500KB', 'error'); return; }

    Swal.fire({ title: '上傳中...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        const base64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(',')[1]); // 去掉 data:image/...;base64, 前綴
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });

        const r = await fetch(`${API_URL}?action=uploadSiteIcon`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: getAuthUserId(),
                fileData: base64,
                fileName: file.name,
                contentType: file.type,
            }),
        });
        const d = await r.json();
        if (d.success) {
            document.getElementById('s-icon-url-display').textContent = d.url;
            Toast.fire({ icon: 'success', title: '圖示已上傳並套用' });
        } else { Swal.fire('錯誤', d.error, 'error'); }
    } catch (e) { Swal.fire('錯誤', e.message, 'error'); }
}

