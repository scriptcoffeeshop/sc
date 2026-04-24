// ============================================
// storefrontCartStore.ts — 購物車 CRUD & UI
// ============================================

import { state } from "../../lib/appState.ts";
import Swal from "../../lib/swal.ts";
import {
  calcCartSummaryFromState,
  getDeliveryMeta as getStorefrontDeliveryMeta,
  getShippingDisplayState as getStorefrontShippingDisplayState,
} from "./storefrontCartSummary.ts";
import { storefrontRuntime } from "./storefrontRuntime.ts";

/** 購物車陣列 [{productId, productName, specKey, specLabel, qty, unitPrice}] */
export let cart = [];

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

function clearElement(element) {
  element?.replaceChildren();
}

function createTotalPriceContent(summary, shippingState) {
  if (summary.totalDiscount > 0 || shippingState.showBadge) {
    const wrapper = document.createElement("div");
    wrapper.className = "flex flex-col items-start justify-center";

    const badges = document.createElement("div");
    badges.className = "flex items-center mb-0.5";

    if (summary.totalDiscount > 0) {
      const discountBadge = document.createElement("span");
      discountBadge.textContent = `折 -$${summary.totalDiscount}`;
      discountBadge.style.backgroundColor = "#fee2e2";
      discountBadge.style.color = "#dc2626";
      discountBadge.style.fontSize = "11px";
      discountBadge.style.padding = "2px 6px";
      discountBadge.style.borderRadius = "4px";
      discountBadge.style.marginRight = "4px";
      badges.appendChild(discountBadge);
    }

    if (shippingState.showBadge) {
      const shippingBadge = document.createElement("span");
      shippingBadge.textContent = shippingState.isFreeShipping
        ? "免運費"
        : `運費 $${shippingState.shippingFee}`;
      shippingBadge.style.backgroundColor = shippingState.isFreeShipping
        ? "#dbeafe"
        : "#f3f4f6";
      shippingBadge.style.color = shippingState.isFreeShipping
        ? "#2563eb"
        : "#4b5563";
      shippingBadge.style.fontSize = "11px";
      shippingBadge.style.padding = "2px 6px";
      shippingBadge.style.borderRadius = "4px";
      badges.appendChild(shippingBadge);
    }

    const total = document.createElement("div");
    total.className = "text-xl font-bold leading-tight";
    total.textContent = `應付總額: $${summary.finalTotal}`;

    wrapper.append(badges, total);
    return wrapper;
  }

  const total = document.createElement("div");
  total.className = "text-xl font-bold";
  total.textContent = `總金額: $${summary.finalTotal}`;
  return total;
}

function createCartQuantityButton(idx, delta, text) {
  const button = document.createElement("button");
  button.className = "quantity-btn";
  button.dataset.action = "cart-item-qty";
  button.dataset.idx = String(idx);
  button.dataset.delta = String(delta);
  button.style.width = "28px";
  button.style.height = "28px";
  button.style.fontSize = "14px";
  button.textContent = text;
  return button;
}

function renderCartItemsList(container, summary) {
  const fragment = document.createDocumentFragment();

  cart.forEach((item, index) => {
    const isDiscounted = summary.discountedItemKeys &&
      summary.discountedItemKeys.has(`${item.productId}-${item.specKey}`);

    const row = document.createElement("div");
    row.className = "flex items-center justify-between py-3 border-b";
    row.style.borderColor = "#f0e6db";

    const info = document.createElement("div");
    info.className = "flex-1 mr-3";

    const title = document.createElement("div");
    title.className = "font-medium text-sm flex items-center flex-wrap";
    title.append(String(item.productName || ""));
    if (isDiscounted) {
      const discountBadge = document.createElement("span");
      discountBadge.className =
        "ml-2 inline-block bg-red-100 text-red-600 text-[10px] px-1.5 py-0.5 rounded leading-tight";
      discountBadge.textContent = "適用優惠";
      title.appendChild(discountBadge);
    }

    const specLine = document.createElement("div");
    specLine.className = "text-xs text-gray-500";
    specLine.textContent = `${String(item.specLabel || "")} · $${item.unitPrice}`;

    info.append(title, specLine);

    const controls = document.createElement("div");
    controls.className = "flex items-center gap-1";
    const qty = document.createElement("span");
    qty.className = "w-8 text-center font-medium";
    qty.textContent = String(item.qty || 0);
    controls.append(
      createCartQuantityButton(index, -1, "−"),
      qty,
      createCartQuantityButton(index, 1, "+"),
    );

    const totalArea = document.createElement("div");
    totalArea.className = "text-right ml-3 min-w-[60px]";

    const total = document.createElement("div");
    total.className = "font-semibold text-sm";
    total.style.color = "var(--accent)";
    total.textContent = `$${item.qty * item.unitPrice}`;

    const removeButton = document.createElement("button");
    removeButton.dataset.action = "remove-cart-item";
    removeButton.dataset.idx = String(index);
    removeButton.className = "text-xs text-red-400 hover:text-red-600";
    removeButton.textContent = "移除";

    totalArea.append(total, removeButton);
    row.append(info, controls, totalArea);
    fragment.appendChild(row);
  });

  container.replaceChildren(fragment);
}

