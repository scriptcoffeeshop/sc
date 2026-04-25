<template>
  <div class="dashboard-settings-card checkout-routing-card">
    <div class="dashboard-settings-card__header checkout-routing-card__header">
      <div>
        <h3 class="dashboard-settings-card__title">
          <img src="../../../../icons/payment-card.png" alt="" class="ui-icon-inline-lg">
          取貨方式與付款對應
        </h3>
        <p class="checkout-routing-card__hint">
          每張卡代表一種取貨方式。設定名稱、說明、運費，再勾選顧客可使用的付款方式。
        </p>
      </div>
      <button
        type="button"
        @click="handleAddDeliveryOption"
        class="btn-primary text-sm"
      >
        + 新增取貨方式
      </button>
    </div>

    <div class="checkout-routing-summary" aria-label="取貨付款設定摘要">
      <span>
        <Truck class="checkout-routing-summary__icon" aria-hidden="true" />
        {{ enabledDeliveryCount }} 種取貨方式啟用
      </span>
      <span>
        <CreditCard class="checkout-routing-summary__icon" aria-hidden="true" />
        勾選卡片即可調整付款支援
      </span>
    </div>

    <div
      id="delivery-routing-table"
      :ref="registerDeliveryRoutingTableElement"
      class="delivery-routing-list settings-routing-list"
    >
      <article
        v-for="item in normalizedDeliveryOptions"
        :key="item.id"
        class="delivery-option-row delivery-rule-card"
        :class="{ 'is-disabled': !item.enabled }"
        :data-id="item.id"
        :data-delivery-id="item.id"
      >
        <header class="delivery-rule-card__header">
          <button
            type="button"
            class="cursor-move dashboard-drag-handle delivery-rule-card__drag"
            aria-label="拖曳排序"
            title="拖曳排序"
          >
            <GripVertical class="h-5 w-5" aria-hidden="true" />
          </button>

          <img
            class="icon-upload-preview do-icon-preview delivery-rule-card__icon"
            :src="getDeliveryPreviewUrl(item)"
            alt="配送圖示預覽"
          >

          <div class="delivery-rule-card__title-block">
            <label class="delivery-rule-card__field-label" :for="`do-name-${item.id}`">
              取貨方式名稱
            </label>
            <input
              v-model.trim="item.name"
              type="text"
              class="input-field do-name delivery-rule-card__name"
              :id="`do-name-${item.id}`"
              placeholder="物流名稱"
            >
            <input :value="item.id" type="hidden" class="do-id">
            <p class="delivery-rule-card__meta">
              {{ getDeliveryPaymentSummary(item) }}
            </p>
          </div>

          <label class="delivery-enabled-toggle">
            <input v-model="item.enabled" type="checkbox" class="sr-only do-enabled">
            <span class="delivery-enabled-toggle__track" aria-hidden="true"></span>
            <span class="delivery-enabled-toggle__text">
              {{ item.enabled ? "啟用" : "停用" }}
            </span>
          </label>
        </header>

        <div class="delivery-rule-card__body">
          <section class="delivery-rule-panel delivery-rule-panel--details">
            <div class="delivery-icon-editor">
              <input v-model="item.icon_url" type="hidden" class="do-icon-url">
              <div class="icon-upload-controls delivery-icon-editor__controls">
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
                  class="dashboard-action dashboard-action--primary icon-upload-action"
                >
                  <UploadCloud class="h-4 w-4" aria-hidden="true" />
                  上傳圖示
                </button>
                <p class="do-icon-url-display delivery-icon-editor__path">
                  {{ getDisplayUrl(item.icon_url) }}
                </p>
              </div>
            </div>

            <label class="delivery-rule-field">
              <span>前台說明</span>
              <textarea
                v-model.trim="item.description"
                class="input-field do-desc"
                placeholder="可分行輸入顧客會看到的取貨說明"
                rows="3"
              ></textarea>
            </label>
          </section>

          <section class="delivery-rule-panel">
            <div class="delivery-fee-grid">
              <label class="delivery-rule-field">
                <span>運費</span>
                <input
                  v-model.number="item.fee"
                  type="number"
                  class="input-field do-fee"
                  min="0"
                >
              </label>
              <label class="delivery-rule-field">
                <span>免運門檻</span>
                <input
                  v-model.number="item.free_threshold"
                  type="number"
                  class="input-field do-free-threshold"
                  min="0"
                >
              </label>
            </div>

            <div class="delivery-payment-picker">
              <div class="delivery-payment-picker__title">
                支援付款方式
              </div>
              <div class="delivery-payment-picker__grid">
                <label
                  v-for="method in routingPaymentMethods"
                  :key="`${item.id}-${method.key}`"
                  class="delivery-payment-chip"
                  :class="{ 'is-selected': item.payment[method.key] }"
                  :data-payment-method="method.key"
                >
                  <input
                    v-model="item.payment[method.key]"
                    type="checkbox"
                    :class="`do-${method.key}`"
                  >
                  <img
                    :id="`dr-${method.key}-icon-preview`"
                    :src="getPaymentPreviewUrl(method.key)"
                    alt=""
                    class="routing-payment-icon"
                  >
                  <span>{{ method.label }}</span>
                </label>
              </div>
            </div>
          </section>
        </div>

        <footer class="delivery-rule-card__footer">
          <button
            type="button"
            @click="handleRemoveDeliveryOption(item.id)"
            class="dashboard-action dashboard-action--danger"
          >
            <Trash2 class="h-4 w-4" aria-hidden="true" />
            刪除
          </button>
        </footer>
      </article>
    </div>

    <label class="linepay-sandbox-toggle">
      <input v-model="linePaySandbox" type="checkbox" id="s-linepay-sandbox">
      <span>
        LINE Pay Sandbox 模式
        <small>測試金流時開啟，正式收款前請關閉。</small>
      </span>
    </label>
  </div>
