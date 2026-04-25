<template>
  <div class="dashboard-order-reason-form">
    <label class="dashboard-order-reason-form__label" for="swal-cancel-reason">
      {{ label }}（選填）
    </label>
    <textarea
      id="swal-cancel-reason"
      v-model.trim="reason"
      class="swal2-textarea dashboard-order-reason-form__control"
      :placeholder="placeholder"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

export interface DashboardOrderReasonValues {
  cancelReason: string;
}

export interface DashboardOrderReasonFormExpose {
  getValues: () => DashboardOrderReasonValues;
}

const props = withDefaults(
  defineProps<{
    label: string;
    placeholder: string;
    initialReason?: string;
  }>(),
  {
    initialReason: "",
  },
);

const reason = ref(String(props.initialReason || ""));

defineExpose<DashboardOrderReasonFormExpose>({
  getValues: () => ({
    cancelReason: reason.value,
  }),
});
</script>

<style scoped>
.dashboard-order-reason-form {
  display: grid;
  gap: 8px;
  text-align: left;
}

.dashboard-order-reason-form__label {
  color: #586e75;
  display: block;
  font-size: 0.875rem;
  font-weight: 700;
}

.dashboard-order-reason-form__control {
  width: 100%;
  margin: 0;
}
</style>
