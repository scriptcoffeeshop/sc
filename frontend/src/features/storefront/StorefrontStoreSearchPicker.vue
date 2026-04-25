<template>
  <div class="store-search-picker">
    <input
      id="store-search-input"
      ref="searchInput"
      v-model="keyword"
      class="swal2-input store-search-input"
      placeholder="輸入門市名稱、地址或關鍵字"
    >
    <div id="store-search-results" class="store-search-results">
      <button
        v-for="store in matches"
        :key="store.id"
        type="button"
        class="store-result-item"
        data-store-result="true"
        :data-id="store.id"
        :data-name="store.name"
        :data-addr="store.address"
        @click="$emit('select-store', store)"
      >
        <span class="store-result-name">{{ store.name }}</span>
        <span class="store-result-address">{{ store.address }}</span>
        <span class="store-result-code">代號：{{ store.id }}</span>
      </button>
    </div>
    <p id="store-search-hint" class="store-search-hint">
      {{ hintText }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import type { StoreRecord } from "./storefrontDeliveryData";

const props = withDefaults(
  defineProps<{
    stores?: StoreRecord[];
  }>(),
  {
    stores: () => [],
  },
);

defineEmits<{
  "select-store": [store: StoreRecord];
}>();

const keyword = ref("");
const searchInput = ref<HTMLInputElement | null>(null);

const normalizedKeyword = computed(() => keyword.value.trim().toLowerCase());
const matches = computed(() => {
  const term = normalizedKeyword.value;
  if (!term) return [];
  return props.stores.filter((store) =>
    store.name.toLowerCase().includes(term) ||
    store.address.toLowerCase().includes(term) ||
    store.id.includes(term)
  ).slice(0, 50);
});

const hintText = computed(() => {
  if (!normalizedKeyword.value) {
    return `共 ${props.stores.length} 間門市，請輸入關鍵字搜尋`;
  }
  if (matches.value.length >= 50) {
    return "顯示前 50 筆，請輸入更精確的關鍵字";
  }
  return `找到 ${matches.value.length} 間門市`;
});

onMounted(() => {
  searchInput.value?.focus();
});
</script>

<style scoped>
.store-search-input {
  width: 90%;
}

.store-search-results {
  max-height: 300px;
  margin-top: 12px;
  overflow-y: auto;
  text-align: left;
}

.store-search-hint {
  margin-top: 8px;
  color: #999;
  font-size: 12px;
}

.store-result-item {
  display: block;
  width: 100%;
  padding: 10px 12px;
  border: 0;
  border-bottom: 1px solid #eee;
  background: #fff;
  cursor: pointer;
  text-align: left;
  transition: background 0.2s;
}

.store-result-item:hover,
.store-result-item:focus {
  background: #f8fafc;
  outline: none;
}

.store-result-name,
.store-result-address,
.store-result-code {
  display: block;
}

.store-result-name {
  font-size: 14px;
  font-weight: 600;
}

.store-result-address {
  color: #666;
  font-size: 12px;
}

.store-result-code {
  color: #aaa;
  font-size: 11px;
}
</style>