</template>

<script setup lang="ts">
import { computed, type ComponentPublicInstance } from "vue";
import {
  CreditCard,
  GripVertical,
  Trash2,
  Truck,
  UploadCloud,
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
  { key: "cod", label: "取貨付款" },
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

const enabledDeliveryCount = computed(() =>
  normalizedDeliveryOptions.value.filter((item) => item.enabled).length
);

function getEnabledPaymentCount(item: DeliveryOptionWithPayment): number {
  return routingPaymentMethods.filter((method) => item.payment[method.key]).length;
}

function getDeliveryPaymentSummary(item: DeliveryOptionWithPayment): string {
  const enabledPayments = getEnabledPaymentCount(item);
  if (!item.enabled) return "此取貨方式目前停用";
  if (!enabledPayments) return "尚未開放付款方式";
  return `支援 ${enabledPayments} 種付款方式`;
}

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
.checkout-routing-card {
  display: grid;
  gap: 1rem;
}

.checkout-routing-card__header {
  margin-bottom: 0;
}

.checkout-routing-card__hint {
  margin-top: 0.35rem;
  color: #657B83;
  font-size: 0.84rem;
  line-height: 1.55;
}

.checkout-routing-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.checkout-routing-summary span {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  border: 1px solid #E2DCC8;
  border-radius: 999px;
  background: #F6F0DE;
  color: #586E75;
  padding: 0.4rem 0.65rem;
  font-size: 0.8rem;
  font-weight: 800;
  line-height: 1.25;
}

.checkout-routing-summary__icon {
  width: 1rem;
  height: 1rem;
  flex: 0 0 auto;
}

.delivery-routing-list {
  display: grid;
  gap: 0.85rem;
}

.delivery-rule-card {
  display: grid;
  gap: 0.9rem;
  min-width: 0;
  border: 1px solid #E2DCC8;
  border-left: 4px solid #268BD2;
  border-radius: 8px;
  background: #FFFDF7;
  padding: 0.95rem;
}

.delivery-rule-card.is-disabled {
  border-left-color: #93A1A1;
  opacity: 0.76;
}

.delivery-rule-card__header {
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr) auto;
  gap: 0.75rem;
  align-items: center;
  min-width: 0;
}

.delivery-rule-card__drag {
  width: 2.25rem;
  height: 2.25rem;
}

.delivery-rule-card__icon {
  width: 3.4rem;
  height: 3.4rem;
  min-width: 3.4rem;
  min-height: 3.4rem;
}

.delivery-rule-card__title-block {
  display: grid;
  gap: 0.35rem;
  min-width: 0;
}

.delivery-rule-card__field-label,
.delivery-rule-field span,
.delivery-payment-picker__title {
  color: #657B83;
  font-size: 0.76rem;
  font-weight: 800;
  line-height: 1.35;
}

.delivery-rule-card__name {
  min-height: 2.65rem;
  font-weight: 900;
}

.delivery-rule-card__meta {
  color: #586E75;
  font-size: 0.8rem;
  font-weight: 700;
  line-height: 1.35;
}

.delivery-rule-card__body {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(18rem, 1.1fr);
  gap: 0.85rem;
  align-items: start;
  min-width: 0;
}

.delivery-rule-panel {
  display: grid;
  gap: 0.75rem;
  min-width: 0;
}

.delivery-rule-panel--details {
  grid-template-columns: minmax(0, 0.78fr) minmax(0, 1.22fr);
}

.delivery-icon-editor {
  display: grid;
  min-width: 0;
}

