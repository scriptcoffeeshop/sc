<template>
  <div id="categories-section" class="glass-card p-6 hidden">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-lg font-bold ui-text-highlight">
        商品分類
      </h2>
    </div>
    <div class="flex gap-2 mb-4">
      <input
        type="text"
        id="new-cat-name"
        class="input-field flex-grow"
        placeholder="新分類名稱"
      >
      <button data-action="add-category" class="btn-primary text-sm">
        新增
      </button>
    </div>
    <div id="categories-list" data-vue-managed="true">
      <p v-if="categoriesView.length === 0" class="text-center ui-text-subtle py-4">
        尚無分類
      </p>
      <template v-else>
        <div
          v-for="category in categoriesView"
          :key="`category-${category.id}`"
          class="flex items-center justify-between p-3 mb-2 rounded-lg"
          style="background:#faf6f2; border:1px solid #e5ddd5;"
          :data-id="category.id"
        >
          <div class="flex items-center gap-2">
            <span
              class="drag-handle-cat cursor-move ui-text-muted hover:text-amber-700 text-xl font-bold select-none px-1"
              title="拖曳排序"
              style="touch-action: none;"
            ><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 256 256" class="drag-handle-icon"><path d="M104,60A12,12,0,1,1,92,48,12,12,0,0,1,104,60Zm60-12a12,12,0,1,0,12,12A12,12,0,0,0,164,48ZM92,116a12,12,0,1,0,12,12A12,12,0,0,0,92,116Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,116ZM92,184a12,12,0,1,0,12,12A12,12,0,0,0,92,184Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,184Z"></path></svg></span>
            <span class="font-medium">{{ category.name }}</span>
          </div>
          <div class="flex gap-2">
            <button
              data-action="edit-category"
              :data-category-id="category.id"
              class="text-sm"
              style="color:var(--primary)"
            >
              編輯
            </button>
            <button
              data-action="delete-category"
              :data-category-id="category.id"
              class="text-sm ui-text-danger"
            >
              刪除
            </button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
defineProps({
  categoriesView: {
    type: Array,
    default: () => [],
  },
});
</script>
