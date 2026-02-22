// ============================================
// products.js — 商品卡片式渲染
// ============================================

import { escapeHtml } from './utils.js';
import { state } from './state.js';

/** 渲染商品列表（卡片式、規格按鈕） */
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
            const desc = p.description ? `<span class="text-xs text-gray-500">${escapeHtml(p.description)}</span>` : '';
            const roast = p.roastLevel ? `<span class="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 ml-1">${escapeHtml(p.roastLevel)}</span>` : '';

            let specs = [];
            try { specs = JSON.parse(p.specs || '[]'); } catch { }
            const enabledSpecs = specs.filter(s => s.enabled);

            let specBtns = '';
            if (enabledSpecs.length) {
                specBtns = enabledSpecs.map(s => `
                    <button onclick="window._cart.addToCart(${p.id}, '${s.key}')" data-pid="${p.id}" data-spec="${s.key}"
                        class="relative flex-1 min-w-[80px] text-xs sm:text-sm py-2 px-2 rounded-lg border-2 font-medium transition-all hover:shadow-md active:scale-95"
                        style="border-color:var(--secondary); color:var(--primary); background:#fefdf8;">
                        <span class="spec-badge hidden absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow">0</span>
                        ${escapeHtml(s.label)}<br><span class="font-bold">$${s.price}</span>
                    </button>
                `).join('');
            } else {
                specBtns = `<button onclick="window._cart.addToCart(${p.id}, 'default')" class="text-sm py-2 px-4 rounded-lg border-2 font-medium" style="border-color:var(--secondary); color:var(--primary);">加入購物車 $${p.price}</button>`;
            }

            html += `
                <div class="product-row p-3 border-b flex flex-col gap-2" style="border-color:#f0e6db;">
                    <div class="flex items-start justify-between">
                        <div>
                            <div class="font-medium">${escapeHtml(p.name)} ${roast}</div>
                            ${desc}
                        </div>
                    </div>
                    <div class="flex gap-2 flex-wrap">${specBtns}</div>
                </div>`;
        });
        html += '</div></div>';
    });
    container.innerHTML = html;
}
