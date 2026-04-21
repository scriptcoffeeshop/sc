<template>
  <StorefrontHeader
    @close-announcement="handleCloseAnnouncement"
    @login="handleStorefrontLogin"
    @show-my-orders="handleShowMyOrders"
    @show-profile="handleShowProfile"
    @logout="handleStorefrontLogout"
  />

  <UiCard class="max-w-3xl mx-auto p-6 md:p-8">
      <StorefrontProductGrid
        :categories="productsCategories"
        :spec-qty-map="cartQtyMap"
        @change-spec-qty="changeSpecQty"
      />

      <StorefrontDeliverySection
        :delivery-options="deliveryOptions"
        :selected-delivery="selectedDelivery"
        :selected-check-icon-url="selectedCheckIconUrl"
        @select-delivery="handleSelectDelivery"
        @open-store-map="handleOpenStoreMap"
        @clear-selected-store="handleClearSelectedStore"
      />

      <div id="dynamic-fields-container"></div>

      <StorefrontPaymentSection
        :bank-accounts="bankAccounts"
        :selected-bank-account-id="selectedBankAccountId"
        :copied-bank-account-id="copiedBankAccountId"
        :total-price-text="totalPriceText"
        :selected-check-icon-url="selectedCheckIconUrl"
        @select-payment="handleSelectPayment"
        @select-bank-account="handleSelectBankAccount"
        @copy-transfer-account="handleCopyTransferAccount"
      />

      <!-- 政策同意 -->
      <div class="mb-4">
        <label class="flex items-start gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            id="policy-agree"
            class="mt-1 w-4 h-4 rounded accent-[#3C2415] shrink-0"
          >
          <span class="text-sm text-gray-600">
            我已閱讀並同意
            <a
              href="policy.html"
              target="_blank"
              class="font-medium underline hover:opacity-80"
              style="color: var(--primary)"
            >隱私權政策及退換貨政策</a>
          </span>
        </label>
        <p id="policy-agree-hint" class="hidden text-xs text-red-500 mt-1 ml-6">
          請先勾選同意政策後才能送出訂單
        </p>
      </div>

      <!-- 收據資訊 -->
      <div class="mb-6">
        <label class="flex items-start gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            id="receipt-request"
            class="mt-1 w-4 h-4 rounded accent-[#3C2415] shrink-0"
          >
          <span class="text-sm text-gray-700">我要索取免用統一發票收據</span>
        </label>
        <div
          id="receipt-fields"
          class="hidden mt-3 ml-6 p-3 rounded-xl border border-amber-200 bg-amber-50 space-y-3"
        >
          <div>
            <label class="block text-sm text-gray-600 mb-1">統一編號（選填）</label>
            <input
              id="receipt-tax-id"
              type="text"
              class="input-field"
              placeholder="若需公司報帳請填 8 碼統編"
              maxlength="8"
              pattern="\d{8}"
              inputmode="numeric"
            >
          </div>
          <div>
            <label class="block text-sm text-gray-600 mb-1">買受人（選填）</label>
            <input
              id="receipt-buyer"
              type="text"
              class="input-field"
              placeholder="請輸入買受人名稱"
            >
          </div>
          <div>
            <label class="block text-sm text-gray-600 mb-1">地址（選填）</label>
            <input
              id="receipt-address"
              type="text"
              class="input-field"
              placeholder="請輸入收據地址"
            >
          </div>
          <label class="flex items-center gap-2 cursor-pointer select-none">
            <input
              id="receipt-date-stamp"
              type="checkbox"
              class="w-4 h-4 rounded accent-[#3C2415] shrink-0"
            >
            <span class="text-sm text-gray-700">是否需要壓印日期</span>
          </label>
        </div>
      </div>

      <!-- 備註 -->
      <div class="mb-6">
        <label
          class="block font-medium mb-2"
          style="color: var(--primary)"
          id="notes-section-title"
        >
          <span class="section-heading-inline">
            <span class="ui-icon-title"><img id="notes-section-icon" src="../../../icons/notes-pencil.png" alt="備註區塊圖示" class="ui-icon-img"></span>
            <span id="notes-section-title-text">訂單備註</span>
          </span>
        </label>
        <UiTextarea
          id="order-note"
          class="input-field resize-none"
          rows="2"
          placeholder="如有特殊需求請在此備註..."
        />
      </div>

      <div class="content-spacer"></div>
  </UiCard>

  <StorefrontBottomBar
    :cart-summary="cartSummary"
    :show-shipping-badge="showShippingBadge"
    :is-free-shipping="isFreeShipping"
    :total-price-text="totalPriceText"
    :cart-count="cartItemCount"
    @toggle-cart="toggleCartDrawer"
  />

  <StorefrontCartDrawer
    :cart-items="cartItems"
    :discounted-item-keys="discountedItemKeySet"
    :cart-summary="cartSummary"
    :show-shipping-notice="showShippingNotice"
    :shipping-notice-title="shippingNoticeTitle"
    :shipping-diff="shippingDiff"
    :show-discount-section="showDiscountSection"
    :is-free-shipping="isFreeShipping"
    :delivery-name="deliveryName"
    :free-shipping-threshold-text="freeShippingThresholdText"
    :total-price-text="totalPriceText"
    @toggle-cart="toggleCartDrawer"
    @change-cart-item-qty="changeCartItemQty"
    @remove-cart-index="removeCartIndex"
    @submit-order="submitOrderFromCart"
  />

  <StorefrontOrderHistoryModal @close="handleCloseOrdersModal" />
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import UiCard from "../components/ui/card/Card.vue";
import UiTextarea from "../components/ui/textarea/Textarea.vue";
import StorefrontBottomBar from "../features/storefront/StorefrontBottomBar.vue";
import StorefrontCartDrawer from "../features/storefront/StorefrontCartDrawer.vue";
import StorefrontDeliverySection from "../features/storefront/StorefrontDeliverySection.vue";
import StorefrontHeader from "../features/storefront/StorefrontHeader.vue";
import StorefrontOrderHistoryModal from "../features/storefront/StorefrontOrderHistoryModal.vue";
import StorefrontPaymentSection from "../features/storefront/StorefrontPaymentSection.vue";
import StorefrontProductGrid from "../features/storefront/StorefrontProductGrid.vue";
import {
  clearSelectedStore,
  selectDelivery,
  openStoreMap,
} from "../../../js/delivery.js";
import { Toast } from "../../../js/utils.js";
import {
  addToCart,
  getCartSnapshot,
  removeCartItem,
  toggleCart,
  updateCartItemQty,
  updateCartItemQtyByKeys,
} from "../../../js/cart.js";
import { getDefaultIconUrl } from "../../../js/icons.js";
import {
  getStorefrontUiSnapshot,
  initMainApp,
  logoutCurrentUser,
  selectBankAccount,
  selectPayment,
  showProfileModal,
  startMainLogin,
} from "../../../js/main-app.js";
import { showMyOrders, submitOrder } from "../../../js/orders.js";
import { getProductsViewModel } from "../../../js/products.js";

