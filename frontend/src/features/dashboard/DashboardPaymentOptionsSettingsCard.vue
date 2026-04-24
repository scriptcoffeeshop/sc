<template>
  <div class="mb-6 p-4 bg-white rounded-xl border">
    <h3 class="font-semibold text-lg mb-3 flex items-center ui-text-highlight">
      <img src="../../../../icons/payment-cash.png" alt="" class="ui-icon-inline-lg">
      金流選項顯示設定
    </h3>
    <p class="text-sm ui-text-subtle mb-4">
      您可以自訂前台四種預設付款方式的圖示、名稱與說明。系統將會依據上方「取貨方式與付款對應設定」中打勾的規則加上這裡設定的名稱呈現給顧客。
    </p>
    <div id="payment-options-table" class="payment-options-list">
      <div
        v-for="method in paymentMethodOrder"
        :key="method"
        class="payment-option-card"
      >
        <div class="payment-option-card-header">
          <div class="min-w-0">
            <div class="text-xs font-semibold ui-text-subtle mb-1">系統代碼</div>
            <code class="payment-option-code">{{ method }}</code>
          </div>
          <div class="payment-option-preview">
            <img
              :src="getPaymentPreviewUrl(method)"
              alt=""
              class="payment-option-preview-icon"
            >
            <span>{{ paymentOptions[method].name || method }}</span>
          </div>
        </div>

        <div class="payment-option-card-body">
          <div class="payment-option-icon-editor">
            <img
              :id="`po-${method}-icon-preview`"
              :src="getPaymentPreviewUrl(method)"
              alt=""
              class="icon-upload-preview payment-option-icon-preview"
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
                class="text-xs px-2 py-1 rounded border ui-border text-blue-700 hover:ui-primary-soft icon-upload-action"
              >
                上傳付款圖示
              </button>
              <span
                :id="`po-${method}-icon-url-display`"
                class="text-[11px] ui-text-muted truncate max-w-full"
              >{{ getDisplayUrl(paymentOptions[method].icon_url) }}</span>
            </div>
          </div>

          <div class="payment-option-fields">
            <label class="payment-option-field">
              <span>顯示名稱</span>
              <input
                v-model.trim="paymentOptions[method].name"
                type="text"
                :id="`po-${method}-name`"
                class="border rounded p-2 w-full"
                placeholder="顯示名稱"
              >
            </label>
            <label class="payment-option-field">
              <span>簡短說明</span>
              <input
                v-model.trim="paymentOptions[method].description"
                type="text"
                :id="`po-${method}-desc`"
                class="border rounded p-2 w-full text-sm ui-text-strong"
                placeholder="簡短說明"
              >
            </label>
          </div>
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
import { useDashboardSettings } from "./useDashboardSettings.ts";

const { paymentOptions, paymentMethodOrder } = useDashboardSettings();
const { getDisplayUrl, getPaymentPreviewUrl } = useDashboardSettingsIcons();
const paymentIconInputs = new Map();

function registerPaymentIconInput(method, element) {
  const key = String(method || "").trim();
  if (!key) return;
  if (element) {
    paymentIconInputs.set(key, element);
    return;
  }
  paymentIconInputs.delete(key);
}

function handlePaymentIconPreview(method, event) {
  dashboardSettingsIconActions.previewPaymentIconFile(
    method,
    event?.target?.files?.[0] || null,
  );
}

async function handlePaymentIconUpload(method) {
  const input = paymentIconInputs.get(String(method || "").trim());
  await dashboardSettingsIconActions.uploadPaymentIconFile(
    method,
    input?.files?.[0] || null,
  );
  if (input) input.value = "";
}
</script>
