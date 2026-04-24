<template>
  <div
    id="icon-library-section"
    v-show="activeTab === 'icon-library'"
    class="glass-card p-6"
  >
    <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-4">
      <div>
        <h2 class="text-lg font-bold ui-text-highlight">
          Icon 素材庫管理
        </h2>
        <p class="text-sm ui-text-subtle mt-1">
          依分類瀏覽 icon，選擇套用目標後可一鍵快速套用到設定欄位。
        </p>
      </div>
      <div class="w-full md:w-[340px]">
        <label class="block text-xs ui-text-subtle mb-1">快速搜尋</label>
        <input
          :value="keyword"
          class="input-field"
          placeholder="輸入關鍵字（例如：付款、配送、brand）"
          @input="handleKeywordInput"
        >
      </div>
    </div>

    <div class="ui-card-section mb-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
        <div>
          <label class="block text-xs ui-text-subtle mb-1">快速套用目標</label>
          <UiSelect id="icon-library-target" v-model="selectedTarget">
            <option value="site">品牌 Icon</option>
            <option value="products">商品區塊 Icon</option>
            <option value="delivery">配送區塊 Icon</option>
            <option value="notes">備註區塊 Icon</option>
            <option value="cod">付款：貨到/取貨付款</option>
            <option value="linepay">付款：LINE Pay</option>
            <option value="jkopay">付款：街口支付</option>
            <option value="transfer">付款：線上轉帳</option>
          </UiSelect>
        </div>
        <p class="text-xs ui-text-subtle leading-relaxed">
          點任一素材卡片的「快速套用」後，會直接寫入對應欄位與預覽圖，最後記得回對應設定頁按「儲存設定」。
        </p>
      </div>
    </div>

    <div class="flex flex-wrap gap-2 mb-4">
      <UiButton
        v-for="category in categories"
        :key="`icon-category-${category}`"
        size="sm"
        :variant="selectedCategory === category ? 'default' : 'outline'"
        @click.prevent="emit('select-category', category)"
      >
        {{ category === "all" ? "全部分類" : category }}
      </UiButton>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" id="icon-library-grid">
      <div
        v-for="icon in items"
        :key="`icon-card-${icon.key}`"
        class="ui-card-section flex flex-col gap-3"
      >
        <div class="flex items-start gap-3">
          <span class="w-12 h-12 rounded-xl border border-slate-200 bg-white p-2 inline-flex items-center justify-center">
            <img :src="getDefaultIconUrl(icon.key)" :alt="icon.label" class="ui-icon-img">
          </span>
          <div class="min-w-0">
            <p class="font-semibold text-sm text-slate-800 leading-tight">{{ icon.label }}</p>
            <p class="text-xs text-slate-500 font-mono truncate mt-0.5">{{ icon.key }}</p>
            <p class="text-xs text-slate-500 truncate">{{ icon.path }}</p>
          </div>
        </div>
        <div class="flex items-center justify-between gap-2">
          <span class="text-[11px] px-2 py-1 rounded-full bg-slate-100 text-slate-600">{{ icon.category }}</span>
          <UiButton
            size="sm"
            variant="secondary"
            @click.prevent="applyIcon(icon)"
          >
            快速套用
          </UiButton>
        </div>
      </div>
    </div>
    <p v-if="items.length === 0" class="text-center text-sm ui-text-subtle py-8">
      找不到符合條件的 icon，請調整分類或搜尋關鍵字。
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import UiButton from "../../components/ui/button/Button.vue";
import UiSelect from "../../components/ui/select/Select.vue";
import { getDefaultIconUrl } from "../../lib/icons.ts";
import { dashboardSettingsIconActions } from "./useDashboardSettingsIcons.ts";
import { useDashboardSession } from "./useDashboardSession.ts";

type IconLibraryItem = {
  key: string;
  label: string;
  path: string;
  category: string;
};

withDefaults(
  defineProps<{
    categories?: string[];
    items?: IconLibraryItem[];
    selectedCategory?: string;
    keyword?: string;
  }>(),
  {
    categories: () => [],
    items: () => [],
    selectedCategory: "all",
    keyword: "",
  },
);

const emit = defineEmits<{
  "update:keyword": [keyword: string];
  "select-category": [category: string];
}>();
const { activeTab } = useDashboardSession();
const selectedTarget = ref("site");

function handleKeywordInput(event: Event) {
  const target = event.target instanceof HTMLInputElement
    ? event.target
    : null;
  emit("update:keyword", target?.value || "");
}

function applyIcon(icon: IconLibraryItem) {
  dashboardSettingsIconActions.applyIconFromLibrary(
    selectedTarget.value,
    icon.key,
    icon.path,
  );
}
</script>
