import { ref } from "vue";

export interface StorefrontLoadErrorEvent extends Event {
  detail?: {
    errorText?: string;
  };
}

interface StorefrontLoadStateDeps {
  reload?: () => void;
}

export function useStorefrontLoadState(
  deps: StorefrontLoadStateDeps = {},
) {
  const loadErrorText = ref("");

  function handleLoadErrorUpdated(event: Event) {
    const detail = (event as StorefrontLoadErrorEvent).detail || {};
    loadErrorText.value = String(detail.errorText || "").trim();
  }

  function handleRetryStorefrontLoad() {
    if (deps.reload) {
      deps.reload();
      return;
    }
    location.reload();
  }

  return {
    loadErrorText,
    handleLoadErrorUpdated,
    handleRetryStorefrontLoad,
  };
}
