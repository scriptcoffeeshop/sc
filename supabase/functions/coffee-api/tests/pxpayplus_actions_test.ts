import { assertEquals } from "@std/assert";
import {
  pxPayPlusOrderStatus,
  pxPayPlusPaymentNotify,
  pxPayPlusRefund,
} from "../api/payments.ts";
import { signJwt } from "../utils/auth.ts";
import type { JsonRecord } from "../utils/json.ts";
import {
  buildPxPayPlusOrderStatusSignPayload,
  buildPxPayPlusPaymentNotifySignPayload,
  hmacSha256UpperHexWithHexKey,
} from "../utils/pxpayplus.ts";
import { withMockedSupabaseTables } from "./test-support.ts";

const TEST_SECRET_KEY =
  "541AA5BE3ABFC734785020541B0D83E4BB608B5E383FF3041E213C1AB647D518";

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

async function withPxPayPlusSecret(fn: () => Promise<void>) {
  const previousSecret = Deno.env.get("PXPAYPLUS_SECRET_KEY");
  Deno.env.set("PXPAYPLUS_SECRET_KEY", TEST_SECRET_KEY);
  try {
    await fn();
  } finally {
    if (previousSecret === undefined) {
      Deno.env.delete("PXPAYPLUS_SECRET_KEY");
    } else {
      Deno.env.set("PXPAYPLUS_SECRET_KEY", previousSecret);
    }
  }
}

async function withPxPayPlusApiEnv(fn: () => Promise<void>) {
  const previousEnv = {
    merchantCode: Deno.env.get("PXPAYPLUS_MERCHANT_CODE"),
    merchantEnName: Deno.env.get("PXPAYPLUS_MERCHANT_EN_NAME"),
    secretKey: Deno.env.get("PXPAYPLUS_SECRET_KEY"),
    baseUrl: Deno.env.get("PXPAYPLUS_BASE_URL"),
    proxyUrl: Deno.env.get("PXPAYPLUS_PROXY_URL"),
  };
  Deno.env.set("PXPAYPLUS_MERCHANT_CODE", "M0002278");
  Deno.env.set("PXPAYPLUS_MERCHANT_EN_NAME", "scriptcoffee");
  Deno.env.set("PXPAYPLUS_SECRET_KEY", TEST_SECRET_KEY);
  Deno.env.set("PXPAYPLUS_BASE_URL", "https://pxpay.example/px-ec");
  Deno.env.delete("PXPAYPLUS_PROXY_URL");
  try {
    await fn();
  } finally {
    for (
      const [key, value] of [
        ["PXPAYPLUS_MERCHANT_CODE", previousEnv.merchantCode],
        ["PXPAYPLUS_MERCHANT_EN_NAME", previousEnv.merchantEnName],
        ["PXPAYPLUS_SECRET_KEY", previousEnv.secretKey],
        ["PXPAYPLUS_BASE_URL", previousEnv.baseUrl],
        ["PXPAYPLUS_PROXY_URL", previousEnv.proxyUrl],
      ] as const
    ) {
      if (value === undefined) {
        Deno.env.delete(key);
      } else {
        Deno.env.set(key, value);
      }
    }
  }
}

async function signedRequest(
  url: string,
  payload: string,
  method = "GET",
): Promise<Request> {
  const signature = await hmacSha256UpperHexWithHexKey(
    payload,
    TEST_SECRET_KEY,
  );
  return new Request(url, {
    method,
    headers: { "PX-SignValue": signature },
  });
}

t("全支付 OrderStatus - 合法簽章回覆商戶訂單付款狀態", async () => {
  await withPxPayPlusSecret(async () => {
    const transactionId = "20210304000001";
    const reqTime = "20211227153030";
    const request = await signedRequest(
      "https://example.com/?action=pxPayPlusOrderStatus",
      buildPxPayPlusOrderStatusSignPayload({ transactionId, reqTime }),
    );

    await withMockedSupabaseTables({
      coffee_orders: [{
        id: "C20260517-PX0001",
        status: "pending",
        payment_method: "pxpayplus",
        payment_status: "pending",
        payment_id: "",
        payment_provider_transaction_id: transactionId,
      }],
    }, async (tables) => {
      const result = await pxPayPlusOrderStatus(
        { transaction_id: transactionId, req_time: reqTime },
        request,
      );

      if (result instanceof Response) {
        throw new Error("expected JSON order status response");
      }
      assertEquals(result.mer_trade_no, "C20260517-PX0001");
      assertEquals(result.transaction_id, transactionId);
      assertEquals(result.pay_status, 0);
      assertEquals(tables.coffee_orders[0].payment_status, "pending");
    });
  });
});

