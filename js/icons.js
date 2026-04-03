// ============================================
// icons.js — Icon URL 與渲染工具
// ============================================

import { escapeAttr, escapeHtml } from "./utils.js";

const ICON_FILE_MAP = {
  brand: "icons/brand-coffee.png",
  orders: "icons/orders-list.png",
  profile: "icons/profile-user.png",
  products: "icons/products-beans.png",
  categories: "icons/categories-folder.png",
  promotions: "icons/promotions-gift.png",
  settings: "icons/settings-gear.png",
  form: "icons/form-fields.png",
  users: "icons/users-group.png",
  blacklist: "icons/blacklist-shield.png",
  refresh: "icons/refresh-sync.png",
  delivery: "icons/delivery-truck.png",
  notes: "icons/notes-pencil.png",
  location: "icons/location-pin.png",
  store: "icons/store-front.png",
  payment: "icons/payment-card.png",
  cod: "icons/payment-cash.png",
  linepay: "icons/payment-linepay.png",
  transfer: "icons/payment-bank.png",
  cart: "icons/cart-bag.png",
  announcement: "icons/announcement-bell.png",
  storeStatus: "icons/status-store.png",
  shipping: "icons/shipping-box.png",
  map: "icons/map-route.png",
  in_store: "icons/in-store-bag.png",
  delivery_method: "icons/delivery-scooter.png",
  home_delivery: "icons/shipping-box.png",
  seven_eleven: "icons/seven-eleven-store.png",
  family_mart: "icons/family-mart-store.png",
  section: "icons/section-tag.png",
  copy: "icons/copy-doc.png",
  drag: "icons/drag-grip.png",
  refund: "icons/refund-arrow.png",
  selected: "icons/selected-check.png",
};

const ABSOLUTE_URL_RE = /^(?:https?:|data:|blob:|\/\/)/i;

export function resolveAssetUrl(rawUrl = "") {
  const value = String(rawUrl || "").trim();
  if (!value) return "";
  if (ABSOLUTE_URL_RE.test(value)) return value;

  const normalized = value.replace(/^\.?\//, "").replace(/^\/+/, "");
  if (!normalized) return "";

  if (typeof window === "undefined") return normalized;

  const pathname = window.location.pathname || "/";
  const base = pathname.slice(0, pathname.lastIndexOf("/") + 1) || "/";
  return `${base}${normalized}`;
}

export function getDefaultIconUrl(key = "") {
  const file = ICON_FILE_MAP[key] || "";
  return file ? resolveAssetUrl(file) : "";
}

function isLikelyImageUrl(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return false;
  if (ABSOLUTE_URL_RE.test(raw)) return true;
  return /\.(?:png|jpe?g|webp|gif|svg)(?:$|\?)/i.test(raw);
}

export function getIconUrlFromConfig(option = {}, fallbackKey = "") {
  if (!option || typeof option !== "object") {
    return getDefaultIconUrl(fallbackKey);
  }

  const explicitUrl = String(option.icon_url || option.iconUrl || "").trim();
  if (explicitUrl) return resolveAssetUrl(explicitUrl);

  const iconField = String(option.icon || "").trim();
  if (isLikelyImageUrl(iconField)) return resolveAssetUrl(iconField);

  return getDefaultIconUrl(fallbackKey);
}

export function renderIconMarkup(option = {}, fallbackKey = "", alt = "") {
  const url = getIconUrlFromConfig(option, fallbackKey);
  if (url) {
    return `<img src="${escapeAttr(url)}" alt="${escapeAttr(alt)}" class="ui-icon-img">`;
  }

  const fallbackText = String(option.icon || "").trim();
  if (fallbackText) {
    return `<span class="ui-icon-fallback" aria-hidden="true">${
      escapeHtml(fallbackText)
    }</span>`;
  }

  return "";
}

export function setIconElement(element, option = {}, fallbackKey = "", alt = "") {
  if (!element) return "";

  const url = getIconUrlFromConfig(option, fallbackKey);

  if (element instanceof HTMLImageElement) {
    if (url) {
      element.src = url;
      element.alt = alt || element.alt || "icon";
      element.classList.remove("hidden");
    } else {
      element.removeAttribute("src");
    }
    return url;
  }

  if (element instanceof HTMLElement) {
    element.innerHTML = "";
    if (url) {
      const img = document.createElement("img");
      img.src = url;
      img.alt = alt || "icon";
      img.className = "ui-icon-img";
      element.appendChild(img);
    } else if (option && option.icon) {
      element.textContent = String(option.icon);
    }
  }

  return url;
}

export function getDeliveryIconFallbackKey(deliveryId = "") {
  const id = String(deliveryId || "").trim();
  if (!id) return "delivery";
  if (ICON_FILE_MAP[id]) return id;
  return "delivery";
}

export function getPaymentIconFallbackKey(method = "") {
  const key = String(method || "").trim();
  if (["cod", "linepay", "transfer"].includes(key)) return key;
  return "payment";
}
