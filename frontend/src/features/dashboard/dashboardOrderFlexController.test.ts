/** @vitest-environment jsdom */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createOrderFlexController } from "./dashboardOrderFlexController.ts";
import type {
  DashboardOrderFlexControllerDeps,
} from "./dashboardOrderNotificationTypes.ts";

function jsonResponse(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    headers: { "content-type": "application/json" },
  });
}

function createBaseDeps(
  overrides: Partial<DashboardOrderFlexControllerDeps> = {},
): DashboardOrderFlexControllerDeps {
  return {
    API_URL: "https://api.example",
    authFetch: vi.fn(async () => jsonResponse({ success: true })),
    getAuthUserId: () => "admin-user",
    getOrders: () => [],
    Toast: { fire: vi.fn() },
    Swal: { fire: vi.fn(async () => ({})) },
    esc: (value) => String(value || ""),
    orderStatusLabel: {
      shipped: "已出貨",
      pending: "待處理",
    },
    orderMethodLabel: {},
    orderPayMethodLabel: {},
    orderPayStatusLabel: {},
    normalizeReceiptInfo: () => null,
    normalizeTrackingUrl: (value) => String(value || ""),
    buildLineFlexMessage: () => ({
      type: "flex" as const,
      altText: "訂單通知",
      contents: { type: "bubble" },
    }),
    resolveOrderLineUserId: (order) => String(order.lineUserId || ""),
    ...overrides,
  };
}

function installClipboard(writeText: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
}

function installLocalStorage() {
  const storage = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => storage.get(String(key)) || null,
      setItem: (key: string, value: string) =>
        storage.set(String(key), String(value)),
      removeItem: (key: string) => storage.delete(String(key)),
      clear: () => storage.clear(),
    },
  });
}

describe("dashboardOrderFlexController", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    installLocalStorage();
    localStorage.clear();
    document.body.innerHTML = "";
  });

  it("renders Flex preview through Vue and copies JSON from the deny action", async () => {
    const writeText = vi.fn(async () => undefined);
    installClipboard(writeText);

    const deps = createBaseDeps({
      Swal: {
        fire: vi.fn(async (options) => {
          if (options?.title === "LINE Flex Message") {
            expect(options.html).toBeInstanceOf(HTMLElement);
            const popup = document.createElement("div");
            document.body.appendChild(popup);
            options.didOpen?.(popup);
            expect(popup.textContent).toContain("#O-1001");
            expect(popup.textContent).toContain("已出貨");
            expect(popup.textContent).toContain("line-user-1");
            options.willClose?.();
            popup.remove();
            return { isDenied: true };
          }
          return {};
        }),
      },
    });
    const controller = createOrderFlexController(deps);

    await controller.previewOrderStatusNotification(
      {
        orderId: "O-1001",
        timestamp: "2026-04-25T00:00:00.000Z",
        lineUserId: "line-user-1",
      },
      "shipped",
    );

    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining('"type": "flex"'),
    );
    expect(deps.Toast.fire).toHaveBeenCalledWith({
      icon: "success",
      title: "Flex Message 已複製",
    });
    expect(JSON.parse(localStorage.getItem("coffee_flex_message_history"))[0])
      .toMatchObject({
        orderId: "O-1001",
        statusLabel: "已出貨",
      });
  });

  it("renders Flex history through Vue actions for copy and clear", async () => {
    const writeText = vi.fn(async () => undefined);
    installClipboard(writeText);
    localStorage.setItem(
      "coffee_flex_message_history",
      JSON.stringify([
        {
          orderId: "O-2001",
          statusLabel: "待處理",
          timestamp: "2026-04-25T00:00:00.000Z",
          flex: {
            type: "flex" as const,
            altText: "歷史通知",
            contents: { type: "bubble" },
          },
        },
      ]),
    );

    const deps = createBaseDeps({
      Swal: {
        fire: vi.fn(async (options) => {
          if (options?.title === "LINE Flex 歷史紀錄") {
            expect(options.html).toBeInstanceOf(HTMLElement);
            const popup = document.createElement("div");
            document.body.appendChild(popup);
            options.didOpen?.(popup);
            expect(popup.textContent).toContain("#O-2001");
            const copyButton = popup.querySelector(
              ".dashboard-flex-history-list__copy",
            ) as HTMLButtonElement | null;
            copyButton?.click();
            await Promise.resolve();
            const clearButton = popup.querySelector(
              ".dashboard-flex-history-list__clear",
            ) as HTMLButtonElement | null;
            clearButton?.click();
            await Promise.resolve();
            options.willClose?.();
            popup.remove();
          }
          return {};
        }),
      },
    });
    const controller = createOrderFlexController(deps);

    controller.showFlexHistory();
    await Promise.resolve();

    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining('"altText": "歷史通知"'),
    );
    expect(localStorage.getItem("coffee_flex_message_history")).toBeNull();
    expect(deps.Swal.fire).toHaveBeenCalledWith(
      "已清除",
      "所有 Flex Message 歷史已刪除",
      "success",
    );
  });
});
