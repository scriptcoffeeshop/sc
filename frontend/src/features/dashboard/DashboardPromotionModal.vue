<template>
  <div
    id="promotion-modal"
    class="modal-overlay promotion-modal"
    :class="{ hidden: !isPromotionModalOpen }"
  >
    <div
      class="modal-content promotion-modal__content"
      role="dialog"
      aria-modal="true"
      aria-labelledby="prm-title"
    >
      <div class="promotion-modal__header">
        <div class="promotion-modal__title-block">
          <span class="promotion-modal__eyebrow">促銷活動</span>
          <h3 id="prm-title" class="promotion-modal__title">
            {{ promotionModalTitle }}
          </h3>
          <p class="promotion-modal__summary" aria-live="polite">
            {{ promotionRulePreview }}
          </p>
        </div>
        <UiButton
          type="button"
          variant="ghost"
          size="icon"
          aria-label="關閉活動視窗"
          class="promotion-modal__close"
          @click="handleClosePromotionModal"
        >
          <X class="promotion-modal__button-icon" aria-hidden="true" />
        </UiButton>
      </div>

      <form class="promotion-form" @submit.prevent="handleSavePromotion">
        <input type="hidden" id="prm-id" :value="promotionForm.id">

        <section class="promotion-form-section" aria-labelledby="promotion-basic-title">
          <div class="promotion-section-heading">
            <div>
              <h4 id="promotion-basic-title" class="promotion-section-heading__title">
                基本資訊
              </h4>
              <p class="promotion-section-heading__hint">
                活動名稱會顯示在前台購物車優惠明細。
              </p>
            </div>
            <label class="promotion-status-toggle">
              <input
                type="checkbox"
                id="prm-enabled"
                :checked="promotionForm.enabled"
                @change="handlePromotionEnabledInput"
              >
              <span class="promotion-status-toggle__track" aria-hidden="true"></span>
              <span class="promotion-status-toggle__text">
                {{ promotionForm.enabled ? "啟用中" : "已停用" }}
              </span>
            </label>
          </div>

          <div class="promotion-field-grid">
            <div class="promotion-field promotion-field--wide">
              <label for="prm-name" class="promotion-field__label">
                活動名稱 <span aria-hidden="true">*</span>
              </label>
              <UiInput
                type="text"
                id="prm-name"
                placeholder="例如：任選 2 件 9 折"
                required
                :value="promotionForm.name"
                @input="handlePromotionFieldInput('name', $event)"
              />
            </div>

            <div class="promotion-field">
              <label for="prm-type" class="promotion-field__label">
                活動類型 <span aria-hidden="true">*</span>
              </label>
              <UiSelect
                id="prm-type"
                required
                :value="promotionForm.type"
                @change="handlePromotionFieldInput('type', $event)"
              >
                <option value="bundle">組合優惠</option>
              </UiSelect>
            </div>
          </div>
        </section>

        <section class="promotion-form-section" aria-labelledby="promotion-trigger-title">
          <div class="promotion-section-heading promotion-section-heading--stacked">
            <div>
              <h4 id="promotion-trigger-title" class="promotion-section-heading__title">
                觸發條件
              </h4>
              <p class="promotion-section-heading__hint">
                已選 {{ selectedPromotionTargetCount }} / {{ totalPromotionTargetCount }} 個品項，滿
                {{ promotionForm.minQuantity || 0 }} 件後套用優惠。
              </p>
            </div>
            <div class="promotion-section-actions">
              <UiButton
                type="button"
                variant="outline"
                size="sm"
                @click="handleSelectAllPromotionTargets"
              >
                <CheckSquare class="promotion-modal__button-icon" aria-hidden="true" />
                全選
              </UiButton>
              <UiButton
                type="button"
                variant="ghost"
                size="sm"
                @click="handleClearPromotionTargets"
              >
                <RotateCcw class="promotion-modal__button-icon" aria-hidden="true" />
                清除
              </UiButton>
            </div>
          </div>

          <div class="promotion-rule-builder">
            <label for="prm-min-qty" class="promotion-rule-builder__label">
              門檻
            </label>
            <div class="promotion-rule-builder__control">
              <span>選中品項合計滿</span>
              <UiInput
                type="number"
                id="prm-min-qty"
                class="promotion-rule-builder__input"
                :value="promotionForm.minQuantity"
                min="1"
                required
                @input="handlePromotionFieldInput('minQuantity', $event)"
              />
              <span>件</span>
            </div>
          </div>

          <div class="promotion-field">
            <span id="prm-products-list-label" class="promotion-field__label">
              適用商品
            </span>
            <div
              id="prm-products-list"
              aria-labelledby="prm-products-list-label"
              class="promotion-products-picker"
            >
              <p
                v-if="promotionProductGroups.length === 0"
                class="promotion-products-picker__empty"
              >
                目前沒有商品可選
              </p>
              <template v-else>
                <article
                  v-for="group in promotionProductGroups"
                  :key="`promotion-product-${group.productId}`"
                  class="promotion-product-group"
                >
                  <div class="promotion-product-group__header">
                    <div>
                      <div class="promotion-product-group__name">
                        {{ group.name }}
                      </div>
                      <div class="promotion-product-group__category">
                        {{ group.category || "未分類" }}
                      </div>
                    </div>
                    <span class="promotion-product-group__count">
                      {{ getPromotionGroupSelectedCount(group) }} / {{ group.options.length }}
                    </span>
                  </div>
                  <template v-if="isSingleDefaultPromotionGroup(group)">
                    <label
                      v-for="option in group.options"
                      :key="`promotion-product-${group.productId}-${option.specKey || 'default'}`"
                      class="promotion-target-option promotion-target-option--single"
                    >
                      <input
                        type="checkbox"
                        class="promo-product-cb"
                        :data-pid="option.productId"
                        :data-skey="option.specKey"
                        :checked="isPromotionTargetSelected(option.productId, option.specKey)"
                        @change="handlePromotionTargetChange(option.productId, option.specKey, $event)"
                      >
                      <span class="promotion-target-option__main">
                        <span class="promotion-target-option__label">{{ option.label }}</span>
                        <span class="promotion-target-option__price">${{ option.price }}</span>
                      </span>
                    </label>
                  </template>
                  <template v-else>
                    <div class="promotion-target-options-grid">
                      <label
                        v-for="option in group.options"
                        :key="`promotion-product-${group.productId}-${option.specKey || 'default'}`"
                        class="promotion-target-option"
                      >
                        <input
                          type="checkbox"
                          class="promo-product-cb"
                          :data-pid="option.productId"
                          :data-skey="option.specKey"
                          :checked="isPromotionTargetSelected(option.productId, option.specKey)"
                          @change="handlePromotionTargetChange(option.productId, option.specKey, $event)"
                        >
                        <span class="promotion-target-option__main">
                          <span class="promotion-target-option__label">{{ option.label }}</span>
                          <span class="promotion-target-option__price">${{ option.price }}</span>
                        </span>
                      </label>
                    </div>
                  </template>
                </article>
              </template>
            </div>
          </div>
        </section>

        <section class="promotion-form-section" aria-labelledby="promotion-discount-title">
          <div class="promotion-section-heading">
            <div>
              <h4 id="promotion-discount-title" class="promotion-section-heading__title">
                優惠內容
              </h4>
              <p class="promotion-section-heading__hint">
                目前設定：{{ discountPreviewText }}
              </p>
            </div>
          </div>

          <div class="promotion-field-grid promotion-field-grid--discount">
            <div class="promotion-field">
              <label for="prm-discount-type" class="promotion-field__label">
                優惠方式
              </label>
              <UiSelect
                id="prm-discount-type"
                :value="promotionForm.discountType"
                @change="handlePromotionFieldInput('discountType', $event)"
              >
                <option value="percent">折扣折數</option>
                <option value="amount">固定折抵</option>
              </UiSelect>
            </div>

            <div class="promotion-field">
              <label for="prm-discount-value" class="promotion-field__label">
                優惠數值
              </label>
              <UiInput
                type="number"
                id="prm-discount-value"
                :placeholder="discountValuePlaceholder"
                required
                min="0"
                step="0.1"
                :value="promotionForm.discountValue"
                @input="handlePromotionFieldInput('discountValue', $event)"
              />
            </div>
          </div>
        </section>

        <div class="promotion-modal__footer">
          <UiButton
            type="button"
            variant="secondary"
            @click="handleClosePromotionModal"
          >
            <X class="promotion-modal__button-icon" aria-hidden="true" />
            取消
          </UiButton>
          <UiButton type="submit">
            <Check class="promotion-modal__button-icon" aria-hidden="true" />
            儲存
          </UiButton>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Check, CheckSquare, RotateCcw, X } from "lucide-vue-next";
