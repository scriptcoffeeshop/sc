import type { StorefrontBrandingView } from "./useStorefrontBranding";

export const STOREFRONT_PUBLIC_BRANDING_CACHE_KEY =
  "coffee_storefront_public_branding";

export function applyStorefrontBrandingSideEffects(
  view: StorefrontBrandingView,
): void {
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
        site_subtitle: view.siteSubtitle,
        resolved_logo_url: view.brandIconUrl,
      }),
    );
  } catch (_error) {
    // localStorage may be unavailable in private mode or strict test sandboxes.
  }
}
