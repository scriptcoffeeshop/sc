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
  </div>
</template>

<script setup lang="ts">
defineProps<{
  orderId: string;
  currentStatusLabel: string;
  newStatusLabel: string;
}>();
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
</style>