import UiButton from "../../components/ui/button/Button.vue";
import UiInput from "../../components/ui/input/Input.vue";
import UiSelect from "../../components/ui/select/Select.vue";
import {
  dashboardPromotionsActions,
  useDashboardPromotions,
} from "./useDashboardPromotions.ts";

const {
  isPromotionModalOpen,
  promotionModalTitle,
  promotionForm,
  promotionProductGroups,
  updatePromotionField,
  isPromotionTargetSelected,
  togglePromotionTarget,
} = useDashboardPromotions();

const totalPromotionTargetCount = computed(() =>
  promotionProductGroups.value.reduce(
    (total, group) => total + group.options.length,
    0,
  )
);

const selectedPromotionTargetCount = computed(() =>
  promotionForm.targetItems.filter((item) => Number(item.productId) > 0).length
);

const discountValuePlaceholder = computed(() =>
  promotionForm.discountType === "amount" ? "例如：100" : "例如：90"
);

const discountPreviewText = computed(() => {
  const discountValue = Number(promotionForm.discountValue) || 0;
  if (!discountValue) return "尚未設定";
  if (promotionForm.discountType === "amount") {
    return `折抵 $${formatPromotionNumber(discountValue)}`;
  }
  const displayValue = discountValue >= 10 ? discountValue / 10 : discountValue;
  return `${formatPromotionNumber(displayValue)} 折`;
});

