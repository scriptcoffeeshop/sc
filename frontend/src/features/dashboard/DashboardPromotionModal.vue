<template>
  <div id="promotion-modal" class="modal-overlay hidden overflow-y-auto">
    <div
      class="modal-content my-8 mx-auto"
      style="max-height: 90vh; overflow-y: auto"
    >
      <h3
        id="prm-title"
        class="text-xl font-bold mb-6 ui-text-highlight"
      >
        新增活動
      </h3>
      <form id="promotion-form" class="space-y-4">
        <input type="hidden" id="prm-id">

        <div>
          <label class="block text-sm ui-text-strong mb-1">活動名稱 *</label>
          <UiInput
            type="text"
            id="prm-name"
            placeholder="例如：任選2件9折"
            required
          />
        </div>

        <div>
          <label class="block text-sm ui-text-strong mb-1">活動類型 *</label>
          <UiSelect id="prm-type" required>
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
              <!-- JS 生成 checkbox -->
            </div>
          </div>
          <div class="flex items-center gap-2 mb-2">
            <span class="text-sm">任選滿</span>
            <UiInput
              type="number"
              id="prm-min-qty"
              class="w-20 text-center"
              value="2"
              min="1"
              required
            />
            <span class="text-sm">件，可享優惠</span>
          </div>
        </div>

        <div class="ui-card-section bg-gray-50">
          <label class="block text-sm ui-text-strong font-medium mb-2">優惠設定</label>
          <div class="flex items-center gap-2 mb-2">
            <UiSelect id="prm-discount-type" class="w-32">
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
            />
          </div>
          <p class="text-xs ui-text-subtle">
            例如：選擇「打折(%)」並輸入 90 表示 9折；選擇「折抵現金($)」並輸入
            100 表示折抵 100元。
          </p>
        </div>

        <div>
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" id="prm-enabled" checked class="w-4 h-4">
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
</script>
