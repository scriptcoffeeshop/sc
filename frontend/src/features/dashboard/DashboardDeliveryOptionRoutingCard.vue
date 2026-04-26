<template>
  <article
    v-if="item"
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
        <span class="delivery-toggle__track" aria-hidden="true"></span>
        <span class="delivery-toggle__text">
          {{ item.enabled ? "啟用" : "停用" }}
        </span>
      </label>
    </header>

    <div class="delivery-routing-card__body">
      <section class="delivery-routing-card__section delivery-config-panel">
        <div class="delivery-panel-title">基本資訊</div>

        <div class="delivery-icon-uploader">
          <input v-model="item.icon_url" type="hidden" class="do-icon-url">
          <input
            type="file"
            :ref="registerDeliveryIconInput"
            class="icon-upload-file delivery-icon-file"
            accept="image/png,image/webp,image/jpeg,image/jpg"
            hidden
            @change="handleDeliveryIconSelection"
          >
          <div class="delivery-icon-uploader__copy">
            <span class="delivery-icon-uploader__label">圖示</span>
            <span class="do-icon-url-display delivery-icon-path">
              {{ getDisplayUrl(item.icon_url) || "使用預設圖示" }}
            </span>
          </div>
          <button
            type="button"
            @click="openDeliveryIconPicker"
            class="dashboard-action dashboard-action--primary icon-upload-action"
          >
            <UploadCloud class="h-4 w-4" aria-hidden="true" />
            更換圖示
          </button>
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

      <section class="delivery-routing-card__section delivery-config-panel">
        <div class="delivery-panel-title">費用與規則</div>
        <div class="delivery-money-grid">
          <label class="delivery-field">
            <span>運費</span>
            <div class="delivery-money-input">
              <input
                v-model.number="item.fee"
                type="number"
                class="input-field do-fee"
                min="0"
              >
              <span>元</span>
            </div>
          </label>
          <label class="delivery-field">
            <span>免運門檻</span>
            <div class="delivery-money-input">
              <input
                v-model.number="item.free_threshold"
                type="number"
                class="input-field do-free-threshold"
                min="0"
              >
              <span>元</span>
            </div>
          </label>
        </div>

        <div class="delivery-panel-title delivery-panel-title--payments">
          付款設定
        </div>
        <div class="delivery-payment-list">
          <div class="delivery-payment-list__title">支援付款方式</div>
          <label
            v-for="method in paymentMethods"
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
        @click="handleRemoveDeliveryOption"
        class="dashboard-action dashboard-action--danger"
      >
        <Trash2 class="h-4 w-4" aria-hidden="true" />
        刪除
      </button>
    </footer>
  </article>
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
import { useDashboardSettings } from "./useDashboardSettings.ts";
import type {
  DashboardDeliveryOption,
  DashboardPaymentRouting,
} from "./dashboardSettingsShared.ts";

type RoutingPaymentMethod = {
  key: keyof DashboardPaymentRouting;
  label: string;
};
type DeliveryOptionWithPayment = DashboardDeliveryOption & {
  payment: DashboardPaymentRouting;
};
type TemplateRefElement = Element | ComponentPublicInstance | null;

const props = defineProps<{
  deliveryId: string;
  paymentMethods: ReadonlyArray<RoutingPaymentMethod>;
}>();
const emit = defineEmits<{
  remove: [deliveryId: string | number];
}>();

const { deliveryOptions } = useDashboardSettings();
const {
  getDisplayUrl,
  getPaymentPreviewUrl,
  getDeliveryPreviewUrl,
} = useDashboardSettingsIcons();
let deliveryIconInput: HTMLInputElement | null = null;

function ensureDeliveryPayment(
  deliveryOption: DashboardDeliveryOption,
): DeliveryOptionWithPayment {
  if (!deliveryOption.payment) {
    deliveryOption.payment = {
      cod: false,
      linepay: false,
      jkopay: false,
      transfer: false,
    };
  }
  return deliveryOption as DeliveryOptionWithPayment;
}

const item = computed(() => {
  const deliveryOption = deliveryOptions.value.find((option) =>
    option.id === props.deliveryId
  );
  return deliveryOption ? ensureDeliveryPayment(deliveryOption) : null;
});

