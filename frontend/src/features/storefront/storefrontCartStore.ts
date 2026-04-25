// ============================================
// storefrontCartStore.ts — 購物車 CRUD & state
// ============================================

import { state } from "../../lib/appState.ts";
import { asJsonRecord, parseJsonArray } from "../../lib/jsonUtils.ts";
import { createLogger } from "../../lib/logger.ts";
import Swal from "../../lib/swal.ts";
import {
  calcCartSummaryFromState,
  getDeliveryMeta as getStorefrontDeliveryMeta,
  type StorefrontCartSummary,
} from "./storefrontCartSummary.ts";
import { emitStorefrontEvent, STOREFRONT_EVENTS } from "./storefrontEventBus.ts";
import { storefrontRuntime } from "./storefrontRuntime.ts";

const logger = createLogger("storefront-cart");

export interface StorefrontCartItem {
  productId: number | string;
  productName: string;
  specKey: string;
  specLabel: string;
  qty: number;
  unitPrice: number;
}

interface StorefrontProductSpec {
  key: string;
  label: string;
  price: number;
}

/** 購物車陣列 [{productId, productName, specKey, specLabel, qty, unitPrice}] */
export let cart: StorefrontCartItem[] = [];

function parseStoredCart(rawCart: string | null): StorefrontCartItem[] {
  return parseJsonArray(rawCart)
    .map(asJsonRecord)
    .map((item) => ({
      productId: Number.isFinite(Number(item["productId"]))
        ? Number(item["productId"])
        : String(item["productId"] || ""),
      productName: String(item["productName"] || ""),
      specKey: String(item["specKey"] || ""),
      specLabel: String(item["specLabel"] || ""),
      qty: Math.max(1, Number(item["qty"]) || 1),
      unitPrice: Number(item["unitPrice"]) || 0,
    }));
}

function parseProductSpecs(specsValue: unknown): StorefrontProductSpec[] {
  return parseJsonArray(specsValue).map(asJsonRecord).map((spec) => ({
    key: String(spec["key"] || ""),
    label: String(spec["label"] || ""),
    price: Number(spec["price"]) || 0,
  }));
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

function getDeliveryMeta() {
  return getStorefrontDeliveryMeta(
    state.selectedDelivery || "",
    storefrontRuntime.appSettings?.delivery_options_config,
  );
}

function emitCartUpdated(summary: StorefrontCartSummary) {
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
  emitStorefrontEvent(STOREFRONT_EVENTS.cartUpdated, detail);
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
    logger.warn("無法讀取購物車快取", error);
    cart = [];
    updateCartUI();
    triggerQuoteRefresh();
  }
}

/** 加入購物車 */
export function addToCart(productId: number | string, specKey: string) {
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
export function updateCartItemQty(idx: number, delta: number) {
  if (!cart[idx]) return;
  cart[idx].qty += delta;
  if (cart[idx].qty <= 0) cart.splice(idx, 1);
  saveCart();
  updateCartUI();
  triggerQuoteRefresh();
}

/** 依據商品ID與規格Key更新數量 (給 In-line Stepper 使用) */
export function updateCartItemQtyByKeys(
  productId: number | string,
  specKey: string,
  delta: number,
) {
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
export function removeCartItem(idx: number) {
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
  if (!cart.length) {
    state.orderQuote = null;
    state.quoteError = "";
    if (storefrontRuntime.updateFormState) storefrontRuntime.updateFormState();
    emitCartUpdated(calcCartSummary());
    return;
  }

  const summary = calcCartSummary();
  if (storefrontRuntime.updateFormState) storefrontRuntime.updateFormState();
  emitCartUpdated(summary);
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
  const sel = config.find((opt) => opt["id"] === state.selectedDelivery);
  return sel
    ? {
      fee: Number(sel["fee"]) || 0,
      freeThreshold: Number(sel["free_threshold"]) || 0,
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
