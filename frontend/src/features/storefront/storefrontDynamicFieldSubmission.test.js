import { describe, expect, it } from "vitest";
import { collectDynamicFields } from "./storefrontDynamicFieldSubmission.ts";

describe("collectDynamicFields", () => {
  it("collects dynamic fields from Vue state values", () => {
    expect(collectDynamicFields(
      [
        {
          field_key: "phone",
          field_type: "tel",
          label: "電話",
          required: true,
        },
        {
          field_key: "agree",
          field_type: "checkbox",
          label: "同意",
        },
        {
          field_key: "hidden_required",
          field_type: "text",
          label: "隱藏必填",
          required: true,
        },
      ],
      {
        phone: "0912345678",
        agree: "是",
      },
    )).toEqual({
      valid: true,
      data: {
        phone: "0912345678",
        agree: "是",
      },
      error: "",
    });
  });

  it("validates required and email fields from Vue state values", () => {
    expect(collectDynamicFields(
      [{
        field_key: "email",
        field_type: "email",
        label: "Email",
        required: true,
      }],
      { email: "not-email" },
    )).toEqual({
      valid: false,
      data: {},
      error: "「Email」格式不正確",
    });
  });
});
