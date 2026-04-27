import { describe, expect, it } from "vitest";
import {
  getDefaultTrackingUrl,
  normalizeTrackingUrl,
  TRACKING_PROVIDER_PRESETS,
} from "./trackingUrls.ts";

describe("trackingUrls", () => {
  it("normalizes only http and https tracking URLs", () => {
    expect(normalizeTrackingUrl(" https://example.com/track?id=1 ")).toBe(
      "https://example.com/track?id=1",
    );
    expect(normalizeTrackingUrl("javascript:alert(1)")).toBe("");
    expect(normalizeTrackingUrl("ftp://example.com/file")).toBe("");
  });

  it("resolves default tracking URLs by delivery method", () => {
    expect(getDefaultTrackingUrl("seven_eleven")).toBe(
      "https://eservice.7-11.com.tw/e-tracking/search.aspx",
    );
    expect(getDefaultTrackingUrl("family_mart")).toBe(
      "https://fmec.famiport.com.tw/FP_Entrance/QueryBox",
    );
    expect(getDefaultTrackingUrl("home_delivery")).toBe(
      "https://postserv.post.gov.tw/pstmail/main_mail.html",
    );
    expect(getDefaultTrackingUrl("in_store")).toBe("");
  });

  it("exposes selectable dashboard tracking provider presets", () => {
    expect(TRACKING_PROVIDER_PRESETS).toEqual([
      {
        id: "seven_eleven",
        label: "7-11",
        url: "https://eservice.7-11.com.tw/e-tracking/search.aspx",
      },
      {
        id: "family_mart",
        label: "全家",
        url: "https://fmec.famiport.com.tw/FP_Entrance/QueryBox",
      },
      {
        id: "post",
        label: "中華郵政",
        url: "https://postserv.post.gov.tw/pstmail/main_mail.html",
      },
    ]);
  });
});
