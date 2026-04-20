import { assertEquals, assertStringIncludes } from "@std/assert";
import app from "../index.ts";
import { buildCustomFieldsHtml } from "../api/order-shared.ts";
import { signJwt } from "../utils/auth.ts";
import { withMockedSupabaseTables } from "./test-support.ts";

function buildActionRequest(
  action: string,
  options: {
    method?: "GET" | "POST";
    body?: Record<string, unknown>;
    headers?: HeadersInit;
  } = {},
): Request {
  const method = options.method || "GET";
  const headers = new Headers(options.headers);

  if (method === "GET") {
    return new Request(`https://example.com/?action=${action}`, {
      method,
      headers,
    });
  }

  headers.set("content-type", "application/json");
  return new Request("https://example.com/", {
    method,
    headers,
    body: JSON.stringify({
      action,
      ...(options.body || {}),
    }),
  });
}

Deno.test({
  name: "Routing Guards - write actions reject GET requests",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const response = await app.fetch(
      buildActionRequest("updateSettings", { method: "GET" }),
    );
    const payload = await response.json();

    assertEquals(response.status, 405);
    assertEquals(response.headers.get("Allow"), "POST");
    assertEquals(payload.success, false);
  },
});

Deno.test({
  name: "Routing Guards - LINE login callbacks require POST",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    for (const action of ["customerLineLogin", "lineLogin"]) {
      const response = await app.fetch(
        buildActionRequest(action, { method: "GET" }),
      );
      const payload = await response.json();

      assertEquals(response.status, 405);
      assertEquals(response.headers.get("Allow"), "POST");
      assertEquals(payload.success, false);
    }
  },
});

Deno.test({
  name: "Routing Guards - admin actions require authentication",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const response = await app.fetch(
      buildActionRequest("getOrders", { method: "GET" }),
    );
    const payload = await response.json();

    assertEquals(response.status, 401);
    assertEquals(payload.success, false);
    assertEquals(payload.error, "請先登入");
  },
});

Deno.test({
  name: "Routing Guards - non-admin users cannot call admin actions",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    await withMockedSupabaseTables({
      coffee_users: [{
        line_user_id: "user-non-admin",
        role: "USER",
        status: "ACTIVE",
      }],
    }, async () => {
      const token = await signJwt({ userId: "user-non-admin" });
      const headers = { authorization: `Bearer ${token}` };
      const cases = [
        buildActionRequest("getOrders", { method: "GET", headers }),
        buildActionRequest("addProduct", {
          method: "POST",
          headers,
          body: { category: "豆子", name: "測試豆", price: 220 },
        }),
        buildActionRequest("updateSettings", {
          method: "POST",
          headers,
          body: { settings: { site_title: "Script Coffee" } },
        }),
      ];

      for (const request of cases) {
        const response = await app.fetch(request);
        const payload = await response.json();
        assertEquals(response.status, 401);
        assertEquals(payload.success, false);
        assertEquals(payload.error, "權限不足");
      }
    });
  },
});

Deno.test({
  name: "Routing Guards - submitOrder has stricter action rate limit",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const headers = { "x-real-ip": `rate-limit-${crypto.randomUUID()}` };
    let response = await app.fetch(
      buildActionRequest("submitOrder", { method: "POST", headers }),
    );

    for (let i = 0; i < 5; i++) {
      response = await app.fetch(
        buildActionRequest("submitOrder", { method: "POST", headers }),
      );
    }

    const payload = await response.json();
    assertEquals(response.status, 429);
    assertEquals(response.headers.get("Retry-After") !== null, true);
    assertEquals(payload.success, false);
    assertEquals(payload.error, "操作過於頻繁，請稍後再試");
  },
});

Deno.test({
  name: "Routing Integration - submitOrder works against mocked database",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    await withMockedSupabaseTables({
      coffee_users: [{
        line_user_id: "user-submit-order",
        role: "USER",
        status: "ACTIVE",
        display_name: "原始名稱",
      }],
      coffee_products: [{
        id: 101,
        name: "測試配方豆",
        price: 220,
        specs: "",
        enabled: true,
      }],
      coffee_settings: [],
      coffee_promotions: [],
      coffee_orders: [],
      coffee_form_fields: [],
    }, async (tables) => {
      const token = await signJwt({ userId: "user-submit-order" });
      const response = await app.fetch(
        buildActionRequest("submitOrder", {
          method: "POST",
          headers: { authorization: `Bearer ${token}` },
          body: {
            lineName: "測試顧客",
            phone: "0912345678",
            items: [{ productId: 101, qty: 2 }],
            deliveryMethod: "in_store",
            paymentMethod: "cod",
            note: "少冰",
            customFields: JSON.stringify({
              grind: "手沖研磨",
              roast: "中焙",
            }),
            receiptInfo: {
              buyer: "測試公司",
              taxId: "12345678",
              address: "新竹市東區測試路 1 號",
              needDateStamp: true,
            },
          },
        }),
      );
      const payload = await response.json();

      assertEquals(response.status, 200);
      assertEquals(payload.success, true);
      assertEquals(typeof payload.orderId, "string");
      assertEquals(tables.coffee_orders.length, 1);

      const order = tables.coffee_orders[0];
      assertEquals(order.line_user_id, "user-submit-order");
      assertEquals(order.line_name, "測試顧客");
      assertEquals(order.payment_method, "cod");
      assertEquals(order.total, 220 * 2);
      assertEquals(order.status, "pending");
      assertEquals(order.items_json, [{
        productId: 101,
        productName: "測試配方豆",
        specKey: "",
        specLabel: "",
        qty: 2,
        unitPrice: 220,
        lineTotal: 440,
      }]);
      assertStringIncludes(String(order.items || ""), "測試配方豆 x 2");
      assertStringIncludes(String(order.items || ""), "運費: $0");
      assertEquals(String(order.note || ""), "少冰");
      assertEquals(order.custom_fields, {
        grind: "手沖研磨",
        roast: "中焙",
      });
      assertEquals(order.receipt_info, {
        buyer: "測試公司",
        taxId: "12345678",
        address: "新竹市東區測試路 1 號",
        needDateStamp: true,
      });
      assertEquals(String(order.id || ""), String(payload.orderId));

      const updatedUser = tables.coffee_users.find((row) =>
        row.line_user_id === "user-submit-order"
      );
      assertEquals(updatedUser?.display_name, "測試顧客");
      assertEquals(updatedUser?.phone, "0912345678");
      assertEquals(updatedUser?.default_payment_method, "cod");
      assertEquals(updatedUser?.default_delivery_method, "in_store");
      assertEquals(
        updatedUser?.default_custom_fields,
        JSON.stringify({
          grind: "手沖研磨",
          roast: "中焙",
        }),
      );
      assertEquals(
        updatedUser?.default_receipt_info,
        JSON.stringify({
          buyer: "測試公司",
          taxId: "12345678",
          address: "新竹市東區測試路 1 號",
          needDateStamp: true,
        }),
      );
    });
  },
});

Deno.test({
  name: "Order Shared - buildCustomFieldsHtml accepts JSONB objects",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    await withMockedSupabaseTables({
      coffee_form_fields: [{
        field_key: "grind",
        label: "研磨方式",
        enabled: true,
        sort_order: 1,
      }],
    }, async () => {
      const html = await buildCustomFieldsHtml({
        grind: "手沖研磨",
        roast: "中焙",
      });

      assertStringIncludes(html, "研磨方式");
      assertStringIncludes(html, "手沖研磨");
      assertStringIncludes(html, "roast");
      assertStringIncludes(html, "中焙");
    });
  },
});
