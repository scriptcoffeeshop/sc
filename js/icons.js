// ============================================
// icons.js — Icon URL 與渲染工具
// ============================================

import { escapeAttr, escapeHtml } from "./utils.js";

export const ICON_FILE_MAP = {
  brand: "icons/logo.png",
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
  jkopay: "icons/payment-jkopay.png",
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

const ICON_META_MAP = {
  brand: { label: "品牌", category: "品牌" },
  orders: { label: "訂單", category: "導航" },
  profile: { label: "會員", category: "導航" },
  products: { label: "商品", category: "導航" },
  categories: { label: "分類", category: "導航" },
  promotions: { label: "促銷", category: "導航" },
  settings: { label: "設定", category: "導航" },
  form: { label: "表單", category: "導航" },
  users: { label: "用戶", category: "導航" },
  blacklist: { label: "黑名單", category: "導航" },
  refresh: { label: "重整", category: "操作" },
  copy: { label: "複製", category: "操作" },
  drag: { label: "拖曳", category: "操作" },
  refund: { label: "退款", category: "操作" },
  selected: { label: "已選", category: "狀態" },
  announcement: { label: "公告", category: "狀態" },
  storeStatus: { label: "營業狀態", category: "狀態" },
  delivery: { label: "配送", category: "物流" },
  shipping: { label: "宅配", category: "物流" },
  location: { label: "定位", category: "物流" },
  map: { label: "地圖", category: "物流" },
  store: { label: "門市", category: "物流" },
  delivery_method: { label: "配送車", category: "物流" },
  home_delivery: { label: "宅配", category: "物流" },
  in_store: { label: "來店取貨", category: "物流" },
  seven_eleven: { label: "7-11", category: "物流" },
  family_mart: { label: "全家", category: "物流" },
  payment: { label: "付款", category: "金流" },
  cod: { label: "取貨付款", category: "金流" },
  linepay: { label: "LINE Pay", category: "金流" },
  jkopay: { label: "街口支付", category: "金流" },
  transfer: { label: "轉帳", category: "金流" },
  cart: { label: "購物車", category: "商店" },
  notes: { label: "備註", category: "商店" },
  section: { label: "區塊", category: "商店" },
};

export const ICON_CATALOG = Object.entries(ICON_FILE_MAP).map(([key, path]) => ({
  key,
  path,
  label: ICON_META_MAP[key]?.label || key,
  category: ICON_META_MAP[key]?.category || "其他",
}));

const ABSOLUTE_URL_RE = /^(?:https?:|data:|blob:|\/\/)/i;
const RELATIVE_ICON_HOSTS = new Set([
  "scriptcoffee.com.tw",
  "www.scriptcoffee.com.tw",
  "scriptcoffeeshop.github.io",
]);

function shouldNormalizeAbsoluteIconHost(hostname = "") {
  const normalizedHost = String(hostname || "").trim().toLowerCase();
  if (!normalizedHost) return false;
  if (RELATIVE_ICON_HOSTS.has(normalizedHost)) return true;
  if (typeof window !== "undefined") {
    const currentHost = String(window.location.hostname || "").trim().toLowerCase();
    if (currentHost && normalizedHost === currentHost) return true;
  }
  return false;
}

/**
 * 將 icon_url 正規化為乾淨的相對路徑（不帶 /sc/ 或前導斜線）。
 * 目的：確保無論部署在 GitHub Pages 子目錄 (/sc/) 還是自訂網域根目錄，
 * 儲存到資料庫的 icon_url 都是環境無關的相對路徑（如 "icons/in-store-bag.png"）。
 * 這樣在顯示時由 resolveAssetUrl 負責根據環境補上正確前綴。
 */
export function normalizeIconPath(rawUrl = "") {
  const value = String(rawUrl || "").trim();
  if (!value) return "";
  // 絕對 URL 若是舊有 /sc/icons 或 /icons，且屬於本站網域，轉為相對路徑
  if (ABSOLUTE_URL_RE.test(value)) {
    if (/^(?:data:|blob:|\/\/)/i.test(value)) return value;
    try {
      const parsed = new URL(value);
      if (shouldNormalizeAbsoluteIconHost(parsed.hostname)) {
        const normalizedPath = parsed.pathname.replace(/^\/+/, "");
        if (normalizedPath.startsWith("sc/icons/")) {
          return normalizedPath.slice(3);
        }
        if (normalizedPath.startsWith("icons/")) {
          return normalizedPath;
        }
      }
    } catch {
      return value;
    }
    return value;
  }
  // 去除前導斜線和 /sc/ 前綴，統一為相對路徑
  return value.replace(/^\/+/, "").replace(/^sc\//, "");
}

export function resolveAssetUrl(rawUrl = "") {
  const value = String(rawUrl || "").trim();
  if (!value) return "";

  if (ABSOLUTE_URL_RE.test(value)) return value;

  const normalized = value.replace(/^\.?\//, "").replace(/^\/+/, "");
  if (!normalized) return "";

  if (typeof window === "undefined") return normalized;

  const pathname = window.location.pathname || "/";
  const base = pathname.slice(0, pathname.lastIndexOf("/") + 1) || "/";

  // 防止路徑重複：若 normalized 已包含 base 子目錄名則去除
  // 例如 base="/sc/", normalized="sc/icons/x.png" → 僅使用 "icons/x.png"
  const baseDir = base.replace(/^\/|\/$/g, ""); // "sc"
  if (baseDir && normalized.startsWith(baseDir + "/")) {
    return `${base}${normalized.slice(baseDir.length + 1)}`;
  }

  // 若目前不在 /sc/ 子目錄下（例如自訂網域 scriptcoffee.com.tw），
  // 但路徑仍帶有舊的 "sc/" 前綴（資料庫殘留），則自動去除
  if (!baseDir && normalized.startsWith("sc/")) {
    return `/${normalized.slice(3)}`;
  }

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
  if (["cod", "linepay", "jkopay", "transfer"].includes(key)) return key;
  return "payment";
}
