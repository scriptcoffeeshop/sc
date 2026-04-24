/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from "vitest";
import { createStorefrontMainAppPayments } from "./storefrontMainAppPayments.ts";

describe("createStorefrontMainAppPayments", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reports init load errors through Vue state events", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      json: async () => ({ success: false, error: "API boom" }),
    })));
    const listener = vi.fn();
    window.addEventListener("coffee:storefront-load-error-updated", listener);

    const payments = createStorefrontMainAppPayments({
      getErrorMessage: (error) =>
        error instanceof Error ? error.message : String(error || ""),
      prefillUserFields: vi.fn(),
      applySavedOrderFormPrefs: vi.fn(),
    });

    await payments.loadInitData();

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].detail).toEqual({
      errorText: "載入資料失敗: API boom",
    });

    window.removeEventListener("coffee:storefront-load-error-updated", listener);
  });
});
