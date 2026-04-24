import { computed, ref } from "vue";
import {
  addToCart,
  getCartSnapshot,
  removeCartItem,
  toggleCart,
  updateCartItemQty,
  updateCartItemQtyByKeys,
} from "./storefrontCartStore.ts";
import {
  getShippingDisplayState,
  toItemKey,
} from "./storefrontCartSummary.ts";

interface StorefrontCartItem {
  productId?: number | string;
  specKey?: string;
  productName?: string;
  qty?: number | string;
  unitPrice?: number | string;
}

interface StorefrontCartSummary {
  subtotal?: number;
  appliedPromos?: Array<{ name?: string; amount?: number; discount?: number }>;
  totalDiscount?: number;
  discountedItemKeys?: Set<string>;
  afterDiscount?: number;
  totalAfterDiscount?: number;
  shippingFee?: number;
  finalTotal?: number;
  quoteAvailable?: boolean;
}

interface StorefrontCartSummaryInput
  extends Omit<StorefrontCartSummary, "discountedItemKeys">
{
  discountedItemKeys?: string[] | Set<string>;
}

interface StorefrontShippingConfig {
  fee?: number | string;
  freeThreshold?: number | string;
}

interface StorefrontCartApi {
  addToCart: (productId: unknown, specKey: unknown) => void;
  getCartSnapshot: () => StorefrontCartItem[];
  removeCartItem: (index: number) => void;
  toggleCart: () => void;
  updateCartItemQty: (index: number, delta: number) => void;
  updateCartItemQtyByKeys: (
    productId: unknown,
    specKey: unknown,
    delta: number,
  ) => void;
}

interface StorefrontOrderApi {
  submitOrder: () => Promise<unknown> | unknown;
}

interface StorefrontCartDeps {
  cartApi?: Partial<StorefrontCartApi>;
  orderApi?: Partial<StorefrontOrderApi>;
}

interface StorefrontCartUpdatedEvent {
  detail?: {
    items?: StorefrontCartItem[];
    selectedDelivery?: string;
    deliveryName?: string;
    shippingConfig?: StorefrontShippingConfig | null;
    summary?: StorefrontCartSummaryInput;
  };
}

const defaultCartSummary: Required<StorefrontCartSummary> = {
  subtotal: 0,
  appliedPromos: [],
  totalDiscount: 0,
  discountedItemKeys: new Set<string>(),
  afterDiscount: 0,
  totalAfterDiscount: 0,
  shippingFee: 0,
  finalTotal: 0,
  quoteAvailable: false,
};

function normalizeDiscountedItemKeys(
  value: StorefrontCartSummaryInput["discountedItemKeys"],
  fallback: Set<string>,
) {
  if (value instanceof Set) {
    return new Set(value);
  }
  if (Array.isArray(value)) {
    return new Set(value);
  }
  return new Set(fallback);
}

const defaultCartApi: StorefrontCartApi = {
  addToCart,
  getCartSnapshot,
  removeCartItem,
  toggleCart,
  updateCartItemQty,
  updateCartItemQtyByKeys,
};

const defaultOrderApi: StorefrontOrderApi = {
  submitOrder: () => {},
};

