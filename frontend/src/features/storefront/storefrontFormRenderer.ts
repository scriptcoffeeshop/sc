// ============================================
// form-renderer.js — 動態表單欄位收集與品牌套用
// ============================================

import { isValidEmail } from "../../../../js/utils.js";
import {
  getDefaultIconUrl,
  resolveAssetUrl,
  setIconElement,
} from "../../../../js/icons.js";

const STOREFRONT_PUBLIC_BRANDING_CACHE_KEY =
  "coffee_storefront_public_branding";

function normalizeSiteSubtitle(value) {
  const subtitle = String(value || "").trim();
  if (!subtitle) return "";
  if (/^咖啡豆\s*[|｜]\s*耳掛$/.test(subtitle)) return "咖啡豆｜耳掛";
  return subtitle;
}

/**
 * Vue 已接手動態欄位渲染；保留相容入口避免舊流程呼叫中斷。
 * @param {Array} fields - coffee_form_fields 記錄
 * @param {HTMLElement} container - 要渲染到的容器
 * @param {string} [deliveryMethod] - 目前選定的配送方式 ID
 */
export function renderDynamicFields(fields, container, deliveryMethod) {
  void fields;
  void container;
  void deliveryMethod;
}

/**
 * 收集所有動態欄位的值，同時驗證必填
 * @param {Array} fields - coffee_form_fields 記錄
 * @returns {{ valid: boolean, data: Object, error: string }}
 */
export function collectDynamicFields(fields) {
  const data = {};

  for (const f of (fields || [])) {
    if (f.field_type === "section_title") continue;

    const fieldId = `field-${f.field_key}`;
    const el = document.getElementById(fieldId);
    // 跳過 DOM 中不存在的欄位（可能因配送方式而被隱藏）
    if (!el) continue;

    let value;
    if (f.field_type === "checkbox") {
      value = el.checked ? "是" : "否";
    } else {
      value = el.value.trim();
    }

    // 驗證必填
    if (f.required && !value) {
      return {
        valid: false,
        data: {},
        error: `請填寫「${String(f.label || "").trim()}」`,
      };
    }

    // email 格式驗證
    if (
      f.field_type === "email" && value &&
      !isValidEmail(value)
    ) {
      return {
        valid: false,
        data: {},
        error: `「${String(f.label || "").trim()}」格式不正確`,
      };
    }

    data[f.field_key] = value;
  }

  return { valid: true, data, error: "" };
}

/**
 * 套用品牌設定
 * @param {Object} settings
 */