t("全支付 OrderStatus - 偽造簽章不揭露訂單狀態", async () => {
  await withPxPayPlusSecret(async () => {
    const transactionId = "20210304000002";
    const reqTime = "20211227153030";
    const request = new Request(
      "https://example.com/?action=pxPayPlusOrderStatus",
      { headers: { "PX-SignValue": "forged-signature" } },
    );

    await withMockedSupabaseTables({
      coffee_orders: [{
        id: "C20260517-PX0002",
        status: "pending",
        payment_method: "pxpayplus",
        payment_status: "pending",
        payment_provider_transaction_id: transactionId,
      }],
    }, async (tables) => {
      const result = await pxPayPlusOrderStatus(
        { transaction_id: transactionId, req_time: reqTime },
        request,
      );

      if (!(result instanceof Response)) {
        throw new Error("expected forged signature to return Response");
      }
      assertEquals(result.status, 401);
      const body = await result.json();
      assertEquals(body.success, false);
      assertEquals(body.error, "全支付簽章驗證失敗");
      assertEquals(tables.coffee_orders[0].payment_status, "pending");
    });
  });
});

t("全支付 PaymentNotify - 合法通知會寫入交易與付款中繼資料", async () => {
  await withPxPayPlusSecret(async () => {
    const payload = {
      mer_trade_no: "C20260517-PX0003",
      transaction_id: "20210304000003",
      px_trade_no: "PXO023892398239",
      trade_time: "20210304170022",
      amount: 300,
      trade_amount: 277,
      discount_amount: 23,
      invo_carrier: "/NFVIAZP",
      req_time: "20211227153030",
    };
    const request = await signedRequest(
      "https://example.com/?action=pxPayPlusPaymentNotify",
      buildPxPayPlusPaymentNotifySignPayload({
        merTradeNo: payload.mer_trade_no,
        transactionId: payload.transaction_id,
        pxTradeNo: payload.px_trade_no,
        reqTime: payload.req_time,
      }),
      "POST",
    );

    await withMockedSupabaseTables({
      coffee_orders: [{
        id: payload.mer_trade_no,
        total: 300,
        status: "pending",
        line_user_id: "",
        payment_method: "pxpayplus",
        payment_status: "pending",
        payment_id: "",
        payment_confirmed_at: "",
        payment_provider_status_code: "",
        payment_provider_transaction_id: "",
        payment_provider_trade_no: "",
      }],
    }, async (tables) => {
      const response = await pxPayPlusPaymentNotify(payload, request);

      assertEquals(response.status, 200);
      assertEquals(await response.text(), "");
      const order = tables.coffee_orders[0];
      assertEquals(order.payment_status, "paid");
      assertEquals(order.payment_id, payload.transaction_id);
      assertEquals(
        order.payment_provider_transaction_id,
        payload.transaction_id,
      );
      assertEquals(order.payment_provider_trade_no, payload.px_trade_no);
      assertEquals(order.payment_provider_trade_time, payload.trade_time);
      assertEquals(order.payment_trade_amount, 277);
      assertEquals(order.payment_discount_amount, 23);
      assertEquals(order.payment_invo_carrier, "/NFVIAZP");
      assertEquals(order.payment_provider_status_code, "0000");
    });
  });
});

t("全支付 PaymentNotify - 金額不一致時拒絕更新付款狀態", async () => {
  await withPxPayPlusSecret(async () => {
    const payload = {
      mer_trade_no: "C20260517-PX0004",
      transaction_id: "20210304000004",
      px_trade_no: "PXO023892398240",
      trade_time: "20210304170022",
      amount: 299,
      trade_amount: 299,
      discount_amount: 0,
      req_time: "20211227153030",
    };
    const request = await signedRequest(
      "https://example.com/?action=pxPayPlusPaymentNotify",
      buildPxPayPlusPaymentNotifySignPayload({
        merTradeNo: payload.mer_trade_no,
        transactionId: payload.transaction_id,
        pxTradeNo: payload.px_trade_no,
        reqTime: payload.req_time,
      }),
      "POST",
    );

    await withMockedSupabaseTables({
      coffee_orders: [{
        id: payload.mer_trade_no,
        total: 300,
        status: "pending",
        payment_method: "pxpayplus",
        payment_status: "pending",
        payment_id: "",
        payment_provider_transaction_id: "",
        payment_provider_trade_no: "",
      }],
    }, async (tables) => {
      const response = await pxPayPlusPaymentNotify(payload, request);

      assertEquals(response.status, 422);
      const body = await response.json();
      assertEquals(body.success, false);
      assertEquals(body.error, "全支付通知金額不一致");
      assertEquals(tables.coffee_orders[0].payment_status, "pending");
      assertEquals(tables.coffee_orders[0].payment_id, "");
      assertEquals(tables.coffee_orders[0].payment_provider_trade_no, "");
    });
  });
});

