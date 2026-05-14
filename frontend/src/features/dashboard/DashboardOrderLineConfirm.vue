<template>
  <div class="dashboard-order-line-confirm">
    <p class="dashboard-order-line-confirm__line">
      訂單
      <b class="dashboard-order-line-confirm__order">#{{ orderId }}</b>
    </p>
    <p class="dashboard-order-line-confirm__line">
      將發送 LINE 通知給
    </p>
    <p class="dashboard-order-line-confirm__target">
      {{ targetLine }}
    </p>
    <p class="dashboard-order-line-confirm__status">
      目前狀態：{{ statusLabel }}
    </p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  orderId: string;
  targetLine: string;
  statusLabel: string;
}>();
</script>

<style scoped>
.dashboard-order-line-confirm {
  display: grid;
  gap: 6px;
  text-align: center;
}

.dashboard-order-line-confirm__line,
.dashboard-order-line-confirm__target,
.dashboard-order-line-confirm__status {
  margin: 0;
}

.dashboard-order-line-confirm__order,
.dashboard-order-line-confirm__target {
  color: #268bd2;
}

.dashboard-order-line-confirm__status {
  color: #839496;
  font-size: 0.75rem;
}
</style>
