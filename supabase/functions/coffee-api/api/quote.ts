import { supabase } from "../utils/supabase.ts";
import {
  calcPercentDiscountAmount,
  isPromotionActive,
} from "../utils/promotion.ts";
import {
  asJsonRecord,
  parseJsonArray,
  tryParseJsonArray,
  tryParseJsonRecord,
} from "../utils/json.ts";

export type QuoteRequestItem = {
  productId: number;
  specKey?: string;
  qty: number;
};

export type QuoteLineItem = {
  productId: number;
  productName: string;
  specKey: string;
  specLabel: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
};

export type QuotePayload = {
  deliveryMethod: string;
  availablePaymentMethods: {
    cod: boolean;
    linepay: boolean;
    jkopay: boolean;
    transfer: boolean;
  };
  items: QuoteLineItem[];
  appliedPromos: Array<{ name: string; amount: number }>;
  discountedItemKeys: string[];
  subtotal: number;
  totalDiscount: number;
  afterDiscount: number;
  shippingFee: number;
  total: number;
  orderLines: string[];
  ordersText: string;
};

export type PaymentMethod = "cod" | "linepay" | "jkopay" | "transfer";

type PaymentAvailability = Record<PaymentMethod, boolean>;
type QuoteProductRow = Record<string, unknown>;
type QuoteProductSpec = Record<string, unknown>;
type DeliveryConfigRow = Record<string, unknown>;

export type QuoteResult =
  | { success: true; quote: QuotePayload }
  | { success: false; error: string };

const VALID_DELIVERY_METHODS = [
  "delivery",
  "home_delivery",
  "seven_eleven",
  "family_mart",
  "in_store",
];

const VALID_PAYMENT_METHODS: PaymentMethod[] = [
  "cod",
  "linepay",
  "jkopay",
  "transfer",
];

const STANDARD_DELIVERY_METHODS = [
  "in_store",
  "delivery",
  "home_delivery",
  "seven_eleven",
  "family_mart",
];

const COD_ONLY_PAYMENT: PaymentAvailability = {
  cod: true,
  linepay: false,
  jkopay: false,
  transfer: false,
};

const DEFAULT_STORE_PAYMENT_METHODS = new Set([
  "in_store",
  "delivery",
  "home_delivery",
]);

function isPaymentMethod(value: string): value is PaymentMethod {
  return VALID_PAYMENT_METHODS.includes(value as PaymentMethod);
}

function toPaymentAvailability(
  payment: Record<string, unknown> | undefined,
): PaymentAvailability {
  const source = payment || {};
  const linepayEnabled = source.linepay === true || source.linepay === "true";
  const hasJkoPayInConfig = Object.prototype.hasOwnProperty.call(
    source,
    "jkopay",
  );
  return {
    cod: source.cod === true || source.cod === "true",
    linepay: linepayEnabled,
    jkopay: hasJkoPayInConfig
      ? source.jkopay === true || source.jkopay === "true"
      : linepayEnabled,
    transfer: source.transfer === true || source.transfer === "true",
  };
}

function parseMaybeJsonArray<T = unknown>(value: unknown): T[] {
  return parseJsonArray<T>(value);
}

function buildDefaultPaymentRouting(
  linePayEnabled: boolean,
  transferEnabled: boolean,
): Record<string, PaymentAvailability> {
  return Object.fromEntries(
    STANDARD_DELIVERY_METHODS.map((method) => {
      if (!DEFAULT_STORE_PAYMENT_METHODS.has(method)) {
        return [method, { ...COD_ONLY_PAYMENT }];
      }

      return [
        method,
        {
          cod: true,
          linepay: linePayEnabled,
          jkopay: linePayEnabled,
          transfer: transferEnabled,
        },
      ];
    }),
  ) as Record<string, PaymentAvailability>;
}

function getPaymentRoutingForMethod(
  paymentRouting: Record<string, unknown>,
  method: string,
): Record<string, unknown> {
  const configured = paymentRouting[method];
  if (
    configured &&
    typeof configured === "object" &&
    !Array.isArray(configured)
  ) {
    return asJsonRecord(configured);
  }
  return { ...COD_ONLY_PAYMENT };
}

