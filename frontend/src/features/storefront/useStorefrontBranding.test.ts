import { describe, expect, it } from "vitest";
import { normalizeStorefrontBranding } from "./useStorefrontBranding.ts";

describe("useStorefrontBranding", () => {
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
});
