<template>
  <div id="orders-section" class="glass-card p-6 hidden">
    <div class="flex flex-col gap-4 mb-4">
      <div class="flex justify-between items-center gap-3 flex-wrap">
        <h2 class="text-lg font-bold ui-text-highlight">
          訂單列表
        </h2>
        <div class="flex gap-2 items-center">
          <button
            data-action="show-flex-history"
            class="text-sm px-3 py-1 rounded-lg border"
            title="LINE Flex Message 歷史紀錄"
          >
            📋 Flex 歷史
          </button>
          <button
            data-action="reload-orders"
            class="text-sm ui-text-highlight"
          >
            <span class="tab-with-icon"><img src="../../../../icons/refresh-sync.png" alt="" class="ui-icon-inline">重整</span>
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
        <select
          id="order-filter"
          data-order-filter
          class="input-field text-sm py-2"
        >
          <option value="all">訂單狀態：全部</option>
          <option value="pending">訂單狀態：待處理</option>
          <option value="processing">訂單狀態：處理中</option>
          <option value="shipped">訂單狀態：已出貨</option>
          <option value="completed">訂單狀態：已完成</option>
          <option value="cancelled">訂單狀態：已取消</option>
        </select>
        <select
          id="order-payment-filter"
          data-order-filter
          class="input-field text-sm py-2"
        >
          <option value="all">付款方式：全部</option>
          <option value="cod">貨到/取貨付款</option>
          <option value="linepay">LINE Pay</option>
          <option value="jkopay">街口支付</option>
          <option value="transfer">轉帳</option>
        </select>
        <select
          id="order-payment-status-filter"
          data-order-filter
          class="input-field text-sm py-2"
        >
          <option value="all">付款狀態：全部</option>
          <option value="pending">待付款</option>
          <option value="processing">付款確認中</option>
          <option value="paid">已付款</option>
          <option value="failed">付款失敗</option>
          <option value="cancelled">付款取消</option>
          <option value="expired">付款逾期</option>
          <option value="refunded">已退款</option>
          <option value="empty">未設定</option>
        </select>
        <select
          id="order-delivery-filter"
          data-order-filter
          class="input-field text-sm py-2"
        >
          <option value="all">配送方式：全部</option>
          <option value="delivery">配送到府</option>
          <option value="home_delivery">全台宅配</option>
          <option value="seven_eleven">7-11 取件</option>
          <option value="family_mart">全家取件</option>
          <option value="in_store">來店取貨</option>
        </select>
        <input
          id="order-date-from"
          data-order-filter
          type="date"
          class="input-field text-sm py-2"
          placeholder="起始日期"
        >
        <input
          id="order-date-to"
          data-order-filter
          type="date"
          class="input-field text-sm py-2"
          placeholder="結束日期"
        >
        <input
          id="order-amount-min"
          data-order-filter
          type="number"
          min="0"
          class="input-field text-sm py-2"
          placeholder="最低金額"
        >
        <input
          id="order-amount-max"
          data-order-filter
          type="number"
          min="0"
          class="input-field text-sm py-2"
          placeholder="最高金額"
        >
      </div>

      <div class="flex flex-wrap gap-2 items-center p-3 rounded-lg bg-white border">
        <label class="inline-flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            id="orders-select-all"
            data-action="toggle-select-all-orders"
            class="w-4 h-4"
          >
          全選目前篩選結果
        </label>
        <span id="orders-selected-count" class="text-sm ui-text-strong">已選 0 筆</span>
        <select
          id="batch-order-status"
          class="input-field text-sm py-1"
          style="width: auto"
        >
          <option value="">批次狀態</option>
          <option value="pending">待處理</option>
          <option value="processing">處理中</option>
          <option value="shipped">已出貨</option>
          <option value="completed">已完成</option>
          <option value="cancelled">已取消</option>
        </select>
        <select
          id="batch-payment-status"
          class="input-field text-sm py-1"
          style="width: auto"
        >
          <option value="__keep__">付款狀態：維持不變</option>
          <option value="pending">付款待處理</option>
          <option value="processing">付款確認中</option>
          <option value="paid">付款完成</option>
          <option value="failed">付款失敗</option>
          <option value="cancelled">付款取消</option>
          <option value="expired">付款逾期</option>
          <option value="refunded">已退款</option>
          <option value="">清空付款狀態</option>
        </select>
        <button
          data-action="batch-update-orders"
          class="btn-primary text-sm py-2 px-4"
        >
          批次更新
        </button>
        <button
          data-action="batch-delete-orders"
          class="text-sm px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
        >
          批次刪除
        </button>
        <button
          data-action="export-orders-csv"
          class="text-sm px-4 py-2 rounded-lg border ui-border text-blue-700 hover:ui-primary-soft"
        >
          匯出篩選 CSV
        </button>
        <button
          data-action="export-selected-orders-csv"
          class="text-sm px-4 py-2 rounded-lg border ui-border text-blue-700 hover:ui-primary-soft"
        >
          匯出勾選 CSV
        </button>
      </div>
    </div>
    <div id="orders-summary" class="text-sm ui-text-strong mb-3"></div>
    <div id="orders-list" data-vue-managed="true">
      <p v-if="ordersView.length === 0" class="text-center ui-text-subtle py-8">
        沒有符合的訂單
      </p>
      <template v-else>
        <div
          v-for="order in ordersView"
          :key="order.orderId"
          class="border rounded-xl p-4 mb-3"
        >
          <div class="flex justify-between items-center mb-2">
            <div class="flex items-center gap-2 flex-wrap">
              <label class="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  data-action="toggle-order-selection"
                  :data-order-id="order.orderId"
                  class="w-4 h-4"
                  :checked="order.isSelected"
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
                data-action="copy-tracking-number"
                :data-tracking-number="order.trackingNumber"
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
            <span class="ui-text-subtle">取消原因：</span>{{ order.cancelReason }}
          </div>

          <div class="flex justify-between items-center">
            <span class="font-bold" style="color:var(--accent)">${{ order.total }}</span>
            <div class="flex gap-2">
              <button
                v-if="order.showSendLineButton"
                data-action="send-order-flex"
                :data-order-id="order.orderId"
                class="text-xs text-emerald-700 hover:text-emerald-900"
              >
                LINE通知
              </button>
              <button
                v-if="order.showSendEmailButton"
                data-action="send-order-email"
                :data-order-id="order.orderId"
                class="text-xs ui-text-strong hover:opacity-80"
              >
                發送信件
              </button>
              <button
                v-if="order.showRefundButton"
                data-action="refund-onlinepay-order"
                :data-order-id="order.orderId"
                :data-payment-method="order.paymentMethod"
                class="text-xs text-purple-600 hover:text-purple-800 tab-with-icon"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-15-6l-3 2" /></svg>{{ order.refundButtonText || "退款" }}
              </button>
              <button
                v-if="order.showConfirmTransferButton"
                data-action="confirm-transfer-payment"
                :data-order-id="order.orderId"
                class="text-xs ui-text-success hover:text-green-800"
              >
                確認已收款
              </button>
              <select
                data-action="change-order-status"
                :data-order-id="order.orderId"
                :data-current-status="order.status"
                class="text-xs border rounded px-2 py-1"
                :value="order.status"
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
                data-action="confirm-order-status"
                :data-order-id="order.orderId"
                class="confirm-status-btn hidden text-xs px-2 py-1 rounded font-medium"
                style="background:#6F4E37; color:#fff;"
              >
                確認
              </button>
              <button
                data-action="delete-order"
                :data-order-id="order.orderId"
                class="text-xs ui-text-danger hover:text-red-700"
              >
                刪除
              </button>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
defineProps({
  ordersView: {
    type: Array,
    default: () => [],
  },
  ordersStatusOptions: {
    type: Array,
    default: () => [],
  },
  orderStatusText: {
    type: Function,
    required: true,
  },
});
</script>
