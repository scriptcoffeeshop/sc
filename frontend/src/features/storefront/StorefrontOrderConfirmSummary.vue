<template>
  <div class="storefront-order-confirm-summary">
    <dl class="storefront-order-confirm-summary__list">
      <div class="storefront-order-confirm-summary__row">
        <dt>配送方式</dt>
        <dd>{{ summary.deliveryLabel }}</dd>
      </div>
      <div class="storefront-order-confirm-summary__row">
        <dt>取貨地點</dt>
        <dd class="storefront-order-confirm-summary__multiline">
          {{ summary.addressText }}
        </dd>
      </div>
      <div
        v-if="summary.companyOrBuilding"
        class="storefront-order-confirm-summary__row"
      >
        <dt>公司行號/社區大樓</dt>
        <dd>{{ summary.companyOrBuilding }}</dd>
      </div>
      <div class="storefront-order-confirm-summary__row">
        <dt>訂單內容</dt>
        <dd>
          <ul class="storefront-order-confirm-summary__items">
            <li
              v-for="line in summary.orderLines"
              :key="line"
              class="storefront-order-confirm-summary__item"
            >
              {{ line }}
            </li>
          </ul>
        </dd>
      </div>
      <div class="storefront-order-confirm-summary__row">
        <dt>總金額</dt>
        <dd>{{ summary.totalText }}</dd>
      </div>
      <div
        v-if="summary.note"
        class="storefront-order-confirm-summary__row"
      >
        <dt>訂單備註</dt>
        <dd class="storefront-order-confirm-summary__multiline">
          {{ summary.note }}
        </dd>
      </div>
      <div
        v-if="summary.receiptRows.length"
        class="storefront-order-confirm-summary__row"
      >
        <dt>收據資訊</dt>
        <dd>
          <dl class="storefront-order-confirm-summary__nested">
            <div
              v-for="row in summary.receiptRows"
              :key="row.label"
              class="storefront-order-confirm-summary__nested-row"
            >
              <dt>{{ row.label }}</dt>
              <dd>{{ row.value }}</dd>
            </div>
          </dl>
        </dd>
      </div>
      <div class="storefront-order-confirm-summary__row">
        <dt>付款方式</dt>
        <dd>
          <span>{{ summary.paymentLabel }}</span>
          <span
            v-if="summary.transferTargetAccountInfo"
            class="storefront-order-confirm-summary__transfer"
          >
            匯入：{{ summary.transferTargetAccountInfo }}
          </span>
        </dd>
      </div>
    </dl>
  </div>
</template>

<script setup lang="ts">
export interface StorefrontOrderConfirmReceiptRow {
  label: string;
  value: string;
}

export interface StorefrontOrderConfirmSummaryView {
  deliveryLabel: string;
  addressText: string;
  companyOrBuilding: string;
  orderLines: string[];
  totalText: string;
  note: string;
  receiptRows: StorefrontOrderConfirmReceiptRow[];
  paymentLabel: string;
  transferTargetAccountInfo: string;
}

defineProps<{
  summary: StorefrontOrderConfirmSummaryView;
}>();
</script>

<style scoped>
.storefront-order-confirm-summary {
  color: #3c2415;
  font-size: 0.95rem;
  text-align: left;
}

.storefront-order-confirm-summary__list,
.storefront-order-confirm-summary__nested {
  margin: 0;
}

.storefront-order-confirm-summary__row {
  display: grid;
  grid-template-columns: minmax(84px, max-content) 1fr;
  gap: 8px 14px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(60, 36, 21, 0.1);
}

.storefront-order-confirm-summary__row:last-child {
  border-bottom: 0;
}

.storefront-order-confirm-summary dt {
  color: #6f7f83;
  font-weight: 700;
}

.storefront-order-confirm-summary dd {
  margin: 0;
  color: #3c2415;
  line-height: 1.55;
}

.storefront-order-confirm-summary__items {
  display: grid;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.storefront-order-confirm-summary__item {
  line-height: 1.55;
}

.storefront-order-confirm-summary__multiline {
  white-space: pre-line;
}

.storefront-order-confirm-summary__nested {
  display: grid;
  gap: 4px;
}

.storefront-order-confirm-summary__nested-row {
  display: grid;
  grid-template-columns: minmax(72px, max-content) 1fr;
  gap: 8px;
}

.storefront-order-confirm-summary__transfer {
  display: block;
  margin-top: 4px;
  color: #2e7d32;
  font-size: 0.85rem;
}

@media (max-width: 520px) {
  .storefront-order-confirm-summary__row,
  .storefront-order-confirm-summary__nested-row {
    grid-template-columns: 1fr;
    gap: 4px;
  }
}
</style>
