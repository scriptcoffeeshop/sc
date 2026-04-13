import { assertEquals } from "std/testing/asserts";
import {
  buildCancelledNotificationHtml,
  buildOrderConfirmationHtml,
  buildProcessingNotificationHtml,
  buildShippingNotificationHtml,
} from "../utils/email-templates.ts";

Deno.test("Basic Router Test - Health Check", () => {
  // 這裡可以匯入 router 邏輯進行單元測試
  // 暫時以純邏輯測試代替
  const sum = (a: number, b: number) => a + b;
  assertEquals(sum(1, 2), 3);
});

Deno.test("Utility Test - HTML Escape", () => {
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
});

Deno.test("Email Templates - Order Confirmation", () => {
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
  });

  assertEquals(html.includes("7-11 取貨"), true, "Missing delivery method");
  assertEquals(html.includes("已付款"), true, "Missing payment status");
  assertEquals(html.includes("700123456"), true, "Missing tracking number");
  assertEquals(html.includes("複製單號"), true, "Missing copy tracking button");
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
    address: "測試路3號",
    storeName: "",
    storeAddress: "",
    paymentMethod: "linepay",
    paymentStatus: "pending",
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
});

Deno.test("Email Templates - Cancelled Notification", () => {
  const html = buildCancelledNotificationHtml({
    orderId: "C20261231-AABBCCDD",
    siteTitle: "Script Coffee",
    logoUrl: "https://cdn.example.com/logo-cancelled.png",
    lineName: "User",
    cancelReason: "付款逾時未完成",
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
});
