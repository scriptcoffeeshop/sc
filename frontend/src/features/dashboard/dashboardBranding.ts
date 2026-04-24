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
  getDefaultIconUrl: (kind: string) => string;
  resolveAssetUrl: (url: string) => string;
}

type DashboardSettings = Record<string, unknown>;

function cacheDashboardPublicBranding(
  cacheKey: string,
  settings: DashboardSettings = {},
  resolvedLogoUrl = "",
): void {
  if (typeof window === "undefined" || !window.localStorage) return;

  try {
    const payload = {
      site_title: String(settings.site_title || "").trim(),
      resolved_logo_url: String(resolvedLogoUrl || "").trim(),
    };
    window.localStorage.setItem(cacheKey, JSON.stringify(payload));
  } catch (_error) {
  }
}

export function createDashboardBrandingController(
  deps: DashboardBrandingDeps,
) {
  function applyDashboardBranding(settings: DashboardSettings = {}): void {
    const siteIconUrl = String(settings.site_icon_url || "").trim();
    const resolvedLogoUrl = siteIconUrl
      ? deps.resolveAssetUrl(siteIconUrl)
      : deps.getDefaultIconUrl("brand");
    const logoIds = [
      "dashboard-login-logo",
      "dashboard-header-logo",
      "settings-brand-logo",
    ];
    logoIds.forEach((id) => {
      const logoEl = document.getElementById(id);
      if (!(logoEl instanceof HTMLImageElement) || !resolvedLogoUrl) return;
      logoEl.src = resolvedLogoUrl;
    });

    const faviconEl = document.getElementById("dynamic-favicon");
    if (faviconEl instanceof HTMLLinkElement && resolvedLogoUrl) {
      faviconEl.href = resolvedLogoUrl;
    }

    const siteTitle = String(settings.site_title || "").trim();
    document.title = siteTitle
      ? `管理後台 | ${siteTitle}`
      : "管理後台 | Script Coffee";

    const loginTitleEl = document.querySelector("#login-page h1");
    if (loginTitleEl instanceof HTMLElement) {
      loginTitleEl.textContent = "後台登入";
      loginTitleEl.classList.remove("ui-text-highlight");
      loginTitleEl.classList.add("text-slate-800");
    }

    const loginSubtitleEl = document.querySelector("#login-page p");
    if (loginSubtitleEl instanceof HTMLElement) {
      loginSubtitleEl.classList.remove("ui-text-subtle");
      loginSubtitleEl.classList.add("text-slate-600");
    }

    cacheDashboardPublicBranding(
      deps.cacheKey,
      settings,
      resolvedLogoUrl,
    );
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
    loadPublicDashboardBranding,
  };
}
