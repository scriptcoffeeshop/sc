import { ref } from "vue";
import { getIconUrlFromConfig } from "../../lib/icons.ts";
import type { DashboardSettingsRecord } from "../../types/settings";
import type { StorefrontUiSnapshot } from "./storefrontUiSnapshot";

interface StorefrontBrandingDeps {
  getStorefrontUiSnapshot?: () => Partial<StorefrontUiSnapshot>;
}

export interface StorefrontSectionTitleView {
  title: string;
  color: string;
  sizeClass: string;
  weightClass: string;
  iconUrl: string;
  iconAlt: string;
}

export interface StorefrontBrandingView {
  siteTitle: string;
  siteSubtitle: string;
  brandIconUrl: string;
  sections: {
    products: StorefrontSectionTitleView;
    delivery: StorefrontSectionTitleView;
    notes: StorefrontSectionTitleView;
  };
}

const STOREFRONT_PUBLIC_BRANDING_CACHE_KEY =
  "coffee_storefront_public_branding";
const SECTION_SIZE_CLASSES = new Set([
  "text-base",
  "text-lg",
  "text-xl",
  "text-2xl",
]);

function normalizeSiteSubtitle(value: unknown) {
  const subtitle = String(value || "").trim();
  if (!subtitle) return "";
  if (/^咖啡豆\s*[|｜]\s*耳掛$/.test(subtitle)) return "咖啡豆｜耳掛";
  return subtitle;
}

function getSectionSizeClass(value: unknown) {
  const sizeClass = String(value || "").trim();
  return SECTION_SIZE_CLASSES.has(sizeClass) ? sizeClass : "text-lg";
}

function getSectionWeightClass(value: unknown) {
  return String(value ?? "true") === "false" ? "font-medium" : "font-bold";
}

function buildSectionTitle(
  settings: DashboardSettingsRecord,
  prefix: "products" | "delivery" | "notes",
  defaults: { title: string; iconKey: string; iconAlt: string },
): StorefrontSectionTitleView {
  return {
    title: String(settings[`${prefix}_section_title`] || defaults.title),
    color: String(settings[`${prefix}_section_color`] || "var(--primary)"),
    sizeClass: getSectionSizeClass(settings[`${prefix}_section_size`]),
    weightClass: getSectionWeightClass(settings[`${prefix}_section_bold`]),
    iconUrl: getIconUrlFromConfig(
      { icon_url: settings[`${prefix}_section_icon_url`] },
      defaults.iconKey,
    ),
    iconAlt: defaults.iconAlt,
  };
}

export function normalizeStorefrontBranding(
  settings: DashboardSettingsRecord = {},
): StorefrontBrandingView {
  return {
    siteTitle: String(settings.site_title || "Script Coffee"),
    siteSubtitle: normalizeSiteSubtitle(settings.site_subtitle) || "咖啡豆 | 耳掛",
    brandIconUrl: getIconUrlFromConfig(
      { icon_url: settings.site_icon_url },
      "brand",
    ),
    sections: {
      products: buildSectionTitle(settings, "products", {
        title: "咖啡豆選購",
        iconKey: "products",
        iconAlt: "商品區塊圖示",
      }),
      delivery: buildSectionTitle(settings, "delivery", {
        title: "配送方式",
        iconKey: "delivery",
        iconAlt: "配送區塊圖示",
      }),
      notes: buildSectionTitle(settings, "notes", {
        title: "訂單備註",
        iconKey: "notes",
        iconAlt: "備註區塊圖示",
      }),
    },
  };
}

function applyStorefrontBrandingSideEffects(view: StorefrontBrandingView) {
  if (typeof document !== "undefined" && view.siteTitle) {
    document.title = view.siteTitle;
    let favicon = document.getElementById("dynamic-favicon");
    if (!favicon) {
      const link = document.createElement("link");
      link.id = "dynamic-favicon";
      link.rel = "icon";
      document.head.appendChild(link);
      favicon = link;
    }
    if (favicon instanceof HTMLLinkElement) {
      favicon.href = view.brandIconUrl;
    }
  }

  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(
      STOREFRONT_PUBLIC_BRANDING_CACHE_KEY,
      JSON.stringify({
        site_title: view.siteTitle,
        resolved_logo_url: view.brandIconUrl,
      }),
    );
  } catch (_error) {
  }
}

export function useStorefrontBranding(deps: StorefrontBrandingDeps = {}) {
  const branding = ref<StorefrontBrandingView>(
    normalizeStorefrontBranding({}),
  );

  function syncBrandingState(snapshot: Partial<StorefrontUiSnapshot> = {}) {
    branding.value = normalizeStorefrontBranding(snapshot.settings || {});
    applyStorefrontBrandingSideEffects(branding.value);
  }

  function refreshBrandingState() {
    syncBrandingState(deps.getStorefrontUiSnapshot?.() || {});
  }

  return {
    branding,
    syncBrandingState,
    refreshBrandingState,
  };
}
