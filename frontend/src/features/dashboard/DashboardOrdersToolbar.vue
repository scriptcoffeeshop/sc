<template>
  <div class="flex flex-col gap-4 mb-4">
    <div class="dashboard-section-header mb-0">
      <div>
        <h2 class="dashboard-section-title">
          訂單列表
        </h2>
        <p class="dashboard-section-hint">
          篩選、批次更新、匯出與逐筆處理訂單。
        </p>
      </div>
      <div class="dashboard-section-actions">
        <button
          type="button"
          @click="handleShowFlexHistory"
          class="text-sm px-3 py-1 rounded-lg border"
          title="LINE Flex Message 歷史紀錄"
        >
          <span class="tab-with-icon">
            <svg viewBox="0 0 24 24" aria-hidden="true" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5h10" /><path d="M9 12h10" /><path d="M9 19h10" /><path d="M4 6h.01" /><path d="M4 12h.01" /><path d="M4 18h.01" /></svg>
            Flex 歷史
          </span>
        </button>
        <button
          type="button"
          @click="handleReloadOrders"
          class="text-sm ui-text-highlight"
        >
          <span class="tab-with-icon"><img src="../../../../icons/refresh-sync.png" alt="" class="ui-icon-inline">重整</span>
        </button>
      </div>
    </div>

    <div class="dashboard-toolbar-card grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
      <select
        id="order-filter"
        v-model="filters.status"
        class="input-field text-sm py-2"
      >
        <option value="all">訂單狀態：全部</option>
        <option value="pending">訂單狀態：待處理</option>
        <option value="processing">訂單狀態：處理中</option>
        <option value="shipped">訂單狀態：已出貨</option>
        <option value="completed">訂單狀態：已完成</option>
        <option value="failed">訂單狀態：已失敗</option>
        <option value="cancelled">訂單狀態：已取消</option>
      </select>
      <select
        id="order-payment-filter"
        v-model="filters.paymentMethod"
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
        v-model="filters.paymentStatus"
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
        v-model="filters.deliveryMethod"
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
        v-model="filters.dateFrom"
        type="date"
        class="input-field text-sm py-2"
        placeholder="起始日期"
      >
      <input
        id="order-date-to"
        v-model="filters.dateTo"
        type="date"
        class="input-field text-sm py-2"
        placeholder="結束日期"
      >
      <input
        id="order-amount-min"
        v-model="filters.minAmount"
        type="number"
        min="0"
        class="input-field text-sm py-2"
        placeholder="最低金額"
      >
      <input
        id="order-amount-max"
        v-model="filters.maxAmount"
        type="number"
        min="0"
        class="input-field text-sm py-2"
        placeholder="最高金額"
      >
    </div>

    <div class="dashboard-toolbar-card flex flex-wrap gap-2 items-center">
      <label class="inline-flex items-center gap-2 text-sm cursor-pointer">
        <input
          ref="selectAllCheckbox"
          type="checkbox"
          id="orders-select-all"
          class="w-4 h-4"
          :checked="allFilteredSelected"
          @change="handleToggleSelectAllOrders"
        >
        全選目前篩選結果
      </label>
      <span id="orders-selected-count" class="text-sm ui-text-strong">{{ selectedCountText }}</span>
      <select
        id="batch-order-status"
        v-model="batchForm.status"
        class="input-field text-sm py-1"
        style="width: auto"
      >
        <option value="">批次狀態</option>
        <option value="pending">待處理</option>
        <option value="processing">處理中</option>
        <option value="shipped">已出貨</option>
        <option value="completed">已完成</option>
        <option value="failed">已失敗</option>
        <option value="cancelled">已取消</option>
      </select>
      <select
        id="batch-payment-status"
        v-model="batchForm.paymentStatus"
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
        type="button"
        @click="handleBatchUpdateOrders"
        class="btn-primary text-sm py-2 px-4"
      >
        批次更新
      </button>
      <button
        type="button"
        @click="handleBatchDeleteOrders"
        class="text-sm px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
      >
        批次刪除
      </button>
      <button
        type="button"
        @click="handleExportFilteredOrdersCsv"
        class="text-sm px-4 py-2 rounded-lg border ui-border text-blue-700 hover:ui-primary-soft"
      >
        匯出篩選 CSV
      </button>
      <button
        type="button"
        @click="handleExportSelectedOrdersCsv"
        class="text-sm px-4 py-2 rounded-lg border ui-border text-blue-700 hover:ui-primary-soft"
      >
        匯出勾選 CSV
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watchEffect } from "vue";
import {
  dashboardOrdersActions,
  useDashboardOrders,
} from "./useDashboardOrders.ts";

const {
  filters,
  batchForm,
  allFilteredSelected,
  selectAllIndeterminate,
  selectedCountText,
} = useDashboardOrders();

const selectAllCheckbox = ref<HTMLInputElement | null>(null);

watchEffect(() => {
  if (selectAllCheckbox.value) {
    selectAllCheckbox.value.indeterminate = selectAllIndeterminate.value;
  }
});

function handleShowFlexHistory() {
  dashboardOrdersActions.showFlexHistory();
}

function handleReloadOrders() {
  dashboardOrdersActions.loadOrders();
}

function handleToggleSelectAllOrders(event: Event) {
  const target = event.target instanceof HTMLInputElement
    ? event.target
    : null;
  dashboardOrdersActions.toggleSelectAllOrders(Boolean(target?.checked));
}

function handleBatchUpdateOrders() {
  dashboardOrdersActions.batchUpdateOrders();
}

function handleBatchDeleteOrders() {
  dashboardOrdersActions.batchDeleteOrders();
}

function handleExportFilteredOrdersCsv() {
  dashboardOrdersActions.exportFilteredOrdersCsv();
}

function handleExportSelectedOrdersCsv() {
  dashboardOrdersActions.exportSelectedOrdersCsv();
}
</script>
