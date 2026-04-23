<template>
  <div
    id="cart-overlay"
    class="hidden fixed inset-0 bg-black bg-opacity-50 z-[60]"
    @click="$emit('toggle-cart')"
  >
  </div>
  <div
    id="cart-drawer"
    class="fixed inset-y-0 right-0 h-dvh max-h-dvh w-full max-w-md overflow-hidden bg-white shadow-2xl z-[61] transform translate-x-full transition-transform duration-300 flex flex-col"
  >
    <div
      class="p-4 border-b flex justify-between items-center"
      style="border-color: #f0e6db"
    >
      <h3 class="text-lg font-bold" style="color: var(--primary)">
        <span class="tab-with-icon"><ShoppingCart class="ui-action-icon" aria-hidden="true" />購物車</span>
      </h3>
      <button
        class="text-gray-500 hover:text-gray-700 text-2xl"
        @click.prevent="$emit('toggle-cart')"
      >
        &times;
      </button>
    </div>
    <div id="cart-items" data-vue-managed="true" class="min-h-0 flex-1 overflow-y-auto p-4">
      <p v-if="cartItems.length === 0" class="text-center text-gray-400 py-8">
        購物車是空的
      </p>
      <template v-else>
        <div
          v-for="(item, index) in cartItems"
          :key="`${item.productId}-${item.specKey}`"
          class="flex items-center justify-between py-3 border-b"
          style="border-color:#f0e6db;"
        >
          <div class="flex-1 mr-3">
            <div class="font-medium text-sm flex items-center flex-wrap">
              {{ item.productName }}
              <span
                v-if="isDiscountedItem(item)"
                class="ml-2 inline-block bg-red-100 text-red-600 text-[10px] px-1.5 py-0.5 rounded leading-tight"
              >
                適用優惠
              </span>
            </div>
            <div class="text-xs text-gray-500">{{ item.specLabel }} · ${{ item.unitPrice }}</div>
          </div>
          <div class="flex items-center gap-1">
            <button
              class="quantity-btn"
              style="width:28px;height:28px;font-size:14px;"
              @click.prevent="$emit('change-cart-item-qty', index, -1)"
            >
              −
            </button>
            <span class="w-8 text-center font-medium">{{ item.qty }}</span>
            <button
              class="quantity-btn"
              style="width:28px;height:28px;font-size:14px;"
              @click.prevent="$emit('change-cart-item-qty', index, 1)"
            >
              +
            </button>
          </div>
          <div class="text-right ml-3 min-w-[60px]">
            <div class="font-semibold text-sm" style="color:var(--accent)">
              ${{ item.qty * item.unitPrice }}
            </div>
            <button
              class="text-xs text-red-400 hover:text-red-600"
              @click.prevent="$emit('remove-cart-index', index)"
            >
              移除
            </button>
          </div>
        </div>
      </template>
    </div>
    <div
      class="cart-drawer-footer shrink-0 p-4 border-t"
      style="border-color: #f0e6db; background: #faf6f2"
    >
      <div
        id="cart-shipping-notice"
        class="mb-3"
        :class="{ hidden: !showShippingNotice }"
      >
        <div
          v-if="showShippingNotice"
          class="px-3 py-2 rounded-lg mb-1"
          style="background:#fef2f2; border:1px solid #fca5a5;"
        >
          <div class="flex justify-between items-center text-sm font-semibold" style="color:#991b1b;">
            <span>{{ shippingNoticeTitle }}</span>
            <span>+${{ cartSummary.shippingFee }}</span>
          </div>
          <div
            v-if="shippingDiff > 0"
            class="text-xs mt-1"
            style="color:#b91c1c;"
          >
            還差 ${{ shippingDiff }} 即可免運
          </div>
        </div>
      </div>
      <div
        id="cart-discount-details"
        class="mb-3 text-sm text-gray-600"
        :class="{ hidden: !showDiscountSection }"
      >
        <div
          v-if="showDiscountSection"
          class="border-b border-dashed border-[#e5ddd5] pb-2 mb-2"
        >
          <div class="font-semibold text-gray-700 mb-2">已套用優惠與折抵：</div>
          <div
            v-for="promo in cartSummary.appliedPromos"
            :key="promo.name"
            class="flex justify-between items-center text-red-600 mb-1"
          >
            <span>{{ promo.name }}</span>
            <span>-${{ promo.amount }}</span>
          </div>
          <div
            v-if="isFreeShipping"
            class="flex justify-between items-center text-blue-600 mb-1"
          >
            <span>{{ deliveryName }}免運{{ freeShippingThresholdText }}</span>
            <span>免運費</span>
          </div>
        </div>
      </div>
      <div class="flex justify-between items-center mb-3">
        <span class="font-semibold text-gray-700">合計</span>
        <span
          id="cart-total"
          class="text-xl font-bold"
          style="color: var(--primary)"
        >{{ totalPriceText }}</span>
      </div>
      <UiButton
        id="cart-submit-btn"
        class="btn-primary w-full"
        @click.prevent="$emit('submit-order')"
      >
        確認送出訂單
      </UiButton>
    </div>
  </div>
</template>

<script setup>
import { ShoppingCart } from "lucide-vue-next";
import UiButton from "../../components/ui/button/Button.vue";

const props = defineProps({
  cartItems: {
    type: Array,
    default: () => [],
  },
  discountedItemKeys: {
    type: Object,
    default: () => new Set(),
  },
  cartSummary: {
    type: Object,
    required: true,
  },
  showShippingNotice: {
    type: Boolean,
    default: false,
  },
  shippingNoticeTitle: {
    type: String,
    default: "",
  },
  shippingDiff: {
    type: Number,
    default: 0,
  },
  showDiscountSection: {
    type: Boolean,
    default: false,
  },
  isFreeShipping: {
    type: Boolean,
    default: false,
  },
  deliveryName: {
    type: String,
    default: "該配送方式",
  },
  freeShippingThresholdText: {
    type: String,
    default: "",
  },
  totalPriceText: {
    type: String,
    required: true,
  },
});

defineEmits([
  "toggle-cart",
  "change-cart-item-qty",
  "remove-cart-index",
  "submit-order",
]);

function itemKey(productId, specKey = "") {
  return `${Number(productId)}-${String(specKey || "")}`;
}

function isDiscountedItem(item) {
  return props.discountedItemKeys?.has?.(
    itemKey(item.productId, item.specKey),
  );
}
</script>
