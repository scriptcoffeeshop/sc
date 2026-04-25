/** @vitest-environment jsdom */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { applyDashboardBrandingSideEffects } from "./dashboardBrandingSideEffects.ts";

describe("applyDashboardBrandingSideEffects", () => {
  const localStorageItems = new Map();

  beforeEach(() => {
    localStorageItems.clear();
    vi.stubGlobal("localStorage", {
      getItem: vi.fn((key) =>
        localStorageItems.has(key) ? localStorageItems.get(key) : null
      ),
      setItem: vi.fn((key, value) =>
        localStorageItems.set(key, String(value))
      ),
      removeItem: vi.fn((key) => localStorageItems.delete(key)),
    });
    document.body.innerHTML = `
      <div id="login-page">
        <h1 class="ui-text-highlight">舊標題</h1>
        <p class="ui-text-subtle">舊副標</p>
      </div>
      <img id="dashboard-login-logo" alt="">
      <img id="dashboard-header-logo" alt="">
      <img id="settings-brand-logo" alt="">
    `;
    document.head.innerHTML = '<link id="dynamic-favicon" rel="icon" href="">';
    document.title = "";
  });

  it("updates dashboard brand DOM and public branding cache", () => {
    applyDashboardBrandingSideEffects({
      cacheKey: "coffee_dashboard_public_branding",
      documentTitle: "管理後台 | 新品牌",
      logoUrl: "/icons/custom-brand.png",
      siteTitle: "新品牌",
    });

    expect(document.title).toBe("管理後台 | 新品牌");
    expect(document.getElementById("dashboard-login-logo")?.getAttribute("src"))
      .toBe("/icons/custom-brand.png");
    expect(document.getElementById("dashboard-header-logo")?.getAttribute("src"))
      .toBe("/icons/custom-brand.png");
    expect(document.getElementById("settings-brand-logo")?.getAttribute("src"))
      .toBe("/icons/custom-brand.png");
    expect(document.getElementById("dynamic-favicon")?.getAttribute("href"))
      .toBe("/icons/custom-brand.png");
    expect(document.querySelector("#login-page h1")?.textContent).toBe("後台登入");
    expect(document.querySelector("#login-page h1")?.classList.contains(
      "text-slate-800",
    )).toBe(true);
    expect(JSON.parse(
      localStorage.getItem("coffee_dashboard_public_branding") || "{}",
    )).toEqual({
      site_title: "新品牌",
      resolved_logo_url: "/icons/custom-brand.png",
    });
  });
});
