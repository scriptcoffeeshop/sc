<template>
  <div class="storefront-payment-dialog-summary">
    <dl
      v-if="summary.rows.length"
      class="storefront-payment-dialog-summary__rows"
    >
      <div
        v-for="row in summary.rows"
        :key="row.label"
        class="storefront-payment-dialog-summary__row"
      >
        <dt>{{ row.label }}</dt>
        <dd
          :class="{
            'storefront-payment-dialog-summary__value--strong': row.strong,
            'storefront-payment-dialog-summary__value--danger': row.tone === 'danger',
          }"
        >
          {{ row.value }}
        </dd>
      </div>
    </dl>

    <section
      v-if="summary.bankAccount"
      class="storefront-payment-dialog-summary__bank"
    >
      <b>
        {{ summary.bankAccount.bankName }}
        ({{ summary.bankAccount.bankCode }})
      </b>
      <span class="storefront-payment-dialog-summary__account">
        {{ summary.bankAccount.accountNumber }}
      </span>
      <span
        v-if="summary.bankAccount.accountName"
        class="storefront-payment-dialog-summary__account-name"
      >
        戶名: {{ summary.bankAccount.accountName }}
      </span>
    </section>

    <p
      v-if="summary.guideDescription"
      class="storefront-payment-dialog-summary__guide"
    >
      {{ summary.guideDescription }}
    </p>

    <p
      v-if="summary.footerText"
      class="storefront-payment-dialog-summary__footer"
    >
      {{ summary.footerText }}
    </p>
  </div>
</template>

<script setup lang="ts">
export interface StorefrontPaymentDialogRow {
  label: string;
  value: string;
  strong?: boolean;
  tone?: "danger" | "neutral";
}

export interface StorefrontPaymentDialogBankAccount {
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
}

export interface StorefrontPaymentDialogSummaryView {
  rows: StorefrontPaymentDialogRow[];
  guideDescription: string;
  bankAccount: StorefrontPaymentDialogBankAccount | null;
  footerText: string;
}

defineProps<{
  summary: StorefrontPaymentDialogSummaryView;
}>();
</script>

<style scoped>
.storefront-payment-dialog-summary {
  color: #3c2415;
  font-size: 0.95rem;
  line-height: 1.65;
  text-align: left;
}

.storefront-payment-dialog-summary__rows {
  display: grid;
  gap: 8px;
  margin: 0;
}

.storefront-payment-dialog-summary__row {
  display: grid;
  grid-template-columns: minmax(76px, max-content) 1fr;
  gap: 10px;
}

.storefront-payment-dialog-summary dt {
  color: #6f7f83;
  font-weight: 700;
}

.storefront-payment-dialog-summary dd {
  margin: 0;
}

.storefront-payment-dialog-summary__value--strong {
  font-weight: 700;
}

.storefront-payment-dialog-summary__value--danger {
  color: #e63946;
}

.storefront-payment-dialog-summary__bank {
  display: grid;
  gap: 4px;
  margin: 12px 0 8px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #f0f5fa;
}

.storefront-payment-dialog-summary__account {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 1.1em;
}

.storefront-payment-dialog-summary__account-name {
  color: #667085;
}

.storefront-payment-dialog-summary__guide {
  margin: 12px 0 0;
  color: #475569;
}

.storefront-payment-dialog-summary__footer {
  margin: 10px 0 0;
  color: #667085;
  font-size: 0.9em;
}

@media (max-width: 520px) {
  .storefront-payment-dialog-summary__row {
    grid-template-columns: 1fr;
    gap: 2px;
  }
}
</style>
