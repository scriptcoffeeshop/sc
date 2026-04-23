<template>
  <div class="bottom-bar">
    <div class="w-full max-w-3xl mx-auto flex items-center justify-between">
      <div
        id="total-price"
        class="text-xl font-bold"
        style="color: var(--primary)"
      >
        <div
          v-if="cartSummary.totalDiscount > 0 || showShippingBadge"
          class="flex flex-col items-start justify-center"
        >
          <div class="flex items-center mb-0.5">
            <span
              v-if="cartSummary.totalDiscount > 0"
              style="background-color: #fee2e2; color: #dc2626; font-size: 11px; padding: 2px 6px; border-radius: 4px; margin-right: 4px;"
            >
              折 -${{ cartSummary.totalDiscount }}
            </span>
            <span
              v-if="showShippingBadge"
              :style="shippingBadgeStyle"
            >
              {{ isFreeShipping ? "免運費" : `運費 $${cartSummary.shippingFee}` }}
            </span>
          </div>
          <div class="text-xl font-bold leading-tight">
            應付總額: {{ totalPriceText }}
          </div>
        </div>
        <div v-else class="text-xl font-bold">總金額: {{ totalPriceText }}</div>
      </div>
      <div class="flex gap-2">
        <button
          type="button"
          class="relative inline-flex items-center bg-amber-50 border-2 border-amber-200 text-amber-800 px-4 py-3 rounded-xl font-semibold text-sm leading-none hover:bg-amber-100 transition-colors"
          @click.prevent="$emit('toggle-cart')"
        >
          <span class="tab-with-icon"><ShoppingCart class="ui-action-icon" aria-hidden="true" />購物車</span>
          <span
            id="cart-badge"
            class="ml-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 inline-flex items-center justify-center"
            :class="{ hidden: cartCount <= 0 }"
          >{{ cartCount }}</span>
        </button>
        <button id="submit-btn" style="display: none"></button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { ShoppingCart } from "lucide-vue-next";

const props = defineProps({
  cartSummary: {
    type: Object,
    required: true,
  },
  showShippingBadge: {
    type: Boolean,
    default: false,
  },
  isFreeShipping: {
    type: Boolean,
    default: false,
  },
  totalPriceText: {
    type: String,
    required: true,
  },
  cartCount: {
    type: Number,
    default: 0,
  },
});

defineEmits(["toggle-cart"]);

const shippingBadgeStyle = computed(() => ({
  backgroundColor: props.isFreeShipping ? "#dbeafe" : "#f3f4f6",
  color: props.isFreeShipping ? "#2563eb" : "#4b5563",
  fontSize: "11px",
  padding: "2px 6px",
  borderRadius: "4px",
}));
</script>