const originalBodyClass = document.body.className;
const productsCategories = ref([]);
const cartItems = ref([]);
const deliveryOptions = ref([]);
const bankAccounts = ref([]);
const selectedBankAccountId = ref("");
const selectedDelivery = ref("");
const deliveryName = ref("該配送方式");
const shippingConfig = ref(null);
const copiedBankAccountId = ref("");
const selectedCheckIconUrl = getDefaultIconUrl("selected");
const cartSummary = ref({
  subtotal: 0,
  appliedPromos: [],
  totalDiscount: 0,
  discountedItemKeys: [],
  afterDiscount: 0,
  totalAfterDiscount: 0,
  shippingFee: 0,
  finalTotal: 0,
  quoteAvailable: false,
});

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
      `${Number(item.productId)}-${String(item.specKey || "")}`,
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

function itemKey(productId, specKey = "") {
  return `${Number(productId)}-${String(specKey || "")}`;
}

function getSpecQty(productId, specKey) {
  return cartQtyMap.value.get(itemKey(productId, specKey)) || 0;
}

function changeSpecQty(productId, specKey, delta) {
  if (delta > 0 && getSpecQty(productId, specKey) <= 0) {
    addToCart(productId, specKey);
    return;
  }
  updateCartItemQtyByKeys(productId, specKey, delta);
}

