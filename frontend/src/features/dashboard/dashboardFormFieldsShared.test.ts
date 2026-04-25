import { describe, expect, it } from "vitest";
import {
  buildFormFieldViewModel,
  normalizeDeliveryVisibilityValue,
  parseFieldOptionsText,
  serializeFieldOptions,
} from "./dashboardFormFieldsShared.ts";

describe("dashboardFormFieldsShared", () => {
  it("builds field view model with hidden delivery summary", () => {
    expect(
      buildFormFieldViewModel({
        id: 1,
        field_key: "receipt_type",
        label: "收據類型",
        field_type: "select",
        placeholder: "請選擇",
        required: true,
        enabled: false,
        delivery_visibility: JSON.stringify({
          delivery: false,
          seven_eleven: true,
        }),
      }),
    ).toMatchObject({
      id: 1,
      fieldTypeLabel: "下拉選單",
      hiddenDeliveryMethodsText: "在 delivery 時隱藏",
      toggleEnabledValue: "true",
      toggleEnabledTitle: "啟用",
      toggleEnabledIcon: "關",
    });
  });

  it("serializes and parses select options text", () => {
    expect(serializeFieldOptions(" 二聯式, 三聯式 , ,免開 ")).toBe(
      JSON.stringify(["二聯式", "三聯式", "免開"]),
    );
    expect(parseFieldOptionsText(JSON.stringify(["二聯式", "三聯式"]))).toBe(
      "二聯式,三聯式",
    );
    expect(parseFieldOptionsText("not-json")).toBe("");
  });

  it("normalizes all-visible delivery visibility to null", () => {
    expect(
      normalizeDeliveryVisibilityValue(
        JSON.stringify({
          delivery: true,
          seven_eleven: true,
        }),
      ),
    ).toBeNull();

    expect(
      normalizeDeliveryVisibilityValue(
        JSON.stringify({
          delivery: false,
          seven_eleven: true,
        }),
      ),
    ).toBe(JSON.stringify({
      delivery: false,
      seven_eleven: true,
    }));
  });
});