t("全支付 Refund - 管理員可對已付款訂單送出全額退款", async () => {
  await withPxPayPlusApiEnv(async () => {
    const originalFetch = globalThis.fetch;
    const refundRequests: JsonRecord[] = [];
    globalThis.fetch = async (
      input: RequestInfo | URL,
      init?: RequestInit,
    ) => {
      const url = String(input instanceof Request ? input.url : input);
      if (url.startsWith("https://pxpay.example/px-ec/Refund")) {
        const headers = new Headers(init?.headers);
        const requestBody = JSON.parse(String(init?.body || "{}"));
        refundRequests.push({
          method: init?.method || "GET",
          merCode: headers.get("PX-MerCode"),
          signValue: headers.get("PX-SignValue"),
          body: requestBody,
        });
        return new Response(
          JSON.stringify({
            status_code: "0000",
            status_message: "退款成功",
            refund_mer_trade_no: requestBody.refund_mer_trade_no,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      return await originalFetch(input, init);
    };

    try {
      await withMockedSupabaseTables({
        coffee_users: [{
          line_user_id: "admin-pxpayplus-refund",
          role: "ADMIN",
          status: "ACTIVE",
        }],
        coffee_orders: [{
          id: "C20260517-PX0005",
          total: 300,
          payment_trade_amount: 277,
          payment_method: "pxpayplus",
          payment_status: "paid",
          payment_provider_trade_no: "PXO023892398241",
          payment_provider_trade_time: "20210304170022",
          payment_refund_records: [],
        }],
      }, async (tables) => {
        const token = await signJwt({ userId: "admin-pxpayplus-refund" });
        const result = await pxPayPlusRefund(
          {
            orderId: "C20260517-PX0005",
            refundMerTradeNo: "RPX202605170001",
          },
          new Request("https://example.com/?action=pxPayPlusRefund", {
            method: "POST",
            headers: { authorization: `Bearer ${token}` },
          }),
        ) as JsonRecord;

        assertEquals(result.success, true);
        assertEquals(result.paymentStatus, "refunded");
        assertEquals(result.refundAmount, 277);
        assertEquals(refundRequests.length, 1);
        const request = refundRequests[0];
        assertEquals(request.method, "POST");
        assertEquals(request.merCode, "M0002278");
        assertEquals(String(request.signValue || "").length, 64);
        const body = request.body as JsonRecord;
        assertEquals(body.mer_trade_no, "C20260517-PX0005");
        assertEquals(body.px_trade_no, "PXO023892398241");
        assertEquals(body.trade_time, "20210304170022");
        assertEquals(body.refund_mer_trade_no, "RPX202605170001");
        assertEquals(body.amount, 277);

        const order = tables.coffee_orders[0];
        assertEquals(order.payment_status, "refunded");
        const records = order.payment_refund_records as JsonRecord[];
        assertEquals(records.length, 1);
        assertEquals(records[0].refundMerTradeNo, "RPX202605170001");
        assertEquals(records[0].amount, 277);
        assertEquals(records[0].statusCode, "0000");
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

t("全支付 Refund - 缺少交易單號或交易時間時不送出退款", async () => {
  await withPxPayPlusApiEnv(async () => {
    const originalFetch = globalThis.fetch;
    let fetchCalled = false;
    globalThis.fetch = async (
      input: RequestInfo | URL,
      init?: RequestInit,
    ) => {
      fetchCalled = true;
      return await originalFetch(input, init);
    };

    try {
      await withMockedSupabaseTables({
        coffee_users: [{
          line_user_id: "admin-pxpayplus-refund-missing",
          role: "ADMIN",
          status: "ACTIVE",
        }],
        coffee_orders: [{
          id: "C20260517-PX0006",
          total: 300,
          payment_method: "pxpayplus",
          payment_status: "paid",
          payment_provider_trade_no: "",
          payment_provider_trade_time: "",
          payment_refund_records: [],
        }],
      }, async (tables) => {
        const token = await signJwt({
          userId: "admin-pxpayplus-refund-missing",
        });
        const result = await pxPayPlusRefund(
          { orderId: "C20260517-PX0006" },
          new Request("https://example.com/?action=pxPayPlusRefund", {
            method: "POST",
            headers: { authorization: `Bearer ${token}` },
          }),
        ) as JsonRecord;

        assertEquals(result.success, false);
        assertEquals(result.error, "缺少全支付退款必要交易資料");
        assertEquals(fetchCalled, false);
        assertEquals(tables.coffee_orders[0].payment_status, "paid");
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
