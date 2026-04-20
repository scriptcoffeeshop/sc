<template>
  <div
    id="promotion-modal"
    class="modal-overlay overflow-y-auto"
    :class="{ hidden: !isPromotionModalOpen }"
  >
    <div
      class="modal-content my-8 mx-auto"
      style="max-height: 90vh; overflow-y: auto"
    >
      <h3
        id="prm-title"
        class="text-xl font-bold mb-6 ui-text-highlight"
      >{{ promotionModalTitle }}</h3>
      <form id="promotion-form" class="space-y-4">
        <input type="hidden" id="prm-id" :value="promotionForm.id">

        <div>
          <label class="block text-sm ui-text-strong mb-1">活動名稱 *</label>
          <UiInput
            type="text"
            id="prm-name"
            placeholder="例如：任選2件9折"
            required
            :value="promotionForm.name"
            @input="updatePromotionField('name', $event.target.value)"
          />
        </div>

        <div>
          <label class="block text-sm ui-text-strong mb-1">活動類型 *</label>
          <UiSelect
            id="prm-type"
            required
            :value="promotionForm.type"
            @change="updatePromotionField('type', $event.target.value)"
          >
            <option value="bundle">組合優惠 (多件折扣)</option>
          </UiSelect>
        </div>

        <div class="ui-card-section bg-gray-50">
          <label
            class="block text-sm ui-text-strong space-x-2 font-medium mb-2"
          >觸發條件</label>
          <div class="mb-3">
            <label class="block text-xs ui-text-subtle mb-1">適用商品 (打勾即納入計算)</label>
            <div
              id="prm-products-list"
              class="max-h-40 overflow-y-auto border p-2 bg-white rounded space-y-1 text-sm"
            >
              <p
                v-if="promotionProductGroups.length === 0"
                class="ui-text-muted"
              >
                目前沒有商品可選
              </p>
              <template v-else>
                <div
                  v-for="group in promotionProductGroups"
                  :key="`promotion-product-${group.productId}`"
                  class="mb-2 border-b pb-1 last:border-0"
                  style="border-color:#E2DCC8"
                >
                  <template v-if="group.options.length === 1 && group.options[0].specKey === ''">
                    <label class="flex items-center gap-2 cursor-pointer p-1 hover:ui-bg-soft rounded">
                      <input
                        type="checkbox"
                        class="promo-product-cb"
                        :data-pid="group.options[0].productId"
                        :data-skey="group.options[0].specKey"
                        :checked="isPromotionTargetSelected(group.options[0].productId, group.options[0].specKey)"
                        @change="togglePromotionTarget(group.options[0].productId, group.options[0].specKey, $event.target.checked)"
                      >
                      <span class="ui-text-strong font-medium">[{{ group.category }}] {{ group.name }}</span>
                    </label>
                  </template>
                  <template v-else>
                    <div class="ui-text-strong font-medium p-1 ui-bg-soft rounded">[{{ group.category }}] {{ group.name }}</div>
                    <div class="pl-4 mt-1 space-y-1">
                      <label
                        v-for="option in group.options"
                        :key="`promotion-product-${group.productId}-${option.specKey || 'default'}`"
                        class="flex items-center gap-2 cursor-pointer p-1 hover:ui-bg-soft rounded text-sm"
                      >
                        <input
                          type="checkbox"
                          class="promo-product-cb"
                          :data-pid="option.productId"
                          :data-skey="option.specKey"
                          :checked="isPromotionTargetSelected(option.productId, option.specKey)"
                          @change="togglePromotionTarget(option.productId, option.specKey, $event.target.checked)"
                        >
                        <span class="ui-text-strong">{{ option.label }} <span class="text-xs ui-text-muted">(${{ option.price }})</span></span>
                      </label>
                    </div>
                  </template>
                </div>
              </template>
            </div>
          </div>
          <div class="flex items-center gap-2 mb-2">
            <span class="text-sm">任選滿</span>
            <UiInput
              type="number"
              id="prm-min-qty"
              class="w-20 text-center"
              :value="promotionForm.minQuantity"
              min="1"
              required
              @input="updatePromotionField('minQuantity', $event.target.value)"
            />
            <span class="text-sm">件，可享優惠</span>
          </div>
        </div>

        <div class="ui-card-section bg-gray-50">
          <label class="block text-sm ui-text-strong font-medium mb-2">優惠設定</label>
          <div class="flex items-center gap-2 mb-2">
            <UiSelect
              id="prm-discount-type"
              class="w-32"
              :value="promotionForm.discountType"
              @change="updatePromotionField('discountType', $event.target.value)"
            >
              <option value="percent">打折 (%)</option>
              <option value="amount">折抵現金 ($)</option>
            </UiSelect>
            <UiInput
              type="number"
              id="prm-discount-value"
              class="flex-1"
              placeholder="數值"
              required
              min="0"
              step="0.1"
              :value="promotionForm.discountValue"
              @input="updatePromotionField('discountValue', $event.target.value)"
            />
          </div>
          <p class="text-xs ui-text-subtle">
            例如：選擇「打折(%)」並輸入 90 表示 9折；選擇「折抵現金($)」並輸入
            100 表示折抵 100元。
          </p>
        </div>

        <div>
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              id="prm-enabled"
              class="w-4 h-4"
              :checked="promotionForm.enabled"
              @change="updatePromotionField('enabled', $event.target.checked)"
            >
            <span class="text-sm">啟用此活動</span>
          </label>
        </div>

        <div class="flex gap-3 pt-2">
          <UiButton type="submit" class="flex-1">儲存</UiButton>
          <UiButton
            type="button"
            variant="secondary"
            data-action="close-promotion-modal"
            class="flex-1"
          >
            取消
          </UiButton>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import UiButton from "../../components/ui/button/Button.vue";
import UiInput from "../../components/ui/input/Input.vue";
import UiSelect from "../../components/ui/select/Select.vue";
import { useDashboardPromotions } from "./useDashboardPromotions.js";

const {
  isPromotionModalOpen,
  promotionModalTitle,
  promotionForm,
  promotionProductGroups,
  updatePromotionField,
  isPromotionTargetSelected,
  togglePromotionTarget,
} = useDashboardPromotions();
</script>
