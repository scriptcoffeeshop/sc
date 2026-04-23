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
    <div class="overflow-x-auto mb-4 border rounded settings-responsive-wrap">
      <table class="w-full text-sm text-left whitespace-nowrap settings-routing-table">
        <thead class="ui-bg-soft border-b">
          <tr>
            <th class="p-3 font-medium ui-text-strong w-10 text-center">
              排序
            </th>
            <th class="p-3 font-medium ui-text-strong">
              圖示與名稱 / 說明
            </th>
            <th class="p-3 font-medium ui-text-strong w-16 text-center border-l">
              啟用
            </th>
            <th class="p-3 font-medium ui-text-strong w-20 text-center border-l">
              運費
            </th>
            <th class="p-3 font-medium ui-text-strong w-24 text-center border-l">
              免運門檻
            </th>
            <th
              v-for="method in routingPaymentMethods"
              :key="method.key"
              class="p-3 font-medium ui-text-strong text-center border-l"
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
            </th>
            <th class="p-3 font-medium ui-text-strong w-16 text-center border-l">
              操作
            </th>
          </tr>
        </thead>
        <tbody
          id="delivery-routing-table"
          :ref="registerDeliveryRoutingTableElement"
          class="sortable-tbody"
        >
          <tr
            v-for="item in deliveryOptions"
            :key="item.id"
            class="border-b delivery-option-row group"
            style="border-color:#E2DCC8"
            :data-id="item.id"
            :data-delivery-id="item.id"
          >
            <td
              class="p-3 text-center cursor-move ui-text-muted hover:ui-text-strong transition"
              data-label="排序"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="1em"
                height="1em"
                fill="currentColor"
                viewBox="0 0 256 256"
                class="drag-handle-icon"
              ><path d="M104,60A12,12,0,1,1,92,48,12,12,0,0,1,104,60Zm60-12a12,12,0,1,0,12,12A12,12,0,0,0,164,48ZM92,116a12,12,0,1,0,12,12A12,12,0,0,0,92,116Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,116ZM92,184a12,12,0,1,0,12,12A12,12,0,0,0,92,184Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,184Z" /></svg>
            </td>
            <td class="p-3" data-label="圖示與名稱 / 說明">
              <div class="flex flex-col gap-2 min-w-[280px]">
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
                <div class="flex items-center gap-2">
                  <input
                    v-model.trim="item.icon"
                    type="text"
                    class="border rounded p-1 icon-text-fallback text-sm do-icon"
                    placeholder="備援字元"
                  >
                  <input
                    v-model.trim="item.name"
                    type="text"
                    class="border rounded p-1 flex-1 min-w-[120px] do-name"
                    placeholder="物流名稱"
                  >
                  <input :value="item.id" type="hidden" class="do-id">
                </div>
                <input
                  v-model.trim="item.description"
                  type="text"
                  class="border rounded p-1 w-full text-xs ui-text-strong do-desc"
                  placeholder="簡短說明 (例如: 到店自取)"
                >
              </div>
            </td>
            <td
              class="p-3 text-center border-l ui-bg-soft/50"
              style="border-color:#E2DCC8"
              data-label="啟用"
            >
              <label class="relative inline-flex items-center cursor-pointer">
                <input v-model="item.enabled" type="checkbox" class="sr-only peer do-enabled">
                <div class="w-9 h-5 ui-bg-soft peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
              </label>
            </td>
            <td
              class="p-3 text-center border-l"
              style="border-color:#E2DCC8"
              data-label="運費"
            >
              <input
                v-model.number="item.fee"
                type="number"
                class="border rounded p-1 w-16 text-center text-sm do-fee"
                min="0"
              >
            </td>
            <td
              class="p-3 text-center border-l"
              style="border-color:#E2DCC8"
              data-label="免運門檻"
            >
              <input
                v-model.number="item.free_threshold"
                type="number"
                class="border rounded p-1 w-20 text-center text-sm do-free-threshold"
                min="0"
              >
            </td>
            <td
              v-for="method in routingPaymentMethods"
              :key="`${item.id}-${method.key}`"
              class="p-3 text-center border-l"
              style="border-color:#E2DCC8"
              :data-label="method.label"
            >
              <input
                v-model="item.payment[method.key]"
                type="checkbox"
                :class="`w-4 h-4 do-${method.key}`"
              >
            </td>
            <td
              class="p-3 text-center border-l"
              style="border-color:#E2DCC8"
              data-label="操作"
            >
              <button
                type="button"
                @click="handleRemoveDeliveryOption(item.id)"
                class="ui-text-danger hover:text-red-700 p-1"
                title="刪除此選項"
              >
                刪除
              </button>
            </td>
          </tr>
        </tbody>
      </table>
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
