import { expect, type Page } from "@playwright/test";

export type StorefrontSwalCall = {
  html: string;
  text: string;
  title: string;
};

type StorefrontSwalRecorderOptions = {
  confirmTitleIncludes?: string[];
};

export async function gotoStorefront(page: Page, path = "/main.html") {
  await page.goto(path, { waitUntil: "domcontentloaded" });
}

export async function gotoStorefrontReady(page: Page) {
  await gotoStorefront(page);
  await expect(page.locator("#products-container")).toBeVisible();
}

export async function installStorefrontUser(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem(
      "coffee_user",
      JSON.stringify({
        userId: "user-1",
        displayName: "測試客戶",
        pictureUrl: "",
      }),
    );
    localStorage.setItem("coffee_jwt", "mock-token");
  });
}

export async function expectCartHasItems(page: Page) {
  await expect.poll(() =>
    page.evaluate(() => {
      try {
        const raw = localStorage.getItem("coffee_cart");
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed.length : 0;
      } catch (_error) {
        return 0;
      }
    })
  ).toBeGreaterThan(0);
}

export async function installStorefrontSwalRecorder(
  page: Page,
  options: StorefrontSwalRecorderOptions = {},
) {
  await page.addInitScript(
    ({ confirmTitleIncludes }) => {
      type StorefrontSwalPayload = {
        didOpen?: (popup: HTMLElement) => void;
        html?: unknown;
        text?: unknown;
        title?: unknown;
        willClose?: () => void;
      };

      type StorefrontTestWindow = Window & typeof globalThis & {
        __storefrontSwalCalls: StorefrontSwalCall[];
        Swal: {
          fire: (input?: unknown) => Promise<{ isConfirmed: boolean }>;
        };
      };

      const testWindow = window as StorefrontTestWindow;
      const swalCalls: StorefrontSwalCall[] = [];
      const toPayload = (input: unknown): StorefrontSwalPayload => {
        if (typeof input === "string") return { title: input };
        if (input && typeof input === "object") {
          return input as StorefrontSwalPayload;
        }
        return {};
      };
      const persistSwalCalls = () => {
        localStorage.setItem("__storefrontSwalCalls", JSON.stringify(swalCalls));
      };
      const serializeSwalPayload = (input: unknown): StorefrontSwalCall => {
        const payload = toPayload(input);
        let html = "";
        if (payload.html instanceof HTMLElement) {
          const popup = document.createElement("div");
          document.body.appendChild(popup);
          payload.didOpen?.(popup);
          html = payload.html.textContent || payload.html.innerHTML || "";
          payload.willClose?.();
          popup.remove();
        } else {
          html = String(payload.html || "");
        }
        return {
          html,
          text: String(payload.text || ""),
          title: String(payload.title || ""),
        };
      };

      testWindow.__storefrontSwalCalls = swalCalls;
      testWindow.Swal.fire = async (input?: unknown) => {
        const payload = serializeSwalPayload(input);
        swalCalls.push(payload);
        persistSwalCalls();
        const shouldConfirm = confirmTitleIncludes.length === 0 ||
          confirmTitleIncludes.some((title) => payload.title.includes(title));
        return { isConfirmed: shouldConfirm };
      };
    },
    {
      confirmTitleIncludes: options.confirmTitleIncludes ?? [],
    },
  );
}

export async function getStorefrontSwalCalls(page: Page) {
  return await page.evaluate(() => {
    type StorefrontTestWindow = Window & typeof globalThis & {
      __storefrontSwalCalls?: StorefrontSwalCall[];
    };

    const normalizeCall = (call: unknown): StorefrontSwalCall => {
      const raw = call && typeof call === "object"
        ? call as Partial<Record<keyof StorefrontSwalCall, unknown>>
        : {};
      return {
        html: String(raw.html || ""),
        text: String(raw.text || ""),
        title: String(raw.title || ""),
      };
    };
    const testWindow = window as StorefrontTestWindow;
    const calls = Array.isArray(testWindow.__storefrontSwalCalls)
      ? testWindow.__storefrontSwalCalls
      : [];
    try {
      const stored = JSON.parse(
        localStorage.getItem("__storefrontSwalCalls") || "[]",
      );
      if (Array.isArray(stored) && stored.length > 0) {
        return stored.map(normalizeCall);
      }
    } catch (_error) {
      return calls.map(normalizeCall);
    }
    return calls.map(normalizeCall);
  });
}

export async function getStorefrontSwalCall(
  page: Page,
  titleIncludes: string,
) {
  const calls = await getStorefrontSwalCalls(page);
  return calls.find((call) => call.title.includes(titleIncludes)) ?? null;
}

export async function hasStorefrontSwalCall(
  page: Page,
  titleIncludes: string,
) {
  return (await getStorefrontSwalCall(page, titleIncludes)) !== null;
}
