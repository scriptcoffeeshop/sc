// ============================================
// cart.js — 購物車 CRUD & UI
// ============================================

import { escapeHtml, Toast } from './utils.js?v=43';
import { state } from './state.js?v=43';

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

/** 更新購物車品項數量 (by Array Index) */
export function updateCartItemQty(idx, delta) {
    if (!cart[idx]) return;
    cart[idx].qty += delta;
    if (cart[idx].qty <= 0) cart.splice(idx, 1);
    saveCart();
    updateCartUI();
}

/** 依據商品ID與規格Key更新數量 (給 In-line Stepper 使用) */
export function updateCartItemQtyByKeys(productId, specKey, delta) {
    const idx = cart.findIndex(c => c.productId === productId && c.specKey === specKey);
    if (idx !== -1) {
        updateCartItemQty(idx, delta);
    } else if (delta > 0) {
        addToCart(productId, specKey);
    }
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

    // 更新前台商品卡片：In-line Stepper 顯示邏輯
    document.querySelectorAll('.spec-container').forEach(container => {
        const pid = parseInt(container.dataset.pid);
        const specKey = container.dataset.spec;
        const cartItem = cart.find(c => c.productId === pid && c.specKey === specKey);

        const btnAdd = container.querySelector('.spec-btn-add');
        const btnStepper = container.querySelector('.spec-btn-stepper');
        const specBadge = container.querySelector('.spec-badge');
        const qtyText = container.querySelector('.spec-qty-text');

        if (cartItem && cartItem.qty > 0) {
            if (btnAdd) btnAdd.classList.add('hidden');
            if (btnStepper) btnStepper.classList.remove('hidden');
            if (specBadge) {
                specBadge.textContent = cartItem.qty;
                specBadge.classList.remove('hidden');
            }
            if (qtyText) {
                qtyText.textContent = cartItem.qty;
            }
        } else {
            if (btnAdd) btnAdd.classList.remove('hidden');
            if (btnStepper) btnStepper.classList.add('hidden');
            if (specBadge) specBadge.classList.add('hidden');
        }
    });

    // 渲染購物車清單
    const container = document.getElementById('cart-items');
    if (!cart.length) {
        container.innerHTML = '<p class="text-center text-gray-400 py-8">購物車是空的</p>';
        const discountSection = document.getElementById('cart-discount-details');
        if (discountSection) { discountSection.classList.add('hidden'); discountSection.innerHTML = ''; }

        // 購物車為空時，重置底部欄位與金額
        document.getElementById('total-price').innerHTML = '<div class="text-xl font-bold">總金額: $0</div>';
        document.getElementById('cart-total').textContent = '$0';
        const transferTotalEl = document.getElementById('transfer-total-amount');
        if (transferTotalEl) transferTotalEl.textContent = '$0';

        if (window.updateFormState) window.updateFormState();
        return;
    }

    // 計算總金額並套用方案 B 排版 (動態小標籤 + 大總額)
    const summary = calcCartSummary();
    let priceHtml = `<div class="text-xl font-bold">總金額: $${summary.finalTotal}</div>`;

    if (summary.totalDiscount > 0 || state.selectedDelivery) {
        let badgesHtml = '';
        if (summary.totalDiscount > 0) {
            badgesHtml += `<span style="background-color: #fee2e2; color: #dc2626; font-size: 11px; padding: 2px 6px; border-radius: 4px; margin-right: 4px;">折 -$${summary.totalDiscount}</span>`;
        }
        if (state.selectedDelivery) {
            if (summary.shippingFee === 0) {
                badgesHtml += `<span style="background-color: #dbeafe; color: #2563eb; font-size: 11px; padding: 2px 6px; border-radius: 4px;">免運費</span>`;
            } else {
                badgesHtml += `<span style="background-color: #f3f4f6; color: #4b5563; font-size: 11px; padding: 2px 6px; border-radius: 4px;">運費 $${summary.shippingFee}</span>`;
            }
        }

        priceHtml = `
            <div class="flex flex-col items-start justify-center">
                <div class="flex items-center mb-0.5">${badgesHtml}</div>
                <div class="text-xl font-bold leading-tight">應付總額: $${summary.finalTotal}</div>
            </div>
        `;
    }
    document.getElementById('total-price').innerHTML = priceHtml;
    document.getElementById('cart-total').textContent = `$${summary.finalTotal}`;

    // 更新匯款資訊的應付總金額
    const transferTotalEl = document.getElementById('transfer-total-amount');
    if (transferTotalEl) {
        transferTotalEl.textContent = `$${summary.finalTotal}`;
    }

    // 呼叫全域 updateFormState，讓 main-app 統一處理按鈕狀態（文字與 disabled 特性）
    if (window.updateFormState) window.updateFormState();

    container.innerHTML = cart.map((c, i) => {
        const isDiscounted = summary.discountedItemKeys && summary.discountedItemKeys.has(`${c.productId}-${c.specKey}`);
        const discountBadge = isDiscounted ? `<span class="ml-2 inline-block bg-red-100 text-red-600 text-[10px] px-1.5 py-0.5 rounded leading-tight">適用優惠</span>` : '';
        return `
        <div class="flex items-center justify-between py-3 border-b" style="border-color:#f0e6db;">
            <div class="flex-1 mr-3">
                <div class="font-medium text-sm flex items-center flex-wrap">${escapeHtml(c.productName)}${discountBadge}</div>
                <div class="text-xs text-gray-500">${escapeHtml(c.specLabel)} · $${c.unitPrice}</div>
            </div>
            <div class="flex items-center gap-1">
                <button class="quantity-btn" data-action="cart-item-qty" data-idx="${i}" data-delta="-1" style="width:28px;height:28px;font-size:14px;">−</button>
                <span class="w-8 text-center font-medium">${c.qty}</span>
                <button class="quantity-btn" data-action="cart-item-qty" data-idx="${i}" data-delta="1" style="width:28px;height:28px;font-size:14px;">+</button>
            </div>
            <div class="text-right ml-3 min-w-[60px]">
                <div class="font-semibold text-sm" style="color:var(--accent)">$${c.qty * c.unitPrice}</div>
                <button data-action="remove-cart-item" data-idx="${i}" class="text-xs text-red-400 hover:text-red-600">移除</button>
            </div>
        </div>
        `;
    }).join('');

    // 更新折扣明細區塊與獨立的運費提示
    const discountSection = document.getElementById('cart-discount-details');
    const shippingNotice = document.getElementById('cart-shipping-notice');

    if (discountSection) {
        const shippingConfig = getShippingConfig();
        const isFreeShipping = state.selectedDelivery && shippingConfig && summary.shippingFee === 0;
        const hasPromos = summary.totalDiscount > 0 && summary.appliedPromos && summary.appliedPromos.length > 0;

        let deliveryName = '該配送方式';
        if (state.selectedDelivery) {
            const configStr = window.appSettings?.delivery_options_config || '[]';
            try {
                const parsed = JSON.parse(configStr);
                const sel = parsed.find(opt => opt.id === state.selectedDelivery);
                if (sel && sel.name) deliveryName = sel.name;
            } catch (e) { }
        }

        // 獨立處理運費與未達免運提示 (不放在優惠與折抵區塊中)
        if (shippingNotice) {
            if (state.selectedDelivery && shippingConfig && !isFreeShipping) {
                let thresholdHint = '';
                if (shippingConfig.freeThreshold > 0) {
                    const diff = shippingConfig.freeThreshold - summary.totalAfterDiscount;
                    if (diff > 0) {
                        thresholdHint = `
                            <div class="text-xs mt-1" style="color:#b91c1c;">還差 $${diff} 即可免運</div>
                        `;
                    }
                }

                let noticeHTML = `
                    <div class="px-3 py-2 rounded-lg mb-1" style="background:#fef2f2; border:1px solid #fca5a5;">
                        <div class="flex justify-between items-center text-sm font-semibold" style="color:#991b1b;">
                            <span>未達🚚 ${escapeHtml(deliveryName)}免運門檻</span>
                            <span>+$${summary.shippingFee}</span>
                        </div>
                        ${thresholdHint}
                    </div>
                `;
                shippingNotice.innerHTML = noticeHTML;
                shippingNotice.classList.remove('hidden');
            } else {
                shippingNotice.classList.add('hidden');
            }
        }

        // 優惠與折抵區塊只顯示折扣或達標的免運
        if (hasPromos || isFreeShipping) {
            discountSection.classList.remove('hidden');
            let promoListHTML = '';

            if (hasPromos) {
                promoListHTML += summary.appliedPromos.map(p => `
                    <div class="flex justify-between items-center text-red-600 mb-1">
                        <span>🏷️ ${escapeHtml(p.name)}</span>
                        <span>-$${p.amount}</span>
                    </div>
                `).join('');
            }

            if (isFreeShipping) {
                let thresholdText = '';
                if (shippingConfig.freeThreshold > 0) {
                    thresholdText = ` (滿$${shippingConfig.freeThreshold})`;
                }

                promoListHTML += `
                    <div class="flex justify-between items-center text-blue-600 mb-1">
                        <span>🚚 ${escapeHtml(deliveryName)}免運${thresholdText}</span>
                        <span>免運費</span>
                    </div>
                `;
            }

            discountSection.innerHTML = `
                <div class="border-b border-dashed border-[#e5ddd5] pb-2 mb-2">
                    <div class="font-semibold text-gray-700 mb-2">已套用優惠與折抵：</div>
                    ${promoListHTML}
                </div>
            `;
        } else {
            discountSection.classList.add('hidden');
            discountSection.innerHTML = '';
        }
    }
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

/** 取得目前的運費設定 */
export function getShippingConfig() {
    if (!window.appSettings || !window.appSettings.delivery_options_config) return null;
    try {
        const config = JSON.parse(window.appSettings.delivery_options_config);
        const sel = config.find(opt => opt.id === state.selectedDelivery);
        return sel ? { fee: parseInt(sel.fee) || 0, freeThreshold: parseInt(sel.free_threshold) || 0 } : { fee: 0, freeThreshold: 0 };
    } catch { return { fee: 0, freeThreshold: 0 }; }
}

function normalizeDiscountRate(discountValue) {
    const raw = Number(discountValue);
    if (!Number.isFinite(raw) || raw <= 0) return 1;
    if (raw <= 1) return raw;
    if (raw <= 10) return raw / 10;
    if (raw <= 100) return raw / 100;
    return 1;
}

function calcPercentDiscountAmount(subtotal, discountValue) {
    const safeSubtotal = Math.max(0, Math.round(Number(subtotal) || 0));
    if (safeSubtotal <= 0) return 0;
    const rate = normalizeDiscountRate(discountValue);
    const discountedTotal = Math.round(safeSubtotal * rate);
    return Math.max(0, safeSubtotal - discountedTotal);
}

function isPromotionActiveNow(promo, nowTs) {
    const start = promo?.startTime ? Date.parse(promo.startTime) : null;
    if (promo?.startTime && !Number.isFinite(start)) return false;
    if (Number.isFinite(start) && nowTs < start) return false;

    const end = promo?.endTime ? Date.parse(promo.endTime) : null;
    if (promo?.endTime && !Number.isFinite(end)) return false;
    if (Number.isFinite(end) && nowTs > end) return false;

    return true;
}

/** 計算折扣活動 */
export function calcPromotions() {
    let totalDiscount = 0;
    const appliedPromos = [];
    const nowTs = Date.now();
    const activePromos = (state.promotions || []).filter(p => p.enabled && isPromotionActiveNow(p, nowTs));
    const discountedItemKeys = new Set();

    for (const prm of activePromos) {
        if (prm.type !== 'bundle') continue;

        let matchQty = 0;
        let matchItems = [];
        for (const item of cart) {
            // 檢查是否符合新版的 targetItems
            const matchInItems = prm.targetItems && prm.targetItems.some(t => {
                if (t.productId !== item.productId) return false;
                // 如果該設定沒有指定規格，代表該商品全規格適用 (或者商品本身就沒規格)
                if (!t.specKey) return true;
                return t.specKey === item.specKey;
            });
            // 檢查是否符合舊版的 targetProductIds
            const matchInOldIds = prm.targetProductIds && prm.targetProductIds.includes(item.productId);

            if (matchInItems || matchInOldIds) {
                matchQty += item.qty;
                matchItems.push(item);
            }
        }

        if (matchQty >= prm.minQuantity) {
            const subtotal = matchItems.reduce((acc, c) => acc + c.qty * c.unitPrice, 0);
            let discountAmount = 0;
            if (prm.discountType === 'percent') {
                discountAmount = calcPercentDiscountAmount(subtotal, prm.discountValue);
            } else if (prm.discountType === 'amount') {
                const sets = Math.floor(matchQty / prm.minQuantity);
                discountAmount = sets * prm.discountValue;
            }
            discountAmount = Math.min(discountAmount, Math.max(0, subtotal));
            if (discountAmount > 0) {
                totalDiscount += discountAmount;
                appliedPromos.push({
                    name: prm.name,
                    amount: discountAmount
                });
                matchItems.forEach(item => discountedItemKeys.add(`${item.productId}-${item.specKey}`));
            }
        }
    }
    return { appliedPromos, totalDiscount, discountedItemKeys };
}

/** 計算購物車所有金額 */
export function calcCartSummary() {
    const subtotal = cart.reduce((s, c) => s + c.qty * c.unitPrice, 0);
    const { appliedPromos, totalDiscount, discountedItemKeys } = calcPromotions();
    const afterDiscount = Math.max(0, subtotal - totalDiscount);

    const shippingConfig = getShippingConfig();
    let shippingFee = 0;
    if (cart.length > 0 && state.selectedDelivery && shippingConfig) {
        if (shippingConfig.freeThreshold <= 0 || afterDiscount < shippingConfig.freeThreshold) {
            shippingFee = shippingConfig.fee;
        }
    }

    return { subtotal, appliedPromos, totalDiscount, discountedItemKeys, afterDiscount, shippingFee, finalTotal: afterDiscount + shippingFee };
}

/** 相容舊版 calcTotal */
export function calcTotal() {
    return calcCartSummary().finalTotal;
}
