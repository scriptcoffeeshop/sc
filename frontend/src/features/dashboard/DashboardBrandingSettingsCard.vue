<template>
  <div id="branding-settings-card" class="dashboard-settings-card">
    <div class="dashboard-settings-card__header">
      <h3 class="dashboard-settings-card__title">
        <img id="settings-brand-logo" src="../../../../icons/logo.png" alt="" class="ui-icon-inline-lg">
        品牌設定
      </h3>
    </div>
    <div class="dashboard-form-grid settings-two-col-grid branding-text-grid">
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
    <div class="dashboard-setting-field branding-logo-field">
      <label class="dashboard-setting-label">品牌自訂 Logo</label>
      <div class="branding-upload">
        <img
          id="s-icon-preview"
          :src="getSiteIconPreviewUrl()"
          alt="品牌圖示"
          class="branding-logo-preview"
        >
        <div class="branding-upload__actions">
          <label
            for="s-site-icon-upload"
            class="btn-primary branding-upload__primary"
          >
            <UploadCloud class="h-4 w-4" aria-hidden="true" />
            點擊上傳新 Logo
          </label>
          <button
            type="button"
            @click="handleResetSiteIcon"
            class="branding-upload__remove"
          >
            <Trash2 class="h-4 w-4" aria-hidden="true" />
            移除
          </button>
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
import { Trash2, UploadCloud } from "lucide-vue-next";
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
</script>

<style scoped>
.branding-text-grid {
  margin-bottom: 1.5rem;
}

.branding-logo-field {
  gap: 0.6rem;
}

.branding-upload {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}

.branding-logo-preview {
  width: 3rem;
  height: 3rem;
  min-width: 3rem;
  border: 1px solid #E2DCC8;
  border-radius: 8px;
  background: #FFFFFF;
  object-fit: cover;
  box-shadow: 0 1px 3px rgba(7, 54, 66, 0.12);
}

.branding-upload__actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  flex-wrap: wrap;
}

.branding-upload__primary {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-height: 2.4rem;
  border-radius: 8px;
  padding: 0.5rem 0.8rem;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 800;
  line-height: 1.2;
}

.branding-upload__remove {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-height: 2.4rem;
  border: 1px solid #F1B7B7;
  border-radius: 8px;
  background: transparent;
  color: #C33434;
  padding: 0.48rem 0.75rem;
  font-size: 0.8rem;
  font-weight: 800;
  line-height: 1.2;
  transition:
    background-color 0.16s ease,
    border-color 0.16s ease;
}

.branding-upload__remove:hover,
.branding-upload__remove:focus-visible {
  border-color: #E57373;
  background: #FFF5F5;
  outline: none;
}

@media (max-width: 520px) {
  .branding-upload {
    align-items: center;
  }

  .branding-upload__actions {
    flex: 1 1 12rem;
  }
}
</style>
