<template>
  <div class="border rounded-xl p-4 mb-3" style="border-color: #e5ddd5">
    <div class="flex justify-between items-center mb-2 gap-3">
      <span class="text-sm font-bold" style="color: var(--primary)">
        #{{ order.orderId }}
      </span>
      <span class="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700">
        {{ order.statusLabel }}
      </span>
    </div>

    <div class="text-xs text-gray-500 mb-2 flex flex-wrap gap-1 items-center">
      <span>{{ order.deliveryMethodLabel }}<template v-if="order.locationText"> ・{{ order.locationText }}</template></span>
      <span
        v-if="order.paymentDisplay.showBadge"
        class="text-xs px-2 py-0.5 rounded-full"
        :class="order.paymentDisplay.badgeClass"
      >
        {{ `${order.paymentDisplay.methodLabel} ${order.paymentDisplay.statusLabel}`.trim() }}
      </span>
    </div>

    <div
      v-if="order.hasShippingInfo"
      class="text-xs text-gray-600 bg-blue-50 p-2 rounded mb-2"
    >
      <div v-if="order.shippingProvider">物流商：{{ order.shippingProvider }}</div>
      <div v-if="order.trackingNumber" class="mt-1">
        物流單號：
        <span class="font-mono">{{ order.trackingNumber }}</span>
        <button
          type="button"
          :data-copy-tracking-number="true"
          :data-tracking-number="order.trackingNumber"
          class="ml-2 px-2 py-0.5 bg-white border border-blue-200 hover:bg-blue-100 rounded text-gray-700"
          title="複製單號"
          @click="$emit('copy-tracking-number', order.trackingNumber)"
        >
          複製
        </button>
      </div>
      <a
        v-if="order.trackingUrl"
        :href="order.trackingUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="text-blue-600 hover:underline"
      >
        物流追蹤頁面
      </a>
    </div>

    <div
      v-if="order.paymentDisplay.showBadge"
      class="mb-2 rounded-xl border p-3"
      :class="order.paymentDisplay.toneClass"
    >
      <div class="flex flex-wrap items-start justify-between gap-2">
        <div class="font-semibold">付款方式：{{ order.paymentDisplay.methodLabel }}</div>
        <span
          class="text-xs px-2 py-0.5 rounded-full"
          :class="order.paymentDisplay.badgeClass"
        >
          {{ order.paymentDisplay.statusLabel }}
        </span>
      </div>

      <p class="mt-2 text-sm leading-6">{{ order.paymentDisplay.guideDescription }}</p>

      <div class="mt-3 text-xs leading-6 text-slate-700">
        <div>付款方式：{{ order.paymentDisplay.methodLabel }}</div>
        <div v-if="order.paymentDisplay.statusLabel" class="mt-1">
          付款狀態：{{ order.paymentDisplay.statusLabel }}
        </div>
        <div v-if="order.paymentDisplay.showPaymentDeadline && order.paymentExpiresAtText" class="mt-1">
          付款期限：{{ order.paymentExpiresAtText }}
        </div>
        <div v-if="order.paymentConfirmedAtText" class="mt-1">
          付款完成：{{ order.paymentConfirmedAtText }}
        </div>
        <div v-if="order.paymentLastCheckedAtText" class="mt-1">
          最近同步：{{ order.paymentLastCheckedAtText }}
        </div>
      </div>

      <div
        v-if="order.paymentDisplay.canResumePayment"
        class="mt-3 flex flex-wrap gap-2"
      >
        <a
          :href="order.paymentDisplay.paymentUrl"
          class="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
        >
          {{ order.paymentDisplay.resumePaymentLabel }}
        </a>
      </div>
    </div>

    <div class="text-sm text-gray-600 whitespace-pre-line bg-gray-50 p-3 rounded mb-2">
      {{ order.itemsText }}
    </div>

    <div
      v-if="order.showReceiptInfo && order.receiptInfo"
      class="text-sm text-amber-800 bg-amber-50 p-2 rounded mb-2"
    >
      <div><span class="text-gray-500">統一編號：</span>{{ order.receiptInfo.taxId || "未填寫" }}</div>
      <div><span class="text-gray-500">收據買受人：</span>{{ order.receiptInfo.buyer || "未填寫" }}</div>
      <div><span class="text-gray-500">收據地址：</span>{{ order.receiptInfo.address || "未填寫" }}</div>
      <div><span class="text-gray-500">壓印日期：</span>{{ order.receiptInfo.needDateStamp ? "需要" : "不需要" }}</div>
    </div>

    <div class="text-right font-bold" style="color: var(--primary)">
      {{ order.totalText }}
    </div>
  </div>
</template>

<script setup>
defineProps({
  order: {
    type: Object,
    required: true,
  },
});

defineEmits(["copy-tracking-number"]);
</script>
