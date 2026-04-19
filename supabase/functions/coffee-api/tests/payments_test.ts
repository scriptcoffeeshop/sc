import { assertEquals } from "@std/assert";
import {
  isPaymentExpired,
  normalizePaymentStatus,
  parseIsoDate,
  parseReceiptInfo,
  timingSafeEqual,
} from "../api/payments.ts";
import {
  hmacSha256Hex,
  mapJkoStatusCodeToPaymentStatus,
  parseJkoStatusCode,
} from "../utils/jkopay.ts";

// 由於 Supabase JS client 在 module 載入時會產生 keepalive timer，
// 在測試 runner 中會隨機觸發 false-positive leak 偵測。
// 使用統一的 sanitizer 設定以避免此問題。
const t = (
  name: string,
  fn: () => void | Promise<void>,
) =>
  Deno.test({
    name,
    sanitizeOps: false,
    sanitizeResources: false,
    fn,
  });

// ============================================
// timingSafeEqual — 字串安全比較
// ============================================

t("timingSafeEqual - 兩個相同字串應回傳 true", () => {
  assertEquals(timingSafeEqual("abc", "abc"), true);
});

t("timingSafeEqual - 兩個不同字串應回傳 false", () => {
  assertEquals(timingSafeEqual("abc", "abd"), false);
});

t("timingSafeEqual - 長度不同應回傳 false", () => {
  assertEquals(timingSafeEqual("abc", "abcd"), false);
});

t("timingSafeEqual - 空字串比較應回傳 true", () => {
  assertEquals(timingSafeEqual("", ""), true);
});

t("timingSafeEqual - 空字串與非空字串應回傳 false", () => {
  assertEquals(timingSafeEqual("", "a"), false);
});

t("timingSafeEqual - HMAC-like hex 字串比較", () => {
  const hex =
    "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2";
  assertEquals(timingSafeEqual(hex, hex), true);
  const altered =
    "b1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2";
  assertEquals(timingSafeEqual(hex, altered), false);
});

// ============================================
// normalizePaymentStatus — 付款狀態正規化
// ============================================

t("normalizePaymentStatus - 正常值原樣回傳", () => {
  assertEquals(normalizePaymentStatus("paid"), "paid");
  assertEquals(normalizePaymentStatus("pending"), "pending");
  assertEquals(normalizePaymentStatus("processing"), "processing");
  assertEquals(normalizePaymentStatus("failed"), "failed");
  assertEquals(normalizePaymentStatus("expired"), "expired");
  assertEquals(normalizePaymentStatus("refunded"), "refunded");
});

t("normalizePaymentStatus - 空值與 null 回退為 fallback", () => {
  assertEquals(normalizePaymentStatus(""), "pending");
  assertEquals(normalizePaymentStatus(null), "pending");
  assertEquals(normalizePaymentStatus(undefined), "pending");
});

t("normalizePaymentStatus - 自訂 fallback 值", () => {
  assertEquals(normalizePaymentStatus("", "unknown"), "unknown");
  assertEquals(normalizePaymentStatus(null, "none"), "none");
});

t("normalizePaymentStatus - 前後空白會被移除", () => {
  assertEquals(normalizePaymentStatus("  paid  "), "paid");
  assertEquals(normalizePaymentStatus("  "), "pending");
});

// ============================================
// parseIsoDate — ISO 日期解析
// ============================================

t("parseIsoDate - 標準 ISO 字串應正確解析", () => {
  const result = parseIsoDate("2026-04-18T12:00:00Z");
  assertEquals(result instanceof Date, true);
  assertEquals(result!.toISOString(), "2026-04-18T12:00:00.000Z");
});

t("parseIsoDate - 無效字串應回傳 null", () => {
  assertEquals(parseIsoDate("not-a-date"), null);
  assertEquals(parseIsoDate("abc123"), null);
});

t("parseIsoDate - 空值與 null 應回傳 null", () => {
  assertEquals(parseIsoDate(""), null);
  assertEquals(parseIsoDate(null), null);
  assertEquals(parseIsoDate(undefined), null);
});

