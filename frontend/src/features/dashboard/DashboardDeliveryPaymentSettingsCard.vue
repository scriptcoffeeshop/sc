<template>
  <div class="dashboard-settings-card checkout-routing-card">
    <div class="dashboard-settings-card__header checkout-routing-card__header">
      <div>
        <h3 class="dashboard-settings-card__title">
          <img src="../../../../icons/payment-card.png" alt="" class="ui-icon-inline-lg">
          取貨方式與付款對應設定
        </h3>
        <p class="checkout-routing-card__hint">
          一張卡管理一種取貨方式。左側調整名稱、圖示與說明，右側設定運費與可用付款方式。
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

    <div
      id="delivery-routing-table"
      :ref="registerDeliveryRoutingTableElement"
      class="delivery-routing-list settings-routing-list"
    >
      <article
        v-for="item in normalizedDeliveryOptions"
        :key="item.id"
        class="delivery-option-row settings-config-card delivery-routing-card"
        :class="{ 'is-disabled': !item.enabled }"
        :data-id="item.id"
        :data-delivery-id="item.id"
      >
        <header class="delivery-routing-card__header">
          <button
            type="button"
            class="cursor-move dashboard-drag-handle delivery-routing-card__drag"
            aria-label="拖曳排序"
            title="拖曳排序"
          >
            <GripVertical class="h-5 w-5" aria-hidden="true" />
          </button>

          <img
            class="icon-upload-preview do-icon-preview delivery-routing-card__icon"
            :src="getDeliveryPreviewUrl(item)"
            alt="配送圖示預覽"
          >

          <div class="delivery-routing-card__name-field">
            <label :for="`do-name-${item.id}`">取貨方式名稱</label>
            <input
              v-model.trim="item.name"
              type="text"
              class="input-field do-name"
              :id="`do-name-${item.id}`"
              placeholder="物流名稱"
            >
            <input :value="item.id" type="hidden" class="do-id">
          </div>

          <label class="delivery-toggle">
            <input v-model="item.enabled" type="checkbox" class="do-enabled">
            <span>{{ item.enabled ? "啟用" : "停用" }}</span>
          </label>
        </header>

        <div class="delivery-routing-card__body">
          <section class="delivery-routing-card__section">
            <div class="delivery-icon-editor icon-upload-row">
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
                  class="dashboard-action dashboard-action--primary icon-upload-action"
                >
                  <UploadCloud class="h-4 w-4" aria-hidden="true" />
                  上傳圖示
                </button>
                <p class="do-icon-url-display delivery-icon-path">
                  {{ getDisplayUrl(item.icon_url) }}
                </p>
              </div>
            </div>

            <label class="delivery-field">
              <span>前台說明</span>
              <textarea
                v-model.trim="item.description"
                class="input-field do-desc"
                placeholder="可分行輸入顧客會看到的取貨說明"
                rows="3"
              ></textarea>
            </label>
          </section>

          <section class="delivery-routing-card__section">
            <div class="delivery-money-grid">
              <label class="delivery-field">
                <span>運費</span>
                <input
                  v-model.number="item.fee"
                  type="number"
                  class="input-field do-fee"
                  min="0"
                >
              </label>
              <label class="delivery-field">
                <span>免運門檻</span>
                <input
                  v-model.number="item.free_threshold"
                  type="number"
                  class="input-field do-free-threshold"
                  min="0"
                >
              </label>
            </div>

            <div class="delivery-payment-list">
              <div class="delivery-payment-list__title">支援付款方式</div>
              <label
                v-for="method in routingPaymentMethods"
                :key="`${item.id}-${method.key}`"
                class="delivery-payment-row"
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
          </section>
        </div>

        <footer class="delivery-routing-card__footer">
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
  </div>
</template>

