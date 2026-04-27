/** @vitest-environment jsdom */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createOrderEmailController } from "./dashboardOrderEmailController.ts";
import type { JsonRecord } from "../../lib/jsonUtils.ts";
import type { DashboardApiJson } from "./dashboardOrderTypes.ts";

function jsonResponse(payload: DashboardApiJson) {
  return { json: async () => payload };
}

function createDeps(overrides: JsonRecord = {}) {
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
    esc: (value: unknown) => String(value || ""),
    orderStatusLabel: { processing: "處理中" },
    orderMethodLabel: {},
    orderPayMethodLabel: {},
    orderPayStatusLabel: {},
    normalizeReceiptInfo: (): null => null,
    normalizeTrackingUrl: (value: unknown) => String(value || ""),
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

  it("uses delivered notification wording for delivered orders", async () => {
    const deps = createDeps({
      getOrders: () => [
        {
          orderId: "O-EMAIL-2",
          timestamp: "2026-04-27T08:00:00.000Z",
          email: "buyer@example.com",
          status: "delivered",
        },
      ],
      orderStatusLabel: { delivered: "已配達" },
      Swal: {
        fire: vi.fn(async (options) => {
          expect(options.html).toBeInstanceOf(HTMLElement);
          const popup = document.createElement("div");
          document.body.appendChild(popup);
          options.didOpen?.(popup);
          expect(popup.textContent).toContain("配達通知");
          expect(popup.textContent).toContain("目前狀態：已配達");
          options.willClose?.();
          popup.remove();
          return { isConfirmed: false };
        }),
      },
    });

    await createOrderEmailController(deps).sendOrderEmailByOrderId("O-EMAIL-2");

    expect(deps.authFetch).not.toHaveBeenCalled();
  });
});