const promotionRulePreview = computed(() => {
  const targetText = selectedPromotionTargetCount.value
    ? `${selectedPromotionTargetCount.value} 個品項`
    : "尚未選擇品項";
  const minQuantity = Number(promotionForm.minQuantity) || 0;
  return `${targetText} · 滿 ${minQuantity} 件 · ${discountPreviewText.value}`;
});

type PromotionFormField =
  | "name"
  | "type"
  | "minQuantity"
  | "discountType"
  | "discountValue";

function getInputValue(event: Event) {
  const target = event.target;
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLSelectElement ||
    target instanceof HTMLTextAreaElement
  ) {
    return target.value;
  }
  return "";
}

function getCheckedValue(event: Event) {
  return event.target instanceof HTMLInputElement
    ? event.target.checked
    : false;
}

function handlePromotionFieldInput(field: PromotionFormField, event: Event) {
  updatePromotionField(field, getInputValue(event));
}

function handlePromotionEnabledInput(event: Event) {
  updatePromotionField("enabled", getCheckedValue(event));
}

function handlePromotionTargetChange(
  productId: number | string,
  specKey: string,
  event: Event,
) {
  togglePromotionTarget(productId, specKey, getCheckedValue(event));
}

function formatPromotionNumber(value: number) {
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(1).replace(/\.0$/, "");
}

function handleSelectAllPromotionTargets() {
  promotionProductGroups.value.forEach((group) => {
    group.options.forEach((option) => {
      if (!isPromotionTargetSelected(option.productId, option.specKey)) {
        togglePromotionTarget(option.productId, option.specKey, true);
      }
    });
  });
}

function handleClearPromotionTargets() {
  promotionForm.targetItems.slice().forEach((item) => {
    togglePromotionTarget(item.productId, item.specKey, false);
  });
}

function getPromotionGroupSelectedCount(
  group: typeof promotionProductGroups.value[number],
) {
  return group.options.filter((option) =>
    isPromotionTargetSelected(option.productId, option.specKey)
  ).length;
}

