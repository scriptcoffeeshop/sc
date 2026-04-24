<template>
  <div id="payment-method-section" class="mb-6 fade-in">
    <h2
      id="payment-section-title"
      class="text-lg font-bold mb-4"
      style="color: var(--primary)"
    >
      <span class="section-heading-inline">
        <span class="ui-icon-title"><img src="../../../../icons/payment-card.png" alt="付款圖示" class="ui-icon-img"></span>
        <span>付款方式</span>
      </span>
    </h2>
    <div
      id="payment-options"
      class="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4"
    >
      <div
        id="cod-option"
        data-method="cod"
        class="payment-option active"
        @click="$emit('select-payment', 'cod')"
      >
        <div class="check-mark"><img :src="selectedCheckIconUrl" alt="" class="ui-icon-img"></div>
        <div class="option-icon" id="po-cod-icon-display"><img src="../../../../icons/payment-cash.png" alt="貨到付款圖示" class="ui-icon-img"></div>
        <div class="font-semibold" id="po-cod-name-display">
          取件 / 到付
        </div>
        <div id="po-cod-desc-display" class="text-xs text-gray-500 mt-1">
          取貨時付現或宅配到付
        </div>
      </div>
      <div
        id="linepay-option"
        data-method="linepay"
        class="payment-option hidden"
        @click="$emit('select-payment', 'linepay')"
      >
        <div class="check-mark"><img :src="selectedCheckIconUrl" alt="" class="ui-icon-img"></div>
        <div class="option-icon" id="po-linepay-icon-display"><img src="../../../../icons/payment-linepay.png" alt="LINE Pay 圖示" class="ui-icon-img"></div>
        <div
          id="po-linepay-name-display"
          class="font-semibold text-[#06C755]"
        >
          LINE Pay
        </div>
        <div
          id="po-linepay-desc-display"
          class="text-xs text-gray-500 mt-1"
        >
          線上安全付款
        </div>
      </div>
      <div
        id="jkopay-option"
        data-method="jkopay"
        class="payment-option hidden"
        @click="$emit('select-payment', 'jkopay')"
      >
        <div class="check-mark"><img :src="selectedCheckIconUrl" alt="" class="ui-icon-img"></div>
        <div class="option-icon" id="po-jkopay-icon-display"><img src="../../../../icons/payment-jkopay.png" alt="街口支付圖示" class="ui-icon-img"></div>
        <div
          id="po-jkopay-name-display"
          class="font-semibold text-orange-600"
        >
          街口支付
        </div>
        <div
          id="po-jkopay-desc-display"
          class="text-xs text-gray-500 mt-1"
        >
          街口支付線上付款
        </div>
      </div>
      <div
        id="transfer-option"
        data-method="transfer"
        class="payment-option hidden"
        @click="$emit('select-payment', 'transfer')"
      >
        <div class="check-mark"><img :src="selectedCheckIconUrl" alt="" class="ui-icon-img"></div>
        <div class="option-icon" id="po-transfer-icon-display"><img src="../../../../icons/payment-bank.png" alt="轉帳圖示" class="ui-icon-img"></div>
        <div
          id="po-transfer-name-display"
          class="font-semibold text-blue-600"
        >
          線上轉帳
        </div>
        <div
          id="po-transfer-desc-display"
          class="text-xs text-gray-500 mt-1"
        >
          ATM / 網銀匯款
        </div>
      </div>
    </div>

    <div id="transfer-info-section" class="hidden fade-in p-4 rounded-xl ui-card-section">
      <h3 class="font-semibold mb-3" style="color: var(--primary)">
        <span class="tab-with-icon"><img src="../../../../icons/payment-bank.png" alt="" class="ui-icon-inline">匯款資訊</span>
      </h3>

      <div class="mb-3 p-3 bg-white rounded-lg border border-blue-100 flex justify-between items-center">
        <span class="text-sm text-gray-600">應匯款總金額</span>
        <span
          id="transfer-total-amount"
          class="text-lg font-bold text-blue-600"
        >{{ totalPriceText }}</span>
      </div>

      <div id="bank-accounts-list" data-vue-managed="true" class="mb-3">
        <div
          v-for="account in bankAccounts"
          :key="account.id"
          class="p-3 rounded-lg mb-2 relative cursor-pointer font-sans transition-all border"
          :class="selectedBankAccountId === String(account.id)
            ? 'border-primary ring-2 ring-primary bg-orange-50'
            : 'border-[#d1dce5] bg-white'"
          data-bank-card="true"
          :data-bank-id="account.id"
          @click="$emit('select-bank-account', account.id)"
        >
          <div class="flex items-center gap-3 mb-1">
            <input
              type="radio"
              name="bank_account_selection"
              class="w-4 h-4 text-primary"
              :value="account.id"
              :checked="selectedBankAccountId === String(account.id)"
              @click.stop="$emit('select-bank-account', account.id)"
            >
            <div class="font-semibold text-gray-800">
              {{ account.bankName }} ({{ account.bankCode }})
            </div>
          </div>
          <div class="flex items-center gap-2 mt-1 pl-7">
            <span class="text-lg font-mono font-medium" style="color:var(--primary)">
              {{ account.accountNumber }}
            </span>
            <button
              type="button"
              data-copy-account="true"
              :data-account="account.accountNumber"
              class="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-1 rounded transition-colors"
              title="複製帳號"
              @click.stop="$emit('copy-transfer-account', account.id, account.accountNumber)"
            >
              {{ copiedBankAccountId === String(account.id) ? "已複製" : "複製" }}
            </button>
          </div>
          <div
            v-if="account.accountName"
            class="text-sm text-gray-500 mt-1 pl-7"
          >
            戶名: {{ account.accountName }}
          </div>
        </div>
      </div>
      <div class="mt-3">
        <label class="block text-sm text-gray-600 mb-1">您的匯款帳號末 5 碼（供對帳用）</label>
        <input
          id="transfer-last5"
          type="text"
          class="input-field"
          placeholder="請輸入帳號末5碼"
          maxlength="5"
          pattern="\d{5}"
          inputmode="numeric"
        >
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { StorefrontBankAccount } from "./useStorefrontPayment";

defineEmits<{
  "select-payment": [method: string];
  "select-bank-account": [bankId: string | number | undefined];
  "copy-transfer-account": [
    bankId: string | number | undefined,
    accountNumber: string | undefined,
  ];
}>();

withDefaults(
  defineProps<{
    bankAccounts?: StorefrontBankAccount[];
    selectedBankAccountId?: string;
    copiedBankAccountId?: string;
    totalPriceText: string;
    selectedCheckIconUrl: string;
  }>(),
  {
    bankAccounts: () => [],
    selectedBankAccountId: "",
    copiedBankAccountId: "",
  },
);
</script>
