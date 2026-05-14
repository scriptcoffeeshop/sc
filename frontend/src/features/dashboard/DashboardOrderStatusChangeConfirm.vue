<template>
  <div class="dashboard-order-status-change-confirm">
    <p class="dashboard-order-status-change-confirm__line">
      訂單
      <b class="dashboard-order-status-change-confirm__order">#{{ orderId }}</b>
    </p>
    <div class="dashboard-order-status-change-confirm__status-row">
      <span class="dashboard-order-status-change-confirm__status-old">
        {{ currentStatusLabel }}
      </span>
      <span class="dashboard-order-status-change-confirm__connector">
        變更為
      </span>
      <span class="dashboard-order-status-change-confirm__status-new">
        {{ newStatusLabel }}
      </span>
    </div>
    <label
      class="dashboard-order-status-change-confirm__note-label"
      for="swal-status-note"
    >
      給消費者的狀態備註（選填）
    </label>
    <textarea
      id="swal-status-note"
      v-model.trim="statusNote"
      class="swal2-textarea dashboard-order-status-change-confirm__note-control"
      maxlength="500"
      placeholder="例如：已放在管理室冰箱裡"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

export interface DashboardOrderStatusChangeValues {
  statusNote: string;
}

export interface DashboardOrderStatusChangeConfirmExpose {
  getValues: () => DashboardOrderStatusChangeValues;
}

const props = withDefaults(
  defineProps<{
    orderId: string;
    currentStatusLabel: string;
    newStatusLabel: string;
    initialStatusNote?: string;
  }>(),
  {
    initialStatusNote: "",
  },
);

const statusNote = ref(String(props.initialStatusNote || ""));

defineExpose<DashboardOrderStatusChangeConfirmExpose>({
  getValues: () => ({
    statusNote: statusNote.value,
  }),
});
</script>

<style scoped>
.dashboard-order-status-change-confirm {
  display: grid;
  gap: 10px;
  text-align: center;
}

.dashboard-order-status-change-confirm__line {
  margin: 0;
}

.dashboard-order-status-change-confirm__order {
  color: #268bd2;
}

.dashboard-order-status-change-confirm__status-row {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.dashboard-order-status-change-confirm__status-old {
  color: #839496;
}

.dashboard-order-status-change-confirm__connector {
  color: #586e75;
  font-size: 0.875rem;
}

.dashboard-order-status-change-confirm__status-new {
  color: #b58900;
  font-weight: 700;
}

.dashboard-order-status-change-confirm__note-label {
  color: #586e75;
  display: block;
  font-size: 0.875rem;
  font-weight: 700;
  text-align: left;
}

.dashboard-order-status-change-confirm__note-control {
  margin: 0;
  min-height: 96px;
  width: 100%;
}
</style>