export function resolveDeliveryConfigFromSettings(options: {
  deliveryConfig: DeliveryConfigRow[];
  paymentRoutingConfig: Record<string, unknown> | null;
  linePayEnabled: boolean;
  transferEnabled: boolean;
}): DeliveryConfigRow[] {
  if (options.deliveryConfig.length > 0) return options.deliveryConfig;

  const paymentRouting = options.paymentRoutingConfig ||
    buildDefaultPaymentRouting(
      options.linePayEnabled,
      options.transferEnabled,
    );

  return STANDARD_DELIVERY_METHODS.map((method) => ({
    id: method,
    enabled: true,
    payment: getPaymentRoutingForMethod(paymentRouting, method),
  }));
}

async function loadDeliveryConfig() {
  const { data: settingsData } = await supabase.from("coffee_settings")
    .select("key, value")
    .in("key", [
      "delivery_options_config",
      "payment_routing_config",
      "linepay_enabled",
      "transfer_enabled",
    ]);

  let deliveryConfig: DeliveryConfigRow[] = [];
  let routingConfig: Record<string, unknown> | null = null;
  let linePayEnabled = false;
  let transferEnabled = false;

  settingsData?.forEach((r: Record<string, unknown>) => {
    if (r.key === "delivery_options_config") {
      deliveryConfig = parseJsonArray<Record<string, unknown>>(r.value);
      return;
    }

    if (r.key === "payment_routing_config") {
      routingConfig = tryParseJsonRecord(r.value);
      return;
    }

    if (r.key === "linepay_enabled") {
      linePayEnabled = String(r.value) === "true";
      return;
    }

    if (r.key === "transfer_enabled") {
      transferEnabled = String(r.value) === "true";
    }
  });

  return resolveDeliveryConfigFromSettings({
    deliveryConfig,
    paymentRoutingConfig: routingConfig,
    linePayEnabled,
    transferEnabled,
  });
}

function parseRequestItems(data: Record<string, unknown>): QuoteRequestItem[] {
  if (!Array.isArray(data.items)) return [];

  return data.items.map((raw) => {
    const item = asJsonRecord(raw);
    return {
      productId: Number(item.productId),
      specKey: item.specKey ? String(item.specKey) : "",
      qty: Math.max(1, Math.floor(Number(item.qty) || 1)),
    };
  }).filter((item) => Number.isFinite(item.productId) && item.productId > 0);
}

type QuoteProductPriceResult =
  | { success: true; unitPrice: number; specLabel: string }
  | { success: false; error: string };

function parseProductSpecs(
  product: QuoteProductRow,
): QuoteProductSpec[] | null {
  if (!product.specs) return [];
  if (typeof product.specs === "string") {
    return tryParseJsonArray<QuoteProductSpec>(product.specs);
  }
  if (Array.isArray(product.specs)) return product.specs as QuoteProductSpec[];
  return [];
}

function resolveQuoteProductPrice(
  product: QuoteProductRow,
  specKey: string,
): QuoteProductPriceResult {
  if (!product.specs) {
    if (specKey && specKey !== "default") {
      return {
        success: false,
        error: `商品「${product.name}」無可選規格，請重新整理商品列表`,
      };
    }
    return {
      success: true,
      unitPrice: Number(product.price) || 0,
      specLabel: "",
    };
  }

  if (!specKey) {
    return { success: false, error: `商品「${product.name}」必須選擇規格` };
  }

  const specList = parseProductSpecs(product);
  if (!specList) {
    return { success: false, error: `商品「${product.name}」規格解析失敗` };
  }

  try {
    const spec = specList.find((s: QuoteProductSpec) =>
      String(s.key) === specKey ||
      String(s.label || "") === specKey ||
      String(s.name || "") === specKey
    );
    if (!spec) {
      return {
        success: false,
        error: `商品「${product.name}」的規格「${specKey}」不存在`,
      };
    }
    if (spec.enabled === false) {
      return {
        success: false,
        error: `商品「${product.name}」的規格「${specKey}」已停止供應`,
      };
    }
    return {
      success: true,
      unitPrice: Number(spec.price ?? product.price) || 0,
      specLabel: String(spec.label || specKey),
    };
  } catch (_error) {
    return { success: false, error: `商品「${product.name}」規格解析失敗` };
  }
}

