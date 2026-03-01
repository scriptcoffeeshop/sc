// ============================================
// products.js — 商品卡片式渲染
// ============================================

import { escapeHtml } from './utils.js?v=21';
import { state } from './state.js?v=21';

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
                    <div class="spec-container flex-1 min-w-[80px] relative" data-pid="${p.id}" data-spec="${s.key}">
                        <!-- 預設按鈕 (未加入購物車) -->
                        <button data-action="add-to-cart" data-pid="${p.id}" data-spec="${s.key}"
                            class="spec-btn-add w-full text-xs sm:text-sm py-2 px-1 rounded-lg border-2 font-medium transition-all hover:shadow-md active:scale-95 flex flex-col items-center justify-center min-h-[48px]"
                            style="border-color:var(--secondary); color:var(--primary); background:#fefdf8;">
                            <span>${escapeHtml(s.label)}</span>
                            <span class="font-bold">$${s.price}</span>
                        </button>
                        
                        <!-- 展開的加減算盤 (已加入購物車時顯示，方案 A) -->
                        <div class="spec-btn-stepper hidden w-full rounded-lg border-2 flex flex-col overflow-hidden"
                            style="border-color:var(--secondary); background:white;">
                            <div class="text-xs sm:text-sm py-1.5 px-1 bg-amber-50 flex flex-col items-center justify-center border-b" style="border-color:var(--secondary); color:var(--primary);">
                                 <span>${escapeHtml(s.label)}</span>
                                 <span class="font-bold">$${s.price}</span>
                            </div>
                            <div class="flex items-center justify-between px-1 py-1" style="background:var(--secondary);">
                                <button data-action="cart-qty-change" data-pid="${p.id}" data-spec="${s.key}" data-delta="-1" class="w-7 h-7 sm:w-8 sm:h-8 shrink-0 rounded-full bg-white text-gray-800 font-bold shadow-sm flex items-center justify-center active:scale-90">−</button>
                                <div class="flex-1 flex items-center justify-center mx-1 overflow-hidden">
                                    <span class="text-sm sm:text-base font-bold text-white spec-qty-text">1</span>
                                </div>
                                <button data-action="cart-qty-change" data-pid="${p.id}" data-spec="${s.key}" data-delta="1" class="w-7 h-7 sm:w-8 sm:h-8 shrink-0 rounded-full bg-white text-gray-800 font-bold shadow-sm flex items-center justify-center active:scale-90">+</button>
                            </div>
                        </div>
                    </div>
                `).join('');
            } else {
                specBtns = `
                    <div class="spec-container flex-1 relative" data-pid="${p.id}" data-spec="default">
                        <button data-action="add-to-cart" data-pid="${p.id}" data-spec="default"
                            class="spec-btn-add text-sm py-2 px-4 rounded-lg border-2 font-medium transition-all min-h-[48px] w-full flex flex-col items-center justify-center" 
                            style="border-color:var(--secondary); color:var(--primary); background:#fefdf8;">
                            <span>加入購物車</span>
                            <span class="font-bold">$${p.price}</span>
                        </button>
                            
                        <div class="spec-btn-stepper hidden w-full rounded-lg border-2 flex flex-col overflow-hidden"
                            style="border-color:var(--secondary); background:white;">
                            <div class="text-xs sm:text-sm py-1.5 px-1 bg-amber-50 flex flex-col items-center justify-center border-b" style="border-color:var(--secondary); color:var(--primary);">
                                 <span>已加入</span>
                                 <span class="font-bold">$${p.price}</span>
                            </div>
                            <div class="flex items-center justify-between px-2 py-1" style="background:var(--secondary);">
                                <button data-action="cart-qty-change" data-pid="${p.id}" data-spec="default" data-delta="-1" class="w-8 h-8 rounded-full bg-white text-gray-800 font-bold shadow-sm flex items-center justify-center active:scale-90">−</button>
                                <div class="flex-1 flex items-center justify-center mx-1 overflow-hidden">
                                    <span class="text-sm sm:text-base font-bold text-white spec-qty-text">1</span>
                                </div>
                                <button data-action="cart-qty-change" data-pid="${p.id}" data-spec="default" data-delta="1" class="w-8 h-8 rounded-full bg-white text-gray-800 font-bold shadow-sm flex items-center justify-center active:scale-90">+</button>
                            </div>
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
