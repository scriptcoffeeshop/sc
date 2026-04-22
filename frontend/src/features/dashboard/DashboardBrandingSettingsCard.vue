<template>
  <div class="mb-6 p-4 bg-white rounded-xl border">
    <h3 class="font-semibold mb-3 flex items-center ui-text-highlight">
      <img id="settings-brand-logo" src="../../../../icons/logo.png" alt="" class="ui-icon-inline-lg">
      品牌設定
    </h3>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3 settings-two-col-grid">
      <div>
        <label class="block text-sm ui-text-strong mb-1">網站標題</label>
        <input
          v-model.trim="brandingSettings.siteTitle"
          type="text"
          id="s-site-title"
          class="input-field"
          placeholder="Script Coffee"
        >
      </div>
      <div>
        <label class="block text-sm ui-text-strong mb-1">副標題</label>
        <input
          v-model.trim="brandingSettings.siteSubtitle"
          type="text"
          id="s-site-subtitle"
          class="input-field"
          placeholder="咖啡豆 | 耳掛"
        >
      </div>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3 settings-two-col-grid">
      <div>
        <label class="block text-sm ui-text-strong mb-1">備援文字圖示（可留空）</label>
        <input
          v-model.trim="brandingSettings.siteEmoji"
          type="text"
          id="s-site-emoji"
          class="input-field"
          placeholder="例如：品牌"
        >
      </div>
      <div>
        <label class="block text-sm ui-text-strong mb-1">品牌自訂 Logo</label>
        <div class="flex gap-3 items-center">
          <img
            id="s-icon-preview"
            :src="getSiteIconPreviewUrl()"
            alt="品牌圖示"
            class="w-10 h-10 rounded object-cover border shadow-sm"
          >
          <div class="flex flex-col gap-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <label
                for="s-site-icon-upload"
                class="btn-primary text-xs font-medium px-3 py-1.5 rounded transition shadow-sm cursor-pointer"
              >
                點擊上傳新 Logo
              </label>
              <button
                type="button"
                @click="handleResetSiteIcon"
                class="text-xs ui-text-danger hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-1.5 rounded transition"
              >
                移除自訂
              </button>
            </div>
            <div
              id="s-icon-url-display"
              class="text-xs ui-text-muted truncate max-w-[240px]"
            >
              {{ getSiteIconDisplayText() }}
            </div>
          </div>
          <input
            type="file"
            id="s-site-icon-upload"
            class="hidden"
            accept="image/png,image/jpeg,image/webp"
            @change="handleSiteIconSelection"
          >
          <input v-model="brandingSettings.siteIconUrl" type="hidden" id="s-site-icon-url">
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import {
  dashboardSettingsIconActions,
  useDashboardSettingsIcons,
} from "./useDashboardSettingsIcons.js";
import { useDashboardSettings } from "./useDashboardSettings.ts";

const { brandingSettings } = useDashboardSettings();
const { getSiteIconPreviewUrl } = useDashboardSettingsIcons();

async function handleSiteIconSelection(event) {
  const input = event?.target;
  const file = input?.files?.[0] || null;
  await dashboardSettingsIconActions.handleSiteIconSelection(file);
  if (input) input.value = "";
}

function handleResetSiteIcon() {
  dashboardSettingsIconActions.resetSiteIcon();
}

function getSiteIconDisplayText() {
  return brandingSettings.value.siteIconUrl ? "自訂 Logo" : "未設定 (預設)";
}
</script>
