import { assertEquals } from "std/testing/asserts";
import { computeOrderQuote } from "../api/quote.ts";

const MOCK_DELIVERY_CONFIG = [
  {
    id: "delivery",
    enabled: true,
    fee: 100,
    free_threshold: 1000,
    payment: { cod: true, transfer: true, linepay: true, jkopay: true },
  },
  {
    id: "seven_eleven",
    enabled: true,
    fee: 65,
    free_threshold: 1200,
    payment: { cod: true, transfer: false, linepay: false, jkopay: false },
  },
  {
    id: "disabled_method",
    enabled: false,
    fee: 0,
    payment: { cod: true, transfer: true, linepay: true, jkopay: true },
  },
];

const MOCK_PRODUCTS = [
  { id: 1, name: "測試咖啡豆 A", price: 300, enabled: true, specs: null },
  { id: 2, name: "測試周邊 B", price: 500, enabled: true, specs: null },
  {
    id: 3,
    name: "有規格的豆子",
    price: 0,
    enabled: true,
    specs: [
      { key: "half", label: "半磅", price: 400, enabled: true },
      { key: "one", label: "一磅", price: 750, enabled: true },
    ],
  },
  { id: 99, name: "下架商品", price: 100, enabled: false, specs: null },
];

const MOCK_PROMOS = [
  {
    id: 1,
    name: "兩件折50",
    type: "bundle",
    enabled: true,
    start_time: "2020-01-01T00:00:00Z",
    end_time: "2099-12-31T23:59:59Z",
    target_product_ids: [1, 2, 3],
    target_items: [],
    min_quantity: 2,
    discount_type: "amount",
    discount_value: 50,
  },
  {
    id: 2,
    name: "三件打8折",
    type: "bundle",
    enabled: true,
    start_time: "2020-01-01T00:00:00Z",
    end_time: "2099-12-31T23:59:59Z",
    target_product_ids: [1], // Only Product A
    target_items: [],
    min_quantity: 3,
    discount_type: "percent",
    discount_value: 80, // Means 80% of original price (8折)
  },
];

const DEFAULT_PROMO_NOW = new Date("2026-03-10T12:00:00Z");

Deno.test("Quote Engine - Basic Subtotal Calculation", () => {
  const result = computeOrderQuote({
    cartItems: [
      { productId: 1, qty: 2 },
      { productId: 2, qty: 1 },
    ],
    requestedDeliveryMethod: "delivery",
    requestedPaymentMethod: "transfer",
    products: MOCK_PRODUCTS,
    deliveryConfig: MOCK_DELIVERY_CONFIG,
    activePromos: [],
    promoNow: DEFAULT_PROMO_NOW,
  });

  assertEquals(result.success, true);
  if (result.success) {
    const q = result.quote;
    // 300 * 2 + 500 = 1100
    assertEquals(q.subtotal, 1100);
    // Over free_threshold (1000) -> 0 fee
    assertEquals(q.shippingFee, 0);
    assertEquals(q.total, 1100);
  }
});

Deno.test("Quote Engine - Product with Specs", () => {
  const result = computeOrderQuote({
    cartItems: [
      { productId: 3, specKey: "half", qty: 2 }, // 400 * 2 = 800
      { productId: 3, specKey: "one", qty: 1 }, // 750 * 1 = 750
    ],
    requestedDeliveryMethod: "seven_eleven",
    requestedPaymentMethod: "cod",
    products: MOCK_PRODUCTS,
    deliveryConfig: MOCK_DELIVERY_CONFIG,
    activePromos: [],
    promoNow: DEFAULT_PROMO_NOW,
  });

  assertEquals(result.success, true);
  if (result.success) {
    const q = result.quote;
    assertEquals(q.subtotal, 1550);
    // 1550 > 1200 (free threshold for 7-11)
    assertEquals(q.shippingFee, 0);
    assertEquals(q.total, 1550);
    assertEquals(q.items[0].unitPrice, 400);
    assertEquals(q.items[1].unitPrice, 750);
  }
});

Deno.test("Quote Engine - JKO Pay Availability", () => {
  const result = computeOrderQuote({
    cartItems: [{ productId: 1, qty: 1 }],
    requestedDeliveryMethod: "delivery",
    requestedPaymentMethod: "jkopay",
    products: MOCK_PRODUCTS,
    deliveryConfig: MOCK_DELIVERY_CONFIG,
    activePromos: [],
    promoNow: DEFAULT_PROMO_NOW,
  });

  assertEquals(result.success, true);
  if (result.success) {
    const q = result.quote;
    assertEquals(q.availablePaymentMethods.jkopay, true);
  }
});

Deno.test("Quote Engine - Legacy Routing Fallback For JKO Pay", () => {
  const legacyDeliveryConfig = [
    {
      id: "delivery",
      enabled: true,
      fee: 100,
      free_threshold: 1000,
      payment: { cod: true, transfer: true, linepay: true }, // no jkopay key
    },
  ];

  const result = computeOrderQuote({
    cartItems: [{ productId: 1, qty: 1 }],
    requestedDeliveryMethod: "delivery",
    requestedPaymentMethod: "jkopay",
    products: MOCK_PRODUCTS,
    deliveryConfig: legacyDeliveryConfig,
    activePromos: [],
    promoNow: DEFAULT_PROMO_NOW,
  });

  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.quote.availablePaymentMethods.jkopay, true);
  }
});