t("parseIsoDate - 有時區偏移的日期應正確解析", () => {
  const result = parseIsoDate("2026-04-18T20:00:00+08:00");
  assertEquals(result instanceof Date, true);
  assertEquals(result!.toISOString(), "2026-04-18T12:00:00.000Z");
});

// ============================================
// isPaymentExpired — 付款逾期判定
// ============================================

t("isPaymentExpired - 截止時間已過應回傳 true", () => {
  const now = new Date("2026-04-18T13:00:00Z");
  assertEquals(isPaymentExpired("2026-04-18T12:00:00Z", now), true);
});

t("isPaymentExpired - 截止時間尚未到應回傳 false", () => {
  const now = new Date("2026-04-18T11:00:00Z");
  assertEquals(isPaymentExpired("2026-04-18T12:00:00Z", now), false);
});

t("isPaymentExpired - 截止時間等於現在應回傳 true", () => {
  const now = new Date("2026-04-18T12:00:00Z");
  assertEquals(isPaymentExpired("2026-04-18T12:00:00Z", now), true);
});

t("isPaymentExpired - 空截止時間應回傳 false", () => {
  const now = new Date("2026-04-18T12:00:00Z");
  assertEquals(isPaymentExpired("", now), false);
  assertEquals(isPaymentExpired(null, now), false);
  assertEquals(isPaymentExpired(undefined, now), false);
});

t("isPaymentExpired - 無效日期格式應回傳 false", () => {
  const now = new Date("2026-04-18T12:00:00Z");
  assertEquals(isPaymentExpired("not-a-date", now), false);
});

// ============================================
// parseReceiptInfo — 收據資訊解析
// ============================================

t("parseReceiptInfo - JSON 字串應正確解析", () => {
  const result = parseReceiptInfo('{"taxId":"12345678","buyer":"測試公司"}');
  assertEquals(result !== null, true);
  assertEquals(result!.taxId, "12345678");
  assertEquals(result!.buyer, "測試公司");
});

t("parseReceiptInfo - 物件應直接回傳", () => {
  const obj = { taxId: "87654321" };
  const result = parseReceiptInfo(obj);
  assertEquals(result, obj);
});

t("parseReceiptInfo - 空值應回傳 null", () => {
  assertEquals(parseReceiptInfo(null), null);
  assertEquals(parseReceiptInfo(undefined), null);
  assertEquals(parseReceiptInfo(""), null);
  assertEquals(parseReceiptInfo("   "), null);
});

t("parseReceiptInfo - 陣列應回傳 null", () => {
  assertEquals(parseReceiptInfo([1, 2, 3]), null);
  assertEquals(parseReceiptInfo("[]"), null);
});

t("parseReceiptInfo - 不合法 JSON 字串應回傳 null", () => {
  assertEquals(parseReceiptInfo("{invalid json}"), null);
  assertEquals(parseReceiptInfo("123"), null);
  assertEquals(parseReceiptInfo('"just a string"'), null);
});

// ============================================
// parseJkoStatusCode — 街口狀態碼解析
// ============================================

t("parseJkoStatusCode - 數字字串應正確解析", () => {
  assertEquals(parseJkoStatusCode("0"), 0);
  assertEquals(parseJkoStatusCode("100"), 100);
  assertEquals(parseJkoStatusCode("101"), 101);
  assertEquals(parseJkoStatusCode("102"), 102);
});

t("parseJkoStatusCode - 數字直接回傳", () => {
  assertEquals(parseJkoStatusCode(0), 0);
  assertEquals(parseJkoStatusCode(100), 100);
});

t("parseJkoStatusCode - 空值與無效值應回傳 null", () => {
  assertEquals(parseJkoStatusCode(null), null);
  assertEquals(parseJkoStatusCode(undefined), null);
  assertEquals(parseJkoStatusCode(""), null);
  assertEquals(parseJkoStatusCode("abc"), null);
});

// ============================================
// mapJkoStatusCodeToPaymentStatus — 街口狀態碼對應
// （此測試與 smoke_test 重複但此處完整覆蓋邊界值）
// ============================================

