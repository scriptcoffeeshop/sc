<template>
  <div class="mb-6">
    <h2
      id="products-section-title"
      class="mb-4"
      :class="[sectionTitle.sizeClass, sectionTitle.weightClass]"
      :style="{ color: sectionTitle.color }"
    >
      <span class="section-heading-inline">
        <span class="ui-icon-title">
          <img
            id="products-section-icon"
            :src="sectionTitle.iconUrl"
            :alt="sectionTitle.iconAlt"
            class="ui-icon-img"
          >
        </span>
        <span id="products-section-title-text">{{ sectionTitle.title }}</span>
      </span>
    </h2>
    <div id="products-container" data-vue-managed="true">
      <div
        v-if="loadErrorText"
        class="p-8 text-center text-red-600"
      >
        <p>{{ loadErrorText }}</p>
        <button
          type="button"
          class="mt-3 btn-primary"
          @click="$emit('retry-load')"
        >
          重試
        </button>
      </div>
      <div
        v-else-if="categories.length === 0"
        class="space-y-3 animate-pulse"
      >
        <div class="h-16 bg-gray-100 rounded-xl"></div>
        <div class="h-16 bg-gray-100 rounded-xl"></div>
        <div class="h-16 bg-gray-100 rounded-xl"></div>
      </div>
      <template v-else>
        <div
          v-for="category in categories"
          :key="category.name"
          class="mb-4"
        >
          <div class="category-header rounded-t-xl px-4 py-2 font-semibold">
            {{ category.name }}
          </div>
          <div
            class="space-y-0 border border-t-0 rounded-b-xl overflow-hidden"
            style="border-color:#e5ddd5;"
          >
            <div
              v-for="product in category.products"
              :key="product.id"
              class="product-row p-3 border-b flex flex-col gap-2"
              style="border-color:#f0e6db;"
            >
              <div class="flex items-start justify-between">
                <div>
                  <div class="font-medium">
                    {{ product.name }}
                    <span
                      v-if="product.roastLevel"
                      class="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 ml-1"
                    >{{ product.roastLevel }}</span>
                  </div>
                  <span
                    v-if="product.description"
                    class="text-xs text-gray-500"
                  >{{ product.description }}</span>
                </div>
              </div>
              <div class="flex gap-2 flex-wrap">
                <div
                  v-for="spec in product.specs"
                  :key="`${product.id}-${spec.key}`"
                  class="spec-container flex-1 min-w-[80px] relative"
                >
                  <button
                    v-if="getSpecQty(product.id, spec.key) <= 0"
                    class="spec-btn-add w-full text-xs sm:text-sm py-2 px-1 rounded-lg border-2 font-medium transition-all hover:shadow-md active:scale-95 flex flex-col items-center justify-center min-h-[48px]"
                    style="border-color:var(--secondary); color:var(--primary); background:#fefdf8;"
                    @click.prevent="$emit('change-spec-qty', product.id, spec.key, 1)"
                  >
                    <span>{{ spec.label }}</span>
                    <span class="font-bold">${{ spec.price }}</span>
                  </button>
                  <div
                    v-else
                    class="spec-btn-stepper w-full rounded-lg border-2 flex flex-col overflow-hidden"
                    style="border-color:var(--secondary); background:white;"
                  >
                    <div
                      class="text-xs sm:text-sm py-1.5 px-1 bg-amber-50 flex flex-col items-center justify-center border-b"
                      style="border-color:var(--secondary); color:var(--primary);"
                    >
                      <span>{{ spec.label }}</span>
                      <span class="font-bold">${{ spec.price }}</span>
                    </div>
                    <div
                      class="flex items-center justify-between px-1 py-1"
                      style="background:var(--secondary);"
                    >
                      <button
                        class="w-7 h-7 sm:w-8 sm:h-8 shrink-0 rounded-full bg-white text-gray-800 font-bold shadow-sm flex items-center justify-center active:scale-90"
                        @click.prevent="$emit('change-spec-qty', product.id, spec.key, -1)"
                      >
                        −
                      </button>
                      <div class="flex-1 flex items-center justify-center mx-1 overflow-hidden">
                        <span class="text-sm sm:text-base font-bold text-white spec-qty-text">
                          {{ getSpecQty(product.id, spec.key) }}
                        </span>
                      </div>
                      <button
                        class="w-7 h-7 sm:w-8 sm:h-8 shrink-0 rounded-full bg-white text-gray-800 font-bold shadow-sm flex items-center justify-center active:scale-90"
                        @click.prevent="$emit('change-spec-qty', product.id, spec.key, 1)"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { StorefrontProductCategoryView } from "./useStorefrontProducts";
import type { StorefrontSectionTitleView } from "./useStorefrontBranding";
import { normalizeStorefrontBranding } from "./useStorefrontBranding.ts";

const props = withDefaults(
  defineProps<{
    categories?: StorefrontProductCategoryView[];
    specQtyMap?: Map<string, number>;
    sectionTitle?: StorefrontSectionTitleView;
    loadErrorText?: string;
  }>(),
  {
    categories: () => [],
    specQtyMap: () => new Map<string, number>(),
    sectionTitle: () => normalizeStorefrontBranding({}).sections.products,
    loadErrorText: "",
  },
);

defineEmits<{
  "change-spec-qty": [productId: number, specKey: string, delta: number];
  "retry-load": [];
}>();

function getSpecQty(productId: number | string, specKey: string) {
  return props.specQtyMap.get(
    `${Number(productId)}-${String(specKey || "")}`,
  ) || 0;
}
</script>