Deno.test("Quote Engine - Missing or Invalid Specs", () => {
  // Should fail because productId 3 requires a spec
  const res1 = computeOrderQuote({
    cartItems: [{ productId: 3, qty: 1 }],
    requestedDeliveryMethod: "delivery",
    requestedPaymentMethod: "cod",
    products: MOCK_PRODUCTS,
    deliveryConfig: MOCK_DELIVERY_CONFIG,
    activePromos: [],
  });
  assertEquals(res1.success, false);

  // Should fail because spec 'invalid' is not in product 3
  const res2 = computeOrderQuote({
    cartItems: [{ productId: 3, specKey: "invalid", qty: 1 }],
    requestedDeliveryMethod: "delivery",
    requestedPaymentMethod: "cod",
    products: MOCK_PRODUCTS,
    deliveryConfig: MOCK_DELIVERY_CONFIG,
    activePromos: [],
  });
  assertEquals(res2.success, false);
});

Deno.test("Quote Engine - Shipping Fee Application", () => {
  const result = computeOrderQuote({
    cartItems: [{ productId: 1, qty: 1 }], // 300
    requestedDeliveryMethod: "seven_eleven", // fee 65, threshold 1200
    requestedPaymentMethod: "cod",
    products: MOCK_PRODUCTS,
    deliveryConfig: MOCK_DELIVERY_CONFIG,
    activePromos: [],
  });

  assertEquals(result.success, true);
  if (result.success) {
    const q = result.quote;
    assertEquals(q.subtotal, 300);
    assertEquals(q.shippingFee, 65);
    assertEquals(q.total, 365);
  }
});

Deno.test("Quote Engine - Promo Amount Deduction (2 items off 50)", () => {
  const result = computeOrderQuote({
    cartItems: [
      { productId: 1, qty: 1 }, // 300
      { productId: 2, qty: 1 }, // 500
    ],
    requestedDeliveryMethod: "delivery",
    requestedPaymentMethod: "cod",
    products: MOCK_PRODUCTS,
    deliveryConfig: MOCK_DELIVERY_CONFIG,
    activePromos: MOCK_PROMOS,
    promoNow: DEFAULT_PROMO_NOW,
  });

  assertEquals(result.success, true);
  if (result.success) {
    const q = result.quote;
    assertEquals(q.subtotal, 800);
    assertEquals(q.totalDiscount, 50); // Promo 1 triggered (qty=2)
    assertEquals(q.afterDiscount, 750);
    // < 1000 free threshold, fee = 100
    assertEquals(q.shippingFee, 100);
    assertEquals(q.total, 850);
    assertEquals(q.appliedPromos.length, 1);
    assertEquals(q.appliedPromos[0].name, "兩件折50");
  }
});

Deno.test("Quote Engine - Promo Percent Deduction (3 items 20% off)", () => {
  const result = computeOrderQuote({
    cartItems: [
      { productId: 1, qty: 3 }, // 300 * 3 = 900
    ],
    requestedDeliveryMethod: "delivery",
    requestedPaymentMethod: "cod",
    products: MOCK_PRODUCTS,
    deliveryConfig: MOCK_DELIVERY_CONFIG,
    activePromos: MOCK_PROMOS,
    promoNow: DEFAULT_PROMO_NOW,
  });

  assertEquals(result.success, true);
  if (result.success) {
    const q = result.quote;
    assertEquals(q.subtotal, 900);
    // Both promos triggered for productId 1!
    // Promo 1: qty >= 2 -> 50 off
    // Promo 2: qty >= 3 for Product 1 -> 900 * 0.2 = 180 off
    // Total discount = 50 + 180 = 230
    assertEquals(q.totalDiscount, 230);
    assertEquals(q.afterDiscount, 670);
    assertEquals(q.shippingFee, 100);
    assertEquals(q.total, 770);
  }
});

Deno.test("Quote Engine - Invalid Delivery and Payment Methods", () => {
  const res1 = computeOrderQuote({
    cartItems: [{ productId: 1, qty: 1 }],
    requestedDeliveryMethod: "invalid_method",
    requestedPaymentMethod: "cod",
    products: MOCK_PRODUCTS,
    deliveryConfig: MOCK_DELIVERY_CONFIG,
    activePromos: [],
  });
  assertEquals(res1.success, false);

  const res2 = computeOrderQuote({
    cartItems: [{ productId: 1, qty: 1 }],
    requestedDeliveryMethod: "seven_eleven",
    requestedPaymentMethod: "linepay", // seven_eleven does not support linepay in Mock
    products: MOCK_PRODUCTS,
    deliveryConfig: MOCK_DELIVERY_CONFIG,
    activePromos: [],
  });
  assertEquals(res2.success, false);
});

Deno.test("Quote Engine - Empty Cart or Disabled Product", () => {
  const res1 = computeOrderQuote({
    cartItems: [],
    requestedDeliveryMethod: "delivery",
    requestedPaymentMethod: "cod",
    products: MOCK_PRODUCTS,
    deliveryConfig: MOCK_DELIVERY_CONFIG,
    activePromos: [],
  });
  assertEquals(res1.success, false);
  if (!res1.success) assertEquals(res1.error, "購物車是空的");

  const res2 = computeOrderQuote({
    cartItems: [{ productId: 99, qty: 1 }], // disabled product
    requestedDeliveryMethod: "delivery",
    requestedPaymentMethod: "cod",
    products: MOCK_PRODUCTS,
    deliveryConfig: MOCK_DELIVERY_CONFIG,
    activePromos: [],
  });
  assertEquals(res2.success, false);
});
