export function createProductsTabLoaders(deps) {
  return {
    categories: () => deps.renderCategories(),
    promotions: () => deps.loadPromotions(),
  };
}
