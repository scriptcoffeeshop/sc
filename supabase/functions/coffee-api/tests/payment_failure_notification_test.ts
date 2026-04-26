import { assertEquals } from "@std/assert";
import { buildAdminPaymentFailureFlexMessage } from "../api/payment-shared.ts";
import { asJsonRecord } from "../utils/json.ts";

Deno.test("buildAdminPaymentFailureFlexMessage includes payment failure context", () => {
  const message = buildAdminPaymentFailureFlexMessage({
    orderId: "C20260426-ABC123",
    paymentMethod: "jkopay",
    phase: "request",
    reason: "街口支付建單失敗: code=999",
    providerStatusCode: "999",
    siteTitle: "Script Coffee",
    lineName: "測試客戶",
    total: 420,
  });

  assertEquals(message.type, "flex");
  assertEquals(message.altText, "街口支付 付款失敗：C20260426-ABC123");

  const contents = asJsonRecord(message.contents);
  const header = asJsonRecord(contents.header);
  assertEquals(header.backgroundColor, "#B42318");

  const body = asJsonRecord(contents.body);
  const rows = Array.isArray(body.contents) ? body.contents : [];
  const joined = JSON.stringify(rows);
  assertEquals(joined.includes("C20260426-ABC123"), true);
  assertEquals(joined.includes("建立付款請求"), true);
  assertEquals(joined.includes("街口支付建單失敗: code=999"), true);
});
