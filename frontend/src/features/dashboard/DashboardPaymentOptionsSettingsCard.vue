<template>
  <div class="dashboard-settings-card payment-display-card">
    <div class="dashboard-settings-card__header">
      <div>
        <h3 class="dashboard-settings-card__title">
          <img src="../../../../icons/payment-cash.png" alt="" class="ui-icon-inline-lg">
          金流選項顯示設定
        </h3>
        <p class="payment-display-card__hint">
          這裡只設定付款方式在前台的名稱、圖示與說明；是否可選由上方取貨方式決定。
        </p>
      </div>
    </div>

    <div id="payment-options-table" class="payment-options-list payment-display-list">
      <article
        v-for="method in paymentMethodOrder"
        :key="method"
        class="payment-option-card settings-config-card payment-display-card-item"
      >
        <div class="payment-display-card-item__icon-panel">
          <img
            :id="`po-${method}-icon-preview`"
            :src="getPaymentPreviewUrl(method)"
            alt=""
            class="payment-display-card-item__icon"
          >
        </div>

        <div class="payment-display-card-item__main">
          <header class="payment-display-card-item__header">
            <span class="payment-display-card-item__code">{{ method }}</span>
            <input
              v-model.trim="paymentOptions[method].name"
              type="text"
              :id="`po-${method}-name`"
              class="input-field"
              placeholder="顯示名稱"
            >
          </header>

          <div class="payment-display-card-item__body">
            <div class="payment-icon-editor icon-upload-row">
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
                  class="payment-icon-path"
                >{{ getDisplayUrl(paymentOptions[method].icon_url) }}</span>
              </div>
            </div>

            <label class="payment-display-field">
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
.payment-display-card__hint {
  margin-top: 0.35rem;
  color: #657B83;
  font-size: 0.84rem;
  line-height: 1.55;
}

.payment-display-list {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.payment-display-list > .settings-config-card + .settings-config-card {
  margin-top: 0;
}

.payment-display-card-item {
  display: grid;
  grid-template-columns: 4.75rem minmax(0, 1fr);
  gap: 1rem;
  align-items: start;
  min-width: 0;
}

.payment-display-card-item__icon-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 4.75rem;
  border: 1px solid #E2DCC8;
  border-radius: 8px;
  background: #FFFFFF;
}

.payment-display-card-item__icon {
  width: 3.8rem;
  height: 3.8rem;
  object-fit: contain;
}

.payment-display-card-item__main {
  display: grid;
  min-width: 0;
  gap: 0.75rem;
}

.payment-display-card-item__header {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}

.payment-display-card-item__header .input-field {
  min-height: 2.45rem;
  font-size: 0.95rem;
  font-weight: 800;
}

.payment-display-card-item__code {
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

.payment-display-card-item__body {
  display: grid;
  grid-template-columns: minmax(13rem, 0.72fr) minmax(17rem, 1.28fr);
  gap: 0.85rem;
  align-items: start;
  min-width: 0;
}

.payment-icon-editor {
  grid-template-columns: minmax(0, 1fr);
}

.payment-icon-path {
  width: 100%;
  overflow: hidden;
  color: #839496;
  font-size: 0.72rem;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.payment-display-field {
  display: grid;
  gap: 0.35rem;
  min-width: 0;
}

.payment-display-field span {
  color: #657B83;
  font-size: 0.76rem;
  font-weight: 800;
  line-height: 1.35;
}

.payment-display-field textarea {
  min-height: 5.75rem;
  line-height: 1.55;
  white-space: pre-wrap;
}

@media (max-width: 1180px) {
  .payment-display-card-item__body {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .payment-display-list {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 639px) {
  .payment-display-card-item {
    grid-template-columns: 1fr;
  }

  .payment-display-card-item__icon-panel {
    justify-content: flex-start;
    min-height: auto;
    border: 0;
    background: transparent;
  }

  .payment-display-card-item__header {
    grid-template-columns: 1fr;
  }
}
</style>
