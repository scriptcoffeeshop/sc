import { assertEquals, assertStringIncludes } from "@std/assert";
import app from "../index.ts";
import {
  buildCustomFieldsHtml,
  resolveMainPageUrlWithQuery,
} from "../api/order-shared.ts";
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
  name: "CORS - Vite preview origins are allowed",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    for (const origin of ["http://localhost:4173", "http://127.0.0.1:4173"]) {
      const response = await app.fetch(
        new Request("https://example.com/?action=getInitData", {
          method: "OPTIONS",
          headers: {
            Origin: origin,
            "Access-Control-Request-Method": "GET",
          },
        }),
      );

      assertEquals(response.headers.get("Access-Control-Allow-Origin"), origin);
    }
  },
});

Deno.test({
  name: "Order Shared - JKO result display URL is absolute HTTPS",
  sanitizeOps: false,
  sanitizeResources: false,
  fn() {
    const url = resolveMainPageUrlWithQuery(
      new URLSearchParams({ jkoOrderId: "SO-JKO-1" }),
    );

    assertEquals(url.startsWith("https://"), true);
    assertStringIncludes(url, "main.html?jkoOrderId=SO-JKO-1");
  },
});

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
        { action: "getOrders", method: "GET" as const },
        { action: "getUsers", method: "GET" as const },
        { action: "getBlacklist", method: "GET" as const },
        { action: "getFormFieldsAdmin", method: "GET" as const },
        { action: "addProduct", method: "POST" as const },
        { action: "updateProduct", method: "POST" as const },
        { action: "deleteProduct", method: "POST" as const },
        { action: "addCategory", method: "POST" as const },
        { action: "addPromotion", method: "POST" as const },
        { action: "updateOrderStatus", method: "POST" as const },
        { action: "addToBlacklist", method: "POST" as const },
        { action: "addFormField", method: "POST" as const },
        { action: "addBankAccount", method: "POST" as const },
        { action: "linePayRefund", method: "POST" as const },
        { action: "jkoPayRefund", method: "POST" as const },
        { action: "updateSettings", method: "POST" as const },
      ];

      for (const testCase of cases) {
        const response = await app.fetch(
          buildActionRequest(testCase.action, {
            method: testCase.method,
            headers,
            body: {},
          }),
        );
        const payload = await response.json();
        assertEquals(response.status, 401);
        assertEquals(payload.success, false);
        assertEquals(payload.error, "權限不足", testCase.action);
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
  name:
    "Routing Integration - submitOrder transfer response matches persisted order",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    await withMockedSupabaseTables({
      coffee_users: [{
        line_user_id: "user-submit-transfer",
        role: "USER",
        status: "ACTIVE",
      }],
      coffee_products: [{
        id: 202,
        name: "轉帳測試豆",
        price: 350,
        specs: "",
        enabled: true,
      }],
      coffee_settings: [{
        key: "transfer_enabled",
        value: "true",
      }],
      coffee_promotions: [],
      coffee_orders: [],
      coffee_form_fields: [],
    }, async (tables) => {
      const token = await signJwt({ userId: "user-submit-transfer" });
      const response = await app.fetch(
        buildActionRequest("submitOrder", {
          method: "POST",
          headers: { authorization: `Bearer ${token}` },
          body: {
            lineName: "轉帳顧客",
            phone: "0911222333",
            items: [{ productId: 202, qty: 1 }],
            deliveryMethod: "in_store",
            paymentMethod: "transfer",
            transferTargetAccount: "822-123456789",
            transferAccountLast5: "98765",
          },
        }),
      );
      const payload = await response.json();

      assertEquals(response.status, 200);
      assertEquals(payload.success, true);
      assertEquals(payload.message, "訂單已送出");
      assertEquals(payload.total, 350);
      assertEquals("paymentUrl" in payload, false);
      assertEquals(tables.coffee_orders.length, 1);

      const order = tables.coffee_orders[0];
      assertEquals(order.id, payload.orderId);
      assertEquals(order.payment_method, "transfer");
      assertEquals(order.payment_status, "pending");
      assertEquals(order.payment_id, "822-123456789");
      assertEquals(order.transfer_account_last5, "98765");
      assertEquals(order.items_json, [{
        productId: 202,
        productName: "轉帳測試豆",
        specKey: "",
        specLabel: "",
        qty: 1,
        unitPrice: 350,
        lineTotal: 350,
      }]);
    });
  },
});

