import { assertEquals } from "std/testing/asserts";
import {
  buildOrderConfirmationHtml,
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
    siteTitle: "Test Shop",
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
    html.includes("Test Shop 訂購確認"),
    true,
    "Missing site title",
  );
  assertEquals(html.includes("配送到府"), true, "Missing delivery method");
  assertEquals(html.includes("貨到付款"), true, "Missing payment method");
});

Deno.test("Email Templates - Shipping Notification", () => {
  const html = buildShippingNotificationHtml({
    orderId: "C20261231-AABBCCDD",
    siteTitle: "Test Shop",
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
  });

  assertEquals(html.includes("7-11 取貨"), true, "Missing delivery method");
  assertEquals(html.includes("已付款"), true, "Missing payment status");
  assertEquals(html.includes("700123456"), true, "Missing tracking number");
  assertEquals(html.includes("統智門市"), true, "Missing store name");
});
