<template>
  <StorefrontHeader
    :current-user="currentUser"
    :branding="branding"
    :announcement-text="announcementText"
    :is-announcement-visible="isAnnouncementVisible"
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
        :section-title="branding.sections.products"
        :load-error-text="loadErrorText"
        @change-spec-qty="changeSpecQty"
        @retry-load="handleRetryStorefrontLoad"
      />

      <StorefrontDeliverySection
        :delivery-options="deliveryOptions"
        :selected-delivery="selectedDelivery"
        :selected-store="selectedStore"
        :local-delivery-address="localDeliveryAddress"
        :local-district-options="localDistrictOptions"
        :home-delivery-address="homeDeliveryAddress"
        :home-county-options="homeCountyOptions"
        :home-district-options="homeDistrictOptions"
        :section-title="branding.sections.delivery"
        :selected-check-icon-url="selectedCheckIconUrl"
        :resolve-delivery-icon="resolveDeliveryIcon"
        @select-delivery="handleSelectDelivery"
        @open-store-map="handleOpenStoreMap"
        @clear-selected-store="handleClearSelectedStore"
        @update-local-delivery-address="updateLocalDeliveryAddress"
        @update-home-delivery-address="updateHomeDeliveryAddress"
      />

      <StorefrontDynamicFields
        :fields="visibleFormFields"
        :selected-delivery="selectedDelivery || dynamicFieldsSelectedDelivery"
        :current-user="dynamicFieldsCurrentUser"
        :field-values="dynamicFieldValues"
        @update-field-value="updateDynamicFieldValue"
      />

      <StorefrontPaymentSection
        :bank-accounts="bankAccounts"
        :selected-bank-account-id="selectedBankAccountId"
        :selected-payment="selectedPayment"
        :payment-availability="paymentAvailability"
        :payment-options="paymentOptions"
        :copied-bank-account-id="copiedBankAccountId"
        :total-price-text="totalPriceText"
        :selected-check-icon-url="selectedCheckIconUrl"
        :transfer-account-last5="transferAccountLast5"
        @select-payment="handleSelectPayment"
        @select-bank-account="handleSelectBankAccount"
        @copy-transfer-account="handleCopyTransferAccount"
        @update-transfer-account-last5="updateTransferAccountLast5"
      />

      <!-- 政策同意 -->
      <div class="mb-4">
        <label class="flex items-start gap-2 cursor-pointer select-none">
          <input
            ref="policyCheckboxEl"
            v-model="policyAgreed"
            type="checkbox"
            id="policy-agree"
            class="mt-1 w-4 h-4 rounded accent-[#3C2415] shrink-0"
            @change="handlePolicyAgreementChanged"
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
        <p
          id="policy-agree-hint"
          class="text-xs text-red-500 mt-1 ml-6"
          :class="{ hidden: !showPolicyHint }"
        >
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
            :checked="receiptRequested"
            @change="handleReceiptRequestedInput"
          >
          <span class="text-sm text-gray-700">我要索取免用統一發票收據</span>
        </label>
        <div
          v-show="receiptRequested"
          id="receipt-fields"
          class="mt-3 ml-6 p-3 rounded-xl border border-amber-200 bg-amber-50 space-y-3"
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
              :value="receiptTaxId"
              @input="handleReceiptTextInput('taxId', $event)"
            >
          </div>
          <div>
            <label class="block text-sm text-gray-600 mb-1">買受人（選填）</label>
            <input
              id="receipt-buyer"
              type="text"
              class="input-field"
              placeholder="請輸入買受人名稱"
              :value="receiptBuyer"
              @input="handleReceiptTextInput('buyer', $event)"
            >
          </div>
          <div>
            <label class="block text-sm text-gray-600 mb-1">地址（選填）</label>
            <input
              id="receipt-address"
              type="text"
              class="input-field"
              placeholder="請輸入收據地址"
              :value="receiptAddress"
              @input="handleReceiptTextInput('address', $event)"
            >
          </div>
          <label class="flex items-center gap-2 cursor-pointer select-none">
            <input
              id="receipt-date-stamp"
              type="checkbox"
              class="w-4 h-4 rounded accent-[#3C2415] shrink-0"
              :checked="receiptNeedDateStamp"
              @change="handleReceiptDateStampInput"
            >
            <span class="text-sm text-gray-700">是否需要壓印日期</span>
          </label>
        </div>
      </div>

      <!-- 備註 -->
      <div class="mb-6">
        <label
          id="notes-section-title"
          class="block mb-2"
          :class="[branding.sections.notes.sizeClass, branding.sections.notes.weightClass]"
          :style="{ color: branding.sections.notes.color }"
        >
          <span class="section-heading-inline">
            <span class="ui-icon-title">
              <img
                id="notes-section-icon"
                :src="branding.sections.notes.iconUrl"
                :alt="branding.sections.notes.iconAlt"
                class="ui-icon-img"
              >
            </span>
            <span id="notes-section-title-text">
              {{ branding.sections.notes.title }}
            </span>
          </span>
        </label>
        <UiTextarea
          v-model="orderNote"
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
    :is-store-open="isStoreOpen"
    :total-price-text="totalPriceText"
    :cart-count="cartItemCount"
    @toggle-cart="toggleCartDrawer"
  />

  <StorefrontCartDrawer
    :is-open="isCartDrawerOpen"
    :cart-items="cartItems"
    :can-submit-order="canSubmitOrder"
    :submit-order-text="submitOrderText"
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

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import UiCard from "../components/ui/card/Card.vue";
import UiTextarea from "../components/ui/textarea/Textarea.vue";
import StorefrontBottomBar from "../features/storefront/StorefrontBottomBar.vue";
import StorefrontCartDrawer from "../features/storefront/StorefrontCartDrawer.vue";
import StorefrontDeliverySection from "../features/storefront/StorefrontDeliverySection.vue";
import StorefrontDynamicFields from "../features/storefront/StorefrontDynamicFields.vue";
import StorefrontHeader from "../features/storefront/StorefrontHeader.vue";
import StorefrontOrderHistoryModal from "../features/storefront/StorefrontOrderHistoryModal.vue";
import StorefrontPaymentSection from "../features/storefront/StorefrontPaymentSection.vue";
import StorefrontProductGrid from "../features/storefront/StorefrontProductGrid.vue";
import { getStorefrontUiSnapshot } from "../features/storefront/storefrontUiSnapshot.ts";
import {
  useStorefrontCart,
  type StorefrontCartUpdatedEvent,
} from "../features/storefront/useStorefrontCart.ts";
import { useStorefrontDelivery } from "../features/storefront/useStorefrontDelivery.ts";
import { useStorefrontDynamicFields } from "../features/storefront/useStorefrontDynamicFields.ts";
import { useStorefrontAuth } from "../features/storefront/useStorefrontAuth.ts";
import { useStorefrontAnnouncement } from "../features/storefront/useStorefrontAnnouncement.ts";
import { useStorefrontBranding } from "../features/storefront/useStorefrontBranding.ts";
import { useStorefrontOrderHistory } from "../features/storefront/useStorefrontOrderHistory.ts";
import { useStorefrontPayment } from "../features/storefront/useStorefrontPayment.ts";
import {
  useStorefrontPolicyAgreement,
  type StorefrontPolicyHintEvent,
} from "../features/storefront/useStorefrontPolicyAgreement.ts";
import { useStorefrontProducts } from "../features/storefront/useStorefrontProducts.ts";
import { useStorefrontReceiptRequest } from "../features/storefront/useStorefrontReceiptRequest.ts";
import { useStorefrontLoadState } from "../features/storefront/useStorefrontLoadState.ts";
import { useStorefrontOrderFormState } from "../features/storefront/useStorefrontOrderFormState.ts";
import { useStorefrontShell } from "../features/storefront/useStorefrontShell.ts";
import { authFetch } from "../lib/auth.ts";
import { API_URL } from "../lib/appConfig.ts";
import { getDefaultIconUrl } from "../lib/icons.ts";
import Swal from "../lib/swal.ts";
import {
  clearSelectedStore,
  openStoreMap,
  selectDelivery,
} from "../features/storefront/storefrontDeliveryActions.ts";
import {
  initMainApp,
  logoutCurrentUser,
  selectBankAccount,
  selectPayment,
  showProfileModal,
  startMainLogin,
} from "../features/storefront/storefrontMainApp.ts";
import {
  formatDateTimeText,
  getCustomerPaymentDisplay,
  submitOrder,
} from "../features/storefront/storefrontOrderActions.ts";
import { state } from "../lib/appState.ts";
import { Toast } from "../lib/sharedUtils.ts";
import { setStorefrontOrderFormState } from "../features/storefront/storefrontOrderFormState.ts";

