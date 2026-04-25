<template>
  <div class="dashboard-settings-card">
    <div class="dashboard-settings-card__header">
      <h3 class="dashboard-settings-card__title">
        <img id="settings-brand-logo" src="../../../../icons/logo.png" alt="" class="ui-icon-inline-lg">
        品牌設定
      </h3>
    </div>
    <div class="dashboard-form-grid mb-3 settings-two-col-grid">
      <div class="dashboard-setting-field">
        <label class="dashboard-setting-label">網站標題</label>
        <input
          v-model.trim="brandingSettings.siteTitle"
          type="text"
          id="s-site-title"
          class="input-field"
          placeholder="Script Coffee"
        >
      </div>
      <div class="dashboard-setting-field">
        <label class="dashboard-setting-label">副標題</label>
        <input
          v-model.trim="brandingSettings.siteSubtitle"
          type="text"
          id="s-site-subtitle"
          class="input-field"
          placeholder="咖啡豆 | 耳掛"
        >
      </div>
    </div>
    <div class="dashboard-setting-field">
      <label class="dashboard-setting-label">品牌自訂 Logo</label>
      <div class="branding-upload">
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
</template>

<script setup lang="ts">
import {
  dashboardSettingsIconActions,
  useDashboardSettingsIcons,
} from "./useDashboardSettingsIcons.ts";
import { useDashboardSettings } from "./useDashboardSettings.ts";

const { brandingSettings } = useDashboardSettings();
const { getSiteIconPreviewUrl } = useDashboardSettingsIcons();

async function handleSiteIconSelection(event: Event) {
  const input = event.target instanceof HTMLInputElement
    ? event.target
    : null;
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

<style scoped>
.branding-upload {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

@media (max-width: 520px) {
  .branding-upload {
    align-items: flex-start;
  }
}
</style>
