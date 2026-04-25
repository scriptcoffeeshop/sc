<template>
  <div class="dashboard-settings-card">
    <div class="dashboard-settings-card__header">
      <h3 class="dashboard-settings-card__title">
        <img src="../../../../icons/announcement-bell.png" alt="" class="ui-icon-inline-lg">
        公告設定
      </h3>
    </div>
    <label class="settings-choice">
      <input v-model="storefrontSettings.announcementEnabled" type="checkbox" id="s-ann-enabled" class="w-4 h-4">
      <span>啟用公告</span>
    </label>
    <UiTextarea
      v-model="storefrontSettings.announcement"
      id="s-announcement"
      class="input-field resize-none"
      rows="3"
      placeholder="公告內容..."
    />
  </div>

  <div class="dashboard-settings-card">
    <div class="dashboard-settings-card__header">
      <h3 class="dashboard-settings-card__title">
        <img src="../../../../icons/announcement-bell.png" alt="" class="ui-icon-inline-lg">
        訂單通知設定
      </h3>
    </div>
    <label class="settings-choice">
      <input
        v-model="storefrontSettings.autoOrderEmailEnabled"
        type="checkbox"
        id="s-auto-order-email-enabled"
        class="w-4 h-4"
      >
      <span>顧客送出訂單後（待處理）自動寄送「訂單成立通知」</span>
    </label>
    <p class="text-xs ui-text-subtle mt-2">
      關閉後，系統不會在下單當下自動寄信；您仍可於訂單管理中手動寄送。
    </p>
  </div>

  <div class="dashboard-settings-card">
    <div class="dashboard-settings-card__header">
      <h3 class="dashboard-settings-card__title">
        <img src="../../../../icons/status-store.png" alt="" class="ui-icon-inline-lg">
        營業狀態
      </h3>
    </div>
    <div class="settings-choice-grid">
      <label class="settings-choice">
        <input
          v-model="storefrontSettings.isOpen"
          type="radio"
          name="s-open"
          :value="true"
          class="w-4 h-4"
        >
        營業中
      </label>
      <label class="settings-choice">
        <input
          v-model="storefrontSettings.isOpen"
          type="radio"
          name="s-open"
          :value="false"
          class="w-4 h-4"
        >
        休息中
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import UiTextarea from "../../components/ui/textarea/Textarea.vue";
import { useDashboardSettings } from "./useDashboardSettings.ts";

const { storefrontSettings } = useDashboardSettings();
</script>

<style scoped>
.settings-choice,
.settings-choice-grid {
  display: flex;
  gap: 0.6rem;
}

.settings-choice {
  align-items: center;
  min-height: 2.4rem;
  border: 1px solid #e2dcc8;
  border-radius: 8px;
  background: #fdf6e3;
  padding: 0.55rem 0.7rem;
  color: #073642;
  cursor: pointer;
  line-height: 1.4;
}

.settings-choice-grid {
  flex-wrap: wrap;
}
</style>
