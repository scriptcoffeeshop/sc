import { describe, expect, it } from "vitest";
import {
  getStorefrontOrderFormState,
  setStorefrontOrderFormState,
} from "./storefrontOrderFormState.ts";
import { useStorefrontOrderFormState } from "./useStorefrontOrderFormState.ts";

describe("useStorefrontOrderFormState", () => {
  it("syncs note and transfer inputs into submit state", () => {
    setStorefrontOrderFormState({
      orderNote: "",
      transferAccountLast5: "",
    });
    const form = useStorefrontOrderFormState();

    form.orderNote.value = "請下午配送";
    form.updateTransferAccountLast5("12345");

    expect(getStorefrontOrderFormState()).toMatchObject({
      orderNote: "請下午配送",
      transferAccountLast5: "12345",
    });
  });

  it("receives saved form values from events", () => {
    const form = useStorefrontOrderFormState();

    form.handleOrderFormStateUpdated(
      new CustomEvent("coffee:order-form-state-updated", {
        detail: {
          orderNote: "",
          transferAccountLast5: "54321",
        },
      }),
    );

    expect(form.orderNote.value).toBe("");
    expect(form.transferAccountLast5.value).toBe("54321");
  });
});
