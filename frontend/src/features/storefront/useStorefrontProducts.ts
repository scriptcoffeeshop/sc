import { ref } from "vue";

interface StorefrontProductViewModel {
  categories?: unknown[];
}

export function useStorefrontProducts() {
  const productsCategories = ref<unknown[]>([]);

  function syncProductsViewModel(viewModel: StorefrontProductViewModel = {}) {
    productsCategories.value = Array.isArray(viewModel.categories)
      ? viewModel.categories
      : [];
  }

  function handleProductsUpdated(event: CustomEvent<StorefrontProductViewModel>) {
    syncProductsViewModel(event?.detail || {});
  }

  return {
    productsCategories,
    syncProductsViewModel,
    handleProductsUpdated,
  };
}
