import { describe, expect, it } from "vitest";
import { formatDateTimeText } from "./dateTime.ts";

describe("formatDateTimeText", () => {
  it("formats valid date-like values for zh-TW", () => {
    expect(formatDateTimeText("2026-04-25T01:02:03Z")).toContain("2026");
  });

  it("returns empty text for blank or invalid values", () => {
    expect(formatDateTimeText("")).toBe("");
    expect(formatDateTimeText("not-a-date")).toBe("");
  });
});