Deno.test({
  name: "Routing Integration - updateSettings round-trips key configs",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    await withMockedSupabaseTables({
      coffee_users: [{
        line_user_id: "settings-admin",
        role: "ADMIN",
        status: "ACTIVE",
      }],
      coffee_settings: [],
    }, async () => {
      const token = await signJwt({ userId: "settings-admin" });
      const deliveryOptions = JSON.stringify([{
        id: "delivery",
        label: "宅配",
        iconUrl: "https://scriptcoffee.com.tw/sc/icons/delivery-truck.png",
        enabled: true,
      }]);
      const paymentOptions = JSON.stringify({
        linepay: {
          label: "LINE Pay",
          iconUrl: "https://scriptcoffee.com.tw/icons/payment-linepay.png",
          enabled: true,
        },
        jkopay: {
          label: "街口支付",
          icon_url: "icons/payment-jkopay.png",
          enabled: true,
        },
      });

      const updateResponse = await app.fetch(
        buildActionRequest("updateSettings", {
          method: "POST",
          headers: { authorization: `Bearer ${token}` },
          body: {
            settings: {
              linepay_sandbox: false,
              delivery_options_config: deliveryOptions,
              payment_options_config: paymentOptions,
            },
          },
        }),
      );
      const updatePayload = await updateResponse.json();
      assertEquals(updateResponse.status, 200);
      assertEquals(updatePayload.success, true);

      const getResponse = await app.fetch(
        buildActionRequest("getSettings", {
          method: "GET",
          headers: { authorization: `Bearer ${token}` },
        }),
      );
      const getPayload = await getResponse.json();

      assertEquals(getResponse.status, 200);
      assertEquals(getPayload.success, true);
      assertEquals(getPayload.settings.linepay_sandbox, "false");
      assertEquals(
        JSON.parse(getPayload.settings.delivery_options_config),
        [{
          id: "delivery",
          label: "宅配",
          enabled: true,
          icon_url: "icons/delivery-truck.png",
        }],
      );
      assertEquals(JSON.parse(getPayload.settings.payment_options_config), {
        linepay: {
          label: "LINE Pay",
          enabled: true,
          icon_url: "icons/payment-linepay.png",
        },
        jkopay: {
          label: "街口支付",
          icon_url: "icons/payment-jkopay.png",
          enabled: true,
        },
      });
    });
  },
});

Deno.test({
  name:
    "Routing Integration - getMyOrders exposes online payment redirect URLs",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    await withMockedSupabaseTables({
      coffee_orders: [
        {
          id: "LINEPAY-ORDER-1",
          line_user_id: "user-online-pay-link",
          created_at: "2026-04-21T03:00:00.000Z",
          items: "LINE Pay 測試豆 x1",
          items_json: [],
          total: 220,
          delivery_method: "delivery",
          status: "pending",
          city: "新竹市",
          address: "測試路 2 號",
          payment_method: "linepay",
          payment_status: "pending",
          payment_redirect_url: "https://pay.example/linepay/LINEPAY-ORDER-1",
        },
        {
          id: "JKO-ORDER-1",
          line_user_id: "user-online-pay-link",
          created_at: "2026-04-21T02:00:00.000Z",
          items: "街口測試豆 x1",
          items_json: [],
          total: 220,
          delivery_method: "delivery",
          status: "pending",
          city: "新竹市",
          address: "測試路 1 號",
          payment_method: "jkopay",
          payment_status: "pending",
          payment_expires_at: "2026-04-21T12:34:00.000Z",
          payment_redirect_url: "https://pay.example/jko/JKO-ORDER-1",
        },
      ],
    }, async () => {
      const token = await signJwt({ userId: "user-online-pay-link" });
      const response = await app.fetch(
        buildActionRequest("getMyOrders", {
          method: "GET",
          headers: { authorization: `Bearer ${token}` },
        }),
      );
      const payload = await response.json();

      assertEquals(response.status, 200);
      assertEquals(payload.success, true);
      assertEquals(payload.orders.length, 2);
      assertEquals(
        payload.orders[0].paymentUrl,
        "https://pay.example/linepay/LINEPAY-ORDER-1",
      );
      assertEquals(
        payload.orders[1].paymentUrl,
        "https://pay.example/jko/JKO-ORDER-1",
      );
    });
  },
});

Deno.test({
  name: "Routing Integration - submitOrder quote errors do not create orders",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    await withMockedSupabaseTables({
      coffee_users: [{
        line_user_id: "user-submit-invalid-product",
        role: "USER",
        status: "ACTIVE",
      }],
      coffee_products: [],
      coffee_settings: [],
      coffee_promotions: [],
      coffee_orders: [],
    }, async (tables) => {
      const token = await signJwt({ userId: "user-submit-invalid-product" });
      const response = await app.fetch(
        buildActionRequest("submitOrder", {
          method: "POST",
          headers: { authorization: `Bearer ${token}` },
          body: {
            lineName: "錯誤商品顧客",
            items: [{ productId: 999, qty: 1 }],
            deliveryMethod: "in_store",
            paymentMethod: "cod",
          },
        }),
      );
      const payload = await response.json();

      assertEquals(response.status, 200);
      assertEquals(payload.success, false);
      assertStringIncludes(payload.error, "商品 ID 999 不存在");
      assertEquals(tables.coffee_orders.length, 0);
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