function changeCartItemQty(index, delta) {
  updateCartItemQty(index, delta);
}

function removeCartIndex(index) {
  removeCartItem(index);
}

function toggleCartDrawer() {
  toggleCart();
}

function submitOrderFromCart() {
  toggleCart();
  void submitOrder();
}

function handleCloseAnnouncement() {
  document.getElementById("announcement-banner")?.classList.add("hidden");
}

function handleStorefrontLogin() {
  void startMainLogin();
}

function handleStorefrontLogout() {
  logoutCurrentUser();
}

function handleShowProfile() {
  void showProfileModal();
}

function handleShowMyOrders() {
  void showMyOrders();
}

function handleCloseOrdersModal() {
  document.getElementById("my-orders-modal")?.classList.add("hidden");
}

function handleSelectPayment(method) {
  selectPayment(method);
  syncStorefrontUiState();
}

function handleSelectDelivery(method) {
  selectDelivery(method);
  syncStorefrontUiState();
}

function handleOpenStoreMap() {
  void openStoreMap();
}

function handleClearSelectedStore() {
  clearSelectedStore();
}

function handleSelectBankAccount(bankId) {
  selectBankAccount(bankId);
  syncStorefrontUiState();
}

function handleCopyTransferAccount(bankId, accountNumber) {
  const account = String(accountNumber || "").trim();
  if (!account) return;
  navigator.clipboard.writeText(account)
    .then(() => {
      copiedBankAccountId.value = String(bankId);
      Toast.fire({ icon: "success", title: "帳號已複製" });
      window.setTimeout(() => {
        if (copiedBankAccountId.value === String(bankId)) {
          copiedBankAccountId.value = "";
        }
      }, 2000);
    })
    .catch(() => Swal.fire("錯誤", "複製失敗，請手動複製", "error"));
}

function syncStorefrontUiState() {
  const snapshot = getStorefrontUiSnapshot();
  deliveryOptions.value = Array.isArray(snapshot.deliveryConfig)
    ? snapshot.deliveryConfig.filter((item) => item && item.enabled !== false)
    : [];
  bankAccounts.value = Array.isArray(snapshot.bankAccounts)
    ? snapshot.bankAccounts
    : [];
  selectedBankAccountId.value = String(snapshot.selectedBankAccountId || "");
}

function handleProductsUpdated(event) {
  const detail = event?.detail || {};
  productsCategories.value = Array.isArray(detail.categories)
    ? detail.categories
    : [];
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
  syncStorefrontUiState();
}

onMounted(() => {
  document.body.className = "p-4 md:p-6";

  window.addEventListener("coffee:products-updated", handleProductsUpdated);
  window.addEventListener("coffee:cart-updated", handleCartUpdated);

  const productsContainer = document.getElementById("products-container");
  const cartContainer = document.getElementById("cart-items");
  if (productsContainer) productsContainer.dataset.vueManaged = "true";
  if (cartContainer) cartContainer.dataset.vueManaged = "true";

  const productVm = getProductsViewModel();
  productsCategories.value = Array.isArray(productVm.categories)
    ? productVm.categories
    : [];
  cartItems.value = getCartSnapshot();

  void initMainApp().then(() => {
    syncStorefrontUiState();
  });
});

onBeforeUnmount(() => {
  window.removeEventListener("coffee:products-updated", handleProductsUpdated);
  window.removeEventListener("coffee:cart-updated", handleCartUpdated);
  document.body.className = originalBodyClass;
});
</script>
