import { describe, expect, it, vi } from "vitest";
import { useStorefrontLoadState } from "./useStorefrontLoadState.ts";

describe("useStorefrontLoadState", () => {
  it("tracks load error events and retries through the provided reload callback", () => {
    const reload = vi.fn();
    const loadState = useStorefrontLoadState({ reload });

    loadState.handleLoadErrorUpdated(
      new CustomEvent("coffee:storefront-load-error-updated", {
        detail: { errorText: "載入資料失敗" },
      }),
    );
    expect(loadState.loadErrorText.value).toBe("載入資料失敗");

    loadState.handleLoadErrorUpdated(
      new CustomEvent("coffee:storefront-load-error-updated", {
        detail: { errorText: "" },
      }),
    );
    expect(loadState.loadErrorText.value).toBe("");

    loadState.handleRetryStorefrontLoad();
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
