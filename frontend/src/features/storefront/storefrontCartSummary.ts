export interface StorefrontCartItemLike {
  productId?: number | string;
  specKey?: string;
  qty?: number | string;
  unitPrice?: number | string;
}

export interface StorefrontCartQuoteLike {
  items?: StorefrontCartItemLike[];
  deliveryMethod?: string;
  subtotal?: number | string;
  totalDiscount?: number | string;
  afterDiscount?: number | string;
  shippingFee?: number | string;
  total?: number | string;
  appliedPromos?: Array<{ name?: string; amount?: number; discount?: number }>;
  discountedItemKeys?: string[] | Set<string>;
}

export interface StorefrontShippingConfigLike {
  fee?: number | string;
  freeThreshold?: number | string;
}

export interface StorefrontCartSummary {
  subtotal: number;
  appliedPromos: Array<{ name?: string; amount?: number; discount?: number }>;
  totalDiscount: number;
  discountedItemKeys: Set<string>;
  afterDiscount: number;
  totalAfterDiscount: number;
  shippingFee: number;
  finalTotal: number;
  quoteAvailable: boolean;
}

export interface StorefrontShippingDisplayState {
  configuredFee: number;
  freeThreshold: number;
  shippingFee: number;
  hasFreeThreshold: boolean;
  hasShippingRule: boolean;
  showBadge: boolean;
  isFreeShipping: boolean;
  showNotice: boolean;
}

export interface StorefrontDeliveryMeta {
  selectedDelivery: string;
  deliveryName: string;
}

function toSafeNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function toItemKey(productId: unknown, specKey = ""): string {
  return `${Number(productId)}-${String(specKey || "")}`;
}

export function toQtyMap(
  items: StorefrontCartItemLike[] = [],
): Map<string, number> {
  const map = new Map<string, number>();
  items.forEach((item) => {
    map.set(
      toItemKey(item.productId, String(item.specKey || "")),
      Math.max(1, Number(item.qty) || 1),
    );
  });
  return map;
}

export function getShippingDisplayState(
  summary: Partial<StorefrontCartSummary>,
  shippingConfig: StorefrontShippingConfigLike | null | undefined,
  selectedDelivery: string,
): StorefrontShippingDisplayState {
  const configuredFee = Math.max(0, toSafeNumber(shippingConfig?.fee));
  const freeThreshold = Math.max(0, toSafeNumber(shippingConfig?.freeThreshold));
  const shippingFee = Math.max(0, toSafeNumber(summary?.shippingFee));
  const hasFreeThreshold = freeThreshold > 0;
  const hasShippingRule = hasFreeThreshold || configuredFee > 0 || shippingFee > 0;
  const showBadge = !!(selectedDelivery && summary?.quoteAvailable && hasShippingRule);
  const isFreeShipping = showBadge && hasFreeThreshold && shippingFee === 0;
  const showNotice = showBadge && shippingFee > 0;

  return {
    configuredFee,
    freeThreshold,
    shippingFee,
    hasFreeThreshold,
    hasShippingRule,
    showBadge,
    isFreeShipping,
    showNotice,
  };
}

export function getDeliveryMeta(
  selectedDelivery: string,
  deliveryOptionsConfig: string | null | undefined,
): StorefrontDeliveryMeta {
  const fallback = {
    selectedDelivery: selectedDelivery || "",
    deliveryName: "該配送方式",
  };
  try {
    const parsed = JSON.parse(String(deliveryOptionsConfig || "[]"));
    const selected = Array.isArray(parsed)
      ? parsed.find((opt) => opt?.id === selectedDelivery)
      : null;
    if (selected?.name) {
      return {
        selectedDelivery: selectedDelivery || "",
        deliveryName: String(selected.name),
      };
    }
  } catch (_error) {
  }
  return fallback;
}

export function isQuoteAlignedWithCart(
  quote: StorefrontCartQuoteLike | null | undefined,
  items: StorefrontCartItemLike[],
  selectedDelivery: string,
): boolean {
  if (!quote || !Array.isArray(quote.items)) return false;
  if (
    selectedDelivery && quote.deliveryMethod &&
    quote.deliveryMethod !== selectedDelivery
  ) {
    return false;
  }

  const cartMap = toQtyMap(items);
  const quoteMap = toQtyMap(quote.items);
  if (cartMap.size !== quoteMap.size) return false;

  for (const [key, qty] of cartMap.entries()) {
    if (quoteMap.get(key) !== qty) return false;
  }
  return true;
}

export function calcCartSummaryFromState(
  items: StorefrontCartItemLike[],
  quote: StorefrontCartQuoteLike | null | undefined,
  selectedDelivery: string,
): StorefrontCartSummary {
  const subtotal = items.reduce(
    (sum, item) => sum + (Number(item.qty) || 0) * (Number(item.unitPrice) || 0),
    0,
  );

  if (isQuoteAlignedWithCart(quote, items, selectedDelivery)) {
    const totalDiscount = Math.max(0, Number(quote?.totalDiscount) || 0);
    const afterDiscount = Math.max(
      0,
      Number(quote?.afterDiscount) || subtotal - totalDiscount,
    );
    const shippingFee = Math.max(0, Number(quote?.shippingFee) || 0);
    const finalTotal = Math.max(
      0,
      Number(quote?.total) || afterDiscount + shippingFee,
    );
    const appliedPromos = Array.isArray(quote?.appliedPromos)
      ? quote.appliedPromos
      : [];
    const discountedItemKeys = new Set(
      Array.isArray(quote?.discountedItemKeys) ? quote?.discountedItemKeys : [],
    );

    return {
      subtotal: Math.max(0, Number(quote?.subtotal) || subtotal),
      appliedPromos,
      totalDiscount,
      discountedItemKeys,
      afterDiscount,
      totalAfterDiscount: afterDiscount,
      shippingFee,
      finalTotal,
      quoteAvailable: true,
    };
  }

  return {
    subtotal,
    appliedPromos: [],
    totalDiscount: 0,
    discountedItemKeys: new Set(),
    afterDiscount: subtotal,
    totalAfterDiscount: subtotal,
    shippingFee: 0,
    finalTotal: subtotal,
    quoteAvailable: false,
  };
}
