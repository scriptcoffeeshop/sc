<template>
  <div class="mb-6 p-4 bg-white rounded-xl border">
    <h3 class="font-semibold mb-3 flex items-center ui-text-highlight">
      <img src="../../../../icons/payment-bank.png" alt="" class="ui-icon-inline-lg">
      匯款帳號管理
    </h3>
    <div class="mb-3">
      <p v-if="bankAccounts.length" class="text-xs ui-text-subtle mb-2">
        可拖曳左側排序圖示自由排序匯款帳號
      </p>
      <p v-else class="text-sm ui-text-subtle">
        尚無匯款帳號
      </p>
      <div
        v-if="bankAccounts.length"
        id="bank-accounts-sortable"
        :ref="registerBankAccountsListElement"
        class="space-y-2"
      >
        <div
          v-for="account in bankAccounts"
          :key="account.id"
          :data-bank-account-id="account.id"
          data-bank-account-row
          class="flex items-center justify-between p-3 rounded-lg"
          style="background:#FFFDF7; border:1px solid #E2DCC8;"
        >
          <div class="flex items-start gap-3 min-w-0">
            <span
              class="drag-handle-bank cursor-move ui-text-muted hover:ui-text-strong select-none pt-1"
              title="拖曳排序"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 256 256" class="drag-handle-icon-sm"><path d="M104,60A12,12,0,1,1,92,48,12,12,0,0,1,104,60Zm60-12a12,12,0,1,0,12,12A12,12,0,0,0,164,48ZM92,116a12,12,0,1,0,12,12A12,12,0,0,0,92,116Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,116ZM92,184a12,12,0,1,0,12,12A12,12,0,0,0,92,184Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,184Z"></path></svg>
            </span>
            <div>
              <div class="font-medium">
                {{ account.bankName }} ({{ account.bankCode }})
              </div>
              <div class="text-sm font-mono ui-text-strong">
                {{ account.accountNumber }}
              </div>
              <div v-if="account.accountName" class="text-xs ui-text-muted">
                戶名: {{ account.accountName }}
              </div>
            </div>
          </div>
          <div class="flex gap-2 shrink-0">
            <button
              type="button"
              @click="handleEditBankAccount(account.id)"
              class="text-sm ui-text-highlight"
            >
              編輯
            </button>
            <button
              type="button"
              @click="handleDeleteBankAccount(account.id)"
              class="text-sm ui-text-danger"
            >
              刪除
            </button>
          </div>
        </div>
      </div>
    </div>
    <button
      type="button"
      @click="handleShowAddBankAccountModal"
      class="text-sm font-medium hover:underline ui-text-highlight"
    >
      + 新增匯款帳號
    </button>
  </div>
</template>

<script setup>
import {
  dashboardBankAccountsActions,
  useDashboardBankAccounts,
} from "./useDashboardBankAccounts.js";

const { bankAccounts } = useDashboardBankAccounts();

function registerBankAccountsListElement(element) {
  dashboardBankAccountsActions.registerBankAccountsListElement(element);
}

function handleShowAddBankAccountModal() {
  dashboardBankAccountsActions.showAddBankAccountModal();
}

function handleEditBankAccount(id) {
  dashboardBankAccountsActions.editBankAccount(id);
}

function handleDeleteBankAccount(id) {
  dashboardBankAccountsActions.deleteBankAccount(id);
}
</script>