function isSingleDefaultPromotionGroup(
  group: typeof promotionProductGroups.value[number],
) {
  return group.options.length === 1 && group.options[0]?.specKey === "";
}

function handleClosePromotionModal() {
  dashboardPromotionsActions.closePromotionModal();
}

function handleSavePromotion() {
  dashboardPromotionsActions.savePromotion();
}
</script>

<style scoped>
.promotion-modal {
  align-items: flex-start;
  padding: 24px 16px;
}

.promotion-modal__content {
  width: min(100%, 760px);
  max-width: 760px;
  max-height: calc(100dvh - 48px);
  padding: 0;
  overflow: hidden;
}

.promotion-modal__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.25rem 1.35rem 1rem;
  border-bottom: 1px solid #E2DCC8;
  background: #FFFDF7;
}

.promotion-modal__title-block {
  min-width: 0;
}

.promotion-modal__eyebrow {
  display: block;
  color: #839496;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  line-height: 1.2;
  text-transform: uppercase;
}

.promotion-modal__title {
  margin-top: 0.2rem;
  color: #073642;
  font-size: 1.35rem;
  font-weight: 900;
  line-height: 1.25;
}

.promotion-modal__summary {
  margin-top: 0.35rem;
  color: #586E75;
  font-size: 0.9rem;
  line-height: 1.45;
  word-break: break-word;
}

.promotion-modal__close {
  flex: 0 0 auto;
  border-radius: 8px;
}

.promotion-modal__button-icon {
  width: 1rem;
  height: 1rem;
  flex: 0 0 auto;
}

.promotion-form {
  display: grid;
  gap: 0;
  max-height: calc(100dvh - 170px);
  overflow-y: auto;
  background: #FDF6E3;
}

.promotion-form-section {
  display: grid;
  gap: 1rem;
  padding: 1.15rem 1.35rem;
  border-bottom: 1px solid #E2DCC8;
}

.promotion-section-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.promotion-section-heading--stacked {
  align-items: stretch;
}

.promotion-section-heading__title {
  color: #073642;
  font-size: 0.98rem;
  font-weight: 900;
  line-height: 1.35;
}

.promotion-section-heading__hint {
  margin-top: 0.25rem;
  color: #657B83;
  font-size: 0.84rem;
  line-height: 1.5;
}

.promotion-section-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: flex-end;
}

.promotion-field-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(12rem, 0.8fr);
  gap: 0.85rem;
}

.promotion-field-grid--discount {
  grid-template-columns: minmax(12rem, 0.8fr) minmax(0, 1fr);
}

.promotion-field {
  display: grid;
  gap: 0.45rem;
  min-width: 0;
}

.promotion-field--wide {
  min-width: 0;
}

.promotion-field__label,
.promotion-rule-builder__label {
  color: #073642;
  font-size: 0.82rem;
  font-weight: 800;
  line-height: 1.3;
}

.promotion-status-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  min-height: 2.35rem;
  cursor: pointer;
  color: #586E75;
  font-size: 0.85rem;
  font-weight: 800;
  white-space: nowrap;
}

.promotion-status-toggle input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}

.promotion-status-toggle__track {
  position: relative;
  width: 2.45rem;
  height: 1.35rem;
  border-radius: 999px;
  background: #D8CFB8;
  transition: background 0.16s ease;
}

.promotion-status-toggle__track::after {
  content: "";
  position: absolute;
  top: 0.18rem;
  left: 0.18rem;
  width: 0.98rem;
  height: 0.98rem;
  border-radius: 999px;
  background: #FFFDF7;
  box-shadow: 0 1px 3px rgba(7, 54, 66, 0.18);
  transition: transform 0.16s ease;
}

.promotion-status-toggle input:checked + .promotion-status-toggle__track {
  background: #859900;
}

.promotion-status-toggle input:checked + .promotion-status-toggle__track::after {
  transform: translateX(1.1rem);
}

