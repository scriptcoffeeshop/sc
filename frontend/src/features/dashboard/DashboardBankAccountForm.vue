<template>
  <div class="dashboard-bank-account-form">
    <label class="dashboard-bank-account-form__label" for="swal-bc">
      銀行代碼
    </label>
    <input
      id="swal-bc"
      class="swal2-input dashboard-bank-account-form__control"
      placeholder="例：013"
      :value="formValues.bankCode"
      @input="updateField('bankCode', getTargetValue($event))"
    >

    <label class="dashboard-bank-account-form__label" for="swal-bn">
      銀行名稱
    </label>
    <input
      id="swal-bn"
      class="swal2-input dashboard-bank-account-form__control"
      placeholder="例：國泰世華"
      :value="formValues.bankName"
      @input="updateField('bankName', getTargetValue($event))"
    >

    <label class="dashboard-bank-account-form__label" for="swal-an">
      帳號
    </label>
    <input
      id="swal-an"
      class="swal2-input dashboard-bank-account-form__control"
      placeholder="帳號號碼"
      :value="formValues.accountNumber"
      @input="updateField('accountNumber', getTargetValue($event))"
    >

    <label class="dashboard-bank-account-form__label" for="swal-am">
      戶名（選填）
    </label>
    <input
      id="swal-am"
      class="swal2-input dashboard-bank-account-form__control"
      placeholder="戶名"
      :value="formValues.accountName"
      @input="updateField('accountName', getTargetValue($event))"
    >
  </div>
</template>

<script setup lang="ts">
import { reactive } from "vue";

export interface DashboardBankAccountFormValues {
  bankCode?: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
}

export interface DashboardBankAccountFormExpose {
  getValues: () => DashboardBankAccountFormValues;
}

const props = withDefaults(
  defineProps<{
    initialValues?: DashboardBankAccountFormValues;
  }>(),
  {
    initialValues: () => ({}),
  },
);

const formValues = reactive({
  bankCode: String(props.initialValues.bankCode || ""),
  bankName: String(props.initialValues.bankName || ""),
  accountNumber: String(props.initialValues.accountNumber || ""),
  accountName: String(props.initialValues.accountName || ""),
});

function getTargetValue(event: Event): string {
  const target = event.target as HTMLInputElement | null;
  return target?.value || "";
}

function updateField(
  key: keyof DashboardBankAccountFormValues,
  value: string,
) {
  formValues[key] = value;
}

defineExpose<DashboardBankAccountFormExpose>({
  getValues: () => ({ ...formValues }),
});
</script>

<style scoped>
.dashboard-bank-account-form {
  display: grid;
  gap: 8px;
  text-align: left;
}

.dashboard-bank-account-form__label {
  color: #586e75;
  font-size: 0.875rem;
  font-weight: 700;
}

.dashboard-bank-account-form__control {
  width: 100%;
  margin: 0 0 8px;
}
</style>
