<template>
  <div
    id="product-modal"
    class="modal-overlay"
    :class="{ hidden: !isProductModalOpen }"
  >
    <div class="modal-content">
      <h3 id="pm-title" class="text-xl font-bold mb-5 ui-text-highlight">
        {{ productModalTitle }}
      </h3>
      <form class="space-y-4" @submit.prevent="handleSaveProduct">
        <input type="hidden" id="pm-id" :value="productForm.id">
        <div>
          <label class="block text-sm ui-text-strong mb-1">分類 *</label>
          <UiSelect
            id="pm-category"
            required
            :value="productForm.category"
            @change="updateProductField('category', $event.target.value)"
          >
            <option value="">選擇分類</option>
            <option
              v-for="category in categoryOptions"
              :key="`product-category-${category.id || category.name}`"
              :value="category.name"
            >
              {{ category.name }}
            </option>
          </UiSelect>
        </div>
        <div>
          <label class="block text-sm ui-text-strong mb-1">品名 *</label>
          <UiInput
            type="text"
            id="pm-name"
            required
            :value="productForm.name"
            @input="updateProductField('name', $event.target.value)"
          />
        </div>
        <div>
          <label class="block text-sm ui-text-strong mb-1">說明</label>
          <UiInput
            type="text"
            id="pm-desc"
            placeholder="風味描述"
            :value="productForm.description"
            @input="updateProductField('description', $event.target.value)"
          />
        </div>
        <div>
          <label class="block text-sm ui-text-strong mb-1">烘焙度</label>
          <UiInput
            type="text"
            id="pm-roast"
            placeholder="例：中淺焙"
            :value="productForm.roastLevel"
            @input="updateProductField('roastLevel', $event.target.value)"
          />
        </div>

        <div class="ui-card-section">
          <label class="block text-sm ui-text-strong mb-2 font-semibold">規格與價格</label>
          <div id="specs-container" class="space-y-2 mb-2">
            <div
              v-for="(spec, specIndex) in productForm.specs"
              :key="`product-spec-${spec.key || specIndex}-${specIndex}`"
              class="spec-row flex items-center gap-2 p-2 rounded-lg border"
              style="border-color:#E2DCC8;"
            >
              <label class="flex items-center">
                <input
                  type="checkbox"
                  class="spec-enabled w-4 h-4"
                  :checked="spec.enabled"
                  @change="updateProductSpec(specIndex, 'enabled', $event.target.checked)"
                >
              </label>
              <input
                type="text"
                class="spec-label input-field text-sm py-1"
                :value="spec.label"
                placeholder="規格名稱"
                style="width:90px"
                @input="updateProductSpec(specIndex, 'label', $event.target.value)"
              >
              <span class="ui-text-subtle text-sm">$</span>
              <input
                type="number"
                class="spec-price input-field text-sm py-1"
                :value="spec.price"
                placeholder="價格"
                min="0"
                style="width:80px"
                @input="updateProductSpec(specIndex, 'price', $event.target.value)"
              >
              <button
                type="button"
                @click="handleRemoveSpecRow(specIndex)"
                class="text-red-400 hover:ui-text-danger text-lg font-bold"
              >
                &times;
              </button>
            </div>
          </div>
          <UiButton
            type="button"
            size="sm"
            variant="outline"
            @click="handleAddSpecRow"
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
              class="w-4 h-4"
              :checked="productForm.enabled"
              @change="updateProductField('enabled', $event.target.checked)"
            >
            啟用販售
          </label>
        </div>
        <div class="flex gap-3 pt-2">
          <UiButton type="submit" class="flex-1">儲存</UiButton>
          <UiButton
            type="button"
            variant="secondary"
            @click="handleCloseProductModal"
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
import {
  dashboardProductsActions,
  useDashboardProducts,
} from "./useDashboardProducts.ts";

const {
  isProductModalOpen,
  productModalTitle,
  productForm,
  categoryOptions,
  updateProductField,
  updateProductSpec,
} = useDashboardProducts();

function handleAddSpecRow() {
  dashboardProductsActions.addSpecRow();
}

function handleRemoveSpecRow(index) {
  dashboardProductsActions.removeSpecRow(index);
}

function handleCloseProductModal() {
  dashboardProductsActions.closeProductModal();
}

function handleSaveProduct() {
  dashboardProductsActions.saveProduct();
}
</script>
