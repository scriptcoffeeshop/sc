// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("TwCitySelector", () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = "";
    delete globalThis.TwCitySelector;
  });

  it("populates Taiwan counties, districts, and zipcode", async () => {
    document.body.innerHTML = `
      <div role="tw-city-selector">
        <select class="county"></select>
        <select class="district"></select>
        <input class="zipcode" />
      </div>
    `;

    const { default: TwCitySelector } = await import("./twCitySelector.js");
    const selector = new TwCitySelector({
      el: '[role="tw-city-selector"]',
      elCounty: ".county",
      elDistrict: ".district",
      elZipcode: ".zipcode",
    });
    await vi.waitFor(() => {
      expect(document.querySelector(".county").options.length).toBeGreaterThan(
        1,
      );
    });

    const county = document.querySelector(".county");
    const district = document.querySelector(".district");
    const zipcode = document.querySelector(".zipcode");

    county.value = "新竹縣";
    county.dispatchEvent(new Event("change", { bubbles: true }));
    expect([...district.options].map((option) => option.value)).toContain(
      "竹北市",
    );

    district.value = "竹北市";
    district.dispatchEvent(new Event("change", { bubbles: true }));
    expect(zipcode.value).toBe("302");

    selector.setValue("台北市", "中山區");
    expect(county.value).toBe("台北市");
    expect(district.value).toBe("中山區");
    expect(zipcode.value).toBe("104");
  });
});
