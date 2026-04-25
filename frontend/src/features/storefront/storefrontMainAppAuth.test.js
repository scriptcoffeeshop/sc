import { describe, expect, it } from "vitest";
import {
  buildProfileFormFields,
  buildProfileUpdatePayload,
} from "./storefrontMainAppAuth.ts";

describe("storefrontMainAppAuth profile helpers", () => {
  const fields = [
    {
      field_key: "phone",
      field_type: "text",
      label: "電話",
      placeholder: "請輸入電話",
      options: "[]",
    },
    {
      field_key: "email",
      field_type: "email",
      label: "Email",
      placeholder: "請輸入 Email",
      options: "[]",
    },
    {
      field_key: "brew",
      field_type: "select",
      label: "沖煮方式",
      placeholder: "",
      options: JSON.stringify(["手沖", "義式"]),
    },
    {
      field_key: "note",
      field_type: "textarea",
      label: "備註",
      placeholder: "偏好",
      options: "[]",
    },
  ];

  it("builds Vue profile form fields from user defaults", () => {
    const result = buildProfileFormFields(fields, {
      userId: "user-1",
      phone: "0912345678",
      email: "old@example.com",
      defaultCustomFields: JSON.stringify({
        brew: "手沖",
        note: "少酸",
      }),
    });

    expect(result.values).toEqual({
      phone: "0912345678",
      email: "old@example.com",
      brew: "手沖",
      note: "少酸",
    });
    expect(result.fields[2]).toMatchObject({
      key: "brew",
      type: "select",
      options: ["手沖", "義式"],
    });
  });

  it("builds update payload without reading DOM controls", () => {
    expect(buildProfileUpdatePayload(fields, {
      phone: "0987654321",
      email: "new@example.com",
      brew: "義式",
      note: "",
    })).toEqual({
      phone: "0987654321",
      email: "new@example.com",
      defaultCustomFields: JSON.stringify({
        brew: "義式",
      }),
    });
  });
});
