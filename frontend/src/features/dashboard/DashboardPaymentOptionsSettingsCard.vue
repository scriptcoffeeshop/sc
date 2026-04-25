<template>
  <div class="dashboard-settings-card payment-display-card">
    <div class="dashboard-settings-card__header payment-display-card__header">
      <div>
        <h3 class="dashboard-settings-card__title">
          <img src="../../../../icons/payment-cash.png" alt="" class="ui-icon-inline-lg">
          金流選項顯示
        </h3>
        <p class="payment-display-card__hint">
          只設定顧客看到的付款名稱、圖示與說明。是否可用由上方取貨方式卡片決定。
        </p>
      </div>
    </div>

    <div id="payment-options-table" class="payment-options-list payment-display-list">
      <article
        v-for="method in paymentMethodOrder"
        :key="method"
        class="payment-option-card payment-display-option"
      >
        <header class="payment-display-option__header">
          <img
            :src="getPaymentPreviewUrl(method)"
            alt=""
            class="payment-display-option__icon"
          >
          <div class="payment-display-option__title-block">
            <span class="payment-display-option__code">{{ method }}</span>
            <input
              v-model.trim="paymentOptions[method].name"
              type="text"
              :id="`po-${method}-name`"
              class="input-field payment-display-option__name"
              placeholder="顯示名稱"
            >
          </div>
        </header>

        <div class="payment-display-option__body">
          <div class="payment-display-option__upload">
            <img
              :id="`po-${method}-icon-preview`"
              :src="getPaymentPreviewUrl(method)"
              alt=""
              class="icon-upload-preview payment-option-icon-preview settings-large-icon-preview"
            >
            <div class="icon-upload-controls">
              <input
                v-model="paymentOptions[method].icon_url"
                type="hidden"
                :id="`po-${method}-icon-url`"
              >
              <input
                type="file"
                :id="`po-${method}-icon-file`"
                accept="image/*"
                :ref="(element) => registerPaymentIconInput(method, element)"
                class="text-sm icon-upload-file"
                @change="handlePaymentIconPreview(method, $event)"
              >
              <button
                type="button"
                @click="handlePaymentIconUpload(method)"
                class="dashboard-action dashboard-action--primary icon-upload-action"
              >
                <UploadCloud class="h-4 w-4" aria-hidden="true" />
                上傳付款圖示
              </button>
              <span
                :id="`po-${method}-icon-url-display`"
                class="payment-display-option__path"
              >{{ getDisplayUrl(paymentOptions[method].icon_url) }}</span>
            </div>
          </div>

          <label class="payment-display-option__field">
            <span>付款說明</span>
            <textarea
              v-model.trim="paymentOptions[method].description"
              :id="`po-${method}-desc`"
              class="input-field text-sm ui-text-strong"
              placeholder="顧客會看到的付款說明"
              rows="3"
            ></textarea>
          </label>
        </div>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ComponentPublicInstance } from "vue";
import { UploadCloud } from "lucide-vue-next";
import {
  dashboardSettingsIconActions,
  useDashboardSettingsIcons,
} from "./useDashboardSettingsIcons.ts";
import { useDashboardSettings } from "./useDashboardSettings.ts";

const { paymentOptions, paymentMethodOrder } = useDashboardSettings();
const { getDisplayUrl, getPaymentPreviewUrl } = useDashboardSettingsIcons();
const paymentIconInputs = new Map<string, HTMLInputElement>();
type TemplateRefElement = Element | ComponentPublicInstance | null;

function registerPaymentIconInput(method: string, element: TemplateRefElement) {
  const key = String(method || "").trim();
  if (!key) return;
  if (element instanceof HTMLInputElement) {
    paymentIconInputs.set(key, element);
    return;
  }
  paymentIconInputs.delete(key);
}

function handlePaymentIconPreview(method: string, event: Event) {
  const input = event.target instanceof HTMLInputElement
    ? event.target
    : null;
  dashboardSettingsIconActions.previewPaymentIconFile(
    method,
    input?.files?.[0] || null,
  );
}

async function handlePaymentIconUpload(method: string) {
  const input = paymentIconInputs.get(String(method || "").trim());
  await dashboardSettingsIconActions.uploadPaymentIconFile(
    method,
    input?.files?.[0] || null,
  );
  if (input) input.value = "";
}
</script>

<style scoped>
.payment-display-card {
  display: grid;
  gap: 1rem;
}

.payment-display-card__header {
  margin-bottom: 0;
}

.payment-display-card__hint {
  margin-top: 0.35rem;
  color: #657B83;
  font-size: 0.84rem;
  line-height: 1.55;
}

.payment-display-list {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.payment-display-option {
  display: grid;
  gap: 0.85rem;
  border: 1px solid #E2DCC8;
  border-radius: 8px;
  background: #FFFDF7;
  padding: 0.95rem;
}

.payment-display-option__header {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.75rem;
  align-items: center;
}

.payment-display-option__icon {
  width: 3.2rem;
  height: 3.2rem;
  object-fit: contain;
}

.payment-display-option__title-block {
  display: grid;
  gap: 0.35rem;
  min-width: 0;
}

.payment-display-option__code {
  width: fit-content;
  max-width: 100%;
  border-radius: 999px;
  background: #F6F0DE;
  color: #657B83;
  padding: 0.18rem 0.5rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.payment-display-option__name {
  min-height: 2.65rem;
  font-weight: 900;
}

.payment-display-option__body {
  display: grid;
  grid-template-columns: minmax(0, 0.82fr) minmax(0, 1.18fr);
  gap: 0.85rem;
  align-items: start;
}

.payment-display-option__upload {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.75rem;
  min-width: 0;
}

.payment-display-option__path {
  width: 100%;
  overflow: hidden;
  color: #839496;
  font-size: 0.72rem;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.payment-display-option__field {
  display: grid;
  gap: 0.35rem;
  min-width: 0;
}

.payment-display-option__field span {
  color: #657B83;
  font-size: 0.76rem;
  font-weight: 800;
  line-height: 1.35;
}

.payment-display-option__field textarea {
  min-height: 6.15rem;
  line-height: 1.55;
  white-space: pre-wrap;
}

@media (max-width: 900px) {
  .payment-display-list {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 639px) {
  .payment-display-option__body,
  .payment-display-option__upload {
    grid-template-columns: 1fr;
  }
}
</style>