export type ComputeOrderQuoteParams = {
  cartItems: QuoteRequestItem[];
  requestedDeliveryMethod: string;
  requestedPaymentMethod: PaymentMethod | "";
  products: QuoteProductRow[];
  deliveryConfig: DeliveryConfigRow[];
  activePromos: Record<string, unknown>[];
  promoNow?: Date;
};

export function computeOrderQuote(
  params: ComputeOrderQuoteParams,
): QuoteResult {
  const {
    cartItems,
    requestedDeliveryMethod,
    requestedPaymentMethod,
    products,
    deliveryConfig,
    activePromos,
    promoNow = new Date(),
  } = params;

  if (cartItems.length === 0) return { success: false, error: "購物車是空的" };

  if (
    requestedDeliveryMethod &&
    !VALID_DELIVERY_METHODS.includes(requestedDeliveryMethod)
  ) {
    return { success: false, error: "無效的配送方式" };
  }

  const productMap = new Map<number, QuoteProductRow>(
    products.map((p: QuoteProductRow) => [Number(p.id), p]),
  );

  const quoteItems: QuoteLineItem[] = [];
  let subtotal = 0;

  for (const item of cartItems) {
    const product = productMap.get(item.productId);
    if (!product) {
      return { success: false, error: `商品 ID ${item.productId} 不存在` };
    }
    if (product.enabled === false) {
      return { success: false, error: `商品「${product.name}」已下架` };
    }

    const specKey = String(item.specKey || "");
    const priceResult = resolveQuoteProductPrice(product, specKey);
    if (!priceResult.success) {
      return { success: false, error: priceResult.error };
    }

    const qty = Math.max(1, Math.floor(Number(item.qty) || 1));
    const lineTotal = qty * priceResult.unitPrice;
    subtotal += lineTotal;
    quoteItems.push({
      productId: item.productId,
      productName: String(product.name || ""),
      specKey,
      specLabel: priceResult.specLabel,
      qty,
      unitPrice: priceResult.unitPrice,
      lineTotal,
    });
  }

  const enabledDeliveryOptions = deliveryConfig.filter(
    (opt) => opt && opt.enabled !== false,
  );
  if (enabledDeliveryOptions.length === 0) {
    return { success: false, error: "目前沒有可用的配送方式" };
  }

  const deliveryMethod = requestedDeliveryMethod ||
    String(enabledDeliveryOptions[0].id || "");
  const selectedDeliveryOpt = enabledDeliveryOptions.find((d) =>
    String(d.id) === deliveryMethod
  );
  if (!selectedDeliveryOpt) {
    return { success: false, error: "該取貨方式已停用或不存在" };
  }

  const availablePaymentMethods = toPaymentAvailability(
    asJsonRecord(selectedDeliveryOpt.payment),
  );
  if (
    requestedPaymentMethod &&
    !availablePaymentMethods[requestedPaymentMethod]
  ) {
    return {
      success: false,
      error: `該取貨方式目前不支援此付款方式：${requestedPaymentMethod}`,
    };
  }

  const activePromosFiltered = activePromos.filter((
    prm: Record<string, unknown>,
  ) =>
    isPromotionActive(
      String(prm.start_time || ""),
      String(prm.end_time || ""),
      promoNow,
    )
  );

  let totalDiscount = 0;
  const appliedPromos: Array<{ name: string; amount: number }> = [];
  const discountedItemKeys = new Set<string>();

  for (const prm of activePromosFiltered) {
    if (prm.type !== "bundle") continue;

    const targetIds = parseMaybeJsonArray<number>(prm.target_product_ids);
    const targetItems = parseMaybeJsonArray<Record<string, unknown>>(
      prm.target_items,
    );

    let matchQty = 0;
    let matchItemsSubtotal = 0;
    const matchedKeys: string[] = [];

    for (const item of quoteItems) {
      const matchInItems = Array.isArray(targetItems) &&
        targetItems.some((t: Record<string, unknown>) => {
          if (Number(t.productId) !== item.productId) return false;
          const targetSpec = String(t.specKey || "");
          return !targetSpec || targetSpec === item.specKey;
        });
      const matchInOldIds = Array.isArray(targetIds) &&
        targetIds.includes(item.productId);

      if (matchInItems || matchInOldIds) {
        matchQty += item.qty;
        matchItemsSubtotal += item.lineTotal;
        matchedKeys.push(`${item.productId}-${item.specKey}`);
      }
    }

    if (matchQty < (Number(prm.min_quantity) || 1)) continue;

    let discountAmount = 0;
    if (prm.discount_type === "percent") {
      discountAmount = calcPercentDiscountAmount(
        matchItemsSubtotal,
        Number(prm.discount_value) || 0,
      );
    } else if (prm.discount_type === "amount") {
      const minQty = Number(prm.min_quantity) || 1;
      const sets = Math.floor(matchQty / minQty);
      discountAmount = sets * (Number(prm.discount_value) || 0);
    }

    discountAmount = Math.min(discountAmount, Math.max(0, matchItemsSubtotal));
    if (discountAmount <= 0) continue;

    totalDiscount += discountAmount;
    appliedPromos.push({
      name: String(prm.name || ""),
      amount: discountAmount,
    });
    matchedKeys.forEach((key) => discountedItemKeys.add(key));
  }

  const afterDiscount = Math.max(0, subtotal - totalDiscount);
  const fee = Number(selectedDeliveryOpt.fee) || 0;
  const freeThreshold = Number(selectedDeliveryOpt.free_threshold) || 0;
  const shippingFee = (freeThreshold > 0 && afterDiscount >= freeThreshold)
    ? 0
    : fee;
  const total = afterDiscount + shippingFee;

  const orderLines = quoteItems.map((item) =>
    `${item.productName}${
      item.specLabel ? ` (${item.specLabel})` : ""
    } x ${item.qty} (${item.lineTotal}元)`
  );
  if (appliedPromos.length > 0) {
    orderLines.push("---");
    appliedPromos.forEach((p) => {
      orderLines.push(`🎁 ${p.name} (-$${p.amount})`);
    });
  }
  orderLines.push(`🚚 運費: $${shippingFee}`);

  return {
    success: true,
    quote: {
      deliveryMethod,
      availablePaymentMethods,
      items: quoteItems,
      appliedPromos,
      discountedItemKeys: Array.from(discountedItemKeys),
      subtotal,
      totalDiscount,
      afterDiscount,
      shippingFee,
      total,
      orderLines,
      ordersText: orderLines.join("\n"),
    },
  };
}

