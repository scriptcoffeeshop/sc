<template>
  <section class="promotion-form-section" aria-labelledby="promotion-trigger-title">
    <div class="promotion-section-heading promotion-section-heading--stacked">
      <div>
        <h4 id="promotion-trigger-title" class="promotion-section-heading__title">
          觸發條件
        </h4>
        <p class="promotion-section-heading__hint">
          已選 {{ selectedCount }} / {{ totalCount }} 個品項，滿
          {{ minQuantity || 0 }} 件後套用優惠。
        </p>
      </div>
      <div class="promotion-section-actions">
        <UiButton
          type="button"
          variant="outline"
          size="sm"
          @click="emit('selectAll')"
        >
          <CheckSquare class="promotion-modal__button-icon" aria-hidden="true" />
          全選
        </UiButton>
        <UiButton
          type="button"
          variant="ghost"
          size="sm"
          @click="emit('clear')"
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
          :value="minQuantity"
          min="1"
          required
          @input="handleMinQuantityInput"
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
          v-if="groups.length === 0"
          class="promotion-products-picker__empty"
        >
          目前沒有商品可選
        </p>
        <template v-else>
          <article
            v-for="group in groups"
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
</template>

<script setup lang="ts">
import { CheckSquare, RotateCcw } from "lucide-vue-next";
import UiButton from "../../components/ui/button/Button.vue";
import UiInput from "../../components/ui/input/Input.vue";
import type {
  PromotionProductGroup,
  PromotionTargetItem,
} from "./dashboardPromotionsShared.ts";

const props = defineProps<{
  groups: ReadonlyArray<PromotionProductGroup>;
  targetItems: ReadonlyArray<PromotionTargetItem>;
  selectedCount: number;
  totalCount: number;
  minQuantity: number;
}>();

const emit = defineEmits<{
  selectAll: [];
  clear: [];
  "min-quantity-input": [value: string];
  targetChange: [
    productId: number | string,
    specKey: string,
    checked: boolean,
  ];
}>();

function getInputValue(event: Event) {
  return event.target instanceof HTMLInputElement ? event.target.value : "";
}

function getCheckedValue(event: Event) {
  return event.target instanceof HTMLInputElement
    ? event.target.checked
    : false;
}

function handleMinQuantityInput(event: Event) {
  emit("min-quantity-input", getInputValue(event));
}

function handlePromotionTargetChange(
  productId: number | string,
  specKey: string,
  event: Event,
) {
  emit("targetChange", productId, specKey, getCheckedValue(event));
}

function isPromotionTargetSelected(productId: number | string, specKey = "") {
  return props.targetItems.some((item) =>
    Number(item.productId) === Number(productId) &&
    String(item.specKey || "") === String(specKey || "")
  );
}

function getPromotionGroupSelectedCount(group: PromotionProductGroup) {
  return group.options.filter((option) =>
    isPromotionTargetSelected(option.productId, option.specKey)
  ).length;
}

function isSingleDefaultPromotionGroup(group: PromotionProductGroup) {
  return group.options.length === 1 && group.options[0]?.specKey === "";
}
</script>

<style scoped>
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

.promotion-modal__button-icon {
  width: 1rem;
  height: 1rem;
  flex: 0 0 auto;
}

.promotion-field {
  display: grid;
  gap: 0.45rem;
  min-width: 0;
}

.promotion-field__label,
.promotion-rule-builder__label {
  color: #073642;
  font-size: 0.82rem;
  font-weight: 800;
  line-height: 1.3;
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

@media (max-width: 639px) {
  .promotion-form-section {
    padding-inline: 1rem;
  }

  .promotion-section-heading,
  .promotion-rule-builder {
    display: grid;
    justify-content: stretch;
  }

  .promotion-section-actions {
    justify-content: stretch;
  }

  .promotion-section-actions > * {
    width: 100%;
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
