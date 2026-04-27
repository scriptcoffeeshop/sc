import { applyDashboardBrandingSideEffects } from "./dashboardBrandingSideEffects.ts";
import { readPublicBrandingCache } from "../../lib/publicBrandingCache.ts";

export function parseBooleanSetting(
  value: unknown,
  defaultValue = true,
): boolean {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }
  const normalized = String(value).trim().toLowerCase();
  return !["false", "0", "off", "no"].includes(normalized);
}

interface DashboardBrandingDeps {
  API_URL: string;
  cacheKey: string;
  fetch?: typeof fetch;
  applyDashboardTitle?: (title: string) => void;
  getDefaultIconUrl: (kind: string) => string;
  resolveAssetUrl: (url: string) => string;
}

interface DashboardSettings {
  [key: string]: unknown;
}

export function readDashboardPublicBrandingCache(cacheKey: string) {
  const cachedBranding = readPublicBrandingCache(cacheKey);
  return {
    dashboardTitle: cachedBranding.dashboardTitle,
    siteTitle: cachedBranding.siteTitle,
    logoUrl: cachedBranding.resolvedLogoUrl,
  };
}

export function createDashboardBrandingController(
  deps: DashboardBrandingDeps,
) {
  function applyDashboardBranding(settings: DashboardSettings = {}): void {
    const siteIconUrl = String(settings["site_icon_url"] || "").trim();
    const resolvedLogoUrl = siteIconUrl
      ? deps.resolveAssetUrl(siteIconUrl)
      : deps.getDefaultIconUrl("brand");
    const siteTitle = String(settings["site_title"] || "").trim();
    const dashboardTitle = String(settings["dashboard_title"] || "").trim();
    deps.applyDashboardTitle?.(dashboardTitle);
    applyDashboardBrandingSideEffects({
      cacheKey: deps.cacheKey,
      dashboardTitle,
      documentTitle: siteTitle
        ? `管理後台 | ${siteTitle}`
        : "管理後台 | Script Coffee",
      logoUrl: resolvedLogoUrl,
      siteTitle,
    });
  }

  function applyCachedDashboardBranding(): void {
    const cachedBranding = readDashboardPublicBrandingCache(deps.cacheKey);
    if (
      !cachedBranding.siteTitle &&
      !cachedBranding.logoUrl &&
      !cachedBranding.dashboardTitle
    ) return;
    const siteTitle = cachedBranding.siteTitle.trim();
    deps.applyDashboardTitle?.(cachedBranding.dashboardTitle);
    applyDashboardBrandingSideEffects({
      cacheKey: deps.cacheKey,
      dashboardTitle: cachedBranding.dashboardTitle,
      documentTitle: siteTitle
        ? `管理後台 | ${siteTitle}`
        : "管理後台 | Script Coffee",
      logoUrl: cachedBranding.logoUrl || deps.getDefaultIconUrl("brand"),
      siteTitle,
    });
  }

  async function loadPublicDashboardBranding(): Promise<void> {
    const fetchFn = deps.fetch || globalThis.fetch;
    if (typeof fetchFn !== "function") return;

    try {
      const response = await fetchFn(`${deps.API_URL}?action=getSettings&_=${Date.now()}`);
      if (!response.ok) return;
      const result = await response.json();
      if (!result?.success || !result?.settings) return;
      applyDashboardBranding(result.settings);
    } catch (_error) {
      // ignore branding prefetch failures on login page
    }
  }

  return {
    applyDashboardBranding,
    applyCachedDashboardBranding,
    loadPublicDashboardBranding,
  };
}
