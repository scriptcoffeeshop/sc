<template>
  <div class="mb-6 p-4 bg-white rounded-xl border">
    <div class="flex flex-col md:flex-row md:justify-between md:items-center mb-3">
      <h3 class="font-semibold text-lg flex items-center ui-text-highlight">
        <img src="../../../../icons/payment-card.png" alt="" class="ui-icon-inline-lg">
        取貨方式與付款對應設定
      </h3>
      <button
        type="button"
        @click="handleAddDeliveryOption"
        class="mt-2 md:mt-0 px-3 py-1 btn-primary text-white rounded transition text-sm"
      >
        + 新增取貨方式
      </button>
    </div>
    <p class="text-sm ui-text-subtle mb-4">
      您可以自由拖曳排序、修改名稱與說明，並個別設定支援哪些付款方式。設定完成後請記得「儲存設定」。
    </p>
    <div
      id="delivery-routing-table"
      :ref="registerDeliveryRoutingTableElement"
      class="space-y-3 mb-4 settings-routing-list"
    >
      <div
        v-for="item in deliveryOptions"
        :key="item.id"
        class="delivery-option-row rounded-lg border bg-white p-4 shadow-sm"
        style="border-color:#E2DCC8"
        :data-id="item.id"
        :data-delivery-id="item.id"
      >
        <div class="grid grid-cols-1 xl:grid-cols-[minmax(0,0.9fr)_minmax(340px,1.15fr)] gap-3">
          <div class="min-w-0 space-y-2">
            <div class="flex flex-col sm:flex-row sm:items-start gap-3">
              <button
                type="button"
                class="cursor-move ui-text-muted hover:ui-text-strong transition inline-flex h-9 w-9 items-center justify-center rounded border ui-border bg-white"
                aria-label="拖曳排序"
                title="拖曳排序"
              >
                <GripVertical class="h-5 w-5" aria-hidden="true" />
              </button>
              <div class="flex-1 min-w-0 space-y-2">
                <div class="icon-upload-row">
                  <img
                    class="icon-upload-preview do-icon-preview"
                    :src="getDeliveryPreviewUrl(item)"
                    alt="配送圖示預覽"
                  >
                  <input v-model="item.icon_url" type="hidden" class="do-icon-url">
                  <input
                    type="file"
                    :ref="(element) => registerDeliveryIconInput(item.id, element)"
                    class="text-xs icon-upload-file"
                    accept="image/png,image/webp,image/jpeg,image/jpg"
                    @change="handleDeliveryIconPreview(item.id, $event)"
                  >
                  <button
                    type="button"
                    @click="handleDeliveryIconUpload(item.id)"
                    class="text-xs px-2 py-1 rounded border ui-border ui-text-highlight hover:ui-primary-soft icon-upload-action"
                  >
                    上傳圖示
                  </button>
                </div>
                <p class="text-[11px] ui-text-muted truncate do-icon-url-display">
                  {{ getDisplayUrl(item.icon_url) }}
                </p>
              </div>
            </div>

            <div>
              <label class="block text-xs ui-text-subtle mb-1">取貨方式名稱</label>
              <input
                v-model.trim="item.name"
                type="text"
                class="border rounded p-2 w-full min-w-0 do-name"
                placeholder="物流名稱"
              >
              <input :value="item.id" type="hidden" class="do-id">
            </div>

            <div>
              <label class="block text-xs ui-text-subtle mb-1">說明</label>
              <textarea
                v-model.trim="item.description"
                class="border rounded p-2 w-full min-h-[76px] text-sm leading-6 ui-text-strong do-desc"
                placeholder="可分行輸入顧客會看到的取貨說明"
                rows="3"
              ></textarea>
            </div>
          </div>

          <div class="min-w-0 space-y-3 rounded-lg border ui-border bg-[#FFFDF7] p-3">
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label class="flex items-center justify-between gap-3 rounded border ui-border bg-white px-3 py-2 text-sm cursor-pointer">
                <span class="font-medium ui-text-strong">啟用</span>
                <span class="relative inline-flex items-center">
                  <input v-model="item.enabled" type="checkbox" class="sr-only peer do-enabled">
                  <span class="w-9 h-5 ui-bg-soft peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></span>
                </span>
              </label>
              <div>
                <label class="block text-xs ui-text-subtle mb-1">運費</label>
                <input
                  v-model.number="item.fee"
                  type="number"
                  class="border rounded p-2 w-full text-center text-sm do-fee"
                  min="0"
                >
              </div>
              <div>
                <label class="block text-xs ui-text-subtle mb-1">免運門檻</label>
                <input
                  v-model.number="item.free_threshold"
                  type="number"
                  class="border rounded p-2 w-full text-center text-sm do-free-threshold"
                  min="0"
                >
              </div>
            </div>

            <div>
              <div class="text-xs ui-text-subtle mb-2">支援付款方式</div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label
                  v-for="method in routingPaymentMethods"
                  :key="`${item.id}-${method.key}`"
                  class="flex items-center justify-between gap-3 rounded border ui-border bg-white px-3 py-2 text-sm cursor-pointer"
                  :data-payment-method="method.key"
                >
                  <span class="routing-payment-header">
                    <img
                      :id="`dr-${method.key}-icon-preview`"
                      :src="getPaymentPreviewUrl(method.key)"
                      alt=""
                      class="routing-payment-icon"
                    >
                    <span>{{ method.label }}</span>
                  </span>
                  <input
                    v-model="item.payment[method.key]"
                    type="checkbox"
                    :class="`w-4 h-4 do-${method.key}`"
                  >
                </label>
              </div>
            </div>

            <div class="flex justify-end">
              <button
                type="button"
                @click="handleRemoveDeliveryOption(item.id)"
                class="inline-flex items-center gap-1 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm ui-text-danger hover:bg-red-100 hover:text-red-700"
              >
                <Trash2 class="h-4 w-4" aria-hidden="true" />
                刪除
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="space-y-3 mt-4">
      <label class="flex items-center gap-2 cursor-pointer text-sm">
        <input v-model="linePaySandbox" type="checkbox" id="s-linepay-sandbox" class="w-4 h-4">
        <span>開發者功能：LINE Pay Sandbox 模式（測試環境）</span>
      </label>
    </div>
  </div>
