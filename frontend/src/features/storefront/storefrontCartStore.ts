// ============================================
// storefrontCartStore.ts — 購物車 CRUD & UI
// ============================================

import { state } from "../../lib/appState.ts";
import { asJsonRecord, parseJsonArray } from "../../lib/jsonUtils.ts";
import Swal from "../../lib/swal.ts";
import {
  calcCartSummaryFromState,
  getDeliveryMeta as getStorefrontDeliveryMeta,
  getShippingDisplayState as getStorefrontShippingDisplayState,
} from "./storefrontCartSummary.ts";
import {
  clearElement,
  createTotalPriceContent,
  renderCartItemsList,
  renderDiscountSection,
  renderShippingNoticePanel,
} from "./storefrontCartUi.ts";
import { storefrontRuntime } from "./storefrontRuntime.ts";

/** 購物車陣列 [{productId, productName, specKey, specLabel, qty, unitPrice}] */
export let cart = [];

function parseStoredCart(rawCart) {
  return parseJsonArray(rawCart);
}

function parseProductSpecs(specsValue) {
  return parseJsonArray(specsValue).map(asJsonRecord);
}

function triggerQuoteRefresh() {
  if (storefrontRuntime.scheduleQuoteRefresh) {
    storefrontRuntime.scheduleQuoteRefresh({ silent: true });
  } else if (storefrontRuntime.refreshQuote) {
    storefrontRuntime.refreshQuote({ silent: true });
  }
}

function saveCart() {
  localStorage.setItem("coffee_cart", JSON.stringify(cart));
}

function isVueManagedCart() {
  return document.getElementById("cart-items")?.dataset?.vueManaged === "true";
}

function isVueManagedProducts() {
  return document.getElementById("products-container")?.dataset?.vueManaged ===
    "true";
}

function getDeliveryMeta() {
  return getStorefrontDeliveryMeta(
    state.selectedDelivery || "",
    storefrontRuntime.appSettings?.delivery_options_config,
  );
}

function emitCartUpdated(summary) {
  const detail = {
    items: cart.map((item) => ({ ...item })),
    summary: {
      ...summary,
      discountedItemKeys: Array.isArray(summary.discountedItemKeys)
        ? summary.discountedItemKeys
        : Array.from(summary.discountedItemKeys || []),
    },
    ...getDeliveryMeta(),
    shippingConfig: getShippingConfig(),
  };
  window.dispatchEvent(
    new CustomEvent("coffee:cart-updated", {
      detail,
    }),
  );
}

/** 供 Vue 元件讀取目前購物車快照 */
export function getCartSnapshot() {
  return cart.map((item) => ({ ...item }));
}

export function loadCart() {
  try {
    cart = parseStoredCart(localStorage.getItem("coffee_cart"));
    updateCartUI();
    triggerQuoteRefresh();
  } catch (error) {
    console.warn("[storefront] 無法讀取購物車快取", error);
    cart = [];
    updateCartUI();
    triggerQuoteRefresh();
  }
}

/** 加入購物車 */
export function addToCart(productId, specKey) {
  const p = state.products.find((x) => x.id === productId);
  if (!p) return;
  const specs = parseProductSpecs(p.specs);
  const spec = specs.find((s) => s.key === specKey) ||
    (specKey === "default"
      ? { key: "default", label: "預設", price: Number(p.price) || 0 }
      : null);
  if (!spec) return;

  const existing = cart.find((c) =>
    c.productId === productId && c.specKey === specKey
  );
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      productId,
      productName: p.name,
      specKey,
      specLabel: spec.label,
      qty: 1,
      unitPrice: spec.price,
    });
  }
  saveCart();
  updateCartUI();
  triggerQuoteRefresh();
  Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 1200,
  })
    .fire({ icon: "success", title: `已加入 ${p.name} (${spec.label})` });
}

/** 更新購物車品項數量 (by Array Index) */
export function updateCartItemQty(idx, delta) {
  if (!cart[idx]) return;
  cart[idx].qty += delta;
  if (cart[idx].qty <= 0) cart.splice(idx, 1);
  saveCart();
  updateCartUI();
  triggerQuoteRefresh();
}

/** 依據商品ID與規格Key更新數量 (給 In-line Stepper 使用) */
export function updateCartItemQtyByKeys(productId, specKey, delta) {
  const idx = cart.findIndex((c) =>
    c.productId === productId && c.specKey === specKey
  );
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
  triggerQuoteRefresh();
}

/** 清空購物車 */
export function clearCart() {
  cart.length = 0;
  state.orderQuote = null;
  state.quoteError = "";
  saveCart();
  updateCartUI();
  triggerQuoteRefresh();
}