export function useStorefrontCart(deps: StorefrontCartDeps = {}) {
  const cartApi: StorefrontCartApi = {
    ...defaultCartApi,
    ...(deps.cartApi || {}),
  };
  const orderApi: StorefrontOrderApi = {
    ...defaultOrderApi,
    ...(deps.orderApi || {}),
  };

  const cartItems = ref<StorefrontCartItem[]>([]);
  const selectedDelivery = ref("");
  const deliveryName = ref("該配送方式");
  const shippingConfig = ref<StorefrontShippingConfig | null>(null);
  const cartSummary = ref<Required<StorefrontCartSummary>>({
    ...defaultCartSummary,
  });

  const discountedItemKeySet = computed(() =>
    new Set(cartSummary.value.discountedItemKeys),
  );

  const totalPriceText = computed(() =>
    `$${Number(cartSummary.value.finalTotal || 0)}`,
  );

  const hasPromos = computed(() =>
    cartSummary.value.totalDiscount > 0 &&
    Array.isArray(cartSummary.value.appliedPromos) &&
    cartSummary.value.appliedPromos.length > 0,
  );

  const shippingState = computed(() =>
    getShippingDisplayState(
      cartSummary.value,
      shippingConfig.value,
      selectedDelivery.value,
    ),
  );

  const showShippingBadge = computed(() =>
    shippingState.value.showBadge,
  );

  const isFreeShipping = computed(() =>
    shippingState.value.isFreeShipping,
  );

  const showShippingNotice = computed(() =>
    shippingState.value.showNotice,
  );

  const shippingNoticeTitle = computed(() =>
    shippingState.value.hasFreeThreshold
      ? `未達 ${deliveryName.value}免運門檻`
      : `${deliveryName.value}運費`,
  );

  const showDiscountSection = computed(() =>
    hasPromos.value || isFreeShipping.value,
  );

  const shippingDiff = computed(() => {
    const threshold = shippingState.value.freeThreshold;
    if (!threshold) return 0;
    const diff = threshold - Number(cartSummary.value.totalAfterDiscount || 0);
    return diff > 0 ? diff : 0;
  });

  const freeShippingThresholdText = computed(() => {
    const threshold = shippingState.value.freeThreshold;
    return threshold > 0 ? ` (滿$${threshold})` : "";
  });

  const cartQtyMap = computed(() => {
    const map = new Map();
    cartItems.value.forEach((item) => {
      map.set(
        toItemKey(item.productId, String(item.specKey || "")),
        Math.max(1, Number(item.qty) || 1),
      );
    });
    return map;
  });

  const cartItemCount = computed(() =>
    cartItems.value.reduce(
      (sum, item) => sum + Math.max(0, Number(item.qty) || 0),
      0,
    ),
  );

  function getSpecQty(productId: unknown, specKey: unknown) {
    return cartQtyMap.value.get(toItemKey(productId, String(specKey || ""))) || 0;
  }

  function changeSpecQty(productId: unknown, specKey: unknown, delta: number) {
    if (delta > 0 && getSpecQty(productId, specKey) <= 0) {
      cartApi.addToCart(productId, specKey);
      return;
    }
    cartApi.updateCartItemQtyByKeys(productId, specKey, delta);
  }

  function changeCartItemQty(index: number, delta: number) {
    cartApi.updateCartItemQty(index, delta);
  }

  function removeCartIndex(index: number) {
    cartApi.removeCartItem(index);
  }

  function toggleCartDrawer() {
    cartApi.toggleCart();
  }

  function submitOrderFromCart() {
    cartApi.toggleCart();
    void orderApi.submitOrder();
  }

  function syncCartSnapshot() {
    cartItems.value = cartApi.getCartSnapshot();
  }

  function handleCartUpdated(event?: StorefrontCartUpdatedEvent) {
    const detail = event?.detail || {};
    const summary = detail.summary || {};
    cartItems.value = Array.isArray(detail.items) ? detail.items : [];
    selectedDelivery.value = String(detail.selectedDelivery || "");
    deliveryName.value = String(detail.deliveryName || "該配送方式");
    shippingConfig.value = detail.shippingConfig || null;
    cartSummary.value = {
      ...cartSummary.value,
      ...summary,
      discountedItemKeys: normalizeDiscountedItemKeys(
        summary.discountedItemKeys,
        cartSummary.value.discountedItemKeys,
      ),
    };
  }

  return {
    cartItems,
    selectedDelivery,
    deliveryName,
    shippingConfig,
    cartSummary,
    discountedItemKeySet,
    totalPriceText,
    showShippingBadge,
    isFreeShipping,
    showShippingNotice,
    shippingNoticeTitle,
    showDiscountSection,
    shippingDiff,
    freeShippingThresholdText,
    cartQtyMap,
    cartItemCount,
    syncCartSnapshot,
    handleCartUpdated,
    changeSpecQty,
    changeCartItemQty,
    removeCartIndex,
    toggleCartDrawer,
    submitOrderFromCart,
  };
}