export function applyBranding(settings) {
  // 標題
  const titleEl = document.getElementById("site-title");
  if (titleEl && settings.site_title) titleEl.textContent = settings.site_title;

  // 副標題
  const subtitleEl = document.getElementById("site-subtitle");
  const normalizedSubtitle = normalizeSiteSubtitle(settings.site_subtitle);
  if (subtitleEl && normalizedSubtitle) {
    subtitleEl.textContent = normalizedSubtitle;
  }

  // Header icon
  const iconEl = document.getElementById("site-icon");
  if (iconEl) {
    setIconElement(
      iconEl,
      {
        icon_url: settings.site_icon_url,
        icon: settings.site_icon_emoji,
      },
      "brand",
      "品牌圖示",
    );
  }

  // Favicon (優先使用設定的主圖像)
  let favicon = document.getElementById("dynamic-favicon");
  const faviconUrl = settings.site_icon_url
    ? resolveAssetUrl(settings.site_icon_url)
    : getDefaultIconUrl("brand");
  if (faviconUrl) {
    if (!favicon) {
      favicon = document.createElement("link");
      favicon.id = "dynamic-favicon";
      favicon.rel = "icon";
      document.head.appendChild(favicon);
    }
    favicon.href = faviconUrl;
  }

  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const payload = {
        site_title: String(settings.site_title || "").trim(),
        resolved_logo_url: String(faviconUrl || "").trim(),
      };
      window.localStorage.setItem(
        STOREFRONT_PUBLIC_BRANDING_CACHE_KEY,
        JSON.stringify(payload),
      );
    } catch {
    }
  }

  // Page title
  if (settings.site_title) {
    document.title = settings.site_title;
  }

  // 商品區塊標題
  const productsTitleEl = document.getElementById("products-section-title");
  const productsTitleTextEl =
    document.getElementById("products-section-title-text");
  const productsTitleIconEl = document.getElementById("products-section-icon");
  if (productsTitleEl) {
    if (settings.products_section_title) {
      if (productsTitleTextEl) {
        productsTitleTextEl.textContent = settings.products_section_title;
      } else {
        productsTitleEl.textContent = settings.products_section_title;
      }
    }
    if (productsTitleIconEl) {
      setIconElement(
        productsTitleIconEl,
        { icon_url: settings.products_section_icon_url },
        "products",
        "商品區塊圖示",
      );
    }
    if (settings.products_section_color) {
      productsTitleEl.style.color = settings.products_section_color;
    }
    if (settings.products_section_size) {
      productsTitleEl.classList.remove(
        "text-base",
        "text-lg",
        "text-xl",
        "text-2xl",
      );
      productsTitleEl.classList.add(settings.products_section_size);
    }
    if (settings.products_section_bold) {
      productsTitleEl.classList.toggle(
        "font-bold",
        String(settings.products_section_bold) !== "false",
      );
    }
  }

  // 配送區塊標題
  const deliveryTitleEl = document.getElementById("delivery-section-title");
  const deliveryTitleTextEl =
    document.getElementById("delivery-section-title-text");
  const deliveryTitleIconEl = document.getElementById("delivery-section-icon");
  if (deliveryTitleEl) {
    if (settings.delivery_section_title) {
      if (deliveryTitleTextEl) {
        deliveryTitleTextEl.textContent = settings.delivery_section_title;
      } else {
        deliveryTitleEl.textContent = settings.delivery_section_title;
      }
    }
    if (deliveryTitleIconEl) {
      setIconElement(
        deliveryTitleIconEl,
        { icon_url: settings.delivery_section_icon_url },
        "delivery",
        "配送區塊圖示",
      );
    }
    if (settings.delivery_section_color) {
      deliveryTitleEl.style.color = settings.delivery_section_color;
    }
    if (settings.delivery_section_size) {
      deliveryTitleEl.classList.remove(
        "text-base",
        "text-lg",
        "text-xl",
        "text-2xl",
      );
      deliveryTitleEl.classList.add(settings.delivery_section_size);
    }
    if (settings.delivery_section_bold) {
      deliveryTitleEl.classList.toggle(
        "font-bold",
        String(settings.delivery_section_bold) !== "false",
      );
    }
  }

  // 備註區塊標題
  const notesTitleEl = document.getElementById("notes-section-title");
  const notesTitleTextEl = document.getElementById("notes-section-title-text");
  const notesTitleIconEl = document.getElementById("notes-section-icon");
  if (notesTitleEl) {
    if (settings.notes_section_title) {
      if (notesTitleTextEl) {
        notesTitleTextEl.textContent = settings.notes_section_title;
      } else {
        notesTitleEl.textContent = settings.notes_section_title;
      }
    }
    if (notesTitleIconEl) {
      setIconElement(
        notesTitleIconEl,
        { icon_url: settings.notes_section_icon_url },
        "notes",
        "備註區塊圖示",
      );
    }
    if (settings.notes_section_color) {
      notesTitleEl.style.color = settings.notes_section_color;
    }
    if (settings.notes_section_size) {
      notesTitleEl.classList.remove(
        "text-base",
        "text-lg",
        "text-xl",
        "text-2xl",
      );
      notesTitleEl.classList.add(settings.notes_section_size);
    }
    if (settings.notes_section_bold) {
      notesTitleEl.classList.toggle(
        "font-bold",
        String(settings.notes_section_bold) !== "false",
      );
    }
  }
}
