export function createOrdersTabLoaders(deps) {
  return {
    orders: () => deps.loadOrders(),
  };
}
