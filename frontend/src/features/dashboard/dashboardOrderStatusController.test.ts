/** @vitest-environment jsdom */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createOrderStatusController } from "./dashboardOrderStatusController.ts";
import type { JsonRecord } from "../../lib/jsonUtils.ts";
import type { DashboardApiJson } from "./dashboardOrderTypes.ts";

function jsonResponse(payload: DashboardApiJson) {
  return { json: async () => payload };
}

function createDeps(overrides: JsonRecord = {}) {
  return {
    API_URL: "https://api.example",
    authFetch: vi.fn(async () => jsonResponse({ success: true })),
    getAuthUserId: () => "admin-user",
    getOrders: () => [
      {
        orderId: "O-STATUS-1",
        timestamp: "2026-04-25T00:00:00.000Z",
        status: "pending",
      },
    ],
    loadOrders: vi.fn(async () => undefined),
    previewOrderStatusNotification: vi.fn(async () => undefined),
    Toast: { fire: vi.fn() },
    Swal: { fire: vi.fn(async () => ({ isConfirmed: true })) },
    esc: (value: unknown) => String(value || ""),
    orderStatusLabel: {
      pending: "待處理",
      processing: "處理中",
    },
    ...overrides,
  };
}

describe("dashboardOrderStatusController", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("renders the status-change confirmation with Vue and preserves the update flow", async () => {
    const deps = createDeps({
      Swal: {
        fire: vi.fn(async (options) => {
          expect(options.html).toBeInstanceOf(HTMLElement);
          const popup = document.createElement("div");
          document.body.appendChild(popup);
          options.didOpen?.(popup);
          expect(popup.textContent).toContain("#O-STATUS-1");
          expect(popup.textContent).toContain("待處理");
          expect(popup.textContent).toContain("處理中");
          options.willClose?.();
          popup.remove();
          return { isConfirmed: true };
        }),
      },
    });

    await createOrderStatusController(deps).changeOrderStatus(
      "O-STATUS-1",
      "processing",
    );

    expect(deps.authFetch).toHaveBeenCalledWith(
      "https://api.example?action=updateOrderStatus",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          userId: "admin-user",
          orderId: "O-STATUS-1",
          status: "processing",
          cancelReason: "",
        }),
      }),
    );
    expect(deps.Toast.fire).toHaveBeenCalledWith({
      icon: "success",
      title: "狀態已更新",
    });
    expect(deps.loadOrders).toHaveBeenCalled();
    expect(deps.previewOrderStatusNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: "O-STATUS-1",
        status: "processing",
      }),
      "processing",
    );
  });
});
