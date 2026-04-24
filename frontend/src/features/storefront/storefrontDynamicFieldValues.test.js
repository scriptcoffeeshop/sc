/** @vitest-environment jsdom */

import { describe, expect, it, vi } from "vitest";
import {
  buildInitialDynamicFieldValues,
  emitStorefrontDynamicFieldValuesUpdated,
  getStorefrontDynamicFieldValues,
  replaceStorefrontDynamicFieldValues,
  setStorefrontDynamicFieldValue,
} from "./storefrontDynamicFieldValues.ts";

describe("storefrontDynamicFieldValues", () => {
  it("builds defaults from profile and custom field data", () => {
    expect(buildInitialDynamicFieldValues(
      [
        { field_key: "phone", field_type: "tel" },
        { field_key: "email", field_type: "email" },
        { field_key: "note", field_type: "text" },
        { field_key: "title", field_type: "section_title" },
      ],
      {
        userId: "user-1",
        phone: "0912345678",
        email: "test@example.com",
        defaultCustomFields: JSON.stringify({ note: "放管理室" }),
      },
    )).toEqual({
      phone: "0912345678",
      email: "test@example.com",
      note: "放管理室",
    });
  });

  it("stores dynamic field values and emits Vue sync events", () => {
    const listener = vi.fn();
    window.addEventListener("coffee:dynamic-field-values-updated", listener);

    replaceStorefrontDynamicFieldValues({ phone: "" });
    setStorefrontDynamicFieldValue("phone", "0912000000");
    expect(getStorefrontDynamicFieldValues()).toEqual({
      phone: "0912000000",
    });

    emitStorefrontDynamicFieldValuesUpdated({ phone: "0988000000" });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].detail).toEqual({
      phone: "0988000000",
    });

    window.removeEventListener("coffee:dynamic-field-values-updated", listener);
  });
});
