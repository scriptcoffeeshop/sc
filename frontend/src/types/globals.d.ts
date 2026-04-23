export {};

declare global {
  interface Window {
    productSortables?: Array<{ destroy?: () => void }>;
    renderDeliveryOptions?: (config?: unknown) => void;
    selectDelivery?: (
      method: string,
      event?: unknown,
      options?: { skipQuote?: boolean },
    ) => void;
  }
}
