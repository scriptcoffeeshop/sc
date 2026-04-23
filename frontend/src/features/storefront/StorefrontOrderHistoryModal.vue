<template>
  <div
    id="my-orders-modal"
    class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
    :class="{ hidden: !isOpen }"
  >
    <div class="storefront-orders-dialog bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
      <div class="p-4 border-b flex justify-between items-center">
        <h3 class="text-lg font-bold" style="color: var(--primary)">
          <span class="tab-with-icon"><ListOrdered class="ui-action-icon" aria-hidden="true" />我的訂單</span>
        </h3>
        <button
          type="button"
          aria-label="關閉我的訂單"
          class="text-gray-500 hover:text-gray-700 text-2xl"
          @click="$emit('close')"
        >
          &times;
        </button>
      </div>
      <div id="my-orders-list" class="storefront-orders-list flex-1 overflow-y-auto p-4">
        <p
          v-if="state === 'loading'"
          class="text-center text-gray-500 py-8"
        >
          載入中...
        </p>
        <p
          v-else-if="state === 'error'"
          class="text-center text-red-500 py-8"
        >
          {{ errorText || "訂單載入失敗" }}
        </p>
        <p
          v-else-if="state === 'empty'"
          class="text-center text-gray-500 py-8"
        >
          尚無訂單
        </p>
        <template v-else>
          <StorefrontOrderHistoryCard
            v-for="order in orders"
            :key="order.orderId"
            :order="order"
            @copy-tracking-number="$emit('copy-tracking-number', $event)"
          />
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ListOrdered } from "lucide-vue-next";
import StorefrontOrderHistoryCard from "./StorefrontOrderHistoryCard.vue";

defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  state: {
    type: String,
    default: "empty",
  },
  errorText: {
    type: String,
    default: "",
  },
  orders: {
    type: Array,
    default: () => [],
  },
});

defineEmits(["close", "copy-tracking-number"]);
</script>
