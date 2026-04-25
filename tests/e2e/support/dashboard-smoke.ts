import type { Page } from "@playwright/test";

type DashboardControlSwalResponse = {
  response: unknown;
  title: string;
};

type DashboardControlHarnessOptions = {
  blockedEvents?: string[];
  swalResponses?: DashboardControlSwalResponse[];
};

export async function gotoDashboard(page: Page) {
  await page.goto("/dashboard.html");
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

      const baseFire = (window as any).Swal.fire;
      (window as any).Swal.fire = async (
        input: string | { title?: string },
      ) => {
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
