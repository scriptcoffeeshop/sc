<template>
  <div class="mb-6 p-4 bg-white rounded-xl border">
    <h3 class="font-semibold mb-3 flex items-center ui-text-highlight">
      <img src="../../../../icons/section-tag.png" alt="" class="ui-icon-inline-lg">
      區塊標題樣式設定
    </h3>

    <div
      v-for="(section, index) in sectionRows"
      :key="section.key"
      :class="index === sectionRows.length - 1 ? '' : 'mb-4 border-b pb-4'"
    >
      <div class="flex justify-between items-center mb-1">
        <label class="block text-sm font-medium ui-text-strong">{{ section.label }}</label>
        <button
          type="button"
          @click="handleResetSectionTitle(section.key)"
          class="text-xs ui-text-highlight hover:text-blue-700"
        >
          恢復預設
        </button>
      </div>
      <div class="flex flex-wrap items-center gap-2 mb-2">
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
          class="text-sm"
          @change="handleSectionIconPreview(section.key, $event)"
        >
        <img
          :id="`s-${section.key}-icon-preview`"
          :src="getSectionIconPreviewUrl(section.key)"
          alt=""
          class="icon-upload-preview"
        >
        <button
          type="button"
          @click="handleSectionIconUpload(section.key)"
          class="text-xs px-2 py-1 rounded border ui-border text-blue-700 hover:ui-primary-soft"
        >
          上傳區塊圖示
        </button>
        <span
          :id="`s-${section.key}-icon-url-display`"
          class="text-[11px] ui-text-muted truncate max-w-[250px]"
        >{{ getDisplayUrl(sectionTitleSettings[section.key].iconUrl) }}</span>
      </div>
      <div class="flex flex-wrap gap-2 items-center">
        <input
          v-model.trim="sectionTitleSettings[section.key].title"
          type="text"
          :id="`s-${section.key}-title`"
          class="input-field flex-1 min-w-[150px]"
          :placeholder="section.placeholder"
        >
        <input
          v-model="sectionTitleSettings[section.key].color"
          type="color"
          :id="`s-${section.key}-color`"
          class="h-10 w-10 cursor-pointer rounded border border-gray-300 p-0.5"
          title="文字顏色"
        >
        <select
          v-model="sectionTitleSettings[section.key].size"
          :id="`s-${section.key}-size`"
          class="input-field w-24"
          title="文字大小"
        >
          <option value="text-base">16px (標準)</option>
          <option value="text-lg">18px (稍大)</option>
          <option value="text-xl">20px (大)</option>
          <option value="text-2xl">24px (特大)</option>
        </select>
        <label class="flex items-center gap-1 cursor-pointer ui-bg-soft px-3 py-2 rounded border ui-border">
          <input
            v-model="sectionTitleSettings[section.key].bold"
            type="checkbox"
            :id="`s-${section.key}-bold`"
          >
          粗體
        </label>
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
