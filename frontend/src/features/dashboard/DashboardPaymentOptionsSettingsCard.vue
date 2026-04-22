<template>
  <div class="mb-6 p-4 bg-white rounded-xl border">
    <h3 class="font-semibold text-lg mb-3 flex items-center ui-text-highlight">
      <img src="../../../../icons/payment-cash.png" alt="" class="ui-icon-inline-lg">
      金流選項顯示設定
    </h3>
    <p class="text-sm ui-text-subtle mb-4">
      您可以自訂前台四種預設付款方式的圖示、名稱與說明。系統將會依據上方「取貨方式與付款對應設定」中打勾的規則加上這裡設定的名稱呈現給顧客。
    </p>
    <div class="overflow-x-auto border rounded settings-responsive-wrap">
      <table class="w-full text-sm text-left settings-payment-table">
        <thead class="bg-gray-50 border-b">
          <tr>
            <th class="p-3 font-medium ui-text-strong w-24 whitespace-nowrap">
              系統代碼
            </th>
            <th class="p-3 font-medium ui-text-strong">
              圖示與名稱 / 說明
            </th>
          </tr>
        </thead>
        <tbody id="payment-options-table">
          <tr v-for="method in paymentMethodOrder" :key="method" class="border-b">
            <td class="p-3 font-mono ui-text-subtle text-center" data-label="系統代碼">
              {{ method }}
            </td>
            <td class="p-3" data-label="圖示與名稱 / 說明">
              <div class="flex flex-col gap-2">
                <div class="flex flex-wrap items-center gap-2">
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
                    class="text-sm"
                    @change="handlePaymentIconPreview(method, $event)"
                  >
                  <img
                    :id="`po-${method}-icon-preview`"
                    :src="getPaymentPreviewUrl(method)"
                    alt=""
                    class="icon-upload-preview"
                  >
                  <button
                    type="button"
                    @click="handlePaymentIconUpload(method)"
                    class="text-xs px-2 py-1 rounded border ui-border text-blue-700 hover:ui-primary-soft"
                  >
                    上傳付款圖示
                  </button>
                  <span
                    :id="`po-${method}-icon-url-display`"
                    class="text-[11px] ui-text-muted truncate max-w-[260px]"
                  >{{ getDisplayUrl(paymentOptions[method].icon_url) }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <input
                    v-model.trim="paymentOptions[method].icon"
                    type="text"
                    :id="`po-${method}-icon`"
                    class="border rounded p-1 icon-text-fallback text-sm"
                    placeholder="備援字元"
                  >
                  <input
                    v-model.trim="paymentOptions[method].name"
                    type="text"
                    :id="`po-${method}-name`"
                    class="border rounded p-1 flex-1 min-w-[120px]"
                    placeholder="顯示名稱"
                  >
                </div>
                <input
                  v-model.trim="paymentOptions[method].description"
                  type="text"
                  :id="`po-${method}-desc`"
                  class="border rounded p-1 w-full text-xs ui-text-strong"
                  placeholder="簡短說明"
                >
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import {
  dashboardSettingsIconActions,
  useDashboardSettingsIcons,
} from "./useDashboardSettingsIcons.js";
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
