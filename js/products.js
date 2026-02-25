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
                    <div class="spec-container relative flex-1 min-w-[80px]" data-pid="${p.id}" data-spec="${s.key}">
                        <!-- 預設按鈕 (未加入購物車) -->
                        <button onclick="window._cart.addToCart(${p.id}, '${s.key}')" 
                            class="spec-btn-add w-full text-xs sm:text-sm py-2 px-2 rounded-lg border-2 font-medium transition-all hover:shadow-md active:scale-95 flex flex-col items-center justify-center"
                            style="border-color:var(--secondary); color:var(--primary); background:#fefdf8; height: 100%;">
                            <span>${escapeHtml(s.label)}</span>
                            <span class="font-bold">$${s.price}</span>
                        </button>
                        
                        <!-- 加減算盤 (已加入購物車時顯示) -->
                        <div class="spec-btn-stepper hidden w-full h-full absolute inset-0 rounded-lg border-2 flex items-center justify-between px-1"
                            style="border-color:var(--secondary); background:var(--secondary); shadow-inner;">
                            <button onclick="window._cart.updateCartItemQtyByKeys(${p.id}, '${s.key}', -1)" class="w-8 h-8 rounded-full bg-white text-gray-800 font-bold shadow-sm flex items-center justify-center active:scale-90">−</button>
                            <div class="flex flex-col items-center justify-center leading-tight">
                                <span class="text-[10px] text-white opacity-90">${escapeHtml(s.label)}</span>
                                <span class="spec-qty-text font-bold text-white text-sm">1</span>
                            </div>
                            <button onclick="window._cart.updateCartItemQtyByKeys(${p.id}, '${s.key}', 1)" class="w-8 h-8 rounded-full bg-white text-gray-800 font-bold shadow-sm flex items-center justify-center active:scale-90">+</button>
                        </div>
                    </div>
                `).join('');
            } else {
                specBtns = `
                    <div class="spec-container relative" data-pid="${p.id}" data-spec="default">
                        <button onclick="window._cart.addToCart(${p.id}, 'default')" 
                            class="spec-btn-add text-sm py-2 px-4 rounded-lg border-2 font-medium transition-all" 
                            style="border-color:var(--secondary); color:var(--primary); width:100%; height:100%;">加入購物車 $${p.price}</button>
                            
                        <div class="spec-btn-stepper hidden w-full h-full absolute inset-0 rounded-lg border-2 flex items-center justify-between px-2"
                            style="border-color:var(--secondary); background:var(--secondary);">
                            <button onclick="window._cart.updateCartItemQtyByKeys(${p.id}, 'default', -1)" class="w-8 h-8 rounded-full bg-white text-gray-800 font-bold shadow-sm flex items-center justify-center active:scale-90">−</button>
                            <span class="spec-qty-text font-bold text-white text-base">1</span>
                            <button onclick="window._cart.updateCartItemQtyByKeys(${p.id}, 'default', 1)" class="w-8 h-8 rounded-full bg-white text-gray-800 font-bold shadow-sm flex items-center justify-center active:scale-90">+</button>
                        </div>
                    </div>
                `;
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