.promotion-status-toggle input:focus-visible + .promotion-status-toggle__track {
  outline: 2px solid #268BD2;
  outline-offset: 3px;
}

.promotion-rule-builder {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.8rem 0.9rem;
  border: 1px solid #E2DCC8;
  border-radius: 8px;
  background: #FFFDF7;
}

.promotion-rule-builder__control {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  color: #073642;
  font-size: 0.92rem;
  font-weight: 800;
  line-height: 1.4;
}

.promotion-rule-builder__input {
  width: 5rem;
  text-align: center;
}

.promotion-products-picker {
  display: grid;
  gap: 0.75rem;
  max-height: min(44dvh, 26rem);
  overflow-y: auto;
  padding: 0.75rem;
  border: 1px solid #E2DCC8;
  border-radius: 8px;
  background: #FFFDF7;
}

.promotion-products-picker__empty {
  margin: 0;
  color: #839496;
  font-size: 0.9rem;
}

.promotion-product-group {
  display: grid;
  gap: 0.65rem;
  padding: 0.75rem;
  border: 1px solid #EEE8D5;
  border-radius: 8px;
  background: #FDF6E3;
}

.promotion-product-group__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.promotion-product-group__name {
  color: #073642;
  font-size: 0.93rem;
  font-weight: 900;
  line-height: 1.35;
  word-break: break-word;
}

.promotion-product-group__category,
.promotion-product-group__count {
  color: #657B83;
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.35;
}

.promotion-product-group__count {
  flex: 0 0 auto;
  padding: 0.18rem 0.45rem;
  border-radius: 999px;
  background: #EEE8D5;
}

.promotion-target-options-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 9rem), 1fr));
  gap: 0.5rem;
}

.promotion-target-option {
  display: flex;
  align-items: flex-start;
  gap: 0.55rem;
  min-width: 0;
  min-height: 2.75rem;
  padding: 0.6rem 0.65rem;
  border: 1px solid #E2DCC8;
  border-radius: 8px;
  background: #FFFDF7;
  cursor: pointer;
  transition: border-color 0.16s ease, background 0.16s ease;
}

.promotion-target-option:hover {
  border-color: #C9C0A8;
  background: #F7F1E2;
}

.promotion-target-option input {
  width: 1.05rem;
  height: 1.05rem;
  flex: 0 0 auto;
  margin-top: 0.12rem;
  accent-color: #268BD2;
}

.promotion-target-option__main {
  display: grid;
  gap: 0.15rem;
  min-width: 0;
}

.promotion-target-option__label {
  color: #073642;
  font-size: 0.88rem;
  font-weight: 800;
  line-height: 1.35;
  word-break: break-word;
}

.promotion-target-option__price {
  color: #657B83;
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.25;
}

.promotion-modal__footer {
  position: sticky;
  bottom: 0;
  display: flex;
  justify-content: flex-end;
  gap: 0.65rem;
  padding: 1rem 1.35rem;
  border-top: 1px solid #E2DCC8;
  background: rgba(253, 246, 227, 0.96);
  backdrop-filter: blur(8px);
}

@media (max-width: 639px) {
  .promotion-modal {
    padding: 10px;
  }

  .promotion-modal__content {
    max-height: calc(100dvh - 20px);
  }

  .promotion-modal__header,
  .promotion-form-section,
  .promotion-modal__footer {
    padding-inline: 1rem;
  }

  .promotion-modal__title {
    font-size: 1.15rem;
  }

  .promotion-section-heading,
  .promotion-rule-builder,
  .promotion-modal__footer {
    display: grid;
    justify-content: stretch;
  }

  .promotion-section-actions {
    justify-content: stretch;
  }

  .promotion-section-actions > *,
  .promotion-modal__footer > * {
    width: 100%;
  }

  .promotion-field-grid,
  .promotion-field-grid--discount {
    grid-template-columns: 1fr;
  }

  .promotion-rule-builder__control {
    display: grid;
    grid-template-columns: 1fr auto auto;
    align-items: center;
  }

  .promotion-products-picker {
    max-height: 42dvh;
  }
}
</style>