<script setup lang="ts">
import { computed, type ComponentPublicInstance } from "vue";
import {
  GripVertical,
  Trash2,
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

const { deliveryOptions } = useDashboardSettings();
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
.checkout-routing-card__hint {
  margin-top: 0.35rem;
  color: #657B83;
  font-size: 0.84rem;
  line-height: 1.55;
}

.checkout-routing-card__header .btn-primary {
  min-height: 2.75rem;
  border-radius: 8px;
  padding: 0.55rem 1.1rem;
  box-shadow: 0 2px 8px -3px rgba(38, 139, 210, 0.5);
}

.delivery-routing-list {
  display: grid;
  gap: 0.85rem;
}

.delivery-routing-list > .settings-config-card + .settings-config-card {
  margin-top: 0;
}

.delivery-routing-card {
  display: grid;
  gap: 0.75rem;
  min-width: 0;
  border-left: 3px solid #268BD2;
}

.delivery-routing-card.is-disabled {
  border-left-color: #93A1A1;
  opacity: 0.72;
}

.delivery-routing-card__header {
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr) auto;
  gap: 0.75rem;
  align-items: center;
  min-width: 0;
}

.delivery-routing-card__drag {
  width: 2.25rem;
  height: 2.25rem;
}

.delivery-routing-card__icon {
  width: 3.25rem;
  height: 3.25rem;
  min-width: 3.25rem;
  min-height: 3.25rem;
}

.delivery-routing-card__name-field,
.delivery-field {
  display: grid;
  min-width: 0;
  gap: 0.35rem;
}

.delivery-routing-card__name-field label,
.delivery-field span,
.delivery-payment-list__title {
  color: #657B83;
  font-size: 0.76rem;
  font-weight: 800;
  line-height: 1.35;
}

.delivery-routing-card__name-field input {
  min-height: 2.45rem;
  padding: 0.55rem 0.75rem;
  font-size: 0.95rem;
  font-weight: 900;
}

.delivery-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  min-height: 2.45rem;
  color: #073642;
  font-size: 0.84rem;
  font-weight: 900;
  cursor: pointer;
  white-space: nowrap;
}

.delivery-toggle input {
  width: 1rem;
  height: 1rem;
  accent-color: #268BD2;
}

.delivery-routing-card__body {
  display: grid;
  grid-template-columns: minmax(18rem, 0.95fr) minmax(21rem, 1.05fr);
  gap: 1.05rem;
  min-width: 0;
}

.delivery-routing-card__section {
  display: grid;
  align-content: start;
  gap: 0.75rem;
  min-width: 0;
}

.delivery-icon-editor {
  grid-template-columns: minmax(0, 1fr);
}

.delivery-icon-path {
  width: 100%;
  overflow: hidden;
  color: #839496;
  font-size: 0.72rem;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.delivery-field textarea {
  min-height: 4.75rem;
  line-height: 1.55;
  white-space: pre-wrap;
}

.delivery-money-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.65rem;
}

.delivery-payment-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
}

.delivery-payment-list__title {
  grid-column: 1 / -1;
}

.delivery-payment-row {
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr);
  align-items: center;
  gap: 0.55rem;
  min-height: 2.45rem;
  border: 1px solid #E2DCC8;
  border-radius: 8px;
  background: #FDF6E3;
  padding: 0.45rem 0.55rem;
  color: #073642;
  cursor: pointer;
}

.delivery-payment-row input {
  width: 1rem;
  height: 1rem;
  accent-color: #268BD2;
}

.routing-payment-icon {
  width: 1.4rem;
  height: 1.4rem;
  object-fit: contain;
}

.delivery-payment-row span {
  min-width: 0;
  overflow-wrap: anywhere;
  font-size: 0.84rem;
  font-weight: 900;
  line-height: 1.3;
}

.delivery-routing-card__footer {
  display: flex;
  justify-content: flex-end;
  border-top: 1px solid #EEE8D5;
  padding-top: 0.65rem;
}

@media (max-width: 900px) {
  .delivery-routing-card__body {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 639px) {
  .checkout-routing-card__header {
    display: grid;
    gap: 0.75rem;
  }

  .checkout-routing-card__header .btn-primary {
    width: 100%;
  }

  .delivery-routing-card__header {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .delivery-routing-card__drag {
    grid-column: 1;
    grid-row: 1;
  }

  .delivery-routing-card__icon {
    grid-column: 1;
    grid-row: 2;
  }

  .delivery-routing-card__name-field {
    grid-column: 2;
    grid-row: 1 / span 2;
  }

  .delivery-toggle {
    grid-column: 1 / -1;
    grid-row: 3;
    justify-self: start;
  }

  .delivery-money-grid {
    grid-template-columns: 1fr;
  }

  .delivery-payment-list {
    grid-template-columns: 1fr;
  }
}
</style>