const originalBodyClass = document.body.className;
const originalBodyOverflow = document.body.style.overflow;
const policyCheckboxEl = ref<HTMLInputElement | null>(null);
const {
  isOrderHistoryOpen,
  orderHistoryError,
  orderHistoryState,
  ordersView,
  openOrderHistory,
  closeOrderHistory,
  copyTrackingNumber,
} = useStorefrontOrderHistory({
  authFetch,
  apiUrl: API_URL,
  getCurrentUser: () => state.currentUser,
  Swal,
  Toast,
  formatDateTimeText,
  getCustomerPaymentDisplay,
});
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
  isCartDrawerOpen,
  isStoreOpen,
  canSubmitOrder,
  submitOrderText,
  syncCartSnapshot,
  refreshCartSubmitState,
  handleCartUpdated: syncCartFromEvent,
  changeSpecQty,
  changeCartItemQty,
  removeCartIndex,
  toggleCartDrawer,
  submitOrderFromCart,
} = useStorefrontCart({
  orderApi: { submitOrder },
  getStorefrontUiSnapshot,
});
const {
  productsCategories,
  refreshProductsState,
} = useStorefrontProducts({ getStorefrontUiSnapshot });
const {
  loadErrorText,
  handleLoadErrorUpdated,
  handleRetryStorefrontLoad,
} = useStorefrontLoadState({ reload: () => location.reload() });
const {
  deliveryOptions,
  localDeliveryAddress,
  localDistrictOptions,
  homeDeliveryAddress,
  homeCountyOptions,
  homeDistrictOptions,
  selectedStore,
  resolveDeliveryIcon,
  refreshDeliveryState,
  handleSelectDelivery,
  handleOpenStoreMap,
  handleClearSelectedStore,
  updateLocalDeliveryAddress,
  handleLocalDeliveryAddressUpdated,
  updateHomeDeliveryAddress,
  handleHomeDeliveryAddressUpdated,
} = useStorefrontDelivery({
  clearSelectedStore,
  selectDelivery,
  openStoreMap,
  getStorefrontUiSnapshot,
});
const {
  bankAccounts,
  selectedBankAccountId,
  selectedPayment,
  paymentAvailability,
  paymentOptions,
  copiedBankAccountId,
  syncPaymentState,
  handleSelectPayment,
  handleSelectBankAccount,
  handleCopyTransferAccount,
} = useStorefrontPayment({
  clipboard: navigator.clipboard,
  setTimeout: window.setTimeout.bind(window),
  Swal,
  selectPayment,
  selectBankAccount,
  getStorefrontUiSnapshot,
});
const {
  currentUser,
  refreshAuthState,
} = useStorefrontAuth({ getStorefrontUiSnapshot });
const {
  announcementText,
  isAnnouncementVisible,
  closeAnnouncement,
  refreshAnnouncementState,
} = useStorefrontAnnouncement({ getStorefrontUiSnapshot });
const {
  branding,
  refreshBrandingState,
} = useStorefrontBranding({ getStorefrontUiSnapshot });
const {
  policyAgreed,
  showPolicyHint,
  handlePolicyAgreementChanged,
  handlePolicyHintUpdated,
} = useStorefrontPolicyAgreement();
const {
  orderNote,
  transferAccountLast5,
  updateTransferAccountLast5,
  handleOrderFormStateUpdated,
} = useStorefrontOrderFormState();
const {
  receiptRequested,
  receiptBuyer,
  receiptTaxId,
  receiptAddress,
  receiptNeedDateStamp,
  updateReceiptRequested,
  updateReceiptBuyer,
  updateReceiptTaxId,
  updateReceiptAddress,
  updateReceiptNeedDateStamp,
  handleReceiptRequestUpdated,
} = useStorefrontReceiptRequest();
const {
  currentUser: dynamicFieldsCurrentUser,
  selectedDelivery: dynamicFieldsSelectedDelivery,
  fieldValues: dynamicFieldValues,
  visibleFormFields,
  refreshDynamicFieldsState,
  updateDynamicFieldValue,
  handleDynamicFieldValuesUpdated,
} = useStorefrontDynamicFields({ getStorefrontUiSnapshot });
const {
  handleCloseAnnouncement,
  handleStorefrontLogin,
  handleShowMyOrders,
  handleCloseOrdersModal,
  handleStorefrontLogout: logoutFromShell,
  handleShowProfile: showProfileFromShell,
} = useStorefrontShell({
  closeAnnouncement,
  startMainLogin,
  logoutCurrentUser,
  showProfileModal,
  showMyOrders: openOrderHistory,
  closeOrderHistory,
});

