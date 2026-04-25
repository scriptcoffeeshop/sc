import type { Page } from "@playwright/test";

type SmokeClipboard = {
  writeText: (text: string) => Promise<void>;
};

type SmokeNavigator = Navigator & {
  clipboard: SmokeClipboard;
};

type SmokeSwal = {
  close: () => void;
  fire: () => Promise<{ isConfirmed: boolean }>;
  mixin: () => { fire: () => Promise<Record<string, never>> };
  showLoading: () => void;
};

type SmokeTestWindow = Window & typeof globalThis & {
  __blockedStorefrontBodyClickDelegation: number;
  __clipboardWrites: string[];
  Swal: SmokeSwal;
};

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
    const testWindow = window as SmokeTestWindow;
    testWindow.Swal = {
      fire: async () => ({ isConfirmed: true }),
      close: noop,
      showLoading: noop,
      mixin: () => ({ fire: async () => ({}) }),
    };
    testWindow.__clipboardWrites = clipboardWrites;
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
      (navigator as SmokeNavigator).clipboard = clipboardMock;
    }
  });
}

export async function blockStorefrontBodyClickDelegation(page: Page) {
  await page.addInitScript(() => {
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    const testWindow = window as SmokeTestWindow;
    testWindow.__blockedStorefrontBodyClickDelegation = 0;
    EventTarget.prototype.addEventListener = function (
      type: string,
      listener: EventListenerOrEventListenerObject | null,
      options?: boolean | AddEventListenerOptions,
    ) {
      if (this === document.body && type === "click") {
        testWindow.__blockedStorefrontBodyClickDelegation += 1;
        return;
      }
      return originalAddEventListener.call(this, type, listener, options);
    };
  });
}

export async function getBlockedStorefrontBodyClickDelegationCount(page: Page) {
  return await page.evaluate(() => {
    const testWindow = window as Partial<SmokeTestWindow>;
    return Number(testWindow.__blockedStorefrontBodyClickDelegation || 0);
  });
}

export async function getClipboardWrites(page: Page) {
  return await page.evaluate(() => {
    const testWindow = window as Partial<SmokeTestWindow>;
    const writes = testWindow.__clipboardWrites;
    return Array.isArray(writes) ? writes.map((value) => String(value)) : [];
  });
}
