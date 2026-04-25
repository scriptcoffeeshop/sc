/** @vitest-environment jsdom */

import { beforeEach, describe, expect, it, vi } from "vitest";
import Swal from "../../lib/swal.ts";
import {
  buildOrderConfirmSummaryView,
  confirmOrderSubmission,
} from "./storefrontOrderConfirmDialog.ts";
import type { StorefrontOrderConfirmParams } from "../../types/storefront";

vi.mock("../../lib/swal.ts", () => ({
  default: {
    fire: vi.fn(async (options) => {
      const popup = document.createElement("div");
      document.body.appendChild(popup);
      options?.didOpen?.(popup);
      return { isConfirmed: true };
    }),
    mixin: vi.fn(() => ({
      fire: vi.fn(),
    })),
  },
}));

const baseParams: StorefrontOrderConfirmParams = {
  deliveryMethod: "delivery",
  deliveryInfo: {
    companyOrBuilding: "A 棟",
  },
  addressText: "新竹市東區測試路 1 號",
  orderLines: ["衣索比亞 咖啡豆 x 1 (420元)"],
  total: 420,
  note: "",
  receiptInfo: null,
  paymentMethod: "cod",
};

describe("storefrontOrderConfirmDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";
  });

  it("builds a confirmation summary view without DOM string templates", () => {
    const summary = buildOrderConfirmSummaryView({
      ...baseParams,
      note: "第一行\n第二行",
      receiptInfo: {
        taxId: "",
        buyer: "測試買受人",
        address: "",
        needDateStamp: true,
      },
      paymentMethod: "transfer",
      transferTargetAccountInfo: "測試銀行 (999) 12345",
    });

    expect(summary).toMatchObject({
      deliveryLabel: "配送到府(限新竹)",
      companyOrBuilding: "A 棟",
      note: "第一行\n第二行",
      paymentLabel: "線上轉帳",
      transferTargetAccountInfo: "測試銀行 (999) 12345",
    });
    expect(summary.receiptRows).toContainEqual({
      label: "統一編號",
      value: "未填寫",
    });
  });

  it("mounts the Vue summary into a SweetAlert HTMLElement root", async () => {
    await confirmOrderSubmission({
      ...baseParams,
      addressText: "<img src=x onerror=alert(1)>",
      orderLines: ["<script>alert(1)</script>"],
      note: "<b>不要執行</b>",
    });

    const options = vi.mocked(Swal.fire).mock.calls[0][0] as {
      html?: unknown;
    };

    expect(options.html).toBeInstanceOf(HTMLElement);
    expect(document.body.innerHTML).toContain(
      "&lt;img src=x onerror=alert(1)&gt;",
    );
    expect(document.body.innerHTML).toContain(
      "&lt;script&gt;alert(1)&lt;/script&gt;",
    );
    expect(document.body.querySelector("script")).toBeNull();
  });
});
