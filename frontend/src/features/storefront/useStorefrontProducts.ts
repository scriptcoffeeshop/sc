import { ref } from "vue";
import type { Product } from "../../types/core";
import {
  buildStorefrontProductsViewModel,
  parseEnabledProductSpecs,
} from "../../../../js/storefront-models.js";

interface StorefrontCategoryRecord {
  name?: string;
}

interface StorefrontProductViewModel {
  categories?: StorefrontProductCategoryView[];
}

interface StorefrontProductsSnapshot {
  products?: Product[];
  categories?: StorefrontCategoryRecord[];
}

interface StorefrontProductsDeps {
  getStorefrontUiSnapshot?: () => StorefrontProductsSnapshot;
}

export interface StorefrontProductSpecView {
  key: string;
  label: string;
  price: number;
}

export interface StorefrontProductView {
  id: number;
  name: string;
  description: string;
  roastLevel: string;
  specs: StorefrontProductSpecView[];
}

export interface StorefrontProductCategoryView {
  name: string;
  products: StorefrontProductView[];
}

export { buildStorefrontProductsViewModel, parseEnabledProductSpecs };

export function useStorefrontProducts(deps: StorefrontProductsDeps = {}) {
  const productsCategories = ref<StorefrontProductCategoryView[]>([]);

  function syncProductsViewModel(viewModel: StorefrontProductViewModel = {}) {
    productsCategories.value = Array.isArray(viewModel.categories)
      ? viewModel.categories
      : [];
  }

  function syncProductsState(snapshot: StorefrontProductsSnapshot = {}) {
    productsCategories.value = buildStorefrontProductsViewModel(
      Array.isArray(snapshot.products) ? snapshot.products : [],
      Array.isArray(snapshot.categories) ? snapshot.categories : [],
    );
  }

  function handleProductsUpdated(event: CustomEvent<StorefrontProductViewModel>) {
    syncProductsViewModel(event?.detail || {});
  }

  function refreshProductsState() {
    syncProductsState(deps.getStorefrontUiSnapshot?.() || {});
  }

  return {
    productsCategories,
    syncProductsViewModel,
    syncProductsState,
    refreshProductsState,
    handleProductsUpdated,
  };
}
