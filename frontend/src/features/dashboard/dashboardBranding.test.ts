/** @vitest-environment jsdom */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createDashboardBrandingController,
  readDashboardPublicBrandingCache,
} from "./dashboardBranding.ts";

describe("dashboardBranding", () => {
  const cacheKey = "coffee_dashboard_public_branding";
  const localStorageItems = new Map<string, string>();

  beforeEach(() => {
    localStorageItems.clear();
    const localStorageMock = {
      getItem: vi.fn((key: string) =>
        localStorageItems.has(key) ? localStorageItems.get(key) : null
      ),
      setItem: vi.fn((key: string, value: string) =>
        localStorageItems.set(key, String(value))
      ),
      removeItem: vi.fn((key: string) => localStorageItems.delete(key)),
      clear: vi.fn(() => localStorageItems.clear()),
    } as unknown as Storage;
    vi.stubGlobal("localStorage", localStorageMock);
    Object.defineProperty(window, "localStorage", {
      value: localStorageMock,
      configurable: true,
    });
    document.body.innerHTML = `
      <div id="login-page">
        <h1>舊標題</h1>
        <p>舊副標</p>
      </div>
      <img id="dashboard-login-logo" alt="">
      <img id="dashboard-header-logo" alt="">
    `;
    document.title = "";
  });

  it("reads cached public branding for first paint", () => {
    localStorage.setItem(
      cacheKey,
      JSON.stringify({
        site_title: "快取後台",
        dashboard_title: "訂購後台",
        resolved_logo_url: "/icons/cached-dashboard.png",
      }),
    );

    expect(readDashboardPublicBrandingCache(cacheKey)).toEqual({
      dashboardTitle: "訂購後台",
      siteTitle: "快取後台",
      logoUrl: "/icons/cached-dashboard.png",
    });
  });

  it("applies cached public branding before network branding returns", () => {
    localStorage.setItem(
      cacheKey,
      JSON.stringify({
        site_title: "快取後台",
        dashboard_title: "訂購後台",
        resolved_logo_url: "/icons/cached-dashboard.png",
      }),
    );
    const applyDashboardTitle = vi.fn();
    const controller = createDashboardBrandingController({
      API_URL: "/api",
      cacheKey,
      applyDashboardTitle,
      getDefaultIconUrl: () => "/icons/default-brand.png",
      resolveAssetUrl: (url) => url,
    });

    controller.applyCachedDashboardBranding();

    expect(document.title).toBe("管理後台 | 快取後台");
    expect(document.getElementById("dashboard-login-logo")?.getAttribute("src"))
      .toBe("/icons/cached-dashboard.png");
    expect(document.getElementById("dashboard-header-logo")?.getAttribute("src"))
      .toBe("/icons/cached-dashboard.png");
    expect(applyDashboardTitle).toHaveBeenCalledWith("訂購後台");
  });

  it("applies dashboard title from public settings before admin bootstrap", async () => {
    const applyDashboardTitle = vi.fn();
    const controller = createDashboardBrandingController({
      API_URL: "/api",
      cacheKey,
      applyDashboardTitle,
      fetch: vi.fn(async () => ({
        ok: true,
        json: vi.fn(async () => ({
          success: true,
          settings: {
            site_title: "新品牌",
            dashboard_title: "訂購後台",
            site_icon_url: "/icons/new-brand.png",
          },
        })),
      } as unknown as Response)),
      getDefaultIconUrl: () => "/icons/default-brand.png",
      resolveAssetUrl: (url) => url,
    });

    await controller.loadPublicDashboardBranding();

    expect(applyDashboardTitle).toHaveBeenCalledWith("訂購後台");
    expect(JSON.parse(localStorage.getItem(cacheKey) || "{}")).toMatchObject({
      dashboard_title: "訂購後台",
    });
  });
});
