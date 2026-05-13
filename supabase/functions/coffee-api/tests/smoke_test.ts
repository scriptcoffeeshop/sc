import { assertEquals } from "@std/assert";
import {
  buildCancelledNotificationHtml,
  buildDeliveredNotificationHtml,
  buildFailedNotificationHtml,
  buildOrderConfirmationHtml,
  buildPaymentStatusNotificationHtml,
  buildProcessingNotificationHtml,
  buildReadyNotificationHtml,
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
      html.includes(
        "width: 64px; height: auto; max-width: 64px; max-height: 64px;",
      ),
      true,
      "Logo should use fixed cross-client width in header",
    );
    assertEquals(
      html.includes('width="64"'),
      true,
      "Logo should include a fixed HTML width attribute for email clients",
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
    phone: "0911222333",
    ordersText: "衣索比亞 西達瑪 x 1\n🚚 運費: $60",
    total: 1200,
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
    html.includes(
      "width: 64px; height: auto; max-width: 64px; max-height: 64px;",
    ),
    true,
    "Shipping email logo should use fixed cross-client width",
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
  assertEquals(html.includes("0911222333"), true, "Missing phone number");
  assertEquals(html.includes("訂單明細"), true, "Missing order detail heading");
  assertEquals(
    html.includes("衣索比亞 西達瑪 x 1"),
    true,
    "Missing order item content",
  );
  assertEquals(html.includes("$1,200"), true, "Missing formatted total");
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
    ordersText: "肯亞 AA x 2\n🎁 優惠折抵: -$100",
    total: 780,
  });

  assertEquals(
    html.includes("訂單處理中通知"),
    true,
    "Missing processing email title",
  );
  assertEquals(
    html.includes("您的訂單已進入處理流程"),
    true,
    "Missing processing status content",
  );
  assertEquals(
    html.includes(
      "width: 64px; height: auto; max-width: 64px; max-height: 64px;",
    ),
    true,
    "Processing email logo should use fixed cross-client width",
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
  assertEquals(html.includes("肯亞 AA x 2"), true, "Missing order items");
  assertEquals(html.includes("$780"), true, "Missing total");
});

Deno.test("Email Templates - Ready Notification", () => {
  const html = buildReadyNotificationHtml({
    orderId: "C20261231-READY01",
    siteTitle: "Script Coffee",
    logoUrl: "https://cdn.example.com/logo-ready.png",
    lineName: "備妥客人",
    deliveryMethod: "in_store",
    city: "",
    district: "",
    address: "",
    storeName: "",
    storeAddress: "",
    paymentMethod: "cod",
    paymentStatus: "",
    note: "可於營業時間取貨",
    ordersText: "瓜地馬拉 花神 x 1",
    total: 460,
  });

  assertEquals(
    html.includes("訂單已備妥通知"),
    true,
    "Missing ready email title",
  );
  assertEquals(
    html.includes("您的訂單已備妥"),
    true,
    "Missing ready status content",
  );
  assertEquals(
    html.includes("可於營業時間取貨"),
    true,
    "Ready email should include note content",
  );
  assertEquals(
    html.includes("https://cdn.example.com/logo-ready.png"),
    true,
    "Ready email should use provided custom logo URL",
  );
  assertEquals(html.includes("瓜地馬拉 花神 x 1"), true, "Missing order items");
  assertEquals(html.includes("$460"), true, "Missing total");
});

