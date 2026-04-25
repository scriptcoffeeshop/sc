import type { Page } from "@playwright/test";

type DashboardControlSwalResponse = {
  response: unknown;
  title: string;
};

type DashboardControlHarnessOptions = {
  blockedEvents?: string[];
  swalResponses?: DashboardControlSwalResponse[];
};

type DashboardSwalInput = string | { title?: string };

type DashboardSwalWindow = Window & typeof globalThis & {
  Swal: {
    fire: (input: DashboardSwalInput) => Promise<unknown>;
  };
};

type DashboardLegacyGlobalsWindow = Window & typeof globalThis & {
  linePayRefundOrder?: unknown;
  loginWithLine?: unknown;
  logout?: unknown;
  showPromotionModal?: unknown;
  showTab?: unknown;
};

type DashboardEventBridgeWindow = Window & typeof globalThis & {
  __blockedDashboardEventCount: number;
};

export async function gotoDashboard(page: Page) {
  await page.goto("/dashboard.html");
}

export async function installDashboardAdminSession(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem(
      "coffee_admin",
      JSON.stringify({
        userId: "admin-1",
        displayName: "測試管理員",
        role: "SUPER_ADMIN",
      }),
    );
    localStorage.setItem("coffee_jwt", "mock-token");
  });
}

export async function installDashboardControlsHarness(
  page: Page,
  options: DashboardControlHarnessOptions = {},
) {
  await page.addInitScript(
    ({ blockedEvents, swalResponses }) => {
      localStorage.setItem(
        "coffee_admin",
        JSON.stringify({
          userId: "admin-1",
          displayName: "測試管理員",
          role: "SUPER_ADMIN",
        }),
      );
      localStorage.setItem("coffee_jwt", "mock-token");

      const blockedTypes = new Set(blockedEvents);
      const originalAddEventListener = Document.prototype.addEventListener;
      Document.prototype.addEventListener = function patchedAddEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject,
        listenerOptions?: boolean | AddEventListenerOptions,
      ) {
        if (this === document && blockedTypes.has(type)) {
          return;
        }
        return originalAddEventListener.call(
          this,
          type,
          listener,
          listenerOptions,
        );
      };

      const testWindow = window as DashboardSwalWindow;
      const baseFire = testWindow.Swal.fire.bind(testWindow.Swal);
      testWindow.Swal.fire = async (input: DashboardSwalInput) => {
        const title = typeof input === "string" ? input : input?.title;
        const match = swalResponses.find((entry) => entry.title === title);
        if (match) {
          return match.response;
        }
        return await baseFire(input);
      };
    },
    {
      blockedEvents: options.blockedEvents ?? ["click", "change"],
      swalResponses: options.swalResponses ?? [],
    },
  );
}

export async function installDashboardEventBridgeBlocker(
  page: Page,
  eventName: string,
) {
  await page.addInitScript((blockedEventName) => {
    const originalDispatchEvent = window.dispatchEvent.bind(window);
    const testWindow = window as DashboardEventBridgeWindow;
    testWindow.__blockedDashboardEventCount = 0;
    window.dispatchEvent = ((event: Event) => {
      if (event?.type === blockedEventName) {
        testWindow.__blockedDashboardEventCount += 1;
        return true;
      }
      return originalDispatchEvent(event);
    }) as typeof window.dispatchEvent;

    localStorage.setItem(
      "coffee_admin",
      JSON.stringify({
        userId: "admin-1",
        displayName: "測試管理員",
        role: "SUPER_ADMIN",
      }),
    );
    localStorage.setItem("coffee_jwt", "mock-token");
  }, eventName);
}

export async function getBlockedDashboardEventBridgeCount(page: Page) {
  return await page.evaluate(() => {
    const testWindow = window as Partial<DashboardEventBridgeWindow>;
    return Number(testWindow.__blockedDashboardEventCount || 0);
  });
}

export async function getDashboardLegacyGlobalTypes(page: Page) {
  return await page.evaluate(() => {
    const testWindow = window as DashboardLegacyGlobalsWindow;
    return {
      linePayRefundOrder: typeof testWindow.linePayRefundOrder,
      loginWithLine: typeof testWindow.loginWithLine,
      logout: typeof testWindow.logout,
      showPromotionModal: typeof testWindow.showPromotionModal,
      showTab: typeof testWindow.showTab,
    };
  });
}
