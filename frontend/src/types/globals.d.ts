export {};

declare global {
  interface Window {
    productSortables?: Array<{ destroy?: () => void }>;
  }
}
