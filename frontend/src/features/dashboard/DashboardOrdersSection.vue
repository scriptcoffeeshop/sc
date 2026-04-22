<template>
  <div id="orders-section" v-show="activeTab === 'orders'" class="glass-card p-6">
    <DashboardOrdersToolbar />
    <div id="orders-summary" class="text-sm ui-text-strong mb-3">{{ summaryText }}</div>
    <div id="orders-list">
      <p v-if="ordersView.length === 0" class="text-center ui-text-subtle py-8">
        沒有符合的訂單
      </p>
      <template v-else>
        <DashboardOrderCard
          v-for="order in ordersView"
          :key="order.orderId"
          :order="order"
        />
      </template>
    </div>
  </div>
</template>

<script setup>
import DashboardOrderCard from "./DashboardOrderCard.vue";
import DashboardOrdersToolbar from "./DashboardOrdersToolbar.vue";
import { useDashboardOrders } from "./useDashboardOrders.ts";
import { useDashboardSession } from "./useDashboardSession.ts";

const {
  ordersView,
  summaryText,
} = useDashboardOrders();
const { activeTab } = useDashboardSession();
</script>
