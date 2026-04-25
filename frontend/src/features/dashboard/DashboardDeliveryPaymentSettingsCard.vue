<template>
  <div class="dashboard-settings-card">
    <div class="dashboard-settings-card__header">
      <h3 class="dashboard-settings-card__title">
        <img src="../../../../icons/payment-card.png" alt="" class="ui-icon-inline-lg">
        取貨方式與付款對應設定
      </h3>
      <button
        type="button"
        @click="handleAddDeliveryOption"
        class="btn-primary text-sm"
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
        v-for="item in normalizedDeliveryOptions"
        :key="item.id"
        class="delivery-option-row settings-config-card"
        :data-id="item.id"
        :data-delivery-id="item.id"
      >
        <div class="grid grid-cols-1 xl:grid-cols-[minmax(0,0.9fr)_minmax(340px,1.15fr)] gap-3">
          <div class="min-w-0 space-y-2">
            <div class="flex flex-col sm:flex-row sm:items-start gap-3">
              <button
                type="button"
                class="cursor-move dashboard-drag-handle"
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
                  <div class="icon-upload-controls">
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
                class="input-field do-name"
                placeholder="物流名稱"
              >
              <input :value="item.id" type="hidden" class="do-id">
            </div>

            <div>
              <label class="block text-xs ui-text-subtle mb-1">說明</label>
              <textarea
                v-model.trim="item.description"
                class="input-field min-h-[76px] text-sm leading-6 ui-text-strong do-desc"
                placeholder="可分行輸入顧客會看到的取貨說明"
                rows="3"
              ></textarea>
            </div>
          </div>

          <div class="min-w-0 space-y-3 rounded-lg border ui-border bg-[#FFFDF7] p-3">
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label class="delivery-setting-tile">
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
                  class="input-field text-center text-sm do-fee"
                  min="0"
                >
              </div>
              <div>
                <label class="block text-xs ui-text-subtle mb-1">免運門檻</label>
                <input
                  v-model.number="item.free_threshold"
                  type="number"
                  class="input-field text-center text-sm do-free-threshold"
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
                  class="delivery-setting-tile"
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
                class="dashboard-action dashboard-action--danger"
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

<script setup lang="ts">
import { computed, type ComponentPublicInstance } from "vue";
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
import type {
  DashboardDeliveryOption,
  DashboardPaymentRouting,
} from "./dashboardSettingsShared.ts";

type RoutingPaymentMethodKey = "cod" | "linepay" | "jkopay" | "transfer";

const routingPaymentMethods: Array<{
  key: RoutingPaymentMethodKey;
  label: string;
}> = [
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
const deliveryIconInputs = new Map<string, HTMLInputElement>();
type TemplateRefElement = Element | ComponentPublicInstance | null;
type DeliveryOptionWithPayment = DashboardDeliveryOption & {
  payment: DashboardPaymentRouting;
};

function ensureDeliveryPayment(
  item: DashboardDeliveryOption,
): DeliveryOptionWithPayment {
  if (!item.payment) {
    item.payment = {
      cod: false,
      linepay: false,
      jkopay: false,
      transfer: false,
    };
  }
  return item as DeliveryOptionWithPayment;
}

const normalizedDeliveryOptions = computed(() =>
  deliveryOptions.value.map(ensureDeliveryPayment),
);

function registerDeliveryRoutingTableElement(element: TemplateRefElement) {
  dashboardSettingsActions.registerDeliveryRoutingTableElement(
    element instanceof HTMLElement ? element : null,
  );
}

function handleAddDeliveryOption() {
  dashboardSettingsActions.addDeliveryOption();
}

function handleRemoveDeliveryOption(deliveryId: string | number) {
  dashboardSettingsActions.removeDeliveryOption(deliveryId);
}

function registerDeliveryIconInput(
  deliveryId: string | number,
  element: TemplateRefElement,
) {
  const key = String(deliveryId || "").trim();
  if (!key) return;
  if (element instanceof HTMLInputElement) {
    deliveryIconInputs.set(key, element);
    return;
  }
  deliveryIconInputs.delete(key);
}

function handleDeliveryIconPreview(deliveryId: string, event: Event) {
  const input = event.target instanceof HTMLInputElement
    ? event.target
    : null;
  dashboardSettingsIconActions.previewDeliveryIconFile(
    deliveryId,
    input?.files?.[0] || null,
  );
}

async function handleDeliveryIconUpload(deliveryId: string) {
  const input = deliveryIconInputs.get(String(deliveryId || "").trim());
  await dashboardSettingsIconActions.uploadDeliveryIconFile(
    deliveryId,
    input?.files?.[0] || null,
  );
  if (input) input.value = "";
}
</script>

<style scoped>
.delivery-setting-tile {
  display: flex;
  min-height: 2.75rem;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  border: 1px solid #e2dcc8;
  border-radius: 8px;
  background: #fffdf7;
  padding: 0.55rem 0.7rem;
  color: #073642;
  cursor: pointer;
}

@media (max-width: 520px) {
  .delivery-option-row {
    padding: 0.85rem;
  }
}
</style>
