import { expect, type Page } from "@playwright/test";

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
