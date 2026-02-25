// ============================================
// products.js — 商品卡片式渲染與規格抽屜
// ============================================

import { escapeHtml } from './utils.js';
import { state } from './state.js';
import { cart } from './cart.js'; // 為了在 Drawer 中判斷目前選擇的商品數量以同步 UI

/** 渲染商品列表（卡片式） */
export function renderProducts() {
    const container = document.getElementById('products-container');
    const { products, categories } = state;
    if (!products.length) { container.innerHTML = '<p class="text-center text-gray-500 py-8">目前沒有商品</p>'; return; }

    const grouped = {};
    products.forEach(p => { if (!grouped[p.category]) grouped[p.category] = []; grouped[p.category].push(p); });
    const catOrder = categories.map(c => c.name);
    const sorted = Object.keys(grouped).sort((a, b) => {
        const ia = catOrder.indexOf(a), ib = catOrder.indexOf(b);
        if (ia === -1) return 1; if (ib === -1) return -1; return ia - ib;
    });

    let html = '';
    sorted.forEach(cat => {
        html += `<div class="mb-4">
            <div class="category-header rounded-t-xl px-4 py-2 font-semibold">${escapeHtml(cat)}</div>
            <div class="space-y-0 border border-t-0 rounded-b-xl overflow-hidden" style="border-color:#e5ddd5;">`;
        grouped[cat].forEach(p => {
            const desc = p.description ? `<p class="text-xs text-gray-500 mt-1">${escapeHtml(p.description)}</p>` : '';
            const roast = p.roastLevel ? `<span class="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 ml-1 whitespace-nowrap">${escapeHtml(p.roastLevel)}</span>` : '';

            // 計算此商品目前在購物車中的總數量，若有則顯示紅點
            const totalInCart = cart.filter(c => c.productId === p.id).reduce((sum, c) => sum + c.qty, 0);
            const badgeHtml = totalInCart > 0
                ? `<span class="cart-item-badge absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow z-10">${totalInCart}</span>`
                : '';

            html += `
                <div class="product-row p-3 border-b flex items-center justify-between gap-3" style="border-color:#f0e6db;">
                    <div class="flex-1">
                        <div class="font-medium text-[15px] leading-tight flex flex-wrap items-center gap-y-1">
                            ${escapeHtml(p.name)} ${roast}
                        </div>
                        ${desc}
                    </div>
                    <div class="shrink-0 relative">
                        ${badgeHtml}
                        <button onclick="window.openSpecDrawer(${p.id})" 
                            class="text-sm py-1.5 px-3 rounded-lg border-2 font-medium transition-all hover:bg-orange-50 active:scale-95 text-[var(--primary)]"
                            style="border-color:var(--secondary);">
                            🛒 選擇
                        </button>
                    </div>
                </div>`;
        });
        html += '</div></div>';
    });
    container.innerHTML = html;
}

/** 開啟底部規格選擇面板 (Bottom Sheet) */
export function openSpecDrawer(productId) {
    const p = state.products.find(x => x.id === productId);
    if (!p) return;

    // 1. 設定標題與描述
    document.getElementById('spec-drawer-title').textContent = p.name;
    const descEl = document.getElementById('spec-drawer-desc');
    if (p.description) {
        descEl.textContent = p.description;
        descEl.classList.remove('hidden');
    } else {
        descEl.classList.add('hidden');
    }

    // 2. 渲染規格列表
    const listEl = document.getElementById('spec-drawer-list');
    let specs = [];
    try { specs = JSON.parse(p.specs || '[]'); } catch { }
    const enabledSpecs = specs.filter(s => s.enabled);

    if (enabledSpecs.length === 0) {
        // 如果沒有規格，自動轉化為 default
        enabledSpecs.push({ key: 'default', label: '預設規格', price: p.price });
    }

    let listHtml = '';
    enabledSpecs.forEach((s, index) => {
        // 尋找購物車內這項規格的數量
        const cartItem = cart.find(c => c.productId === p.id && c.specKey === s.key);
        const qty = cartItem ? cartItem.qty : 0;

        let actionHtml = '';
        if (qty === 0) {
            actionHtml = `
                <button onclick="window._cart.addToCart(${p.id}, '${s.key}'); window.renderSpecDrawerList(${p.id}); window.renderProducts();" 
                    class="text-sm py-1.5 px-4 rounded-full font-medium transition-all active:scale-95 flex items-center gap-1"
                    style="background:var(--secondary); color:#fff;">
                    + 加入
                </button>
            `;
        } else {
            // 已有數量，顯示 Stepper
            actionHtml = `
                <div class="flex items-center gap-3 bg-gray-50 rounded-full px-1 py-1 border border-gray-200">
                    <button onclick="window._cart.updateCartItemQtyByKeys(${p.id}, '${s.key}', -1); window.renderSpecDrawerList(${p.id}); window.renderProducts();" 
                        class="w-7 h-7 shrink-0 rounded-full bg-white text-gray-800 font-bold shadow-sm flex items-center justify-center active:scale-90 border border-gray-200">
                        −
                    </button>
                    <span class="w-6 text-center font-bold text-gray-800">${qty}</span>
                    <button onclick="window._cart.updateCartItemQtyByKeys(${p.id}, '${s.key}', 1); window.renderSpecDrawerList(${p.id}); window.renderProducts();" 
                        class="w-7 h-7 shrink-0 rounded-full bg-white text-gray-800 font-bold shadow-sm flex items-center justify-center active:scale-90 border border-gray-200">
                        +
                    </button>
                </div>
            `;
        }

        listHtml += `
            <div class="flex items-center justify-between py-3 ${index !== enabledSpecs.length - 1 ? 'border-b border-gray-100' : ''}">
                <div>
                    <div class="font-medium text-gray-800 text-[15px]">${escapeHtml(s.label)}</div>
                    <div class="font-bold mt-0.5 text-[var(--accent)]">$${s.price}</div>
                </div>
                <div class="shrink-0 flex items-center">
                    ${actionHtml}
                </div>
            </div>
        `;
    });

    listEl.innerHTML = listHtml;

    // 3. 顯示 Drawer
    const drawer = document.getElementById('spec-drawer');
    const overlay = document.getElementById('spec-overlay');
    drawer.classList.remove('translate-y-full');
    overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // 防止背景滾動
}

/** 供內部點擊數量加減後更新面板不關閉使用 */
window.renderSpecDrawerList = function (productId) {
    const listEl = document.getElementById('spec-drawer-list');
    if (!document.getElementById('spec-overlay').classList.contains('hidden')) {
        // 只重繪 HTML (復用 openSpecDrawer 的區域邏輯，不重新彈出)
        openSpecDrawer(productId);
    }
};

/** 關閉底部規格選擇面板 */
export function closeSpecDrawer() {
    const drawer = document.getElementById('spec-drawer');
    const overlay = document.getElementById('spec-overlay');
    drawer.classList.add('translate-y-full');
    overlay.classList.add('hidden');
    document.body.style.overflow = '';
}
