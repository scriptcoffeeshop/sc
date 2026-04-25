<template>
  <div id="categories-section" v-show="activeTab === 'categories'" class="glass-card dashboard-panel">
    <div class="dashboard-section-header">
      <div>
        <h2 class="dashboard-section-title">
          商品分類
        </h2>
        <p class="dashboard-section-hint">
          管理商品分類顯示順序，可拖曳卡片調整分類排序。
        </p>
      </div>
    </div>
    <div class="dashboard-toolbar-card dashboard-inline-form mb-4">
      <input
        type="text"
        id="new-cat-name"
        class="input-field"
        placeholder="新分類名稱"
        v-model="newCategoryName"
      >
      <button type="button" @click="handleAddCategory" class="btn-primary text-sm">
        新增
      </button>
    </div>
    <div id="categories-list" ref="categoriesList" class="dashboard-card-list">
      <p v-if="categoriesView.length === 0" class="dashboard-empty-state">
        尚無分類
      </p>
      <template v-else>
        <article
          v-for="category in categoriesView"
          :key="`category-${category.id}`"
          class="dashboard-item-card category-card"
          :data-id="category.id"
        >
          <div class="dashboard-card-row">
            <span
              class="drag-handle-cat dashboard-drag-handle"
              title="拖曳排序"
              aria-label="拖曳排序"
            ><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 256 256" class="drag-handle-icon"><path d="M104,60A12,12,0,1,1,92,48,12,12,0,0,1,104,60Zm60-12a12,12,0,1,0,12,12A12,12,0,0,0,164,48ZM92,116a12,12,0,1,0,12,12A12,12,0,0,0,92,116Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,116ZM92,184a12,12,0,1,0,12,12A12,12,0,0,0,92,184Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,184Z"></path></svg></span>
            <div class="dashboard-card-main">
              <div class="dashboard-card-title">{{ category.name }}</div>
              <div class="dashboard-card-meta">分類 ID：{{ category.id }}</div>
            </div>
            <div class="dashboard-card-actions">
              <button
                type="button"
                @click="handleEditCategory(category.id)"
                class="dashboard-action dashboard-action--primary"
              >
                編輯
              </button>
              <button
                type="button"
                @click="handleDeleteCategory(category.id)"
                class="dashboard-action dashboard-action--danger"
              >
                刪除
              </button>
            </div>
          </div>
        </article>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import {
  dashboardCategoriesActions,
  useDashboardCategories,
} from "./useDashboardCategories.ts";
import { useDashboardSession } from "./useDashboardSession.ts";

const { categoriesView, newCategoryName } = useDashboardCategories();
const { activeTab } = useDashboardSession();
const categoriesList = ref<HTMLElement | null>(null);

function syncCategoriesList() {
  dashboardCategoriesActions.registerCategoriesListElement(categoriesList.value);
}

function handleAddCategory() {
  dashboardCategoriesActions.addCategory();
}

function handleEditCategory(id: number | string) {
  dashboardCategoriesActions.editCategory(id);
}

function handleDeleteCategory(id: number | string) {
  dashboardCategoriesActions.delCategory(id);
}

onMounted(syncCategoriesList);
watch(categoriesView, syncCategoriesList, { deep: true });
</script>