function syncStorefrontUiState() {
  refreshAuthState();
  refreshAnnouncementState();
  refreshBrandingState();
  refreshCartSubmitState();
  refreshProductsState();
  refreshDeliveryState();
  syncPaymentState();
  refreshDynamicFieldsState();
}

function handleCartUpdated(event: Event) {
  syncCartFromEvent(event as StorefrontCartUpdatedEvent);
  syncStorefrontUiState();
}

function handleSelectedStoreUpdated() {
  refreshDeliveryState();
}

function handlePolicyHintEvent(event: Event) {
  handlePolicyHintUpdated(event);
  const detail = (event as StorefrontPolicyHintEvent).detail || {};
  if (detail.visible) policyCheckboxEl.value?.focus();
}

function getInputTargetValue(event: Event) {
  const target = event.target instanceof HTMLInputElement ? event.target : null;
  return target?.value || "";
}

function handleReceiptRequestedInput(event: Event) {
  const target = event.target instanceof HTMLInputElement ? event.target : null;
  updateReceiptRequested(Boolean(target?.checked));
}

function handleReceiptTextInput(
  field: "buyer" | "taxId" | "address",
  event: Event,
) {
  const value = getInputTargetValue(event);
  if (field === "buyer") updateReceiptBuyer(value);
  else if (field === "taxId") updateReceiptTaxId(value);
  else updateReceiptAddress(value);
}

