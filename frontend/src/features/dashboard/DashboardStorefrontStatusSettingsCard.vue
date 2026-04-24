<template>
  <div class="mb-6 p-4 bg-white rounded-xl border">
    <h3 class="font-semibold mb-3 flex items-center ui-text-highlight">
      <img src="../../../../icons/announcement-bell.png" alt="" class="ui-icon-inline-lg">
      公告設定
    </h3>
    <label class="flex items-center gap-2 mb-3 cursor-pointer">
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

  <div class="mb-6 p-4 bg-white rounded-xl border">
    <h3 class="font-semibold mb-3 flex items-center ui-text-highlight">
      <img src="../../../../icons/announcement-bell.png" alt="" class="ui-icon-inline-lg">
      訂單通知設定
    </h3>
    <label class="flex items-center gap-2 cursor-pointer">
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

  <div class="mb-6 p-4 bg-white rounded-xl border">
    <h3 class="font-semibold mb-3 flex items-center ui-text-highlight">
      <img src="../../../../icons/status-store.png" alt="" class="ui-icon-inline-lg">
      營業狀態
    </h3>
    <div class="flex gap-4">
      <label class="flex items-center gap-2 cursor-pointer">
        <input
          v-model="storefrontSettings.isOpen"
          type="radio"
          name="s-open"
          :value="true"
          class="w-4 h-4"
        >
        營業中
      </label>
      <label class="flex items-center gap-2 cursor-pointer">
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
