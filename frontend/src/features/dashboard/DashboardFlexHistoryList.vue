<template>
  <div class="dashboard-flex-history-list">
    <div
      v-for="item in items"
      :key="`${item.orderId}-${item.timestamp}`"
      class="dashboard-flex-history-list__item"
    >
      <div class="dashboard-flex-history-list__meta">
        <span class="dashboard-flex-history-list__order">
          #{{ item.orderId }}
        </span>
        <span class="dashboard-flex-history-list__status">
          {{ item.statusLabel }}
        </span>
        <span class="dashboard-flex-history-list__time">
          {{ item.timeText }}
        </span>
      </div>
      <button
        type="button"
        class="dashboard-flex-history-list__copy"
        @click="copyItem(item.index)"
      >
        複製
      </button>
    </div>

    <button
      type="button"
      class="dashboard-flex-history-list__clear"
      @click="clearHistory"
    >
      清除所有歷史
    </button>
  </div>
</template>

<script setup lang="ts">
export interface DashboardFlexHistoryViewItem {
  index: number;
  orderId: string;
  statusLabel: string;
  timestamp: string;
  timeText: string;
  flexJson: string;
}

const props = defineProps<{
  items: DashboardFlexHistoryViewItem[];
  copyItem: (index: number) => void | Promise<void>;
  clearHistory: () => void | Promise<void>;
}>();

function copyItem(index: number) {
  void props.copyItem(index);
}

function clearHistory() {
  void props.clearHistory();
}
</script>

<style scoped>
.dashboard-flex-history-list {
  display: grid;
  max-height: 400px;
  gap: 8px;
  overflow-y: auto;
  text-align: left;
}

.dashboard-flex-history-list__item {
  align-items: center;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 8px;
  border: 1px solid #e2dcc8;
  border-radius: 6px;
  background: #fffdf7;
}

.dashboard-flex-history-list__meta {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
}

.dashboard-flex-history-list__order {
  color: #268bd2;
  font-weight: 700;
}

.dashboard-flex-history-list__status {
  padding: 2px 6px;
  border-radius: 4px;
  background: #268bd2;
  color: #fffdf7;
  font-size: 0.75rem;
}

.dashboard-flex-history-list__time {
  color: #839496;
  font-size: 0.75rem;
}

.dashboard-flex-history-list__copy {
  flex: 0 0 auto;
  padding: 4px 12px;
  border: 0;
  border-radius: 6px;
  background: #268bd2;
  color: #fffdf7;
  cursor: pointer;
  font-size: 0.75rem;
}

.dashboard-flex-history-list__clear {
  justify-self: start;
  border: 0;
  background: transparent;
  color: #dc322f;
  cursor: pointer;
  font-size: 0.75rem;
  text-decoration: underline;
}
</style>
