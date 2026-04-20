<template>
  <div id="products-section" v-show="activeTab === 'products'" class="glass-card p-6">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-lg font-bold ui-text-highlight">
        咖啡豆商品
      </h2>
      <button data-action="show-product-modal" class="btn-primary text-sm">
        + 新增商品
      </button>
    </div>
    <div class="overflow-x-auto">
      <table ref="productsTable" class="w-full" id="products-main-table">
        <thead>
          <tr class="border-b-2 ui-border">
            <th class="p-3 text-left w-10 ui-text-highlight">
              排序
            </th>
            <th class="p-3 text-left ui-text-highlight">
              分類
            </th>
            <th class="p-3 text-left ui-text-highlight">
              品名
            </th>
            <th class="p-3 text-right ui-text-highlight">
              價格
            </th>
            <th class="p-3 text-center ui-text-highlight">
              狀態
            </th>
            <th class="p-3 text-center ui-text-highlight">
              操作
            </th>
          </tr>
        </thead>
        <tbody v-if="productsGroupsView.length === 0">
          <tr>
            <td colspan="6" class="text-center py-8 ui-text-subtle">
              尚無商品
            </td>
          </tr>
        </tbody>
        <template v-else>
          <tbody
            v-for="group in productsGroupsView"
            :key="`products-${group.category}`"
            class="sortable-tbody"
            :data-cat="group.category"
          >
            <tr
              v-for="product in group.items"
              :key="`product-${product.id}`"
              class="border-b"
              style="border-color:#f0e6db;"
              :data-id="product.id"
            >
              <td class="p-3 text-center">
                <span
                  class="drag-handle cursor-move ui-text-muted hover:text-amber-700 text-xl font-bold select-none px-2 inline-block"
                  title="拖曳排序"
                  style="touch-action: none;"
                ><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 256 256" class="drag-handle-icon"><path d="M104,60A12,12,0,1,1,92,48,12,12,0,0,1,104,60Zm60-12a12,12,0,1,0,12,12A12,12,0,0,0,164,48ZM92,116a12,12,0,1,0,12,12A12,12,0,0,0,92,116Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,116ZM92,184a12,12,0,1,0,12,12A12,12,0,0,0,92,184Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,184Z"></path></svg></span>
              </td>
              <td class="p-3 text-sm">{{ product.category }}</td>
              <td class="p-3">
                <div class="font-medium mb-1">{{ product.name }}</div>
                <div class="text-xs ui-text-subtle">
                  {{ product.description }}<span v-if="product.roastLevel">・{{ product.roastLevel }}</span>
                </div>
              </td>
              <td class="p-3 text-right font-medium">
                <template v-for="(line, lineIndex) in product.priceLines" :key="`product-${product.id}-price-${lineIndex}`">
                  <div v-if="line.isSpec" class="text-xs">{{ line.label }}: ${{ line.price }}</div>
                  <span v-else>${{ line.price }}</span>
                </template>
              </td>
              <td class="p-3 text-center">
                <button
                  data-action="toggle-product-enabled"
                  :data-product-id="product.id"
                  :data-enabled="String(!product.enabled)"
                  class="text-sm font-medium hover:underline"
                  :class="product.statusClass"
                >
                  {{ product.statusLabel }}
                </button>
              </td>
              <td class="p-3 text-center">
                <button
                  data-action="edit-product"
                  :data-product-id="product.id"
                  class="text-sm mr-2"
                  style="color:var(--primary)"
                >
                  編輯
                </button>
                <button
                  data-action="delete-product"
                  :data-product-id="product.id"
                  class="text-sm ui-text-danger"
                >
                  刪除
                </button>
              </td>
            </tr>
          </tbody>
        </template>
      </table>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from "vue";
import {
  dashboardProductsActions,
  useDashboardProducts,
} from "./useDashboardProducts.js";
import { useDashboardSession } from "./useDashboardSession.js";

const { productsGroupsView } = useDashboardProducts();
const { activeTab } = useDashboardSession();
const productsTable = ref(null);

function syncProductsTable() {
  dashboardProductsActions.registerProductsTableElement(productsTable.value);
}

onMounted(syncProductsTable);
watch(productsGroupsView, syncProductsTable, { deep: true });
</script>
