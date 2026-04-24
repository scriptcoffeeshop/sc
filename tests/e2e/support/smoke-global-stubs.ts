import type { Page } from "@playwright/test";

export async function installGlobalStubs(page: Page) {
  await page.route("**/*.html", async (route) => {
    const response = await route.fetch();
    let body = await response.text();
    body = body.replace(/\s+integrity="[^"]*"/g, "");
    body = body.replace(/\s+crossorigin="[^"]*"/g, "");
    await route.fulfill({
      response,
      body,
      headers: { ...response.headers(), "content-type": "text/html" },
    });
  });

  await page.route(
    "**/sweetalert2**",
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/javascript",
        body: "/* swal blocked */",
      }),
  );

  await page.addInitScript(() => {
    const noop = () => {};
    const clipboardWrites: string[] = [];
    (window as any).Swal = {
      fire: async () => ({ isConfirmed: true }),
      close: noop,
      showLoading: noop,
      mixin: () => ({ fire: async () => ({}) }),
    };
    (window as any).__clipboardWrites = clipboardWrites;
    const clipboardMock = {
      writeText: async (text: string) => {
        clipboardWrites.push(String(text));
      },
    };
    try {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: clipboardMock,
      });
    } catch {
      (navigator as any).clipboard = clipboardMock;
    }
  });
}

export async function blockStorefrontBodyClickDelegation(page: Page) {
  await page.addInitScript(() => {
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    (window as any).__blockedStorefrontBodyClickDelegation = 0;
    EventTarget.prototype.addEventListener = function (
      type: string,
      listener: EventListenerOrEventListenerObject | null,
      options?: boolean | AddEventListenerOptions,
    ) {
      if (this === document.body && type === "click") {
        (window as any).__blockedStorefrontBodyClickDelegation += 1;
        return;
      }
      return originalAddEventListener.call(this, type, listener, options);
    };
  });
}
