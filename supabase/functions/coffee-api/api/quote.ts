import { supabase } from "../utils/supabase.ts";
import {
  calcPercentDiscountAmount,
  isPromotionActive,
} from "../utils/promotion.ts";

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

export type PaymentMethod = "cod" | "linepay" | "transfer";

type PaymentAvailability = Record<PaymentMethod, boolean>;

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

const VALID_PAYMENT_METHODS: PaymentMethod[] = ["cod", "linepay", "transfer"];

function isPaymentMethod(value: string): value is PaymentMethod {
  return VALID_PAYMENT_METHODS.includes(value as PaymentMethod);
}

function toPaymentAvailability(
  payment: Record<string, unknown> | undefined,
): PaymentAvailability {
  const source = payment || {};
  return {
    cod: source.cod === true || source.cod === "true",
    linepay: source.linepay === true || source.linepay === "true",
    transfer: source.transfer === true || source.transfer === "true",
  };
}

function parseMaybeJsonArray<T = unknown>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
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

  let deliveryConfig: Record<string, unknown>[] = [];
  let routingConfig: Record<string, unknown> | null = null;
  let linePayEnabled = false;
  let transferEnabled = false;

  settingsData?.forEach((r: Record<string, unknown>) => {
    if (r.key === "delivery_options_config") {
      try {
        const parsed = JSON.parse(String(r.value));
        if (Array.isArray(parsed)) deliveryConfig = parsed;
      } catch {
        // ignore malformed setting
      }
      return;
    }

    if (r.key === "payment_routing_config") {
      try {
        const parsed = JSON.parse(String(r.value));
        if (parsed && typeof parsed === "object") {
          routingConfig = parsed as Record<string, unknown>;
        }
      } catch {
        // ignore malformed setting
      }
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

  if (deliveryConfig.length > 0) return deliveryConfig;

  const legacyRouting = routingConfig || {
    in_store: { cod: true, linepay: linePayEnabled, transfer: transferEnabled },
    delivery: { cod: true, linepay: linePayEnabled, transfer: transferEnabled },
    home_delivery: {
      cod: true,
      linepay: linePayEnabled,
      transfer: transferEnabled,
    },
    seven_eleven: { cod: true, linepay: false, transfer: false },
    family_mart: { cod: true, linepay: false, transfer: false },
  };

  return [
    {
      id: "in_store",
      enabled: true,
      payment: legacyRouting.in_store ||
        { cod: true, linepay: false, transfer: false },
    },
    {
      id: "delivery",
      enabled: true,
      payment: legacyRouting.delivery ||
        { cod: true, linepay: false, transfer: false },
    },
    {
      id: "home_delivery",
      enabled: true,
      payment: legacyRouting.home_delivery ||
        { cod: true, linepay: false, transfer: false },
    },
    {
      id: "seven_eleven",
      enabled: true,
      payment: legacyRouting.seven_eleven ||
        { cod: true, linepay: false, transfer: false },
    },
    {
      id: "family_mart",
      enabled: true,
      payment: legacyRouting.family_mart ||
        { cod: true, linepay: false, transfer: false },
    },
  ];
}

function parseRequestItems(data: Record<string, unknown>): QuoteRequestItem[] {
  if (!Array.isArray(data.items)) return [];

  return data.items.map((raw) => {
    const item = (raw || {}) as Record<string, unknown>;
    return {
      productId: Number(item.productId),
      specKey: item.specKey ? String(item.specKey) : "",
      qty: Math.max(1, Math.floor(Number(item.qty) || 1)),
    };
  }).filter((item) => Number.isFinite(item.productId) && item.productId > 0);
}


export type ComputeOrderQuoteParams = {
  cartItems: QuoteRequestItem[];
  requestedDeliveryMethod: string;
  requestedPaymentMethod: PaymentMethod | "";
  products: Record<string, unknown>[];
  deliveryConfig: Record<string, unknown>[];
  activePromos: Record<string, unknown>[];
  promoNow?: Date;
};

export function computeOrderQuote(params: ComputeOrderQuoteParams): QuoteResult {
  const {
    cartItems,
    requestedDeliveryMethod,
    requestedPaymentMethod,
    products,
    deliveryConfig,
    activePromos,
    promoNow = new Date()
  } = params;

  if (cartItems.length === 0) return { success: false, error: "購物車是空的" };

  if (
    requestedDeliveryMethod &&
    !VALID_DELIVERY_METHODS.includes(requestedDeliveryMethod)
  ) {
    return { success: false, error: "無效的配送方式" };
  }

  const productMap = new Map<number, Record<string, unknown>>(
    products.map((p: Record<string, unknown>) => [Number(p.id), p]),
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

    let unitPrice = Number(product.price) || 0;
    let specLabel = "";
    const specKey = String(item.specKey || "");

    if (product.specs) {
      if (!specKey) {
        return { success: false, error: `商品「${product.name}」必須選擇規格` };
      }
      try {
        const specs = typeof product.specs === "string"
          ? JSON.parse(product.specs)
          : product.specs;
        const specList = Array.isArray(specs) ? specs : [];
        const spec = specList.find((s: Record<string, unknown>) =>
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
        unitPrice = Number(spec.price ?? product.price) || 0;
        specLabel = String(spec.label || specKey);
      } catch {
        return { success: false, error: `商品「${product.name}」規格解析失敗` };
      }
    } else if (specKey && specKey !== "default") {
      return {
        success: false,
        error: `商品「${product.name}」無可選規格，請重新整理商品列表`,
      };
    }

    const qty = Math.max(1, Math.floor(Number(item.qty) || 1));
    const lineTotal = qty * unitPrice;
    subtotal += lineTotal;
    quoteItems.push({
      productId: item.productId,
      productName: String(product.name || ""),
      specKey,
      specLabel,
      qty,
      unitPrice,
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
    (selectedDeliveryOpt.payment as Record<string, unknown>) || {},
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

export async function buildOrderQuote(data: Record<string, unknown>): Promise<QuoteResult> {
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
    promoNow: new Date()
  });
}

export async function quoteOrder(data: Record<string, unknown>) {
  return await buildOrderQuote(data);
}