Deno.test("Email Templates - Payment Status Notification", () => {
  const html = buildPaymentStatusNotificationHtml({
    orderId: "C20261231-LINEPAY01",
    siteTitle: "Script Coffee",
    logoUrl: "https://cdn.example.com/logo-linepay.png",
    lineName: "付款客人",
    phone: "0912000111",
    deliveryMethod: "seven_eleven",
    storeName: "建中門市",
    storeAddress: "新竹市東區建中路101號1樓",
    paymentMethod: "linepay",
    paymentStatus: "paid",
    notificationTitle: "LINE Pay 付款狀態通知",
    summaryText: "您的 LINE Pay 付款已成功完成。",
    statusLabel: "已付款",
    statusColor: "#2E7D32",
    note: "付款通知測試",
    ordersText: "巴西 米納斯 x 1",
    total: 620,
  });

  assertEquals(
    html.includes("LINE Pay 付款狀態通知"),
    true,
    "Missing payment status email title",
  );
  assertEquals(html.includes("0912000111"), true, "Missing phone number");
  assertEquals(html.includes("建中門市"), true, "Missing delivery store");
  assertEquals(html.includes("LINE Pay"), true, "Missing payment method");
  assertEquals(html.includes("已付款"), true, "Missing payment status");
  assertEquals(html.includes("巴西 米納斯 x 1"), true, "Missing order items");
  assertEquals(html.includes("$620"), true, "Missing total");
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
    ordersText: "<b>測試商品 x 1</b>",
    total: 300,
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
    ordersText: "哥倫比亞 薇拉 x 1",
    total: 520,
  });

  assertEquals(
    html.includes("訂單已取消通知"),
    true,
    "Missing cancelled email title",
  );
  assertEquals(
    html.includes("付款逾時未完成"),
    true,
    "Missing cancelled reason content",
  );
  assertEquals(
    html.includes(
      "width: 64px; height: auto; max-width: 64px; max-height: 64px;",
    ),
    true,
    "Cancelled email logo should use fixed cross-client width",
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
  assertEquals(html.includes("哥倫比亞 薇拉 x 1"), true, "Missing order items");
  assertEquals(html.includes("$520"), true, "Missing total");
});

