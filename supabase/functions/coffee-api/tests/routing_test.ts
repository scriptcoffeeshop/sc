import { assertEquals, assertStringIncludes } from "@std/assert";
import app from "../index.ts";
import {
  buildCustomFieldsHtml,
  resolveMainPageUrlWithQuery,
} from "../api/order-shared.ts";
import { actionMap, enforceActionMethod } from "../routing/action-map.ts";
import { signJwt } from "../utils/auth.ts";
import type { JsonRecord } from "../utils/json.ts";
import { withMockedSupabaseTables } from "./test-support.ts";

function buildActionRequest(
  action: string,
  options: {
    method?: "GET" | "POST";
    body?: JsonRecord;
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
  name: "Routing Guards - store map sessions accept GET and POST clients",
  sanitizeOps: false,
  sanitizeResources: false,
  fn() {
    for (const action of ["createStoreMapSession", "createPcscMapSession"]) {
      for (const method of ["GET", "POST"]) {
        let error: unknown = null;
        try {
          enforceActionMethod(
            action,
            actionMap[action],
            new Request(`https://example.com/?action=${action}`, { method }),
          );
        } catch (caught) {
          error = caught;
        }

        assertEquals(error, null);
      }
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
        { action: "pxPayPlusRefund", method: "POST" as const },
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
  name:
    "Order Admin - status update saves status note without auto notifications",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    await withMockedSupabaseTables({
      coffee_users: [{
        line_user_id: "orders-admin",
        role: "ADMIN",
        status: "ACTIVE",
        admin_permissions: { orders: true },
      }],
      coffee_orders: [{
        id: "ORDER-STATUS-NOTE",
        status: "pending",
        status_note: "",
        line_user_id: "customer-line",
        email: "customer@example.com",
        payment_status: "paid",
      }],
    }, async (tables) => {
      const token = await signJwt({ userId: "orders-admin" });
      const response = await app.fetch(
        buildActionRequest("updateOrderStatus", {
          method: "POST",
          headers: { authorization: `Bearer ${token}` },
          body: {
            orderId: "ORDER-STATUS-NOTE",
            status: "delivered",
            statusNote: "已放在管理室冰箱裡",
          },
        }),
      );
      const payload = await response.json();

      assertEquals(response.status, 200);
      assertEquals(payload.success, true);
      assertEquals(payload.message, "訂單狀態已更新");
      assertEquals("customerNotifications" in payload, false);
      assertEquals(tables.coffee_orders[0].status, "delivered");
      assertEquals(tables.coffee_orders[0].status_note, "已放在管理室冰箱裡");
    });
  },
});

Deno.test({
  name: "Routing Guards - scoped admins can only use permitted admin pages",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    await withMockedSupabaseTables({
      coffee_users: [{
        line_user_id: "orders-only-admin",
        role: "ADMIN",
        status: "ACTIVE",
        admin_permissions: { orders: true },
      }],
      coffee_orders: [],
    }, async () => {
      const token = await signJwt({ userId: "orders-only-admin" });
      const headers = { authorization: `Bearer ${token}` };

      const ordersResponse = await app.fetch(
        buildActionRequest("getOrders", { method: "GET", headers }),
      );
      assertEquals(ordersResponse.status, 200);

      const settingsResponse = await app.fetch(
        buildActionRequest("updateSettings", {
          method: "POST",
          headers,
          body: { settings: { site_title: "Nope" } },
        }),
      );
      const settingsPayload = await settingsResponse.json();
      assertEquals(settingsResponse.status, 401);
      assertEquals(settingsPayload.error, "此管理員沒有此頁面的操作權限");
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
      assertEquals(updatedUser?.display_name, "原始名稱");
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
  name: "Routing Integration - submitOrder blocks identical repeat submits",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    await withMockedSupabaseTables({
      coffee_users: [{
        line_user_id: "user-duplicate-order",
        role: "USER",
        status: "ACTIVE",
      }],
      coffee_products: [{
        id: 111,
        name: "防重複測試豆",
        price: 180,
        specs: "",
        enabled: true,
      }],
      coffee_settings: [],
      coffee_promotions: [],
      coffee_orders: [],
      coffee_form_fields: [],
    }, async (tables) => {
      const token = await signJwt({ userId: "user-duplicate-order" });
      const body = {
        lineName: "重複顧客",
        phone: "0912345678",
        items: [{ productId: 111, qty: 1 }],
        deliveryMethod: "in_store",
        paymentMethod: "cod",
        idempotencyKey: "same-submit-attempt",
      };
      const headers = {
        authorization: `Bearer ${token}`,
        "x-real-ip": `duplicate-${crypto.randomUUID()}`,
      };

      const firstResponse = await app.fetch(
        buildActionRequest("submitOrder", { method: "POST", headers, body }),
      );
      const firstPayload = await firstResponse.json();
      assertEquals(firstPayload.success, true);

      const secondResponse = await app.fetch(
        buildActionRequest("submitOrder", { method: "POST", headers, body }),
      );
      const secondPayload = await secondResponse.json();

      assertEquals(secondResponse.status, 200);
      assertEquals(secondPayload.success, false);
      assertEquals(secondPayload.code, "duplicate_order");
      assertStringIncludes(String(secondPayload.error || ""), "我的訂單");
      assertEquals(tables.coffee_orders.length, 1);
    });
  },
});

Deno.test({
  name: "Routing Integration - submitOrder enforces three minute order spacing",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    await withMockedSupabaseTables({
      coffee_users: [{
        line_user_id: "user-rate-order",
        role: "USER",
        status: "ACTIVE",
      }],
      coffee_products: [{
        id: 112,
        name: "節流測試豆",
        price: 210,
        specs: "",
        enabled: true,
      }],
      coffee_settings: [],
      coffee_promotions: [],
      coffee_orders: [],
      coffee_form_fields: [],
    }, async (tables) => {
      const token = await signJwt({ userId: "user-rate-order" });
      const headers = {
        authorization: `Bearer ${token}`,
        "x-real-ip": `spacing-${crypto.randomUUID()}`,
      };

      const firstResponse = await app.fetch(
        buildActionRequest("submitOrder", {
          method: "POST",
          headers,
          body: {
            lineName: "節流顧客",
            phone: "0912345678",
            items: [{ productId: 112, qty: 1 }],
            deliveryMethod: "in_store",
            paymentMethod: "cod",
          },
        }),
      );
      const firstPayload = await firstResponse.json();
      assertEquals(firstPayload.success, true);

      const secondResponse = await app.fetch(
        buildActionRequest("submitOrder", {
          method: "POST",
          headers,
          body: {
            lineName: "節流顧客",
            phone: "0912345678",
            items: [{ productId: 112, qty: 2 }],
            deliveryMethod: "in_store",
            paymentMethod: "cod",
          },
        }),
      );
      const secondPayload = await secondResponse.json();

      assertEquals(secondPayload.success, false);
      assertEquals(secondPayload.code, "order_rate_limited");
      assertStringIncludes(String(secondPayload.error || ""), "3 分鐘");
      assertEquals(tables.coffee_orders.length, 1);
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
  name: "Routing Integration - submitOrder creates hidden PxPayPlus payment",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const previousEnv = {
      merchantCode: Deno.env.get("PXPAYPLUS_MERCHANT_CODE"),
      merchantEnName: Deno.env.get("PXPAYPLUS_MERCHANT_EN_NAME"),
      secretKey: Deno.env.get("PXPAYPLUS_SECRET_KEY"),
      baseUrl: Deno.env.get("PXPAYPLUS_BASE_URL"),
      proxyUrl: Deno.env.get("PXPAYPLUS_PROXY_URL"),
    };
    const originalFetch = globalThis.fetch;
    const pxRequests: JsonRecord[] = [];

    Deno.env.set("PXPAYPLUS_MERCHANT_CODE", "M0002278");
    Deno.env.set("PXPAYPLUS_MERCHANT_EN_NAME", "scriptcoffee");
    Deno.env.set(
      "PXPAYPLUS_SECRET_KEY",
      "541AA5BE3ABFC734785020541B0D83E4BB608B5E383FF3041E213C1AB647D518",
    );
    Deno.env.set("PXPAYPLUS_BASE_URL", "https://pxpay.example/px-ec");
    Deno.env.delete("PXPAYPLUS_PROXY_URL");

    globalThis.fetch = async (
      input: RequestInfo | URL,
      init?: RequestInit,
    ) => {
      const url = String(input instanceof Request ? input.url : input);
      if (url.startsWith("https://pxpay.example/px-ec/CreateOrder")) {
        const headers = new Headers(init?.headers);
        const requestBody = JSON.parse(String(init?.body || "{}"));
        pxRequests.push({
          url,
          method: init?.method || "GET",
          merCode: headers.get("PX-MerCode"),
          merEnName: headers.get("PX-MerEnName"),
          signValue: headers.get("PX-SignValue"),
          body: requestBody,
        });
        return new Response(
          JSON.stringify({
            status_code: "0000",
            status_message: "成功",
            transaction_id: "PX-TX-0001",
            payment_url: "https://pay.example/pxpayplus/PX-TX-0001",
            qrcode: "PX-QR-CODE",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      if (url.startsWith("https://api.line.me/")) {
        return new Response("{}", { status: 200 });
      }
      return await originalFetch(input, init);
    };

    try {
      await withMockedSupabaseTables({
        coffee_users: [{
          line_user_id: "user-submit-pxpayplus",
          role: "USER",
          status: "ACTIVE",
        }],
        coffee_products: [{
          id: 203,
          name: "全支付測試豆",
          price: 420,
          specs: "",
          enabled: true,
        }],
        coffee_settings: [{
          key: "payment_routing_config",
          value: JSON.stringify({
            in_store: {
              cod: true,
              transfer: false,
              linepay: false,
              jkopay: false,
              pxpayplus: true,
            },
          }),
        }],
        coffee_promotions: [],
        coffee_orders: [],
        coffee_form_fields: [],
      }, async (tables) => {
        const token = await signJwt({ userId: "user-submit-pxpayplus" });
        const response = await app.fetch(
          buildActionRequest("submitOrder", {
            method: "POST",
            headers: {
              authorization: `Bearer ${token}`,
              "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)",
              "x-real-ip": `pxpayplus-${crypto.randomUUID()}`,
            },
            body: {
              lineName: "全支付顧客",
              phone: "0911222333",
              items: [{ productId: 203, qty: 1 }],
              deliveryMethod: "in_store",
              paymentMethod: "pxpayplus",
            },
          }),
        );
        const payload = await response.json();

        assertEquals(response.status, 200);
        assertEquals(payload.success, true);
        assertEquals(payload.total, 420);
        assertEquals(
          payload.paymentUrl,
          "https://pay.example/pxpayplus/PX-TX-0001",
        );
        assertEquals(payload.transactionId, "PX-TX-0001");
        assertEquals(payload.qrcode, "PX-QR-CODE");
        assertEquals(typeof payload.paymentExpiresAt, "string");
        assertEquals(pxRequests.length, 1);

        const pxRequest = pxRequests[0];
        assertEquals(pxRequest.method, "POST");
        assertEquals(pxRequest.merCode, "M0002278");
        assertEquals(pxRequest.merEnName, "scriptcoffee");
        assertEquals(String(pxRequest.signValue || "").length, 64);
        const requestBody = pxRequest.body as JsonRecord;
        assertEquals(requestBody.mer_trade_no, payload.orderId);
        assertEquals(requestBody.amount, 420);
        assertEquals(requestBody.device_type, 2);
        assertEquals(requestBody.order_type, 1);
        assertEquals(
          new URL(String(requestBody.order_status_url)).searchParams.get(
            "action",
          ),
          "pxPayPlusOrderStatus",
        );
        assertEquals(
          new URL(String(requestBody.payment_notify_url)).searchParams.get(
            "action",
          ),
          "pxPayPlusPaymentNotify",
        );
        assertEquals(
          new URL(String(requestBody.web_confirm_url)).searchParams.get(
            "pxpayplusReturn",
          ),
          "confirm",
        );

        assertEquals(tables.coffee_orders.length, 1);
        const order = tables.coffee_orders[0];
        assertEquals(order.id, payload.orderId);
        assertEquals(order.payment_method, "pxpayplus");
        assertEquals(order.payment_status, "pending");
        assertEquals(order.payment_id, "PX-TX-0001");
        assertEquals(order.payment_provider_transaction_id, "PX-TX-0001");
        assertEquals(order.payment_provider_status_code, "0000");
        assertEquals(
          order.payment_redirect_url,
          "https://pay.example/pxpayplus/PX-TX-0001",
        );
        assertEquals(
          (order.payment_provider_payload as JsonRecord)?.status_code,
          "0000",
        );
      });
    } finally {
      globalThis.fetch = originalFetch;
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
      assertEquals("linepay_sandbox" in getPayload.settings, false);
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
          line_name: "線上付款顧客",
          phone: "0912345678",
          email: "buyer@example.com",
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
          note: "請保留明細",
        },
        {
          id: "JKO-ORDER-1",
          line_user_id: "user-online-pay-link",
          created_at: "2026-04-21T02:00:00.000Z",
          items: "街口測試豆 x1",
          items_json: [],
          total: 220,
          delivery_method: "family_mart",
          status: "pending",
          store_id: "029860",
          store_name: "全家台東龍泉店",
          store_address: "台東縣台東市測試路 1 號",
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
      assertEquals(payload.orders[0].lineName, "線上付款顧客");
      assertEquals(payload.orders[0].phone, "0912345678");
      assertEquals(payload.orders[0].email, "buyer@example.com");
      assertEquals(payload.orders[0].note, "請保留明細");
      assertEquals(
        payload.orders[1].paymentUrl,
        "https://pay.example/jko/JKO-ORDER-1",
      );
      assertEquals(payload.orders[1].storeId, "029860");
      assertEquals(payload.orders[1].storeName, "全家台東龍泉店");
    });
  },
});

Deno.test({
  name:
    "Routing Integration - getMyOrders auto-cancels overdue online payments",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    await withMockedSupabaseTables({
      coffee_orders: [
        {
          id: "LINEPAY-EXPIRED-1",
          line_user_id: "user-expired-payments",
          created_at: "2026-04-18T11:30:00.000Z",
          items: "LINE Pay 測試豆 x1",
          items_json: [],
          total: 220,
          delivery_method: "delivery",
          status: "pending",
          city: "新竹市",
          address: "測試路 8 號",
          payment_method: "linepay",
          payment_status: "pending",
          cancel_reason: "",
          payment_redirect_url: "https://pay.example/linepay/LINEPAY-EXPIRED-1",
        },
        {
          id: "JKO-EXPIRED-1",
          line_user_id: "user-expired-payments",
          created_at: "2026-04-18T11:00:00.000Z",
          items: "街口測試豆 x1",
          items_json: [],
          total: 220,
          delivery_method: "delivery",
          status: "pending",
          city: "新竹市",
          address: "測試路 9 號",
          payment_method: "jkopay",
          payment_status: "pending",
          cancel_reason: "",
          payment_expires_at: "2026-04-18T11:50:00.000Z",
          payment_redirect_url: "https://pay.example/jko/JKO-EXPIRED-1",
        },
        {
          id: "PXPAYPLUS-EXPIRED-1",
          line_user_id: "user-expired-payments",
          created_at: "2026-04-18T11:10:00.000Z",
          items: "全支付測試豆 x1",
          items_json: [],
          total: 220,
          delivery_method: "delivery",
          status: "pending",
          city: "新竹市",
          address: "測試路 10 號",
          payment_method: "pxpayplus",
          payment_status: "pending",
          cancel_reason: "",
          payment_expires_at: "2026-04-18T11:55:00.000Z",
          payment_redirect_url:
            "https://pay.example/pxpayplus/PXPAYPLUS-EXPIRED-1",
        },
      ],
    }, async (tables) => {
      const realDate = Date;
      const fakeNow = new realDate("2026-04-18T12:05:00.000Z");
      globalThis.Date = class extends realDate {
        constructor(value?: string | number | Date) {
          super(value ?? fakeNow.toISOString());
        }
        static override now() {
          return fakeNow.getTime();
        }
        static override parse(value: string) {
          return realDate.parse(value);
        }
        static override UTC(...args: Parameters<typeof realDate.UTC>) {
          return realDate.UTC(...args);
        }
      } as DateConstructor;

      try {
        const token = await signJwt({ userId: "user-expired-payments" });
        const response = await app.fetch(
          buildActionRequest("getMyOrders", {
            method: "GET",
            headers: { authorization: `Bearer ${token}` },
          }),
        );
        const payload = await response.json();

        assertEquals(response.status, 200);
        assertEquals(payload.success, true);

        const orderById = Object.fromEntries(
          payload.orders.map((order: JsonRecord) => [
            String(order.orderId || ""),
            order,
          ]),
        );
        assertEquals(orderById["LINEPAY-EXPIRED-1"].status, "failed");
        assertEquals(orderById["LINEPAY-EXPIRED-1"].paymentStatus, "expired");
        assertEquals(
          orderById["LINEPAY-EXPIRED-1"].cancelReason,
          "付款期限已過，自動設為失敗訂單",
        );
        assertEquals(orderById["JKO-EXPIRED-1"].status, "failed");
        assertEquals(orderById["JKO-EXPIRED-1"].paymentStatus, "expired");
        assertEquals(
          orderById["JKO-EXPIRED-1"].cancelReason,
          "付款期限已過，自動設為失敗訂單",
        );
        assertEquals(orderById["PXPAYPLUS-EXPIRED-1"].status, "failed");
        assertEquals(
          orderById["PXPAYPLUS-EXPIRED-1"].paymentStatus,
          "expired",
        );
        assertEquals(
          orderById["PXPAYPLUS-EXPIRED-1"].cancelReason,
          "付款期限已過，自動設為失敗訂單",
        );

        assertEquals(tables.coffee_orders[0].status, "failed");
        assertEquals(tables.coffee_orders[0].payment_status, "expired");
        assertEquals(tables.coffee_orders[1].status, "failed");
        assertEquals(tables.coffee_orders[1].payment_status, "expired");
        assertEquals(tables.coffee_orders[2].status, "failed");
        assertEquals(tables.coffee_orders[2].payment_status, "expired");
      } finally {
        globalThis.Date = realDate;
      }
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
