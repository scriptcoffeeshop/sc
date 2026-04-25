<template>
  <div class="dashboard-settings-card">
    <div class="dashboard-settings-card__header">
      <h3 class="dashboard-settings-card__title">
        <img src="../../../../icons/payment-bank.png" alt="" class="ui-icon-inline-lg">
        匯款帳號管理
      </h3>
      <button
        type="button"
        @click="handleShowAddBankAccountModal"
        class="dashboard-action dashboard-action--primary"
      >
        新增匯款帳號
      </button>
    </div>
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
        class="dashboard-card-list"
      >
        <article
          v-for="account in bankAccounts"
          :key="account.id"
          :data-bank-account-id="account.id"
          data-bank-account-row
          class="dashboard-item-card bank-account-card"
        >
          <div class="dashboard-card-row">
            <span
              class="drag-handle-bank dashboard-drag-handle"
              title="拖曳排序"
              aria-label="拖曳排序"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 256 256" class="drag-handle-icon-sm"><path d="M104,60A12,12,0,1,1,92,48,12,12,0,0,1,104,60Zm60-12a12,12,0,1,0,12,12A12,12,0,0,0,164,48ZM92,116a12,12,0,1,0,12,12A12,12,0,0,0,92,116Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,116ZM92,184a12,12,0,1,0,12,12A12,12,0,0,0,92,184Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,184Z"></path></svg>
            </span>
            <div class="dashboard-card-main">
              <div class="dashboard-card-title">
                {{ account.bankName }} ({{ account.bankCode }})
              </div>
              <div class="dashboard-code bank-account-card__number">
                {{ account.accountNumber }}
              </div>
              <div v-if="account.accountName" class="dashboard-card-meta">
                戶名: {{ account.accountName }}
              </div>
            </div>
            <div class="dashboard-card-actions">
              <button
                type="button"
                @click="handleEditBankAccount(account.id)"
                class="dashboard-action dashboard-action--primary"
              >
                編輯
              </button>
              <button
                type="button"
                @click="handleDeleteBankAccount(account.id)"
                class="dashboard-action dashboard-action--danger"
              >
                刪除
              </button>
            </div>
          </div>
        </article>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ComponentPublicInstance } from "vue";
import {
  dashboardBankAccountsActions,
  useDashboardBankAccounts,
} from "./useDashboardBankAccounts.ts";

const { bankAccounts } = useDashboardBankAccounts();
type TemplateRefElement = Element | ComponentPublicInstance | null;

function registerBankAccountsListElement(element: TemplateRefElement) {
  dashboardBankAccountsActions.registerBankAccountsListElement(
    element instanceof HTMLElement ? element : null,
  );
}

function handleShowAddBankAccountModal() {
  dashboardBankAccountsActions.showAddBankAccountModal();
}

function handleEditBankAccount(id: number | string) {
  dashboardBankAccountsActions.editBankAccount(id);
}

function handleDeleteBankAccount(id: number | string) {
  dashboardBankAccountsActions.deleteBankAccount(id);
}
</script>

<style scoped>
.bank-account-card__number {
  margin-top: 0.25rem;
  color: #073642;
  font-weight: 800;
}
</style>
