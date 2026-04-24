import { describe, expect, it } from "vitest";
import {
  buildSaveProductPayload,
  buildToggleProductEnabledPayload,
} from "./dashboardProductsShared.ts";

describe("dashboardProductsShared", () => {
  it("builds save payload from enabled product specs", () => {
    const { enabledSpecs, payload } = buildSaveProductPayload(
      {
        id: "42",
        category: "咖啡豆",
        name: "日曬處理",
        description: "莓果調性",
        roastLevel: "中焙",
        enabled: true,
        specs: [
          { key: "half", label: "半磅", price: 420, enabled: true },
          { key: "quarter", label: "1/4磅", price: 220, enabled: false },
          { key: "", label: "", price: 0, enabled: true },
        ],
      },
      "admin-user",
    );

    expect(enabledSpecs).toEqual([
      { key: "half", label: "半磅", price: 420, enabled: true },
    ]);
    expect(payload).toMatchObject({
      userId: "admin-user",
      id: 42,
      category: "咖啡豆",
      name: "日曬處理",
      price: 420,
      enabled: true,
    });
    expect(JSON.parse(payload.specs)).toEqual([
      { key: "half", label: "半磅", price: 420, enabled: true },
      { key: "quarter", label: "1/4磅", price: 220, enabled: false },
    ]);
  });

  it("preserves product fields when toggling enabled state", () => {
    expect(buildToggleProductEnabledPayload(
      {
        id: "7",
        category: "耳掛",
        name: "谷吉",
        description: "花香",
        price: 55,
        weight: "10g",
        origin: "衣索比亞",
        roastLevel: "淺焙",
        specs: "[{}]",
        imageUrl: "/beans.png",
        enabled: true,
      },
      "admin-user",
      false,
    )).toEqual({
      userId: "admin-user",
      id: 7,
      category: "耳掛",
      name: "谷吉",
      description: "花香",
      price: 55,
      weight: "10g",
      origin: "衣索比亞",
      roastLevel: "淺焙",
      specs: "[{}]",
      imageUrl: "/beans.png",
      enabled: false,
    });
  });
});
