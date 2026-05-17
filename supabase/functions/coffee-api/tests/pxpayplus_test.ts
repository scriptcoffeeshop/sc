import { assertEquals, assertRejects } from "@std/assert";
import {
  buildPxPayPlusCreateOrderSignPayload,
  buildPxPayPlusPaymentMetadataUpdates,
  buildPxPayPlusPaymentNotifySignPayload,
  buildPxPayPlusQueryOrderSignPayload,
  buildPxPayPlusRefundSignPayload,
  formatPxPayPlusReqTime,
  hasValidPxPayPlusSignValue,
  hmacSha256UpperHexWithHexKey,
  mapPxPayPlusPayStatusToPaymentStatus,
  parsePxPayPlusPayStatus,
} from "../utils/pxpayplus.ts";

Deno.test("PxPayPlus HMAC uses hex secret bytes and upper-case output", async () => {
  const signature = await hmacSha256UpperHexWithHexKey(
    "QW20210101000032120180301230111",
    "541AA5BE3ABFC734785020541B0D83E4BB608B5E383FF3041E213C1AB647D518",
  );

  assertEquals(
    signature,
    "882C8DDC6E7EC3E23229CE00A2083F0FAF10C0CA3EAC67B31291AB95D2579D56",
  );
});

Deno.test("PxPayPlus signature verification is case-insensitive but payload-bound", async () => {
  const secret =
    "541AA5BE3ABFC734785020541B0D83E4BB608B5E383FF3041E213C1AB647D518";
  const signature =
    "882c8ddc6e7ec3e23229ce00a2083f0faf10c0ca3eac67b31291ab95d2579d56";

  assertEquals(
    await hasValidPxPayPlusSignValue(
      "QW20210101000032120180301230111",
      signature,
      secret,
    ),
    true,
  );
  assertEquals(
    await hasValidPxPayPlusSignValue("different-payload", signature, secret),
    false,
  );
});

Deno.test("PxPayPlus HMAC rejects invalid hex secret", async () => {
  await assertRejects(
    () => hmacSha256UpperHexWithHexKey("payload", "not-hex"),
    Error,
    "16 進位",
  );
});

Deno.test("PxPayPlus request time formats in Taiwan timezone", () => {
  assertEquals(
    formatPxPayPlusReqTime(new Date("2026-05-17T01:02:03.000Z")),
    "20260517090203",
  );
});

Deno.test("PxPayPlus sign payload builders follow the EC spec order", () => {
  assertEquals(
    buildPxPayPlusCreateOrderSignPayload({
      merTradeNo: "QW20210101000032",
      amount: 300,
      deviceType: 1,
      reqTime: "20211227153030",
      storeId: "A01",
    }),
    "QW20210101000032300120211227153030A01",
  );

  assertEquals(
    buildPxPayPlusPaymentNotifySignPayload({
      merTradeNo: "QW20210101000032",
      transactionId: "20210304000001",
      pxTradeNo: "PXO023892398239",
      reqTime: "20211227153030",
    }),
    "QW2021010100003220210304000001PXO02389239823920211227153030",
  );

  assertEquals(
    buildPxPayPlusRefundSignPayload({
      merTradeNo: "202101230000002",
      pxTradeNo: "PXO023892398239",
      tradeTime: "20210101093922",
      refundMerTradeNo: "202101230000001",
      amount: 300,
      reqTime: "20211227153030",
    }),
    "202101230000002PXO0238923982392021010109392220210123000000130020211227153030",
  );

  assertEquals(
    buildPxPayPlusQueryOrderSignPayload({
      tradeNoType: "Merchant",
      tradeNo: "QW20210101000032",
      reqTime: "20211227153030",
    }),
    "MerchantQW2021010100003220211227153030",
  );
});

Deno.test("PxPayPlus pay_status maps to internal payment statuses", () => {
  assertEquals(parsePxPayPlusPayStatus("1"), 1);
  assertEquals(parsePxPayPlusPayStatus(""), null);
  assertEquals(parsePxPayPlusPayStatus("abc"), null);

  assertEquals(mapPxPayPlusPayStatusToPaymentStatus(0), "pending");
  assertEquals(mapPxPayPlusPayStatusToPaymentStatus(1), "paid");
  assertEquals(mapPxPayPlusPayStatusToPaymentStatus(2), "cancelled");
  assertEquals(mapPxPayPlusPayStatusToPaymentStatus(3), "failed");
  assertEquals(mapPxPayPlusPayStatusToPaymentStatus(null), "processing");
});

Deno.test("PxPayPlus metadata updates preserve refund-critical provider fields", () => {
  const updates = buildPxPayPlusPaymentMetadataUpdates({
    statusCode: "0000",
    payStatus: 1,
    transactionId: "20210304000001",
    pxTradeNo: "PXO023892398239",
    tradeTime: "20210304170022",
    amount: 300,
    tradeAmount: 277,
    discountAmount: 23,
    invoCarrier: "/NFVIAZP",
    providerPayload: { status_code: "0000" },
  }, "2026-05-17T09:00:00.000Z");

  assertEquals(updates.payment_status, "paid");
  assertEquals(updates.payment_id, "20210304000001");
  assertEquals(updates.payment_provider_transaction_id, "20210304000001");
  assertEquals(updates.payment_provider_trade_no, "PXO023892398239");
  assertEquals(updates.payment_provider_trade_time, "20210304170022");
  assertEquals(updates.payment_trade_amount, 277);
  assertEquals(updates.payment_discount_amount, 23);
  assertEquals(updates.payment_invo_carrier, "/NFVIAZP");
  assertEquals(updates.payment_confirmed_at, "2026-05-17T09:00:00.000Z");
});
