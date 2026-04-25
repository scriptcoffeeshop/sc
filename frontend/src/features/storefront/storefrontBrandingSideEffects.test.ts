/** @vitest-environment jsdom */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyStorefrontBrandingSideEffects,
  STOREFRONT_PUBLIC_BRANDING_CACHE_KEY,
} from "./storefrontBrandingSideEffects.ts";
import { normalizeStorefrontBranding } from "./useStorefrontBranding.ts";

describe("applyStorefrontBrandingSideEffects", () => {
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
    document.head.innerHTML = "";
    document.title = "";
  });

  it("updates document title, favicon, and public branding cache", () => {
    const branding = normalizeStorefrontBranding({
      site_title: "新的品牌名稱",
      site_subtitle: "咖啡豆 | 耳掛",
      site_icon_url: "/icons/custom-brand.png",
    });

    applyStorefrontBrandingSideEffects(branding);

    const favicon = document.getElementById(
      "dynamic-favicon",
    ) as HTMLLinkElement | null;
    expect(document.title).toBe("新的品牌名稱");
    expect(favicon).toBeInstanceOf(HTMLLinkElement);
    expect(favicon?.href).toContain("/icons/custom-brand.png");
    expect(JSON.parse(
      localStorage.getItem(STOREFRONT_PUBLIC_BRANDING_CACHE_KEY) || "{}",
    )).toEqual({
      site_title: "新的品牌名稱",
      site_subtitle: "咖啡豆｜耳掛",
      resolved_logo_url: "/icons/custom-brand.png",
    });
  });
});
