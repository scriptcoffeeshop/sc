<template>
  <div id="products-section" v-show="activeTab === 'products'" class="glass-card dashboard-panel">
    <div class="dashboard-section-header">
      <div>
        <h2 class="dashboard-section-title">
          咖啡豆商品
        </h2>
        <p class="dashboard-section-hint">
          依分類管理商品、價格規格與上架狀態，可拖曳卡片調整顯示順序。
        </p>
      </div>
      <button type="button" @click="handleShowProductModal" class="btn-primary text-sm">
        + 新增商品
      </button>
    </div>

    <div ref="productsTable" id="products-main-table" class="dashboard-card-list products-groups">
      <p v-if="productsGroupsView.length === 0" class="dashboard-empty-state">
        尚無商品
      </p>
      <template v-else>
        <section
          v-for="group in productsGroupsView"
          :key="`products-${group.category}`"
          class="products-group"
        >
          <div class="products-group__header">
            <h3 class="products-group__title">{{ group.category }}</h3>
            <span class="dashboard-chip">{{ group.items.length }} 項商品</span>
          </div>
          <div
            class="dashboard-card-grid sortable-products-group"
            :data-cat="group.category"
          >
            <article
              v-for="product in group.items"
              :key="`product-${product.id}`"
              class="dashboard-item-card product-card"
              :data-id="product.id"
            >
              <div class="dashboard-card-row">
                <span
                  class="drag-handle dashboard-drag-handle"
                  title="拖曳排序"
                  aria-label="拖曳排序"
                ><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 256 256" class="drag-handle-icon"><path d="M104,60A12,12,0,1,1,92,48,12,12,0,0,1,104,60Zm60-12a12,12,0,1,0,12,12A12,12,0,0,0,164,48ZM92,116a12,12,0,1,0,12,12A12,12,0,0,0,92,116Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,116ZM92,184a12,12,0,1,0,12,12A12,12,0,0,0,92,184Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,184Z"></path></svg></span>
                <div class="dashboard-card-main">
                  <div class="dashboard-card-title">{{ product.name }}</div>
                  <div class="dashboard-card-subtitle">
                    {{ product.description || "未填商品描述" }}<span v-if="product.roastLevel">・{{ product.roastLevel }}</span>
                  </div>
                  <div class="product-card__prices">
                    <template
                      v-for="(line, lineIndex) in product.priceLines"
                      :key="`product-${product.id}-price-${lineIndex}`"
                    >
                      <span v-if="line.isSpec" class="dashboard-chip dashboard-chip--info">
                        {{ line.label }} ${{ line.price }}
                      </span>
                      <span v-else class="product-card__base-price">${{ line.price }}</span>
                    </template>
                  </div>
                </div>
                <div class="dashboard-card-actions">
                  <button
                    type="button"
                    @click="handleToggleProductEnabled(product.id, !product.enabled)"
                    class="dashboard-action"
                    :class="product.enabled ? 'dashboard-action--success' : ''"
                  >
                    {{ product.statusLabel }}
                  </button>
                  <button
                    type="button"
                    @click="handleEditProduct(product.id)"
                    class="dashboard-action dashboard-action--primary"
                  >
                    編輯
                  </button>
                  <button
                    type="button"
                    @click="handleDeleteProduct(product.id)"
                    class="dashboard-action dashboard-action--danger"
                  >
                    刪除
                  </button>
                </div>
              </div>
            </article>
          </div>
        </section>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import {
  dashboardProductsActions,
  useDashboardProducts,
} from "./useDashboardProducts.ts";
import { useDashboardSession } from "./useDashboardSession.ts";

const { productsGroupsView } = useDashboardProducts();
const { activeTab } = useDashboardSession();
const productsTable = ref<HTMLElement | null>(null);

function syncProductsTable() {
  dashboardProductsActions.registerProductsTableElement(productsTable.value);
}

function handleShowProductModal() {
  dashboardProductsActions.showProductModal();
}

function handleToggleProductEnabled(id: number, enabled: boolean) {
  dashboardProductsActions.toggleProductEnabled(id, enabled);
}

function handleEditProduct(id: number) {
  dashboardProductsActions.editProduct(id);
}

function handleDeleteProduct(id: number) {
  dashboardProductsActions.delProduct(id);
}

onMounted(syncProductsTable);
watch(productsGroupsView, syncProductsTable, { deep: true });
</script>

<style scoped>
.products-groups {
  gap: 1rem;
}

.products-group {
  display: grid;
  gap: 0.75rem;
}

.products-group__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.products-group__title {
  color: #657b83;
  font-size: 0.92rem;
  font-weight: 800;
}

.product-card__prices {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.6rem;
}

.product-card__base-price {
  color: #b58900;
  font-weight: 900;
}
</style>
