<template>
  <div class="border rounded-xl p-4 mb-3">
    <div class="flex justify-between items-center mb-2">
      <div class="flex items-center gap-2 flex-wrap">
        <label class="inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            class="w-4 h-4"
            :checked="order.isSelected"
            @change="handleToggleOrderSelection(order.orderId, $event)"
          >
        </label>
        <span class="font-bold text-sm" style="color:var(--primary)">#{{ order.orderId }}</span>
        <span class="delivery-tag" :class="`delivery-${order.deliveryMethod}`">
          {{ order.deliveryLabel }}
        </span>
        <span class="status-badge" :class="`status-${order.status}`">
          {{ order.statusLabel }}
        </span>
        <span
          v-if="order.paymentMethod !== 'cod'"
          class="text-xs px-2 py-0.5 rounded-full"
          :class="order.payBadgeClass"
        >
          {{ order.paymentMethodLabel }} {{ order.paymentStatusLabel }}
        </span>
      </div>
      <span class="text-xs ui-text-subtle">{{ order.timestampText }}</span>
    </div>

    <div class="grid grid-cols-2 gap-2 text-sm mb-2">
      <div><span class="ui-text-subtle">顧客：</span>{{ order.lineName }}</div>
      <div><span class="ui-text-subtle">電話：</span>{{ order.phone }}</div>
      <div class="col-span-2">
        <span class="ui-text-subtle">信箱：</span>
        <a v-if="order.email" :href="`mailto:${order.email}`" class="ui-text-highlight">
          {{ order.email }}
        </a>
        <span v-else>無</span>
      </div>
      <div class="col-span-2">
        <span class="ui-text-subtle">地址/門市：</span>{{ order.addressInfo }}
      </div>
      <div v-if="order.showTransferInfo" class="col-span-2 text-xs text-blue-800 mt-2 ui-primary-soft p-2 rounded">
        <div><b>顧客匯出末5碼:</b> {{ order.transferAccountLast5 || "未提供" }}</div>
        <div class="mt-1 pb-1"><b>匯入目標帳號:</b> {{ order.paymentId || "未提供 (舊版訂單)" }}</div>
      </div>
      <div
        v-if="order.showPaymentMeta"
        class="col-span-2 text-xs text-slate-700 mt-2 bg-slate-50 p-2 rounded border border-slate-200"
      >
        <div v-if="order.showPaymentDeadline">
          <b>付款期限：</b>{{ order.paymentExpiresAtText }}
        </div>
        <div
          v-if="order.paymentLastCheckedAtText"
          :class="{ 'mt-1': order.showPaymentDeadline }"
        >
          <b>最近同步：</b>{{ order.paymentLastCheckedAtText }}
        </div>
        <div
          v-if="order.paymentProviderStatusCode"
          :class="{ 'mt-1': order.showPaymentDeadline || order.paymentLastCheckedAtText }"
        >
          <b>金流狀態碼：</b>{{ order.paymentProviderStatusCode }}
        </div>
      </div>
    </div>

    <div
      v-if="order.hasShippingInfo"
      class="text-xs bg-gray-100 p-2 rounded mt-2 border ui-border"
    >
      <div v-if="order.shippingProvider">
        <span class="ui-text-subtle">物流商：</span>{{ order.shippingProvider }}
      </div>
      <div v-if="order.trackingNumber" class="mt-1">
        <span class="ui-text-subtle">物流單號：</span>
        <span class="font-mono font-bold">{{ order.trackingNumber }}</span>
        <button
          type="button"
          @click="handleCopyTrackingNumber(order.trackingNumber)"
          class="ml-2 px-2 py-0.5 bg-gray-200 hover:bg-gray-300 rounded ui-text-strong"
          title="複製單號"
        >
          複製
        </button>
      </div>
      <div v-if="order.trackingLinkUrl" class="mt-1">
        <a
          :href="order.trackingLinkUrl"
          target="_blank"
          class="text-xs ui-text-highlight hover:underline"
        >
          {{ order.trackingLinkLabel }}
        </a>
      </div>
    </div>

    <div class="text-sm ui-text-strong whitespace-pre-line ui-bg-soft p-3 rounded mb-2 mt-2">
      {{ order.items }}
    </div>
    <div
      v-if="order.showReceiptInfo && order.receiptInfo"
      class="text-xs text-amber-800 bg-amber-50 p-2 rounded mb-2 border border-amber-100"
    >
      <div><span class="ui-text-subtle">統一編號：</span>{{ order.receiptInfo.taxId || "未填寫" }}</div>
      <div><span class="ui-text-subtle">收據買受人：</span>{{ order.receiptInfo.buyer || "未填寫" }}</div>
      <div><span class="ui-text-subtle">收據地址：</span>{{ order.receiptInfo.address || "未填寫" }}</div>
      <div>
        <span class="ui-text-subtle">壓印日期：</span>{{
          order.receiptInfo.needDateStamp ? "需要" : "不需要"
        }}
      </div>
    </div>
    <div
      v-if="order.note"
      class="text-sm text-amber-700 bg-amber-50 p-2 rounded mb-2"
    >
      {{ order.note }}
    </div>
    <div
      v-if="order.showCancellationReason"
      class="text-sm text-red-700 bg-red-50 p-2 rounded mb-2 border border-red-100"
    >
      <span class="ui-text-subtle">{{ order.statusReasonLabel }}：</span>{{ order.cancelReason }}
    </div>

    <div class="flex justify-between items-center">
      <span class="font-bold" style="color:var(--accent)">${{ order.total }}</span>
      <div class="flex gap-2">
        <button
          v-if="order.showSendLineButton"
          type="button"
          @click="handleSendOrderFlex(order.orderId)"
          class="text-xs text-emerald-700 hover:text-emerald-900"
        >
          LINE通知
        </button>
        <button
          v-if="order.showSendEmailButton"
          type="button"
          @click="handleSendOrderEmail(order.orderId)"
          class="text-xs ui-text-strong hover:opacity-80"
        >
          發送信件
        </button>
        <button
          v-if="order.showRefundButton"
          type="button"
          @click="handleRefundOrder(order.orderId, order.paymentMethod)"
          class="text-xs text-purple-600 hover:text-purple-800 tab-with-icon"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-15-6l-3 2" /></svg>{{ order.refundButtonText || "退款" }}
        </button>
        <button
          v-if="order.showConfirmTransferButton"
          type="button"
          @click="handleConfirmTransferPayment(order.orderId)"
          class="text-xs ui-text-success hover:text-green-800"
        >
          確認已收款
        </button>
        <select
          class="text-xs border rounded px-2 py-1"
          :value="order.selectedStatus"
          @change="handleOrderStatusChange(order.orderId, $event)"
        >
          <option
            v-for="status in ordersStatusOptions"
            :key="`${order.orderId}-${status}`"
            :value="status"
          >
            {{ orderStatusText(status) }}
          </option>
        </select>
        <button
          v-if="order.showConfirmStatusButton"
          type="button"
          @click="handleConfirmOrderStatus(order.orderId)"
          class="confirm-status-btn text-xs px-2 py-1 rounded font-medium"
          style="background:#6F4E37; color:#fff;"
        >
          確認
        </button>
        <button
          type="button"
          @click="handleDeleteOrder(order.orderId)"
          class="text-xs ui-text-danger hover:text-red-700"
        >
          刪除
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  dashboardOrdersActions,
  useDashboardOrders,
} from "./useDashboardOrders.ts";
import type { DashboardOrderViewModel } from "./dashboardOrdersView.ts";