export async function buildOrderQuote(
  data: Record<string, unknown>,
): Promise<QuoteResult> {
  const cartItems = parseRequestItems(data);
  if (cartItems.length === 0) return { success: false, error: "購物車是空的" };

  const requestedDeliveryMethod = String(data.deliveryMethod || "").trim();
  const requestedPaymentMethodRaw = String(data.paymentMethod || "").trim();

  if (
    requestedPaymentMethodRaw && !isPaymentMethod(requestedPaymentMethodRaw)
  ) {
    return { success: false, error: "無效的付款方式" };
  }
  const requestedPaymentMethod: PaymentMethod | "" =
    requestedPaymentMethodRaw && isPaymentMethod(requestedPaymentMethodRaw)
      ? requestedPaymentMethodRaw
      : "";

  const productIds = [...new Set(cartItems.map((c) => c.productId))];
  const { data: products, error: pErr } = await supabase.from("coffee_products")
    .select("id, name, price, specs, enabled")
    .in("id", productIds);
  if (pErr || !products) return { success: false, error: "無法讀取商品資料" };

  const deliveryConfig = await loadDeliveryConfig();

  const { data: promotionsRaw } = await supabase.from("coffee_promotions")
    .select("*")
    .eq("enabled", true);

  return computeOrderQuote({
    cartItems,
    requestedDeliveryMethod,
    requestedPaymentMethod,
    products,
    deliveryConfig,
    activePromos: promotionsRaw || [],
    promoNow: new Date(),
  });
}

export async function quoteOrder(data: Record<string, unknown>) {
  return await buildOrderQuote(data);
}