function registerDeliveryIconInput(element: TemplateRefElement) {
  deliveryIconInput = element instanceof HTMLInputElement ? element : null;
}

function openDeliveryIconPicker() {
  deliveryIconInput?.click();
}

async function handleDeliveryIconSelection(event: Event) {
  const input = event.target instanceof HTMLInputElement
    ? event.target
    : null;
  const file = input?.files?.[0] || null;
  const previewed = dashboardSettingsIconActions.previewDeliveryIconFile(
    props.deliveryId,
    file,
  );
  if (previewed && file) {
    await dashboardSettingsIconActions.uploadDeliveryIconFile(
      props.deliveryId,
      file,
    );
  }
  if (input) input.value = "";
}

function handleRemoveDeliveryOption() {
  emit("remove", props.deliveryId);
}
</script>

<style scoped>
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
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 2.45rem;
  color: #073642;
  font-size: 0.84rem;
  font-weight: 900;
  cursor: pointer;
  white-space: nowrap;
}

.delivery-toggle input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.delivery-toggle__track {
  position: relative;
  width: 2.35rem;
  height: 1.32rem;
  border-radius: 999px;
  background: #D8CFB8;
  transition: background 0.16s ease, box-shadow 0.16s ease;
}

.delivery-toggle__track::after {
  position: absolute;
  top: 0.16rem;
  left: 0.16rem;
  width: 1rem;
  height: 1rem;
  border-radius: 999px;
  background: #FFFFFF;
  box-shadow: 0 1px 3px rgba(7, 54, 66, 0.22);
  content: "";
  transition: transform 0.16s ease;
}

.delivery-toggle input:checked + .delivery-toggle__track {
  background: #268BD2;
  box-shadow: 0 0 0 3px rgba(38, 139, 210, 0.12);
}

.delivery-toggle input:checked + .delivery-toggle__track::after {
  transform: translateX(1.03rem);
}

.delivery-toggle__text {
  min-width: 2rem;
}

.delivery-routing-card__body {
  display: grid;
  grid-template-columns: minmax(18rem, 0.95fr) minmax(21rem, 1.05fr);
  gap: 1.35rem;
  min-width: 0;
}

.delivery-routing-card__section {
  display: grid;
  align-content: start;
  gap: 0.75rem;
  min-width: 0;
}

.delivery-config-panel {
  padding-top: 0.15rem;
}

.delivery-panel-title {
  color: #073642;
  font-size: 0.86rem;
  font-weight: 900;
  line-height: 1.35;
}

.delivery-panel-title--payments {
  margin-top: 0.2rem;
}

.delivery-icon-uploader {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.75rem;
  align-items: center;
  min-width: 0;
  border: 1px dashed #C9C0A8;
  border-radius: 8px;
  background: #FDF6E3;
  padding: 0.7rem 0.8rem;
}

.delivery-icon-uploader__copy {
  display: grid;
  min-width: 0;
  gap: 0.25rem;
}

.delivery-icon-uploader__label {
  color: #657B83;
  font-size: 0.76rem;
  font-weight: 800;
  line-height: 1.25;
}

.delivery-icon-uploader .icon-upload-action {
  min-height: 2.35rem;
  border-radius: 8px;
  padding-inline: 0.75rem;
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
  gap: 0.75rem;
}

.delivery-money-input {
  display: inline-grid;
  grid-template-columns: minmax(6rem, 8.5rem) auto;
  gap: 0.45rem;
  align-items: center;
  width: fit-content;
  max-width: 100%;
}

.delivery-money-input .input-field {
  min-height: 2.45rem;
  padding: 0.5rem 0.65rem;
  text-align: right;
}

.delivery-money-input span {
  color: #657B83;
  font-size: 0.82rem;
  font-weight: 800;
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
  grid-template-columns: 1rem 1.4rem minmax(0, 1fr);
  align-items: center;
  gap: 0.6rem;
  min-height: 2.45rem;
  border: 1px solid #E2DCC8;
  border-radius: 8px;
  background: #FDF6E3;
  padding: 0.5rem 0.65rem;
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