defineProps<{
  order: DashboardOrderViewModel;
}>();

const { ordersStatusOptions, orderStatusText } = useDashboardOrders();

function handleToggleOrderSelection(orderId: string, event: Event) {
  const target = event.target instanceof HTMLInputElement
    ? event.target
    : null;
  dashboardOrdersActions.toggleOrderSelection(orderId, Boolean(target?.checked));
}

function handleCopyTrackingNumber(trackingNumber: string) {
  dashboardOrdersActions.copyTrackingNumber(trackingNumber);
}

function handleSendOrderFlex(orderId: string) {
  dashboardOrdersActions.sendOrderFlexByOrderId(orderId);
}

function handleSendOrderEmail(orderId: string) {
  dashboardOrdersActions.sendOrderEmailByOrderId(orderId);
}

function handleRefundOrder(orderId: string, paymentMethod: string) {
  dashboardOrdersActions.refundOnlinePayOrder(orderId, paymentMethod);
}

function handleConfirmTransferPayment(orderId: string) {
  dashboardOrdersActions.confirmTransferPayment(orderId);
}

function handleOrderStatusChange(orderId: string, event: Event) {
  const target = event.target instanceof HTMLSelectElement
    ? event.target
    : null;
  dashboardOrdersActions.setPendingOrderStatus(orderId, target?.value || "");
}

function handleConfirmOrderStatus(orderId: string) {
  dashboardOrdersActions.confirmOrderStatus(orderId);
}

function handleDeleteOrder(orderId: string) {
  dashboardOrdersActions.deleteOrderById(orderId);
}
</script>