t("mapJkoStatusCodeToPaymentStatus - 官方狀態碼對應", () => {
  assertEquals(mapJkoStatusCodeToPaymentStatus(0), "paid");
  assertEquals(mapJkoStatusCodeToPaymentStatus(100), "failed");
  assertEquals(mapJkoStatusCodeToPaymentStatus(101), "pending");
  assertEquals(mapJkoStatusCodeToPaymentStatus(102), "pending");
});

t("mapJkoStatusCodeToPaymentStatus - null 視為 processing", () => {
  assertEquals(mapJkoStatusCodeToPaymentStatus(null), "processing");
});

t("mapJkoStatusCodeToPaymentStatus - 未知代碼視為 processing", () => {
  assertEquals(mapJkoStatusCodeToPaymentStatus(999), "processing");
  assertEquals(mapJkoStatusCodeToPaymentStatus(-1), "processing");
  assertEquals(mapJkoStatusCodeToPaymentStatus(50), "processing");
});

// ============================================
// hmacSha256Hex — HMAC-SHA256 簽章
// ============================================

t("hmacSha256Hex - 應產生 64 字元小寫 hex 字串", async () => {
  const result = await hmacSha256Hex("test-payload", "test-secret");
  assertEquals(result.length, 64);
  assertEquals(/^[0-9a-f]{64}$/.test(result), true);
});

t("hmacSha256Hex - 相同輸入應產生相同輸出", async () => {
  const a = await hmacSha256Hex("order-123", "secret-key");
  const b = await hmacSha256Hex("order-123", "secret-key");
  assertEquals(a, b);
});

t("hmacSha256Hex - 不同 payload 應產生不同輸出", async () => {
  const a = await hmacSha256Hex("order-123", "secret-key");
  const b = await hmacSha256Hex("order-456", "secret-key");
  assertEquals(a !== b, true);
});

t("hmacSha256Hex - 不同 secret 應產生不同輸出", async () => {
  const a = await hmacSha256Hex("same-payload", "key-a");
  const b = await hmacSha256Hex("same-payload", "key-b");
  assertEquals(a !== b, true);
});

t("hmacSha256Hex - 空 payload 仍應產生有效 hash", async () => {
  const result = await hmacSha256Hex("", "secret");
  assertEquals(result.length, 64);
  assertEquals(/^[0-9a-f]{64}$/.test(result), true);
});

// ============================================
// 金流狀態轉換邏輯（整合場景）
// ============================================

t("金流整合 - JKO 狀態碼 parse + map 串聯", () => {
  const rawCode = "0";
  const parsed = parseJkoStatusCode(rawCode);
  assertEquals(parsed, 0);
  const mapped = mapJkoStatusCodeToPaymentStatus(parsed);
  assertEquals(mapped, "paid");
});

t("金流整合 - 逾期判定 + 狀態正規化串聯", () => {
  const expiresAt = "2026-04-18T10:00:00Z";
  const now = new Date("2026-04-18T12:00:00Z");
  const expired = isPaymentExpired(expiresAt, now);
  assertEquals(expired, true);

  const status = normalizePaymentStatus(expired ? "expired" : "pending");
  assertEquals(status, "expired");
});

t("金流整合 - 未逾期時保持 pending 狀態", () => {
  const expiresAt = "2026-04-18T23:59:59Z";
  const now = new Date("2026-04-18T12:00:00Z");
  const expired = isPaymentExpired(expiresAt, now);
  assertEquals(expired, false);

  const status = normalizePaymentStatus(expired ? "expired" : "pending");
  assertEquals(status, "pending");
});

t("金流整合 - HMAC 簽章驗證完整流程", async () => {
  const orderId = "C20260418-ABCD1234";
  const secret = "jkopay-test-secret";
  const payload = `jkopay-callback:${orderId}`;
  const signature = await hmacSha256Hex(payload, secret);

  // 模擬驗證：相同 payload+secret 產生的簽章應 match
  const expected = await hmacSha256Hex(payload, secret);
  assertEquals(timingSafeEqual(signature, expected), true);

  // 偽造簽章應失敗
  const forged =
    "0000000000000000000000000000000000000000000000000000000000000000";
  assertEquals(timingSafeEqual(signature, forged), false);
});
