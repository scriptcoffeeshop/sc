import { assertEquals, assertExists } from "@std/assert";
import { signJwt } from "../../utils/auth.ts";
import { asJsonRecord } from "../../utils/json.ts";

const shouldRun = Deno.env.get("RUN_SUPABASE_INTEGRATION") === "1";
const apiUrl = Deno.env.get("COFFEE_API_INTEGRATION_URL") ||
  "http://127.0.0.1:54321/functions/v1/coffee-api";

async function callApi(
  action: string,
  token: string,
  body: Record<string, unknown> = {},
) {
  const url = new URL(apiUrl);
  url.searchParams.set("action", action);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  return {
    status: response.status,
    body: asJsonRecord(payload),
  };
}

Deno.test({
  name:
    "Supabase local golden path: submit order, confirm payment, query order",
  ignore: !shouldRun,
  async fn() {
    const customerToken = await signJwt({ userId: "integration-user" });
    const adminToken = await signJwt({ userId: "integration-admin" });

    const submit = await callApi("submitOrder", customerToken, {
      lineName: "整合測試顧客",
      phone: "0912000000",
      email: "integration@example.com",
      items: [{ productId: 9101, specKey: "single", qty: 1 }],
      deliveryMethod: "in_store",
      paymentMethod: "transfer",
      transferTargetAccount: "013-111122223333",
      transferAccountLast5: "12345",
      idempotencyKey: crypto.randomUUID(),
    });

    assertEquals(submit.status, 200);
    assertEquals(submit.body.success, true);
    const orderId = String(submit.body.orderId || "");
    assertExists(orderId);

    const confirmPayment = await callApi("updateOrderStatus", adminToken, {
      orderId,
      status: "processing",
      paymentStatus: "paid",
    });
    assertEquals(confirmPayment.status, 200);
    assertEquals(confirmPayment.body.success, true);

    const myOrders = await callApi("getMyOrders", customerToken, {
      page: 1,
      pageSize: 5,
    });
    assertEquals(myOrders.status, 200);
    assertEquals(myOrders.body.success, true);
    const orders = Array.isArray(myOrders.body.orders)
      ? myOrders.body.orders.map(asJsonRecord)
      : [];
    const createdOrder = orders.find((order) => order.orderId === orderId);
    assertExists(createdOrder);
    assertEquals(createdOrder.paymentStatus, "paid");
    assertEquals(createdOrder.status, "processing");
  },
});
