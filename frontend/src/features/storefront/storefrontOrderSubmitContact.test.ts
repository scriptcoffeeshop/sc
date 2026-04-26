import { describe, expect, it } from "vitest";
import { resolveOrderContactFields } from "./storefrontOrderSubmit.ts";

describe("resolveOrderContactFields", () => {
  it("uses customer-entered contact fields before LINE profile values", () => {
    const contact = resolveOrderContactFields({
      fields: [
        { field_key: "nickname", label: "姓名/暱稱" },
        { field_key: "contact_phone", label: "聯絡電話" },
        { field_key: "contact_email", label: "Email" },
        { field_key: "brew_note", label: "研磨需求" },
      ],
      values: {
        nickname: "小明",
        contact_phone: "0912345678",
        contact_email: "buyer@example.com",
        brew_note: "手沖",
      },
      user: {
        userId: "line-user-1",
        displayName: "LINE 原名",
        phone: "0999999999",
        email: "old@example.com",
      },
    });

    expect(contact).toEqual({
      displayName: "小明",
      phone: "0912345678",
      email: "buyer@example.com",
    });
  });
});
