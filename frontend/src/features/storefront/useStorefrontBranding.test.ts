/** @vitest-environment jsdom */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  normalizeStorefrontBranding,
  useStorefrontBranding,
} from "./useStorefrontBranding.ts";
import { STOREFRONT_PUBLIC_BRANDING_CACHE_KEY } from "./storefrontBrandingSideEffects.ts";

describe("useStorefrontBranding", () => {
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
  });

  it("normalizes brand and section title settings", () => {
    const branding = normalizeStorefrontBranding({
      site_title: "新的品牌名稱",
      site_subtitle: "咖啡豆 | 耳掛",
      products_section_title: "商品",
      products_section_color: "#123456",
      products_section_size: "text-2xl",
      products_section_bold: "false",
    });

    expect(branding.siteTitle).toBe("新的品牌名稱");
    expect(branding.siteSubtitle).toBe("咖啡豆｜耳掛");
    expect(branding.sections.products).toMatchObject({
      title: "商品",
      color: "#123456",
      sizeClass: "text-2xl",
      weightClass: "font-medium",
    });
    expect(branding.sections.delivery.title).toBe("配送方式");
  });

  it("uses cached public branding for the initial render", () => {
    localStorage.setItem(
      STOREFRONT_PUBLIC_BRANDING_CACHE_KEY,
      JSON.stringify({
        site_title: "快取品牌",
        site_subtitle: "快取副標",
        resolved_logo_url: "/icons/cached-brand.png",
      }),
    );

    const { branding } = useStorefrontBranding();

    expect(branding.value.siteTitle).toBe("快取品牌");
    expect(branding.value.siteSubtitle).toBe("快取副標");
    expect(branding.value.brandIconUrl).toBe("/icons/cached-brand.png");
  });
});
