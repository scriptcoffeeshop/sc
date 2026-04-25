<template>
  <div class="dashboard-order-email-confirm">
    <p class="dashboard-order-email-confirm__line">
      訂單
      <b class="dashboard-order-email-confirm__order">#{{ orderId }}</b>
    </p>
    <p class="dashboard-order-email-confirm__line">
      將寄送「<b>{{ emailTypeLabel }}</b>」到
    </p>
    <p class="dashboard-order-email-confirm__email">
      {{ targetEmail }}
    </p>
    <p class="dashboard-order-email-confirm__status">
      目前狀態：{{ statusLabel }}
    </p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  orderId: string;
  emailTypeLabel: string;
  targetEmail: string;
  statusLabel: string;
}>();
</script>

<style scoped>
.dashboard-order-email-confirm {
  display: grid;
  gap: 6px;
  text-align: center;
}

.dashboard-order-email-confirm__line,
.dashboard-order-email-confirm__email,
.dashboard-order-email-confirm__status {
  margin: 0;
}

.dashboard-order-email-confirm__order,
.dashboard-order-email-confirm__email {
  color: #268bd2;
}

.dashboard-order-email-confirm__status {
  color: #839496;
  font-size: 0.75rem;
}
</style>
