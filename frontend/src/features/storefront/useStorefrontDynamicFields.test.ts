import { describe, expect, it } from "vitest";
import {
  getInitialDynamicFieldValue,
  isDynamicFieldVisibleForDelivery,
  parseDynamicFieldOptions,
  useStorefrontDynamicFields,
} from "./useStorefrontDynamicFields.ts";

describe("useStorefrontDynamicFields", () => {
  it("filters fields by delivery visibility and keeps current user defaults", () => {
    const dynamicFields = useStorefrontDynamicFields({
      getStorefrontUiSnapshot: () => ({
        selectedDelivery: "delivery",
        currentUser: {
          userId: "user-1",
          phone: "0912345678",
          defaultCustomFields: JSON.stringify({ note: "放管理室" }),
        },
        formFields: [
          {
            id: 1,
            field_key: "phone",
            label: "電話",
            field_type: "tel",
            enabled: true,
          },
          {
            id: 2,
            field_key: "note",
            label: "備註",
            field_type: "text",
            enabled: true,
            delivery_visibility: JSON.stringify({ delivery: false }),
          },
          {
            id: 3,
            field_key: "receipt",
            label: "收據",
            field_type: "select",
            enabled: false,
          },
        ],
      }),
    });

    dynamicFields.refreshDynamicFieldsState();

    expect(dynamicFields.visibleFormFields.value.map((field) => field.field_key))
      .toEqual(["phone"]);
    expect(dynamicFields.fieldValues.value).toEqual({
      phone: "0912345678",
    });
    expect(getInitialDynamicFieldValue(
      dynamicFields.formFields.value[0]!,
      dynamicFields.currentUser.value,
    )).toBe("0912345678");
    expect(getInitialDynamicFieldValue(
      {
        field_key: "note",
      },
      dynamicFields.currentUser.value,
    )).toBe("放管理室");
  });

  it("parses select options and falls back to visible fields on invalid config", () => {
    expect(parseDynamicFieldOptions({
      options: JSON.stringify(["二聯式", "三聯式"]),
    })).toEqual(["二聯式", "三聯式"]);
    expect(parseDynamicFieldOptions({ options: "not-json" })).toEqual([]);
    expect(isDynamicFieldVisibleForDelivery({
      delivery_visibility: "not-json",
    }, "delivery")).toBe(true);
  });

  it("updates field values and receives profile default events", () => {
    const dynamicFields = useStorefrontDynamicFields();

    dynamicFields.syncDynamicFieldsState({
      formFields: [{
        field_key: "phone",
        field_type: "tel",
        enabled: true,
      }],
    });
    dynamicFields.updateDynamicFieldValue("phone", "0912000000");
    expect(dynamicFields.fieldValues.value.phone).toBe("0912000000");

    dynamicFields.handleDynamicFieldValuesUpdated(
      new CustomEvent("coffee:dynamic-field-values-updated", {
        detail: { phone: "0988000000" },
      }),
    );
    expect(dynamicFields.fieldValues.value).toEqual({ phone: "0988000000" });
  });
});
