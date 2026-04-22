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

  <StorefrontOrderHistoryModal
    :is-open="isOrderHistoryOpen"
    :state="orderHistoryState"
    :error-text="orderHistoryError"
    :orders="ordersView"
    @close="handleCloseOrdersModal"
    @copy-tracking-number="copyTrackingNumber"
  />
</template>

<script setup>
import { onBeforeUnmount, onMounted } from "vue";
import UiCard from "../components/ui/card/Card.vue";
import UiTextarea from "../components/ui/textarea/Textarea.vue";
import StorefrontBottomBar from "../features/storefront/StorefrontBottomBar.vue";
import StorefrontCartDrawer from "../features/storefront/StorefrontCartDrawer.vue";
import StorefrontDeliverySection from "../features/storefront/StorefrontDeliverySection.vue";
import StorefrontHeader from "../features/storefront/StorefrontHeader.vue";
import StorefrontOrderHistoryModal from "../features/storefront/StorefrontOrderHistoryModal.vue";
import StorefrontPaymentSection from "../features/storefront/StorefrontPaymentSection.vue";
import StorefrontProductGrid from "../features/storefront/StorefrontProductGrid.vue";
import { useStorefrontCart } from "../features/storefront/useStorefrontCart.js";
import { useStorefrontOrderHistory } from "../features/storefront/useStorefrontOrderHistory.js";
import { useStorefrontShell } from "../features/storefront/useStorefrontShell.js";
import {
  clearSelectedStore,
  selectDelivery,
  openStoreMap,
} from "../../../js/delivery.js";
import { Toast } from "../../../js/utils.js";
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
import { submitOrder } from "../../../js/orders.js";

const originalBodyClass = document.body.className;
const selectedCheckIconUrl = getDefaultIconUrl("selected");
const {
  cartItems,
  selectedDelivery,
  deliveryName,
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
  handleCartUpdated: syncCartFromEvent,
  changeSpecQty,
  changeCartItemQty,
  removeCartIndex,
  toggleCartDrawer,
  submitOrderFromCart,
} = useStorefrontCart({ orderApi: { submitOrder } });
const {
  isOrderHistoryOpen,
  orderHistoryError,
  orderHistoryState,
  ordersView,
  openOrderHistory,
  closeOrderHistory,
  copyTrackingNumber,
} = useStorefrontOrderHistory();
const {
  productsCategories,
  deliveryOptions,
  bankAccounts,
  selectedBankAccountId,
  copiedBankAccountId,
  syncStorefrontUiState,
  handleProductsUpdated,
  handleCloseAnnouncement,
  handleStorefrontLogin,
  handleStorefrontLogout,
  handleShowProfile,
  handleShowMyOrders,
  handleCloseOrdersModal,
  handleSelectPayment,
  handleSelectDelivery,
  handleOpenStoreMap,
  handleClearSelectedStore,
  handleSelectBankAccount,
  handleCopyTransferAccount,
} = useStorefrontShell({
  document,
  clipboard: navigator.clipboard,
  setTimeout: window.setTimeout.bind(window),
  Swal,
  Toast,
  getStorefrontUiSnapshot,
  clearSelectedStore,
  selectDelivery,
  openStoreMap,
  selectPayment,
  selectBankAccount,
  startMainLogin,
  logoutCurrentUser,
  showProfileModal,
  showMyOrders: openOrderHistory,
  closeOrderHistory,
});

function handleCartUpdated(event) {
  syncCartFromEvent(event);
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

  syncCartSnapshot();

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
