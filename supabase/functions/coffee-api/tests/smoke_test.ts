import { assertEquals } from "@std/assert";
import {
  buildCancelledNotificationHtml,
  buildFailedNotificationHtml,
  buildOrderConfirmationHtml,
  buildProcessingNotificationHtml,
  buildShippingNotificationHtml,
} from "../utils/email-templates.ts";
import { mapJkoStatusCodeToPaymentStatus } from "../utils/jkopay.ts";
import { buildOrderStatusLineFlexMessage } from "../utils/line-flex-template.ts";

// 由於 Supabase JS client 在 module 載入時會產生一個 timer，
// 第一個測試需關閉 sanitizer 以避免 false-positive leak 偵測。
Deno.test({
  name: "Basic Router Test - Health Check",
  sanitizeOps: false,
  sanitizeResources: false,
  fn() {
    // 這裡可以匯入 router 邏輯進行單元測試
    // 暫時以純邏輯測試代替
    const sum = (a: number, b: number) => a + b;
    assertEquals(sum(1, 2), 3);
  },
});

Deno.test({
  name: "Utility Test - HTML Escape",
  sanitizeOps: false,
  sanitizeResources: false,
  fn() {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    const escapeHtml = (text: string) =>
      String(text).replace(/[&<>"']/g, (m) => map[m]);
    assertEquals(escapeHtml("<div>"), "&lt;div&gt;");
  },
});

Deno.test({
  name: "Email Templates - Order Confirmation",
  sanitizeOps: false,
  sanitizeResources: false,
  fn() {
    const html = buildOrderConfirmationHtml({
      orderId: "C20261231-AABBCCDD",
      siteTitle: "Script Coffee 訂購確認",
      logoUrl: "https://cdn.example.com/logo-new.png",
      lineName: "User",
      phone: "0912345678",
      deliveryMethod: "delivery",
      city: "新竹市",
      district: "東區",
      address: "測試路1號",
      storeName: "",
      storeAddress: "",
      paymentMethod: "cod",
      transferTargetAccount: "",
      transferAccountLast5: "",
      note: "請快點",
      ordersText: "咖啡豆 x 1",
      total: 500,
      customFieldsHtml: "<p>Custom</p>",
    });

    assertEquals(html.includes("C20261231-AABBCCDD"), true, "Missing orderId");
    assertEquals(
      html.includes("Script Coffee"),
      true,
      "Missing site title",
    );
    assertEquals(
      html.includes("訂購確認"),
      false,
      "Unexpected confirmation suffix in title",
    );
    assertEquals(
      html.includes(
        "display: flex; align-items: center; justify-content: center;",
      ),
      false,
      "Logo layout should not rely on flex in email header",
    );
    assertEquals(
      html.includes("height: 18px; width: auto; max-width: 108px;"),
      true,
      "Logo should use compact ratio-preserving size in header",
    );
    assertEquals(
      html.includes("background-color: rgba(255,255,255,0.96);"),
      false,
      "Logo wrapper should not force white background",
    );
    assertEquals(
      html.includes("height: 40px; width: 40px;"),
      false,
      "Logo should not be forced into square dimensions",
    );
    assertEquals(
      html.includes("https://cdn.example.com/logo-new.png"),
      true,
      "Logo should use provided custom URL",
    );
    assertEquals(
      html.includes("訂單成立通知"),
      true,
      "Missing header subtitle for confirmation email",
    );
    assertEquals(html.includes("配送到府"), true, "Missing delivery method");
    assertEquals(html.includes("貨到付款"), true, "Missing payment method");
  },
});

Deno.test("Email Templates - Shipping Notification", () => {
  const html = buildShippingNotificationHtml({
    orderId: "C20261231-AABBCCDD",
    siteTitle: "Test Shop",
    logoUrl: "https://cdn.example.com/logo-shipping.png",
    lineName: "User",
    deliveryMethod: "seven_eleven",
    city: "",
    district: "",
    address: "",
    storeName: "統智門市",
    storeAddress: "測試路2號",
    paymentMethod: "transfer",
    paymentStatus: "paid",
    trackingNumber: "700123456",
    shippingProvider: "黑貓宅急便",
    trackingUrl: "https://example.com/track/700123456",
    note: "請放管理室",
  });

  assertEquals(html.includes("7-11 取貨"), true, "Missing delivery method");
  assertEquals(html.includes("已付款"), true, "Missing payment status");
  assertEquals(html.includes("700123456"), true, "Missing tracking number");
  assertEquals(html.includes("複製單號"), true, "Missing copy tracking button");
  assertEquals(
    html.includes("copy-tracking.html"),
    true,
    "Missing copy tracking page link",
  );
  assertEquals(
    html.includes("navigator.clipboard"),
    false,
    "Email should not rely on inline clipboard script",
  );
  assertEquals(html.includes("黑貓宅急便"), true, "Missing shipping provider");
  assertEquals(html.includes("物流追蹤頁面"), true, "Missing tracking link");
  assertEquals(html.includes("統智門市"), true, "Missing store name");
  assertEquals(
    html.includes(
      "display: flex; align-items: center; justify-content: center;",
    ),
    false,
    "Shipping email logo layout should not rely on flex",
  );
  assertEquals(
    html.includes("height: 18px; width: auto; max-width: 108px;"),
    true,
    "Shipping email logo should use compact ratio-preserving size",
  );
  assertEquals(
    html.includes("background-color: rgba(255,255,255,0.96);"),
    false,
    "Shipping logo wrapper should not force white background",
  );
  assertEquals(
    html.includes("https://cdn.example.com/logo-shipping.png"),
    true,
    "Shipping email should use provided custom logo URL",
  );
  assertEquals(html.includes("Test Shop"), true, "Missing site title subtitle");
  assertEquals(
    html.includes("訂單備註"),
    true,
    "Shipping email should include note label",
  );
  assertEquals(
    html.includes("請放管理室"),
    true,
    "Shipping email should include note content",
  );
});

Deno.test("Email Templates - Processing Notification", () => {
  const html = buildProcessingNotificationHtml({
    orderId: "C20261231-AABBCCDD",
    siteTitle: "Script Coffee",
    logoUrl: "https://cdn.example.com/logo-processing.png",
    lineName: "User",
    deliveryMethod: "delivery",
    city: "新竹市",
    district: "東區",
    address: "測試路3號（公司行號/社區大樓：好日子商辦）",
    storeName: "",
    storeAddress: "",
    paymentMethod: "linepay",
    paymentStatus: "pending",
    note: "請中午前送達",
  });

  assertEquals(
    html.includes("⏳ 訂單處理中通知"),
    true,
    "Missing processing email title",
  );
  assertEquals(
    html.includes("您的訂單已進入處理流程"),
    true,
    "Missing processing status content",
  );
  assertEquals(
    html.includes("height: 18px; width: auto; max-width: 108px;"),
    true,
    "Processing email logo should use compact ratio-preserving size",
  );
  assertEquals(
    html.includes("https://cdn.example.com/logo-processing.png"),
    true,
    "Processing email should use provided custom logo URL",
  );
  assertEquals(
    html.includes("請中午前送達"),
    true,
    "Processing email should include note content",
  );
  assertEquals(
    html.includes("好日子商辦"),
    true,
    "Processing email should include delivery company/building text",
  );
});

Deno.test("Email Templates - Escape Dynamic Summary Fields", () => {
  const html = buildProcessingNotificationHtml({
    orderId: '<img src=x onerror="alert(1)">',
    siteTitle: "Script Coffee",
    logoUrl: "https://cdn.example.com/logo-processing.png",
    lineName: "User",
    deliveryMethod: "<script>alert(1)</script>",
    city: "新竹市",
    district: "東區",
    address: "測試路3號",
    storeName: "",
    storeAddress: "",
    paymentMethod: "<script>alert(2)</script>",
    paymentStatus: "pending",
    note: "<b>請中午前送達</b>",
  });

  assertEquals(
    html.includes("<img src=x"),
    false,
    "Order id must not be injected as raw HTML",
  );
  assertEquals(
    html.includes("<script>alert(2)</script>"),
    false,
    "Payment method must not be injected as raw HTML",
  );
  assertEquals(
    html.includes("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;"),
    true,
    "Escaped order id should remain visible as text",
  );
  assertEquals(
    html.includes("&lt;script&gt;alert(2)&lt;/script&gt;"),
    true,
    "Escaped payment method should remain visible as text",
  );
});

Deno.test("Email Templates - Cancelled Notification", () => {
  const html = buildCancelledNotificationHtml({
    orderId: "C20261231-AABBCCDD",
    siteTitle: "Script Coffee",
    logoUrl: "https://cdn.example.com/logo-cancelled.png",
    lineName: "User",
    cancelReason: "付款逾時未完成",
    note: "若可改時間請來電",
  });

  assertEquals(
    html.includes("⚠️ 訂單已取消通知"),
    true,
    "Missing cancelled email title",
  );
  assertEquals(
    html.includes("付款逾時未完成"),
    true,
    "Missing cancelled reason content",
  );
  assertEquals(
    html.includes("height: 18px; width: auto; max-width: 108px;"),
    true,
    "Cancelled email logo should use compact ratio-preserving size",
  );
  assertEquals(
    html.includes("https://cdn.example.com/logo-cancelled.png"),
    true,
    "Cancelled email should use provided custom logo URL",
  );
  assertEquals(
    html.includes("若可改時間請來電"),
    true,
    "Cancelled email should include note content",
  );
});

Deno.test("Email Templates - Failed Notification", () => {
  const html = buildFailedNotificationHtml({
    orderId: "C20261231-FAILED01",
    siteTitle: "Script Coffee",
    logoUrl: "https://cdn.example.com/logo-failed.png",
    lineName: "失敗客人",
    failureReason: "付款期限已過，自動設為失敗訂單",
    note: "測試失敗通知",
  });

  assertEquals(
    html.includes("⚠️ 訂單已失敗通知"),
    true,
    "Missing failed email title",
  );
  assertEquals(
    html.includes("付款期限已過，自動設為失敗訂單"),
    true,
    "Missing failed reason content",
  );
  assertEquals(
    html.includes("https://cdn.example.com/logo-failed.png"),
    true,
    "Failed email should use provided custom logo URL",
  );
});

Deno.test("Line Flex Template - Include Note", () => {
  const flex = buildOrderStatusLineFlexMessage({
    orderId: "C20261231-AABBCCDD",
    siteTitle: "Script Coffee",
    status: "processing",
    deliveryMethod: "delivery",
    city: "新竹市",
    district: "東區",
    address: "測試路3號（公司行號/社區大樓：好日子商辦）",
    paymentMethod: "linepay",
    paymentStatus: "paid",
    total: 1200,
    items: "衣索比亞 x 2",
    note: "請先電話聯繫",
  });
  const payloadText = JSON.stringify(flex);
  assertEquals(
    payloadText.includes("訂單備註"),
    true,
    "Flex should include note label",
  );
  assertEquals(
    payloadText.includes("請先電話聯繫"),
    true,
    "Flex should include note content",
  );
  assertEquals(
    payloadText.includes("配送地址"),
    true,
    "Flex should include delivery address label",
  );
  assertEquals(
    payloadText.includes("好日子商辦"),
    true,
    "Flex should include delivery company/building text",
  );
});

Deno.test("JKO Pay Status Mapping - Match Official Inquiry Codes", () => {
  assertEquals(mapJkoStatusCodeToPaymentStatus(0), "paid");
  assertEquals(mapJkoStatusCodeToPaymentStatus(100), "failed");
  assertEquals(mapJkoStatusCodeToPaymentStatus(101), "pending");
  assertEquals(mapJkoStatusCodeToPaymentStatus(102), "pending");
  assertEquals(mapJkoStatusCodeToPaymentStatus(null), "processing");
});

Deno.test("Line Flex Template - Payment Processing Label", () => {
  const flex = buildOrderStatusLineFlexMessage({
    orderId: "C20261231-STATUS01",
    siteTitle: "Script Coffee",
    status: "pending",
    deliveryMethod: "delivery",
    city: "新竹市",
    district: "東區",
    address: "測試路 1 號",
    paymentMethod: "jkopay",
    paymentStatus: "processing",
    total: 300,
    items: "測試商品 x 1",
  });
  const payloadText = JSON.stringify(flex);
  assertEquals(
    payloadText.includes("付款確認中"),
    true,
    "Flex should include processing payment label",
  );
});

Deno.test("Line Flex Template - Payment Expired Label", () => {
  const flex = buildOrderStatusLineFlexMessage({
    orderId: "C20261231-STATUS02",
    siteTitle: "Script Coffee",
    status: "failed",
    deliveryMethod: "delivery",
    city: "新竹市",
    district: "東區",
    address: "測試路 2 號",
    paymentMethod: "jkopay",
    paymentStatus: "expired",
    total: 300,
    items: "測試商品 x 1",
  });
  const payloadText = JSON.stringify(flex);
  assertEquals(
    payloadText.includes("付款逾期"),
    true,
    "Flex should include expired payment label",
  );
});
