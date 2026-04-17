import { assertEquals } from "std/testing/asserts";
import {
  calcPercentDiscountAmount,
  isPromotionActive,
  normalizeDiscountRate,
} from "../utils/promotion.ts";

// 由於 Supabase JS client 在 module 載入時會產生一個 timer，
// 第一個測試需關閉 sanitizer 以避免 false-positive leak 偵測。
Deno.test({
  name: "normalizeDiscountRate 支援 0.9 / 9 / 90 格式",
  sanitizeOps: false,
  sanitizeResources: false,
  fn() {
    assertEquals(normalizeDiscountRate(0.9), 0.9);
    assertEquals(normalizeDiscountRate(9), 0.9);
    assertEquals(normalizeDiscountRate(90), 0.9);
  },
});

Deno.test("calcPercentDiscountAmount 正確計算折扣金額", () => {
  assertEquals(calcPercentDiscountAmount(1000, 9), 100);
  assertEquals(calcPercentDiscountAmount(1000, 90), 100);
  assertEquals(calcPercentDiscountAmount(1000, 0.9), 100);
  assertEquals(calcPercentDiscountAmount(1000, 0), 0);
});

Deno.test("isPromotionActive 能處理起訖時間", () => {
  const now = new Date("2026-03-08T12:00:00.000Z");
  assertEquals(
    isPromotionActive(
      "2026-03-08T00:00:00.000Z",
      "2026-03-09T00:00:00.000Z",
      now,
    ),
    true,
  );
  assertEquals(
    isPromotionActive("2026-03-09T00:00:00.000Z", null, now),
    false,
  );
  assertEquals(
    isPromotionActive(null, "2026-03-07T23:59:59.000Z", now),
    false,
  );
  assertEquals(
    isPromotionActive("invalid-date", null, now),
    false,
  );
});
