<template>
  <div id="section-title-settings-card" class="mb-6 p-4 bg-white rounded-xl border">
    <div class="flex items-center justify-between gap-3 mb-3">
      <h3 class="font-semibold flex items-center ui-text-highlight">
        <img src="../../../../icons/section-tag.png" alt="" class="ui-icon-inline-lg">
        區塊標題樣式設定
      </h3>
    </div>

    <div
      v-for="section in sectionRows"
      :key="section.key"
      class="section-title-card"
    >
      <div class="section-title-card-header">
        <div class="min-w-0">
          <div class="text-xs font-semibold ui-text-subtle mb-1">{{ section.label }}</div>
          <div
            class="section-title-preview"
            :class="[
              sectionTitleSettings[section.key].size,
              sectionTitleSettings[section.key].bold ? 'font-bold' : 'font-medium',
            ]"
            :style="{ color: sectionTitleSettings[section.key].color }"
          >
            <img
              :src="getSectionIconPreviewUrl(section.key)"
              alt=""
              class="section-title-preview-icon"
            >
            <span>{{ sectionTitleSettings[section.key].title || section.placeholder }}</span>
          </div>
        </div>
        <button
          type="button"
          @click="handleResetSectionTitle(section.key)"
          class="section-title-reset"
        >
          恢復預設
        </button>
      </div>

      <div class="section-title-card-body">
        <div class="section-title-icon-editor">
          <img
            :id="`s-${section.key}-icon-preview`"
            :src="getSectionIconPreviewUrl(section.key)"
            alt=""
            class="icon-upload-preview section-title-icon-preview"
          >
          <div class="icon-upload-controls">
            <input
              v-model="sectionTitleSettings[section.key].iconUrl"
              type="hidden"
              :id="`s-${section.key}-icon-url`"
            >
            <input
              type="file"
              :id="`s-${section.key}-icon-file`"
              accept="image/*"
              :ref="(element) => registerSectionIconInput(section.key, element)"
              class="text-sm icon-upload-file"
              @change="handleSectionIconPreview(section.key, $event)"
            >
            <button
              type="button"
              @click="handleSectionIconUpload(section.key)"
              class="text-xs px-2 py-1 rounded border ui-border text-blue-700 hover:ui-primary-soft icon-upload-action"
            >
              上傳區塊圖示
            </button>
            <span
              :id="`s-${section.key}-icon-url-display`"
              class="text-[11px] ui-text-muted truncate max-w-full"
            >{{ getDisplayUrl(sectionTitleSettings[section.key].iconUrl) }}</span>
          </div>
        </div>

        <div class="section-title-form-grid">
          <label class="section-title-field section-title-field-wide">
            <span>標題</span>
            <input
              v-model.trim="sectionTitleSettings[section.key].title"
              type="text"
              :id="`s-${section.key}-title`"
              class="input-field"
              :placeholder="section.placeholder"
            >
          </label>
          <label class="section-title-field">
            <span>文字大小</span>
            <select
              v-model="sectionTitleSettings[section.key].size"
              :id="`s-${section.key}-size`"
              class="input-field"
            >
              <option value="text-base">16px 標準</option>
              <option value="text-lg">18px 稍大</option>
              <option value="text-xl">20px 大</option>
              <option value="text-2xl">24px 特大</option>
            </select>
          </label>
          <label class="section-title-field">
            <span>文字顏色</span>
            <input
              v-model="sectionTitleSettings[section.key].color"
              type="color"
              :id="`s-${section.key}-color`"
              class="section-title-color-input"
              title="文字顏色"
            >
          </label>
          <label class="section-title-bold-toggle">
            <input
              v-model="sectionTitleSettings[section.key].bold"
              type="checkbox"
              :id="`s-${section.key}-bold`"
            >
            <span>粗體</span>
          </label>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import {
  dashboardSettingsIconActions,
  useDashboardSettingsIcons,
} from "./useDashboardSettingsIcons.ts";
import {
  dashboardSettingsActions,
  useDashboardSettings,
} from "./useDashboardSettings.ts";

const sectionRows = [
  { key: "products", label: "商品區塊", placeholder: "咖啡豆選購" },
  { key: "delivery", label: "配送區塊", placeholder: "配送方式" },
  { key: "notes", label: "備註區塊", placeholder: "訂單備註" },
];

const { sectionTitleSettings } = useDashboardSettings();
const { getDisplayUrl, getSectionIconPreviewUrl } = useDashboardSettingsIcons();
const sectionIconInputs = new Map();

function handleResetSectionTitle(section) {
  dashboardSettingsActions.resetSectionTitle(section);
}

function registerSectionIconInput(section, element) {
  const key = String(section || "").trim();
  if (!key) return;
  if (element) {
    sectionIconInputs.set(key, element);
    return;
  }
  sectionIconInputs.delete(key);
}

function handleSectionIconPreview(section, event) {
  dashboardSettingsIconActions.previewSectionIconFile(
    section,
    event?.target?.files?.[0] || null,
  );
}

async function handleSectionIconUpload(section) {
  const input = sectionIconInputs.get(String(section || "").trim());
  await dashboardSettingsIconActions.uploadSectionIconFile(
    section,
    input?.files?.[0] || null,
  );
  if (input) input.value = "";
}
</script>
