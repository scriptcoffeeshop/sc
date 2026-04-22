import { computed, ref } from "vue";

const defaultCartSummary = {
  subtotal: 0,
  appliedPromos: [],
  totalDiscount: 0,
  discountedItemKeys: [],
  afterDiscount: 0,
  totalAfterDiscount: 0,
  shippingFee: 0,
  finalTotal: 0,
  quoteAvailable: false,
};

function itemKey(productId, specKey = "") {
  return `${Number(productId)}-${String(specKey || "")}`;
}

const defaultCartApi = {
  addToCart: () => {},
  getCartSnapshot: () => [],
  removeCartItem: () => {},
  toggleCart: () => {},
  updateCartItemQty: () => {},
  updateCartItemQtyByKeys: () => {},
};

export function useStorefrontCart(deps = {}) {
  const cartApi = deps.cartApi || defaultCartApi;
  const orderApi = deps.orderApi || { submitOrder: () => {} };

  const cartItems = ref([]);
  const selectedDelivery = ref("");
  const deliveryName = ref("該配送方式");
  const shippingConfig = ref(null);
  const cartSummary = ref({ ...defaultCartSummary });

  const discountedItemKeySet = computed(() =>
    new Set(Array.isArray(cartSummary.value.discountedItemKeys)
      ? cartSummary.value.discountedItemKeys
      : []),
  );

  const totalPriceText = computed(() =>
    `$${Number(cartSummary.value.finalTotal || 0)}`,
  );

  const hasPromos = computed(() =>
    cartSummary.value.totalDiscount > 0 &&
    Array.isArray(cartSummary.value.appliedPromos) &&
    cartSummary.value.appliedPromos.length > 0,
  );

  const hasShippingRule = computed(() => {
    const fee = Number(shippingConfig.value?.fee || 0);
    const threshold = Number(shippingConfig.value?.freeThreshold || 0);
    const quoteFee = Number(cartSummary.value.shippingFee || 0);
    return threshold > 0 || fee > 0 || quoteFee > 0;
  });

  const showShippingBadge = computed(() =>
    !!(
      selectedDelivery.value &&
      cartSummary.value.quoteAvailable &&
      hasShippingRule.value
    ),
  );

  const isFreeShipping = computed(() =>
    !!(
      showShippingBadge.value &&
      Number(shippingConfig.value?.freeThreshold || 0) > 0 &&
      Number(cartSummary.value.shippingFee || 0) === 0
    ),
  );

  const showShippingNotice = computed(() =>
    !!(
      showShippingBadge.value &&
      !isFreeShipping.value &&
      Number(cartSummary.value.shippingFee || 0) > 0
    ),
  );

  const shippingNoticeTitle = computed(() =>
    Number(shippingConfig.value?.freeThreshold || 0) > 0
      ? `未達 ${deliveryName.value}免運門檻`
      : `${deliveryName.value}運費`,
  );

  const showDiscountSection = computed(() =>
    hasPromos.value || isFreeShipping.value,
  );

  const shippingDiff = computed(() => {
    const threshold = Number(shippingConfig.value?.freeThreshold || 0);
    if (!threshold) return 0;
    const diff = threshold - Number(cartSummary.value.totalAfterDiscount || 0);
    return diff > 0 ? diff : 0;
  });

  const freeShippingThresholdText = computed(() => {
    const threshold = Number(shippingConfig.value?.freeThreshold || 0);
    return threshold > 0 ? ` (滿$${threshold})` : "";
  });

  const cartQtyMap = computed(() => {
    const map = new Map();
    cartItems.value.forEach((item) => {
      map.set(
        itemKey(item.productId, item.specKey),
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

  function getSpecQty(productId, specKey) {
    return cartQtyMap.value.get(itemKey(productId, specKey)) || 0;
  }

  function changeSpecQty(productId, specKey, delta) {
    if (delta > 0 && getSpecQty(productId, specKey) <= 0) {
      cartApi.addToCart(productId, specKey);
      return;
    }
    cartApi.updateCartItemQtyByKeys(productId, specKey, delta);
  }

  function changeCartItemQty(index, delta) {
    cartApi.updateCartItemQty(index, delta);
  }

  function removeCartIndex(index) {
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

  function handleCartUpdated(event) {
    const detail = event?.detail || {};
    cartItems.value = Array.isArray(detail.items) ? detail.items : [];
    selectedDelivery.value = String(detail.selectedDelivery || "");
    deliveryName.value = String(detail.deliveryName || "該配送方式");
    shippingConfig.value = detail.shippingConfig || null;
    cartSummary.value = {
      ...cartSummary.value,
      ...(detail.summary || {}),
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