function renderShippingNoticePanel(shippingNotice, shippingState, deliveryName, summary) {
  if (!shippingNotice) return;

  if (!shippingState.showNotice) {
    shippingNotice.classList.add("hidden");
    shippingNotice.replaceChildren();
    return;
  }

  const shippingNoticeTitle = shippingState.hasFreeThreshold
    ? `未達 ${deliveryName}免運門檻`
    : `${deliveryName}運費`;

  const wrapper = document.createElement("div");
  wrapper.className = "px-3 py-2 rounded-lg mb-1";
  wrapper.style.background = "#fef2f2";
  wrapper.style.border = "1px solid #fca5a5";

  const header = document.createElement("div");
  header.className = "flex justify-between items-center text-sm font-semibold";
  header.style.color = "#991b1b";
  const title = document.createElement("span");
  title.textContent = shippingNoticeTitle;
  const amount = document.createElement("span");
  amount.textContent = `+$${shippingState.shippingFee}`;
  header.append(title, amount);
  wrapper.appendChild(header);

  if (shippingState.hasFreeThreshold) {
    const diff = shippingState.freeThreshold - summary.totalAfterDiscount;
    if (diff > 0) {
      const hint = document.createElement("div");
      hint.className = "text-xs mt-1";
      hint.style.color = "#b91c1c";
      hint.textContent = `還差 $${diff} 即可免運`;
      wrapper.appendChild(hint);
    }
  }

  shippingNotice.replaceChildren(wrapper);
  shippingNotice.classList.remove("hidden");
}

function createDiscountRow(text, amountText, className) {
  const row = document.createElement("div");
  row.className = `flex justify-between items-center mb-1 ${className}`;
  const label = document.createElement("span");
  label.textContent = text;
  const value = document.createElement("span");
  value.textContent = amountText;
  row.append(label, value);
  return row;
}

function renderDiscountSection(discountSection, summary, shippingState, deliveryName) {
  if (!discountSection) return;

  const hasPromos = summary.totalDiscount > 0 && summary.appliedPromos &&
    summary.appliedPromos.length > 0;

  if (!hasPromos && !shippingState.isFreeShipping) {
    discountSection.classList.add("hidden");
    discountSection.replaceChildren();
    return;
  }

  const wrapper = document.createElement("div");
  wrapper.className = "border-b border-dashed border-[#e5ddd5] pb-2 mb-2";

  const title = document.createElement("div");
  title.className = "font-semibold text-gray-700 mb-2";
  title.textContent = "已套用優惠與折抵：";
  wrapper.appendChild(title);

  if (hasPromos) {
    summary.appliedPromos.forEach((promo) => {
      wrapper.appendChild(
        createDiscountRow(String(promo.name || ""), `-$${promo.amount}`, "text-red-600"),
      );
    });
  }

  if (shippingState.isFreeShipping) {
    const thresholdText = shippingState.hasFreeThreshold
      ? ` (滿$${shippingState.freeThreshold})`
      : "";
    wrapper.appendChild(
      createDiscountRow(
        `${deliveryName}免運${thresholdText}`,
        "免運費",
        "text-blue-600",
      ),
    );
  }

  discountSection.replaceChildren(wrapper);
  discountSection.classList.remove("hidden");
}

/** 供 Vue 元件讀取目前購物車快照 */
export function getCartSnapshot() {
  return cart.map((item) => ({ ...item }));
}

export function loadCart() {
  try {
    const d = localStorage.getItem("coffee_cart");
    cart = d ? JSON.parse(d) : [];
    updateCartUI();
    triggerQuoteRefresh();
  } catch {}
}

/** 加入購物車 */
export function addToCart(productId, specKey) {
  const p = state.products.find((x) => x.id === productId);
  if (!p) return;
  let specs = [];
  try {
    const specsSource = typeof p.specs === "string"
      ? p.specs
      : JSON.stringify(p.specs || []);
    specs = JSON.parse(specsSource);
  } catch {}
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
    renderCartItemsList(container, summary);
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
  try {
    const config = JSON.parse(
      storefrontRuntime.appSettings.delivery_options_config,
    );
    const sel = config.find((opt) => opt.id === state.selectedDelivery);
    return sel
      ? {
        fee: parseInt(sel.fee) || 0,
        freeThreshold: parseInt(sel.free_threshold) || 0,
      }
      : { fee: 0, freeThreshold: 0 };
  } catch {
    return { fee: 0, freeThreshold: 0 };
  }
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