</template>

<script setup>
import {
  GripVertical,
  Trash2,
} from "lucide-vue-next";
import {
  dashboardSettingsIconActions,
  useDashboardSettingsIcons,
} from "./useDashboardSettingsIcons.ts";
import {
  dashboardSettingsActions,
  useDashboardSettings,
} from "./useDashboardSettings.ts";

const routingPaymentMethods = [
  { key: "cod", label: "貨到/取貨付款" },
  { key: "linepay", label: "LINE Pay" },
  { key: "jkopay", label: "街口支付" },
  { key: "transfer", label: "線上轉帳" },
];

const { deliveryOptions, linePaySandbox } = useDashboardSettings();
const {
  getDisplayUrl,
  getPaymentPreviewUrl,
  getDeliveryPreviewUrl,
} = useDashboardSettingsIcons();
const deliveryIconInputs = new Map();

function registerDeliveryRoutingTableElement(element) {
  dashboardSettingsActions.registerDeliveryRoutingTableElement(element);
}

function handleAddDeliveryOption() {
  dashboardSettingsActions.addDeliveryOption();
}

function handleRemoveDeliveryOption(deliveryId) {
  dashboardSettingsActions.removeDeliveryOption(deliveryId);
}

function registerDeliveryIconInput(deliveryId, element) {
  const key = String(deliveryId || "").trim();
  if (!key) return;
  if (element) {
    deliveryIconInputs.set(key, element);
    return;
  }
  deliveryIconInputs.delete(key);
}

function handleDeliveryIconPreview(deliveryId, event) {
  dashboardSettingsIconActions.previewDeliveryIconFile(
    deliveryId,
    event?.target?.files?.[0] || null,
  );
}

async function handleDeliveryIconUpload(deliveryId) {
  const input = deliveryIconInputs.get(String(deliveryId || "").trim());
  await dashboardSettingsIconActions.uploadDeliveryIconFile(
    deliveryId,
    input?.files?.[0] || null,
  );
  if (input) input.value = "";
}
</script>
