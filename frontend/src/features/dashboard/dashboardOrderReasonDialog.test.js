/** @vitest-environment jsdom */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { openDashboardOrderReasonDialog } from "./dashboardOrderReasonDialog.ts";

function setReason(value) {
  const textarea = document.getElementById("swal-cancel-reason");
  expect(textarea).toBeInstanceOf(HTMLTextAreaElement);
  textarea.value = value;
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("dashboardOrderReasonDialog", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("mounts the Vue reason form and returns trimmed reason values", async () => {
    const Swal = {
      fire: vi.fn(async (options) => {
        expect(options.html).toBeInstanceOf(HTMLElement);
        const popup = document.createElement("div");
        document.body.appendChild(popup);
        options.didOpen?.(popup);
        expect(document.getElementById("swal-cancel-reason")?.value).toBe(
          "原原因",
        );
        setReason("  付款逾時  ");
        const value = options.preConfirm();
        options.willClose?.();
        popup.remove();
        return { isConfirmed: true, value };
      }),
    };

    const result = await openDashboardOrderReasonDialog({
      Swal,
      title: "設定已取消",
      label: "取消原因",
      placeholder: "請輸入取消原因",
      confirmButtonText: "確認取消",
      initialReason: "原原因",
    });

    expect(result.value).toEqual({ cancelReason: "付款逾時" });
  });
});