Deno.test("Email Templates - Failed Notification", () => {
  const html = buildFailedNotificationHtml({
    orderId: "C20261231-FAILED01",
    siteTitle: "Script Coffee",
    logoUrl: "https://cdn.example.com/logo-failed.png",
    lineName: "失敗客人",
    failureReason: "付款期限已過，自動設為失敗訂單",
    note: "測試失敗通知",
    ordersText: "巴拿馬 波奎特 x 1",
    total: 680,
  });

  assertEquals(
    html.includes("訂單已失敗通知"),
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
  assertEquals(html.includes("巴拿馬 波奎特 x 1"), true, "Missing order items");
  assertEquals(html.includes("$680"), true, "Missing total");
});

Deno.test("Email Templates - Completed Notification", () => {
  const html = buildCompletedNotificationHtml({
    orderId: "C20261231-COMPLETE01",
    siteTitle: "Script Coffee",
    logoUrl: "https://cdn.example.com/logo-completed.png",
    lineName: "完成客人",
    deliveryMethod: "home_delivery",
    city: "新竹市",
    district: "東區",
    address: "咖啡路100號",
    paymentMethod: "jkopay",
    paymentStatus: "paid",
    note: "已完成測試訂單",
    ordersText: "衣索比亞 谷吉 x 1",
    total: 540,
  });

  assertEquals(
    html.includes("訂單已完成"),
    true,
    "Missing completed email title",
  );
  assertEquals(html.includes("全台宅配"), true, "Missing delivery method");
  assertEquals(html.includes("已付款"), true, "Missing payment status");
  assertEquals(html.includes("衣索比亞 谷吉 x 1"), true, "Missing order items");
  assertEquals(html.includes("$540"), true, "Missing total");
});

Deno.test("Email Templates - Delivered Notification", () => {
  const html = buildDeliveredNotificationHtml({
    orderId: "C20261231-DELIVERED01",
    siteTitle: "Script Coffee",
    logoUrl: "https://cdn.example.com/logo-delivered.png",
    lineName: "配達客人",
    note: "若有問題請聯繫客服",
    statusNote: "已放在管理室冰箱裡",
    ordersText: "宏都拉斯 聖文森 x 2",
    total: 960,
  });

  assertEquals(
    html.includes("訂單已配達通知"),
    true,
    "Missing delivered email title",
  );
  assertEquals(
    html.includes("您的訂單已配達"),
    true,
    "Missing delivered status content",
  );
  assertEquals(
    html.includes("若有問題請聯繫客服"),
    true,
    "Delivered email should include note content",
  );
  assertEquals(
    html.includes("已放在管理室冰箱裡"),
    true,
    "Delivered email should include status note content",
  );
  assertEquals(
    html.includes("https://cdn.example.com/logo-delivered.png"),
    true,
    "Delivered email should use provided custom logo URL",
  );
  assertEquals(
    html.includes("宏都拉斯 聖文森 x 2"),
    true,
    "Missing order items",
  );
  assertEquals(html.includes("$960"), true, "Missing total");
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
    lineName: "訂購人小明",
    phone: "0912345678",
    email: "buyer@example.com",
    paymentMethod: "linepay",
    paymentStatus: "paid",
    total: 1200,
    items: "衣索比亞 x 2",
    note: "請先電話聯繫",
    statusNote: "已放在管理室冰箱裡",
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
    payloadText.includes("狀態備註"),
    true,
    "Flex should include status note label",
  );
  assertEquals(
    payloadText.includes("已放在管理室冰箱裡"),
    true,
    "Flex should include status note content",
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
  assertEquals(payloadText.includes("訂購人小明"), true);
  assertEquals(payloadText.includes("0912345678"), true);
  assertEquals(payloadText.includes("buyer@example.com"), true);
});

Deno.test("Line Flex Template - Delivered Status Label", () => {
  const flex = buildOrderStatusLineFlexMessage({
    orderId: "C20261231-DELIVERED",
    siteTitle: "Script Coffee",
    status: "delivered",
    deliveryMethod: "delivery",
    city: "新竹市",
    district: "東區",
    address: "測試路 8 號",
    paymentMethod: "cod",
    paymentStatus: "paid",
    total: 300,
    items: "測試商品 x 1",
  });
  const payloadText = JSON.stringify(flex);

  assertEquals(
    payloadText.includes("已配達"),
    true,
    "Flex should include delivered status label",
  );
  assertEquals(
    payloadText.includes("#C20261231-DELIVERED"),
    true,
    "Flex should keep delivered order id",
  );
});

Deno.test("Line Flex Template - Ready Status Label", () => {
  const flex = buildOrderStatusLineFlexMessage({
    orderId: "C20261231-READY",
    siteTitle: "Script Coffee",
    status: "ready",
    deliveryMethod: "in_store",
    paymentMethod: "cod",
    paymentStatus: "paid",
    total: 300,
    items: "測試商品 x 1",
  });
  const payloadText = JSON.stringify(flex);

  assertEquals(
    payloadText.includes("已備妥"),
    true,
    "Flex should include ready status label",
  );
  assertEquals(
    payloadText.includes("#C20261231-READY"),
    true,
    "Flex should keep ready order id",
  );
});

Deno.test("Line Flex Template - Includes tracking CTA when only URL is set", () => {
  const flex = buildOrderStatusLineFlexMessage({
    orderId: "C20261231-SHIPCTA",
    siteTitle: "Script Coffee",
    status: "shipped",
    deliveryMethod: "delivery",
    city: "新竹市",
    district: "東區",
    address: "測試路 6 號",
    paymentMethod: "cod",
    paymentStatus: "paid",
    total: 300,
    items: "測試商品 x 1",
    trackingUrl: "https://postserv.post.gov.tw/pstmail/main_mail.html",
  });
  const payloadText = JSON.stringify(flex);

  assertEquals(
    payloadText.includes("追蹤貨態"),
    true,
    "Flex should include tracking CTA when a valid tracking URL is set",
  );
  assertEquals(
    payloadText.includes("https://postserv.post.gov.tw/pstmail/main_mail.html"),
    true,
    "Flex tracking CTA should point to the custom tracking URL",
  );

  const defaultFlex = buildOrderStatusLineFlexMessage({
    orderId: "C20261231-SHIPDEF",
    siteTitle: "Script Coffee",
    status: "shipped",
    deliveryMethod: "seven_eleven",
    storeName: "7-11測試門市",
    paymentMethod: "cod",
    paymentStatus: "paid",
    total: 300,
    items: "測試商品 x 1",
    trackingNumber: "711-123",
  });
  const defaultPayloadText = JSON.stringify(defaultFlex);
  assertEquals(
    defaultPayloadText.includes(
      "https://eservice.7-11.com.tw/e-tracking/search.aspx",
    ),
    true,
    "Flex should fall back to the delivery-method tracking URL",
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
