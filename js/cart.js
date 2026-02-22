// ============================================
// cart.js — 購物車 CRUD & UI
// ============================================

import { escapeHtml, Toast } from './utils.js';
import { state } from './state.js';

/** 購物車陣列 [{productId, productName, specKey, specLabel, qty, unitPrice}] */
export let cart = [];

function saveCart() {
    localStorage.setItem('coffee_cart', JSON.stringify(cart));
}

export function loadCart() {
    try {
        const d = localStorage.getItem('coffee_cart');
        if (d) { cart = JSON.parse(d); updateCartUI(); }
    } catch { }
}

/** 加入購物車 */
export function addToCart(productId, specKey) {
    const p = state.products.find(x => x.id === productId);
    if (!p) return;
    let specs = [];
    try { specs = JSON.parse(p.specs || '[]'); } catch { }
    const spec = specs.find(s => s.key === specKey);
    if (!spec) return;

    const existing = cart.find(c => c.productId === productId && c.specKey === specKey);
    if (existing) {
        existing.qty += 1;
    } else {
        cart.push({ productId, productName: p.name, specKey, specLabel: spec.label, qty: 1, unitPrice: spec.price });
    }
    saveCart();
    updateCartUI();
    Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1200 })
        .fire({ icon: 'success', title: `已加入 ${p.name} (${spec.label})` });
}

/** 更新購物車品項數量 */
export function updateCartItemQty(idx, delta) {
    if (!cart[idx]) return;
    cart[idx].qty += delta;
    if (cart[idx].qty <= 0) cart.splice(idx, 1);
    saveCart();
    updateCartUI();
}

/** 移除購物車品項 */
export function removeCartItem(idx) {
    cart.splice(idx, 1);
    saveCart();
    updateCartUI();
}

/** 清空購物車 */
export function clearCart() {
    cart.length = 0;
    saveCart();
    updateCartUI();
}

/** 同步更新所有購物車相關 UI */
export function updateCartUI() {
    // 更新購物車 badge
    const totalItems = cart.reduce((s, c) => s + c.qty, 0);
    const badge = document.getElementById('cart-badge');
    if (totalItems > 0) { badge.textContent = totalItems; badge.classList.remove('hidden'); }
    else { badge.classList.add('hidden'); }

    // 計算總金額
    const total = calcTotal();
    document.getElementById('total-price').textContent = `總金額: $${total}`;
    document.getElementById('cart-total').textContent = `$${total}`;

    // 更新規格按鈕上的數量 badge
    document.querySelectorAll('button[data-pid][data-spec]').forEach(btn => {
        const pid = parseInt(btn.dataset.pid);
        const specKey = btn.dataset.spec;
        const cartItem = cart.find(c => c.productId === pid && c.specKey === specKey);
        const specBadge = btn.querySelector('.spec-badge');
        if (specBadge) {
            if (cartItem && cartItem.qty > 0) {
                specBadge.textContent = cartItem.qty;
                specBadge.classList.remove('hidden');
            } else {
                specBadge.classList.add('hidden');
            }
        }
    });

    // 渲染購物車清單
    const container = document.getElementById('cart-items');
    if (!cart.length) {
        container.innerHTML = '<p class="text-center text-gray-400 py-8">購物車是空的</p>';
        return;
    }
    container.innerHTML = cart.map((c, i) => `
        <div class="flex items-center justify-between py-3 border-b" style="border-color:#f0e6db;">
            <div class="flex-1 mr-3">
                <div class="font-medium text-sm">${escapeHtml(c.productName)}</div>
                <div class="text-xs text-gray-500">${escapeHtml(c.specLabel)} · $${c.unitPrice}</div>
            </div>
            <div class="flex items-center gap-1">
                <button class="quantity-btn" onclick="window._cart.updateCartItemQty(${i},-1)" style="width:28px;height:28px;font-size:14px;">−</button>
                <span class="w-8 text-center font-medium">${c.qty}</span>
                <button class="quantity-btn" onclick="window._cart.updateCartItemQty(${i},1)" style="width:28px;height:28px;font-size:14px;">+</button>
            </div>
            <div class="text-right ml-3 min-w-[60px]">
                <div class="font-semibold text-sm" style="color:var(--accent)">$${c.qty * c.unitPrice}</div>
                <button onclick="window._cart.removeCartItem(${i})" class="text-xs text-red-400 hover:text-red-600">移除</button>
            </div>
        </div>
    `).join('');
}

/** 切換購物車 Drawer */
export function toggleCart() {
    const drawer = document.getElementById('cart-drawer');
    const overlay = document.getElementById('cart-overlay');
    const isOpen = !drawer.classList.contains('translate-x-full');
    if (isOpen) {
        drawer.classList.add('translate-x-full');
        overlay.classList.add('hidden');
        document.body.style.overflow = '';
    } else {
        drawer.classList.remove('translate-x-full');
        overlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

/** 計算總金額 */
export function calcTotal() {
    return cart.reduce((s, c) => s + c.qty * c.unitPrice, 0);
}
