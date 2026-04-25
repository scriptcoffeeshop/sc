import { describe, expect, it } from "vitest";
import { getDefaultTrackingUrl, normalizeTrackingUrl } from "./trackingUrls.ts";

describe("trackingUrls", () => {
  it("normalizes only http and https tracking URLs", () => {
    expect(normalizeTrackingUrl(" https://example.com/track?id=1 ")).toBe(
      "https://example.com/track?id=1",
    );
    expect(normalizeTrackingUrl("javascript:alert(1)")).toBe("");
    expect(normalizeTrackingUrl("ftp://example.com/file")).toBe("");
  });

  it("resolves default tracking URLs by delivery method", () => {
    expect(getDefaultTrackingUrl("seven_eleven")).toContain("e-tracking");
    expect(getDefaultTrackingUrl("family_mart")).toContain("famiport");
    expect(getDefaultTrackingUrl("home_delivery")).toContain("postserv");
    expect(getDefaultTrackingUrl("in_store")).toBe("");
  });
});