function handleReceiptDateStampInput(event: Event) {
  const target = event.target instanceof HTMLInputElement ? event.target : null;
  updateReceiptNeedDateStamp(Boolean(target?.checked));
}

watch(isCartDrawerOpen, (open) => {
  document.body.style.overflow = open ? "hidden" : originalBodyOverflow;
});
watch(
  policyAgreed,
  (value) => setStorefrontOrderFormState({ policyAgreed: value }),
  { flush: "sync", immediate: true },
);

function handleStorefrontLogout() {
  logoutFromShell();
  syncStorefrontUiState();
}

async function handleShowProfile() {
  await showProfileFromShell();
  syncStorefrontUiState();
}

onMounted(() => {
  document.body.className = "p-4 md:p-6";

  window.addEventListener("coffee:cart-updated", handleCartUpdated);
  window.addEventListener("coffee:store-selected-updated", handleSelectedStoreUpdated);
  window.addEventListener(
    "coffee:policy-agree-hint-updated",
    handlePolicyHintEvent,
  );
  window.addEventListener(
    "coffee:receipt-request-updated",
    handleReceiptRequestUpdated,
  );
  window.addEventListener(
    "coffee:storefront-load-error-updated",
    handleLoadErrorUpdated,
  );
  window.addEventListener(
    "coffee:order-form-state-updated",
    handleOrderFormStateUpdated,
  );
  window.addEventListener(
    "coffee:dynamic-field-values-updated",
    handleDynamicFieldValuesUpdated,
  );
  window.addEventListener(
    "coffee:local-delivery-address-updated",
    handleLocalDeliveryAddressUpdated,
  );
  window.addEventListener(
    "coffee:home-delivery-address-updated",
    handleHomeDeliveryAddressUpdated,
  );

  syncCartSnapshot();

  void initMainApp().then(() => {
    syncStorefrontUiState();
  });
});

onBeforeUnmount(() => {
  window.removeEventListener("coffee:cart-updated", handleCartUpdated);
  window.removeEventListener("coffee:store-selected-updated", handleSelectedStoreUpdated);
  window.removeEventListener(
    "coffee:policy-agree-hint-updated",
    handlePolicyHintEvent,
  );
  window.removeEventListener(
    "coffee:receipt-request-updated",
    handleReceiptRequestUpdated,
  );
  window.removeEventListener(
    "coffee:storefront-load-error-updated",
    handleLoadErrorUpdated,
  );
  window.removeEventListener(
    "coffee:order-form-state-updated",
    handleOrderFormStateUpdated,
  );
  window.removeEventListener(
    "coffee:dynamic-field-values-updated",
    handleDynamicFieldValuesUpdated,
  );
  window.removeEventListener(
    "coffee:local-delivery-address-updated",
    handleLocalDeliveryAddressUpdated,
  );
  window.removeEventListener(
    "coffee:home-delivery-address-updated",
    handleHomeDeliveryAddressUpdated,
  );
  document.body.className = originalBodyClass;
  document.body.style.overflow = originalBodyOverflow;
});
</script>
