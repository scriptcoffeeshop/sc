<template>
  <div id="product-modal" class="modal-overlay hidden">
    <div class="modal-content">
      <h3 id="pm-title" class="text-xl font-bold mb-5 ui-text-highlight">
        新增商品
      </h3>
      <form id="product-form" class="space-y-4">
        <input type="hidden" id="pm-id">
        <div>
          <label class="block text-sm ui-text-strong mb-1">分類 *</label>
          <UiSelect id="pm-category" required>
            <option value="">選擇分類</option>
          </UiSelect>
        </div>
        <div>
          <label class="block text-sm ui-text-strong mb-1">品名 *</label>
          <UiInput
            type="text"
            id="pm-name"
            required
          />
        </div>
        <div>
          <label class="block text-sm ui-text-strong mb-1">說明</label>
          <UiInput
            type="text"
            id="pm-desc"
            placeholder="風味描述"
          />
        </div>
        <div>
          <label class="block text-sm ui-text-strong mb-1">烘焙度</label>
          <UiInput
            type="text"
            id="pm-roast"
            placeholder="例：中淺焙"
          />
        </div>

        <div class="ui-card-section">
          <label class="block text-sm ui-text-strong mb-2 font-semibold">規格與價格</label>
          <div id="specs-container" class="space-y-2 mb-2"></div>
          <UiButton
            type="button"
            size="sm"
            variant="outline"
            data-action="add-spec-row"
            class="text-slate-700"
          >
            + 新增規格
          </UiButton>
        </div>

        <div>
          <label class="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              id="pm-enabled"
              checked
              class="w-4 h-4"
            >
            啟用販售
          </label>
        </div>
        <div class="flex gap-3 pt-2">
          <UiButton type="submit" class="flex-1">儲存</UiButton>
          <UiButton
            type="button"
            variant="secondary"
            data-action="close-product-modal"
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
