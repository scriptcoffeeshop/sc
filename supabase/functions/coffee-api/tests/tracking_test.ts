import { assertEquals } from "@std/assert";
import {
  getDefaultTrackingUrl,
  normalizeTrackingUrl,
} from "../utils/tracking.ts";

Deno.test("Tracking URL helpers - normalize custom URLs", () => {
  assertEquals(
    normalizeTrackingUrl(" https://example.com/track?id=123 "),
    "https://example.com/track?id=123",
  );
  assertEquals(normalizeTrackingUrl("javascript:alert(1)"), "");
  assertEquals(normalizeTrackingUrl("ftp://example.com/file"), "");
});

Deno.test("Tracking URL helpers - resolve delivery defaults", () => {
  assertEquals(
    getDefaultTrackingUrl("seven_eleven"),
    "https://eservice.7-11.com.tw/e-tracking/search.aspx",
  );
  assertEquals(
    getDefaultTrackingUrl("home_delivery"),
    "https://postserv.post.gov.tw/pstmail/main_mail.html?targetTxn=EB500100",
  );
  assertEquals(getDefaultTrackingUrl("in_store"), "");
});
