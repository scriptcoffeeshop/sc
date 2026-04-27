import { describe, expect, it } from "vitest";
import {
  buildSubmittedOrderPreferencePayload,
  resolveOrderContactFields,
} from "./storefrontOrderSubmit.ts";

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

  it("saves recipient name to profile defaults without overwriting LINE display name", () => {
    const payload = buildSubmittedOrderPreferencePayload({
      displayName: "收件人小明",
      phone: "0912345678",
      email: "buyer@example.com",
      customFieldsJson: JSON.stringify({ grind: "手沖" }),
      profileCustomFieldsJson: JSON.stringify({
        nickname: "收件人小明",
        grind: "手沖",
      }),
      deliveryMethod: "family_mart",
      deliveryInfo: {
        storeId: "029860",
        storeName: "全家台東龍泉店",
        storeAddress: "台東縣台東市測試路 1 號",
      },
      paymentMethod: "cod",
      transferAccountLast5: "",
      receiptInfo: null,
    }, { serializeReceiptInfo: true });

    expect("displayName" in payload).toBe(false);
    expect(payload.defaultCustomFields).toBe(JSON.stringify({
      nickname: "收件人小明",
      grind: "手沖",
    }));
  });
});
