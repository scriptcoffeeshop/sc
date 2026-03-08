import { assertEquals } from "std/testing/asserts";
import {
  calcPercentDiscountAmount,
  isPromotionActive,
  normalizeDiscountRate,
} from "../utils/promotion.ts";

Deno.test("normalizeDiscountRate 支援 0.9 / 9 / 90 格式", () => {
  assertEquals(normalizeDiscountRate(0.9), 0.9);
  assertEquals(normalizeDiscountRate(9), 0.9);
  assertEquals(normalizeDiscountRate(90), 0.9);
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
