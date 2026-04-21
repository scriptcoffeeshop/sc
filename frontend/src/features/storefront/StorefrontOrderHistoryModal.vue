<template>
  <div
    id="my-orders-modal"
    class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
  >
    <div class="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col">
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
      <div id="my-orders-list" class="flex-1 overflow-y-auto p-4"></div>
    </div>
  </div>
</template>

<script setup>
import { ListOrdered } from "lucide-vue-next";

defineEmits(["close"]);
</script>
