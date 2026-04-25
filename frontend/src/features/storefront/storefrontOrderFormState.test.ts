/** @vitest-environment jsdom */

import { describe, expect, it, vi } from "vitest";
import {
  emitStorefrontOrderFormStateUpdated,
  getStorefrontOrderFormState,
  setStorefrontOrderFormState,
} from "./storefrontOrderFormState.ts";

describe("storefrontOrderFormState", () => {
  it("stores submit form values without reading DOM controls", () => {
    setStorefrontOrderFormState({
      policyAgreed: true,
      orderNote: "少糖",
      transferAccountLast5: "12345",
    });

    expect(getStorefrontOrderFormState()).toEqual({
      policyAgreed: true,
      orderNote: "少糖",
      transferAccountLast5: "12345",
    });
  });

  it("emits applied form state patches for Vue inputs", () => {
    const listener = vi.fn();
    window.addEventListener("coffee:order-form-state-updated", listener);

    emitStorefrontOrderFormStateUpdated({
      orderNote: "",
      transferAccountLast5: "98765",
    });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0]![0].detail).toEqual({
      orderNote: "",
      transferAccountLast5: "98765",
    });

    window.removeEventListener("coffee:order-form-state-updated", listener);
  });
});
