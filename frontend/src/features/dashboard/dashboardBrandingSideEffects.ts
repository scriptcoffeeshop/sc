export type DashboardBrandingSideEffectView = {
  cacheKey: string;
  dashboardTitle?: string;
  documentTitle: string;
  logoUrl: string;
  siteTitle: string;
};

function cacheDashboardPublicBranding(view: DashboardBrandingSideEffectView): void {
  if (typeof window === "undefined" || !window.localStorage) return;

  try {
    window.localStorage.setItem(
      view.cacheKey,
      JSON.stringify({
        site_title: view.siteTitle,
        dashboard_title: view.dashboardTitle || "",
        resolved_logo_url: view.logoUrl,
      }),
    );
  } catch (_error) {
    // localStorage may be unavailable in private mode or strict test sandboxes.
  }
}

function resolveImageHref(url: string): string {
  if (typeof document === "undefined") return url;
  try {
    return new URL(url, document.baseURI).href;
  } catch (_error) {
    return url;
  }
}

function setImageSourceIfChanged(
  logoEl: HTMLImageElement,
  logoUrl: string,
): void {
  const nextHref = resolveImageHref(logoUrl);
  if (
    logoEl.getAttribute("src") === logoUrl ||
    logoEl.src === nextHref ||
    logoEl.currentSrc === nextHref
  ) {
    return;
  }
  logoEl.src = logoUrl;
}

export function applyDashboardBrandingSideEffects(
  view: DashboardBrandingSideEffectView,
): void {
  if (typeof document !== "undefined") {
    const logoIds = [
      "dashboard-login-logo",
      "dashboard-header-logo",
      "settings-brand-logo",
    ];
    logoIds.forEach((id) => {
      const logoEl = document.getElementById(id);
      if (!(logoEl instanceof HTMLImageElement) || !view.logoUrl) return;
      setImageSourceIfChanged(logoEl, view.logoUrl);
    });

    const faviconEl = document.getElementById("dynamic-favicon");
    if (faviconEl instanceof HTMLLinkElement && view.logoUrl) {
      faviconEl.href = view.logoUrl;
    }

    document.title = view.documentTitle;

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
  }

  cacheDashboardPublicBranding(view);
}
