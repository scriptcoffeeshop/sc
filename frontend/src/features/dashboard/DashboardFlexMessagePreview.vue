<template>
  <div class="dashboard-flex-message-preview">
    <div class="dashboard-flex-message-preview__meta">
      <span class="dashboard-flex-message-preview__muted">訂單</span>
      <b class="dashboard-flex-message-preview__order">#{{ orderId }}</b>
      <span>→</span>
      <span class="dashboard-flex-message-preview__status">
        {{ statusLabel }}
      </span>
    </div>

    <p
      v-if="canSendLine"
      class="dashboard-flex-message-preview__line dashboard-flex-message-preview__line--ok"
    >
      可直接一鍵發送至 LINE（目標 ID：{{ lineUserId }}）
    </p>
    <p
      v-else
      class="dashboard-flex-message-preview__line dashboard-flex-message-preview__line--warn"
    >
      此訂單缺少 LINE 使用者 ID，僅可複製 JSON
    </p>

    <pre
      id="swal-flex-json"
      class="dashboard-flex-message-preview__json"
    >{{ flexJson }}</pre>

    <p class="dashboard-flex-message-preview__hint">
      已自動暫存至歷史紀錄，可從訂單列表上方歷史按鈕查看。
    </p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  orderId: string;
  statusLabel: string;
  lineUserId: string;
  canSendLine: boolean;
  flexJson: string;
}>();
</script>

<style scoped>
.dashboard-flex-message-preview {
  display: grid;
  gap: 8px;
  text-align: left;
}

.dashboard-flex-message-preview__meta {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 0.875rem;
}

.dashboard-flex-message-preview__muted,
.dashboard-flex-message-preview__hint {
  color: #839496;
}

.dashboard-flex-message-preview__order {
  color: #268bd2;
}

.dashboard-flex-message-preview__status {
  color: #b58900;
  font-weight: 700;
}

.dashboard-flex-message-preview__line {
  margin: 0;
  font-size: 0.75rem;
}

.dashboard-flex-message-preview__line--ok {
  color: #2e7d32;
}

.dashboard-flex-message-preview__line--warn {
  color: #b58900;
}

.dashboard-flex-message-preview__json {
  max-height: 300px;
  margin: 0;
  padding: 12px;
  overflow: auto;
  border: 1px solid #e2dcc8;
  border-radius: 6px;
  background: #fffdf7;
  font-size: 11px;
  text-align: left;
  white-space: pre-wrap;
  word-break: break-all;
}

.dashboard-flex-message-preview__hint {
  margin: 0;
  font-size: 0.75rem;
}
</style>