.delivery-icon-editor__controls {
  gap: 0.5rem;
  width: 100%;
  overflow: hidden;
}

.delivery-icon-editor__path {
  width: 100%;
  overflow: hidden;
  color: #839496;
  font-size: 0.72rem;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.delivery-rule-field {
  display: grid;
  gap: 0.35rem;
  min-width: 0;
}

.delivery-rule-field textarea {
  min-height: 6.15rem;
  line-height: 1.55;
  white-space: pre-wrap;
}

.delivery-fee-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.65rem;
}

.delivery-payment-picker {
  display: grid;
  gap: 0.45rem;
}

.delivery-payment-picker__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
}

.delivery-payment-chip {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  min-width: 0;
  min-height: 2.7rem;
  border: 1px solid #E2DCC8;
  border-radius: 8px;
  background: #FDF6E3;
  color: #586E75;
  padding: 0.5rem 0.6rem;
  cursor: pointer;
  transition: border-color 0.16s ease, background 0.16s ease, color 0.16s ease;
}

.delivery-payment-chip.is-selected {
  border-color: #268BD2;
  background: rgba(38, 139, 210, 0.12);
  color: #073642;
}

.delivery-payment-chip input {
  width: 1rem;
  height: 1rem;
  flex: 0 0 auto;
  accent-color: #268BD2;
}

.routing-payment-icon {
  width: 1.45rem;
  height: 1.45rem;
  flex: 0 0 auto;
  object-fit: contain;
}

.delivery-payment-chip span {
  min-width: 0;
  overflow-wrap: anywhere;
  font-size: 0.84rem;
  font-weight: 900;
  line-height: 1.3;
}

.delivery-enabled-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 2.45rem;
  cursor: pointer;
  color: #586E75;
  font-size: 0.82rem;
  font-weight: 900;
  white-space: nowrap;
}

.delivery-enabled-toggle__track {
  position: relative;
  width: 2.35rem;
  height: 1.3rem;
  border-radius: 999px;
  background: #D8CFB8;
  transition: background 0.16s ease;
}

.delivery-enabled-toggle__track::after {
  content: "";
  position: absolute;
  top: 0.17rem;
  left: 0.17rem;
  width: 0.95rem;
  height: 0.95rem;
  border-radius: 999px;
  background: #FFFDF7;
  box-shadow: 0 1px 3px rgba(7, 54, 66, 0.18);
  transition: transform 0.16s ease;
}

.delivery-enabled-toggle input:checked + .delivery-enabled-toggle__track {
  background: #859900;
}

.delivery-enabled-toggle input:checked + .delivery-enabled-toggle__track::after {
  transform: translateX(1.04rem);
}

.delivery-enabled-toggle input:focus-visible + .delivery-enabled-toggle__track {
  outline: 2px solid #268BD2;
  outline-offset: 3px;
}

.delivery-rule-card__footer {
  display: flex;
  justify-content: flex-end;
  border-top: 1px solid #EEE8D5;
  padding-top: 0.75rem;
}

.linepay-sandbox-toggle {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  border: 1px solid #E2DCC8;
  border-radius: 8px;
  background: #F6F0DE;
  padding: 0.75rem;
  color: #073642;
  cursor: pointer;
}

.linepay-sandbox-toggle input {
  width: 1.05rem;
  height: 1.05rem;
  flex: 0 0 auto;
  margin-top: 0.12rem;
  accent-color: #268BD2;
}

.linepay-sandbox-toggle span {
  display: grid;
  gap: 0.15rem;
  font-size: 0.86rem;
  font-weight: 900;
  line-height: 1.35;
}

.linepay-sandbox-toggle small {
  color: #657B83;
  font-size: 0.76rem;
  font-weight: 700;
}

@media (max-width: 900px) {
  .delivery-rule-card__body,
  .delivery-rule-panel--details {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 639px) {
  .checkout-routing-card__header,
  .delivery-rule-card__header,
  .delivery-rule-card__footer {
    display: grid;
    justify-content: stretch;
  }

  .delivery-rule-card__header {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .delivery-rule-card__drag {
    grid-column: 1;
    grid-row: 1;
  }

  .delivery-rule-card__icon {
    grid-column: 1;
    grid-row: 2;
  }

  .delivery-rule-card__title-block {
    grid-column: 2;
    grid-row: 1 / span 2;
  }

  .delivery-rule-card__drag,
  .delivery-enabled-toggle {
    justify-self: start;
  }

  .delivery-enabled-toggle {
    grid-column: 1 / -1;
    grid-row: 3;
  }

  .delivery-fee-grid,
  .delivery-payment-picker__grid {
    grid-template-columns: 1fr;
  }

  .checkout-routing-card__header .btn-primary {
    width: 100%;
  }
}
</style>
