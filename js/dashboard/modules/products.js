function parseId(value) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseBool(value) {
  return value === "true" || value === true || value === 1 || value === "1";
}

export function createProductsActionHandlers(deps) {
  return {
    "show-product-modal": () => deps.showProductModal(),
    "add-category": () => deps.addCategory(),
    "show-promotion-modal": () => deps.showPromotionModal(),
    "edit-product": (el) => {
      const id = parseId(el.dataset.productId);
      if (id !== null) deps.editProduct(id);
    },
    "delete-product": (el) => {
      const id = parseId(el.dataset.productId);
      if (id !== null) deps.delProduct(id);
    },
    "toggle-product-enabled": (el) => {
      const id = parseId(el.dataset.productId);
      if (id === null || !deps.toggleProductEnabled) return;
      deps.toggleProductEnabled(id, parseBool(el.dataset.enabled));
    },
    "remove-spec-row": (el) => {
      el.closest(".spec-row")?.remove();
    },
    "edit-category": (el) => {
      const id = parseId(el.dataset.categoryId);
      if (id !== null) deps.editCategory(id);
    },
    "delete-category": (el) => {
      const id = parseId(el.dataset.categoryId);
      if (id !== null) deps.delCategory(id);
    },
    "edit-promotion": (el) => {
      const id = parseId(el.dataset.promotionId);
      if (id !== null) deps.editPromotion(id);
    },
    "delete-promotion": (el) => {
      const id = parseId(el.dataset.promotionId);
      if (id !== null) deps.delPromotion(id);
    },
    "toggle-promotion-enabled": (el) => {
      const id = parseId(el.dataset.promotionId);
      if (id === null || !deps.togglePromotionEnabled) return;
      deps.togglePromotionEnabled(id, parseBool(el.dataset.enabled));
    },
    "add-spec-row": () => deps.addSpecRow(),
    "close-product-modal": () => deps.closeProductModal(),
    "close-promotion-modal": () => deps.closePromotionModal(),
  };
}

export function createProductsTabLoaders(deps) {
  return {
    categories: () => deps.renderCategories(),
    promotions: () => deps.loadPromotions(),
  };
}