/** 同步更新所有購物車相關 UI */
export function updateCartUI() {
  // 更新購物車 badge
  const totalItems = cart.reduce((s, c) => s + c.qty, 0);
  const badge = document.getElementById("cart-badge");
  if (!badge) return;
  if (totalItems > 0) {
    badge.textContent = totalItems;
    badge.classList.remove("hidden");
  } else badge.classList.add("hidden");

  // 更新前台商品卡片：In-line Stepper 顯示邏輯
  if (!isVueManagedProducts()) {
    document.querySelectorAll(".spec-container").forEach((container) => {
      if (!(container instanceof HTMLElement)) return;
      const pid = parseInt(container.dataset.pid);
      const specKey = container.dataset.spec;
      const cartItem = cart.find((c) =>
        c.productId === pid && c.specKey === specKey
      );

      const btnAdd = container.querySelector(".spec-btn-add");
      const btnStepper = container.querySelector(".spec-btn-stepper");
      const specBadge = container.querySelector(".spec-badge");
      const qtyText = container.querySelector(".spec-qty-text");

      if (cartItem && cartItem.qty > 0) {
        if (btnAdd) btnAdd.classList.add("hidden");
        if (btnStepper) btnStepper.classList.remove("hidden");
        if (specBadge) {
          specBadge.textContent = cartItem.qty;
          specBadge.classList.remove("hidden");
        }
        if (qtyText) {
          qtyText.textContent = cartItem.qty;
        }
      } else {
        if (btnAdd) btnAdd.classList.remove("hidden");
        if (btnStepper) btnStepper.classList.add("hidden");
        if (specBadge) specBadge.classList.add("hidden");
      }
    });
  }

  // 渲染購物車清單
  const container = document.getElementById("cart-items");
  const vueManagedCart = isVueManagedCart();
  if (!cart.length) {
    state.orderQuote = null;
    state.quoteError = "";
    if (!vueManagedCart && container) {
      const emptyState = document.createElement("p");
      emptyState.className = "text-center text-gray-400 py-8";
      emptyState.textContent = "購物車是空的";
      container.replaceChildren(emptyState);
    }
    const discountSection = document.getElementById("cart-discount-details");
    if (discountSection && !vueManagedCart) {
      discountSection.classList.add("hidden");
      clearElement(discountSection);
    }

    // 購物車為空時，重置底部欄位與金額
    if (!vueManagedCart) {
      const totalPriceEl = document.getElementById("total-price");
      const cartTotalEl = document.getElementById("cart-total");
      if (totalPriceEl) {
        totalPriceEl.replaceChildren(createTotalPriceContent({
          finalTotal: 0,
          totalDiscount: 0,
        }, { showBadge: false }));
      }
      if (cartTotalEl) {
        cartTotalEl.textContent = "$0";
      }
    }
    const transferTotalEl = document.getElementById("transfer-total-amount");
    if (transferTotalEl) transferTotalEl.textContent = "$0";

    if (storefrontRuntime.updateFormState) storefrontRuntime.updateFormState();
    emitCartUpdated(calcCartSummary());
    return;
  }

  // 計算總金額並套用方案 B 排版 (動態小標籤 + 大總額)
  const summary = calcCartSummary();
  const shippingConfig = getShippingConfig();
  const shippingState = getStorefrontShippingDisplayState(
    summary,
    shippingConfig,
    state.selectedDelivery || "",
  );
  if (!vueManagedCart) {
    const totalPriceEl = document.getElementById("total-price");
    const cartTotalEl = document.getElementById("cart-total");
    if (totalPriceEl) {
      totalPriceEl.replaceChildren(createTotalPriceContent(summary, shippingState));
    }
    if (cartTotalEl) cartTotalEl.textContent = `$${summary.finalTotal}`;
  }

  // 更新匯款資訊的應付總金額
  const transferTotalEl = document.getElementById("transfer-total-amount");
  if (transferTotalEl) {
    transferTotalEl.textContent = `$${summary.finalTotal}`;
  }

  // 呼叫全域 updateFormState，讓 main-app 統一處理按鈕狀態（文字與 disabled 特性）
  if (storefrontRuntime.updateFormState) storefrontRuntime.updateFormState();

  if (!vueManagedCart && container) {
    renderCartItemsList(container, cart, summary);
  }

  // 更新折扣明細區塊與獨立的運費提示
  const discountSection = document.getElementById("cart-discount-details");
  const shippingNotice = document.getElementById("cart-shipping-notice");

  if (discountSection && !vueManagedCart) {
    const { deliveryName } = getDeliveryMeta();

    // 獨立處理運費與未達免運提示 (不放在優惠與折抵區塊中)
    if (shippingNotice) {
      renderShippingNoticePanel(
        shippingNotice,
        shippingState,
        deliveryName,
        summary,
      );
    }

    // 優惠與折抵區塊只顯示折扣或達標的免運
    renderDiscountSection(discountSection, summary, shippingState, deliveryName);
  }

  emitCartUpdated(summary);
}

/** 切換購物車 Drawer */
export function toggleCart() {
  const drawer = document.getElementById("cart-drawer");
  const overlay = document.getElementById("cart-overlay");
  const isOpen = !drawer.classList.contains("translate-x-full");
  if (isOpen) {
    drawer.classList.add("translate-x-full");
    overlay.classList.add("hidden");
    document.body.style.overflow = "";
  } else {
    drawer.classList.remove("translate-x-full");
    overlay.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }
}

/** 取得目前的運費設定 */
export function getShippingConfig() {
  if (
    !storefrontRuntime.appSettings ||
    !storefrontRuntime.appSettings.delivery_options_config
  ) {
    return null;
  }
  const config = parseJsonArray(
    storefrontRuntime.appSettings.delivery_options_config,
  ).map(asJsonRecord);
  const sel = config.find((opt) => opt.id === state.selectedDelivery);
  return sel
    ? {
      fee: Number(sel.fee) || 0,
      freeThreshold: Number(sel.free_threshold) || 0,
    }
    : { fee: 0, freeThreshold: 0 };
}

/** 計算購物車所有金額 */
export function calcCartSummary() {
  return calcCartSummaryFromState(
    cart,
    state.orderQuote,
    state.selectedDelivery || "",
  );
}

/** 相容舊版 calcTotal */
export function calcTotal() {
  return calcCartSummary().finalTotal;
}
