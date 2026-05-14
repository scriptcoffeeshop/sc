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
    <label class="dashboard-order-reason-form__label" for="swal-status-note">
      給消費者的狀態備註（選填）
    </label>
    <textarea
      id="swal-status-note"
      v-model.trim="statusNote"
      class="swal2-textarea dashboard-order-reason-form__control"
      maxlength="500"
      placeholder="例如：已放在管理室冰箱裡"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

export interface DashboardOrderReasonValues {
  cancelReason: string;
  statusNote: string;
}

export interface DashboardOrderReasonFormExpose {
  getValues: () => DashboardOrderReasonValues;
}

const props = withDefaults(
  defineProps<{
    label: string;
    placeholder: string;
    initialReason?: string;
    initialStatusNote?: string;
  }>(),
  {
    initialReason: "",
    initialStatusNote: "",
  },
);

const reason = ref(String(props.initialReason || ""));
const statusNote = ref(String(props.initialStatusNote || ""));

defineExpose<DashboardOrderReasonFormExpose>({
  getValues: () => ({
    cancelReason: reason.value,
    statusNote: statusNote.value,
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
