/** @vitest-environment jsdom */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createOrderEmailController } from "./dashboardOrderEmailController.ts";

function jsonResponse(payload) {
  return { json: async () => payload };
}

function createDeps(overrides = {}) {
  return {
    API_URL: "https://api.example",
    authFetch: vi.fn(async () => jsonResponse({ success: true, message: "已發送" })),
    getAuthUserId: () => "admin-user",
    getOrders: () => [
      {
        orderId: "O-EMAIL-1",
        timestamp: "2026-04-25T00:00:00.000Z",
        email: "buyer@example.com",
        status: "processing",
      },
    ],
    Toast: { fire: vi.fn() },
    Swal: { fire: vi.fn(async () => ({ isConfirmed: true })) },
    esc: (value) => String(value || ""),
    orderStatusLabel: { processing: "處理中" },
    orderMethodLabel: {},
    orderPayMethodLabel: {},
    orderPayStatusLabel: {},
    normalizeReceiptInfo: () => null,
    normalizeTrackingUrl: (value) => String(value || ""),
    ...overrides,
  };
}

describe("dashboardOrderEmailController", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("renders the send-email confirmation with Vue and preserves the send payload", async () => {
    const deps = createDeps({
      Swal: {
        fire: vi.fn(async (options) => {
          expect(options.html).toBeInstanceOf(HTMLElement);
          const popup = document.createElement("div");
          document.body.appendChild(popup);
          options.didOpen?.(popup);
          expect(popup.textContent).toContain("#O-EMAIL-1");
          expect(popup.textContent).toContain("處理中通知");
          expect(popup.textContent).toContain("buyer@example.com");
          expect(popup.textContent).toContain("目前狀態：處理中");
          options.willClose?.();
          popup.remove();
          return { isConfirmed: true };
        }),
      },
    });

    await createOrderEmailController(deps).sendOrderEmailByOrderId("O-EMAIL-1");

    expect(deps.authFetch).toHaveBeenCalledWith(
      "https://api.example?action=sendOrderEmail",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          userId: "admin-user",
          orderId: "O-EMAIL-1",
        }),
      }),
    );
    expect(deps.Toast.fire).toHaveBeenCalledWith({
      icon: "success",
      title: "已發送",
    });
  });
});
